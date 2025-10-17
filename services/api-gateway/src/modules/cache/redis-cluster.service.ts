import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface RedisNodeStatus {
  name: string;
  host: string;
  status: string;
  role: 'master' | 'subMicroService';
  connected: boolean;
  replicationLag?: number;
  lastCheck: Date;
}

export interface RedisClusterStatus {
  master: RedisNodeStatus;
  subMicroServices: RedisNodeStatus[];
  totalSubMicroServices: number;
  healthySubMicroServices: number;
  avgReplicationLag: number;
}

@Injectable()
export class RedisClusterService implements OnModuleInit {
  private readonly logger = new Logger(RedisClusterService.name);
  
  private masterClient: Redis;
  private subMicroServiceClients: Redis[] = [];
  private currentSubMicroServiceIndex = 0;
  
  private masterHost: string;
  private subMicroServiceHosts: string[];
  private port: number;
  private password: string;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.masterHost = this.configService.get('REDIS_MASTER_HOST', 'redis-master');
    this.port = this.configService.get('REDIS_MASTER_PORT', 6379);
    this.password = this.configService.get('REDIS_PASSWORD');
    
    const subMicroServiceHostsStr = this.configService.get('REDIS_SUBMICROSERVICE_HOSTS', '');
    this.subMicroServiceHosts = subMicroServiceHostsStr 
      ? subMicroServiceHostsStr.split(',').map(h => h.trim()) 
      : [];

