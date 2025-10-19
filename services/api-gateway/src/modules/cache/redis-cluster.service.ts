// services/api-gateway/src/modules/cache/redis-cluster.service.ts

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface RedisNodeStatus {
  name: string;
  host: string;
  status: string;
  role: 'master' | 'replica';
  connected: boolean;
  replicationLag?: number;
  lastCheck: Date;
}

export interface RedisClusterStatus {
  master: RedisNodeStatus;
  replicas: RedisNodeStatus[];
  totalReplicas: number;
  healthyReplicas: number;
  avgReplicationLag: number;
  subMicroServices: RedisNodeStatus[];
  healthySubMicroServices: number;
  totalSubMicroServices: number;
}

@Injectable()
export class RedisClusterService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisClusterService.name);
  
  private masterClient: Redis;
  private replicaClients: Redis[] = [];
  private currentReplicaIndex = 0;
  
  private masterHost: string;
  private replicaHosts: string[];
  private port: number;
  private password: string;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    // Prefer explicit master vars; fall back to generic REDIS_HOST/PORT; then localhost defaults
    this.masterHost = this.configService.get('REDIS_MASTER_HOST')
      || this.configService.get('REDIS_HOST')
      || '127.0.0.1';
    this.port = this.configService.get('REDIS_MASTER_PORT', this.configService.get('REDIS_PORT', 6379));
    this.password = this.configService.get('REDIS_PASSWORD');
    
    const replicaHostsStr = this.configService.get('REDIS_REPLICA_HOSTS', '');
    this.replicaHosts = replicaHostsStr 
      ? replicaHostsStr.split(',').map(h => h.trim()).filter(Boolean)
      : [];

    // ✅ Redis connection is REQUIRED - application will crash if it fails
    if (!this.masterHost) {
      this.logger.error('❌ CRITICAL: REDIS_MASTER_HOST not configured!');
      throw new Error('Redis Master host is required. Set REDIS_MASTER_HOST in .env.local');
    }

    await this.initializeCluster();
  }

  private async initializeCluster() {
    this.logger.log(`🔌 Connecting to Redis Master: ${this.masterHost}:${this.port}`);
    
    try {
      this.masterClient = new Redis({
        host: this.masterHost,
        port: this.port,
        password: this.password,
        retryStrategy: (times) => {
          if (times > 10) {
            this.logger.error('❌ Redis Master connection failed after 10 attempts');
            return null; // Stop retrying
          }
          const delay = Math.min(times * 1000, 5000);
          this.logger.warn(`⚠️ Redis Master retry attempt ${times}, delay: ${delay}ms`);
          return delay;
        },
        maxRetriesPerRequest: null, // ✅ Unlimited retries for each request
        enableReadyCheck: true,
        lazyConnect: false,
        connectTimeout: 10000,
      });

      // ✅ REQUIRED: Wait for master connection
      await this.masterClient.ping();
      this.logger.log('✅ Redis Master connected successfully');

      this.masterClient.on('error', (err) => {
        this.logger.error(`❌ Redis Master error: ${err.message}`);
      });

      this.masterClient.on('reconnecting', () => {
        this.logger.warn('🔄 Redis Master reconnecting...');
      });

      this.masterClient.on('end', () => {
        this.logger.error('❌ Redis Master connection closed');
      });

      // Replica connections (optional)
      if (this.replicaHosts.length > 0) {
        this.logger.log(`🔌 Connecting to ${this.replicaHosts.length} Redis Replicas...`);
        
        for (const replicaHost of this.replicaHosts) {
          try {
            const replicaClient = new Redis({
              host: replicaHost,
              port: this.port,
              password: this.password,
              readOnly: true,
              retryStrategy: (times) => (times > 5 ? null : Math.min(times * 1000, 3000)),
              maxRetriesPerRequest: null,
              enableReadyCheck: true,
              lazyConnect: false,
              connectTimeout: 5000,
            });

            await replicaClient.ping();
            
            replicaClient.on('connect', () => {
              this.logger.log(`✅ Redis Replica connected: ${replicaHost}`);
            });

            replicaClient.on('error', (err) => {
              this.logger.warn(`⚠️ Redis Replica error (${replicaHost}): ${err.message}`);
            });

            this.replicaClients.push(replicaClient);
          } catch (error) {
            this.logger.warn(`⚠️ Failed to connect to Replica ${replicaHost}: ${error.message}`);
            // Replica connection is optional, continue
          }
        }
      }

      this.logger.log(`🎯 Redis Cluster initialized: 1 Master, ${this.replicaClients.length} Replicas`);
    } catch (error) {
      this.logger.error(`❌ CRITICAL: Failed to initialize Redis Master: ${error.message}`);
      throw new Error(`Redis Master connection failed: ${error.message}`);
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
      // Read from replica (if available)
      const replica = this.getNextHealthyReplica();
      
      if (replica && replica !== this.masterClient) {
        try {
          const value = await replica.get(key);
          if (value) {
            this.logger.debug(`👁️ Redis Replica READ: ${key}`);
            return JSON.parse(value) as T;
          }
        } catch (error) {
          this.logger.warn(`⚠️ Replica read failed, falling back to Master`);
        }
      }
      
      // Read from master
      const value = await this.masterClient.get(key);
      return value ? JSON.parse(value) as T : null;
    } catch (error) {
      this.logger.error(`❌ Redis GET error: ${error.message}`);
      throw error;
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
      const result = await this.masterClient.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`❌ Redis EXISTS error: ${error.message}`);
      return false;
    }
  }

  async hset(key: string, field: string, value: any): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.masterClient.hset(key, field, serialized);
      this.logger.debug(`✍️ Redis Master HSET: ${key}:${field}`);
    } catch (error) {
      this.logger.error(`❌ Redis Master HSET error: ${error.message}`);
      throw error;
    }
  }

  async hget<T = any>(key: string, field: string): Promise<T | null> {
    try {
      const value = await this.masterClient.hget(key, field);
      return value ? JSON.parse(value) as T : null;
    } catch (error) {
      this.logger.error(`❌ Redis HGET error: ${error.message}`);
      return null;
    }
  }

  private getNextHealthyReplica(): Redis {
    if (this.replicaClients.length === 0) {
      return this.masterClient;
    }

    const replica = this.replicaClients[this.currentReplicaIndex];
    this.currentReplicaIndex = (this.currentReplicaIndex + 1) % this.replicaClients.length;

    if (replica.status === 'ready') {
      return replica;
    }

    // Find any healthy replica
    for (let i = 0; i < this.replicaClients.length; i++) {
      const nextReplica = this.replicaClients[i];
      if (nextReplica.status === 'ready') {
        return nextReplica;
      }
    }

    // No healthy replicas, use master
    return this.masterClient;
  }

  async getClusterStatus(): Promise<RedisClusterStatus> {
    const masterStatus = await this.getMasterStatus();
    const replicaStatuses = await Promise.all(
      this.replicaClients.map((client, index) => 
        this.getReplicaStatus(client, index)
      )
    );

    const healthyReplicas = replicaStatuses.filter(s => s.connected).length;
    const avgLag = replicaStatuses.length > 0
      ? replicaStatuses.reduce((sum, s) => sum + (s.replicationLag || 0), 0) / replicaStatuses.length
      : 0;

    // For subMicroServices, we'll use the replicas as they represent the sub-microservices
    const subMicroServices = replicaStatuses;
    const healthySubMicroServices = healthyReplicas;
    const totalSubMicroServices = this.replicaClients.length;

    return {
      master: masterStatus,
      replicas: replicaStatuses,
      totalReplicas: this.replicaClients.length,
      healthyReplicas,
      avgReplicationLag: avgLag,
      subMicroServices,
      healthySubMicroServices,
      totalSubMicroServices,
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

  private async getReplicaStatus(client: Redis, index: number): Promise<RedisNodeStatus> {
    try {
      const info = await client.info('replication');
      const lagMatch = info.match(/master_last_io_seconds_ago:(\d+)/);
      const replicationLag = lagMatch ? parseInt(lagMatch[1]) : 0;

      return {
        name: `replica-${index + 1}`,
        host: this.replicaHosts[index],
        role: 'replica',
        status: client.status,
        connected: client.status === 'ready',
        replicationLag,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        name: `replica-${index + 1}`,
        host: this.replicaHosts[index],
        role: 'replica',
        status: 'error',
        connected: false,
        replicationLag: -1,
        lastCheck: new Date(),
      };
    }
  }

  async onModuleDestroy() {
    this.logger.log('🔌 Disconnecting Redis Cluster...');
    try {
      await this.masterClient.quit();
      await Promise.all(this.replicaClients.map(client => client.quit()));
      this.logger.log('✅ Redis Cluster disconnected');
    } catch (error) {
      this.logger.error(`❌ Error disconnecting Redis: ${error.message}`);
    }
  }
}