    await this.initializeCluster();
  }

  private async initializeCluster() {
    try {
      this.logger.log(`🔌 Connecting to Redis Master: ${this.masterHost}:${this.port}`);
      this.masterClient = new Redis({
        host: this.masterHost,
        port: this.port,
        password: this.password,
        retryStrategy: (times) => {
          const delay = Math.min(times * 1000, 5000);
          this.logger.warn(`Redis Master retry attempt ${times}, delay: ${delay}ms`);
          return delay;
        },
        maxRetriesPerRequest: 3,
      });

      this.masterClient.on('connect', () => {
        this.logger.log('✅ Redis Master connected successfully');
      });

      this.masterClient.on('error', (err) => {
        this.logger.error(`❌ Redis Master error: ${err.message}`);
      });

      for (const subMicroServiceHost of this.subMicroServiceHosts) {
        this.logger.log(`🔌 Connecting to Redis SubMicroService: ${subMicroServiceHost}:${this.port}`);
        const subMicroServiceClient = new Redis({
          host: subMicroServiceHost,
          port: this.port,
          password: this.password,
          readOnly: true,
          retryStrategy: (times) => Math.min(times * 1000, 5000),
          maxRetriesPerRequest: 3,
        });

        subMicroServiceClient.on('connect', () => {
          this.logger.log(`✅ Redis SubMicroService connected: ${subMicroServiceHost}`);
        });

        subMicroServiceClient.on('error', (err) => {
          this.logger.error(`❌ Redis SubMicroService error (${subMicroServiceHost}): ${err.message}`);
        });

        this.subMicroServiceClients.push(subMicroServiceClient);
      }

      this.logger.log(`🎯 Redis Cluster initialized: 1 Master, ${this.subMicroServiceClients.length} SubMicroServices`);
    } catch (error) {
      this.logger.error(`❌ Failed to initialize Redis Cluster: ${error.message}`);
      throw error;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.masterClient.setex(key, ttl, serialized);
      } else {
        await this.masterClient.set(key, serialized);
      }
      this.logger.debug(`✍️ Redis Master SET: ${key}`);
    } catch (error) {
      this.logger.error(`❌ Redis Master SET error: ${error.message}`);
      throw error;
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const subMicroService = this.getNextHealthySubMicroService();
      const value = await subMicroService.get(key);
      
      if (value) {
        this.logger.debug(`👁️ Redis SubMicroService READ: ${key}`);
        return JSON.parse(value) as T;
      }
      return null;
    } catch (error) {
      this.logger.warn(`⚠️ Redis SubMicroService READ failed, falling back to Master`);
      const value = await this.masterClient.get(key);
      return value ? JSON.parse(value) as T : null;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.masterClient.del(key);
      this.logger.debug(`🗑️ Redis Master DEL: ${key}`);
    } catch (error) {
      this.logger.error(`❌ Redis Master DEL error: ${error.message}`);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const subMicroService = this.getNextHealthySubMicroService();
      const result = await subMicroService.exists(key);
      return result === 1;
    } catch (error) {
      const result = await this.masterClient.exists(key);
      return result === 1;
    }
  }

  async hset(key: string, field: string, value: any): Promise<void> {
    const serialized = JSON.stringify(value);
    await this.masterClient.hset(key, field, serialized);
    this.logger.debug(`✍️ Redis Master HSET: ${key}:${field}`);
  }

  async hget<T = any>(key: string, field: string): Promise<T | null> {
    try {
      const subMicroService = this.getNextHealthySubMicroService();
      const value = await subMicroService.hget(key, field);
      return value ? JSON.parse(value) as T : null;
    } catch (error) {
      const value = await this.masterClient.hget(key, field);
      return value ? JSON.parse(value) as T : null;
    }
  }

  private getNextHealthySubMicroService(): Redis {
    if (this.subMicroServiceClients.length === 0) {
      return this.masterClient;
    }

    const subMicroService = this.subMicroServiceClients[this.currentSubMicroServiceIndex];
    this.currentSubMicroServiceIndex = (this.currentSubMicroServiceIndex + 1) % this.subMicroServiceClients.length;

    if (subMicroService.status === 'ready') {
      return subMicroService;
    }

    for (let i = 0; i < this.subMicroServiceClients.length; i++) {
      const nextSubMicroService = this.subMicroServiceClients[i];
      if (nextSubMicroService.status === 'ready') {
        return nextSubMicroService;
      }
    }

    this.logger.warn('⚠️ All Redis SubMicroServices unavailable, using Master for read');
    return this.masterClient;
  }

  async getClusterStatus(): Promise<RedisClusterStatus> {
    const masterStatus = await this.getMasterStatus();
    const subMicroServiceStatuses = await Promise.all(
      this.subMicroServiceClients.map((client, index) => 
        this.getSubMicroServiceStatus(client, index)
      )
    );

    const healthySubMicroServices = subMicroServiceStatuses.filter(s => s.connected).length;
    const avgLag = subMicroServiceStatuses.reduce((sum, s) => sum + (s.replicationLag || 0), 0) 
      / (subMicroServiceStatuses.length || 1);

    return {
      master: masterStatus,
      subMicroServices: subMicroServiceStatuses,
      totalSubMicroServices: this.subMicroServiceClients.length,
      healthySubMicroServices,
      avgReplicationLag: avgLag,
    };
  }

  private async getMasterStatus(): Promise<RedisNodeStatus> {
    try {
      await this.masterClient.ping();
      return {
        name: 'master',
        host: this.masterHost,
        role: 'master',
        status: this.masterClient.status,
        connected: this.masterClient.status === 'ready',
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        name: 'master',
        host: this.masterHost,
        role: 'master',
        status: 'error',
        connected: false,
        lastCheck: new Date(),
      };
    }
  }

  private async getSubMicroServiceStatus(client: Redis, index: number): Promise<RedisNodeStatus> {
    try {
      const info = await client.info('replication');
      const lagMatch = info.match(/master_last_io_seconds_ago:(\d+)/);
      const replicationLag = lagMatch ? parseInt(lagMatch[1]) : 0;

      return {
        name: `subMicroService-${index + 1}`,
        host: this.subMicroServiceHosts[index],
        role: 'subMicroService',
        status: client.status,
        connected: client.status === 'ready',
        replicationLag,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        name: `subMicroService-${index + 1}`,
        host: this.subMicroServiceHosts[index],
        role: 'subMicroService',
        status: 'error',
        connected: false,
        replicationLag: -1,
        lastCheck: new Date(),
      };
    }
  }

  async onModuleDestroy() {
    this.logger.log('🔌 Disconnecting Redis Cluster...');
    await this.masterClient.quit();
    await Promise.all(this.subMicroServiceClients.map(client => client.quit()));
    this.logger.log('✅ Redis Cluster disconnected');
  }
}