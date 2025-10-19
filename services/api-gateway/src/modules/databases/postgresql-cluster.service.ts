// services/api-gateway/src/modules/databases/postgresql-cluster.service.ts

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient } from 'pg';
import { 
  DbNodeStatus, 
  PostgresClusterStatus, 
  DatabaseHealthConfig,
  DatabaseConnectionInfo 
} from './database-types';

@Injectable()
export class PostgreSQLClusterService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PostgreSQLClusterService.name);
  
  private primaryPool: Pool;
  private replicaPools: Pool[] = [];
  private currentReplicaIndex = 0;
  
  private primaryConfig: DatabaseHealthConfig;
  private replicaConfigs: DatabaseHealthConfig[] = [];

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.logger.log('🚀 Initializing PostgreSQL Cluster Service...');
    
    // Parse configuration from environment variables
    this.primaryConfig = this.parsePrimaryConfig();
    this.replicaConfigs = this.parseReplicaConfigs();

    this.logger.log(`📋 PostgreSQL Configuration:`);
    this.logger.log(`   Host: ${this.primaryConfig.host}`);
    this.logger.log(`   Port: ${this.primaryConfig.port}`);
    this.logger.log(`   Database: ${this.primaryConfig.database}`);
    this.logger.log(`   Username: ${this.primaryConfig.username}`);
    this.logger.log(`   Replicas: ${this.replicaConfigs.length}`);

    // ✅ PostgreSQL connection is REQUIRED - application will crash if it fails
    if (!this.primaryConfig.host) {
      this.logger.error('❌ CRITICAL: PostgreSQL primary host not configured!');
      throw new Error('PostgreSQL primary host is required. Set DATABASE_URL or POSTGRES_HOST in .env.local');
    }

    await this.initializeCluster();
  }

  private parsePrimaryConfig(): DatabaseHealthConfig {
    const databaseUrl = this.configService.get('DATABASE_URL');
    
    if (databaseUrl) {
      // Parse DATABASE_URL format: postgresql://user:password@host:port/database
      const url = new URL(databaseUrl);
      return {
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        username: url.username,
        password: url.password,
        database: url.pathname.slice(1), // Remove leading slash
        connectionTimeout: 10000,
        retryAttempts: 10,
        retryDelay: 1000,
      };
    }

    // Fallback to individual environment variables
    return {
      host: this.configService.get('POSTGRES_HOST') || '127.0.0.1',
      port: this.configService.get('POSTGRES_PORT', 5432),
      username: this.configService.get('POSTGRES_USER') || 'postgres',
      password: this.configService.get('POSTGRES_PASSWORD'),
      database: this.configService.get('POSTGRES_DB') || 'masterfabric',
      connectionTimeout: 10000,
      retryAttempts: 10,
      retryDelay: 1000,
    };
  }

  private parseReplicaConfigs(): DatabaseHealthConfig[] {
    const replicaHostsStr = this.configService.get('POSTGRES_REPLICA_HOSTS', '');
    if (!replicaHostsStr) return [];

    return replicaHostsStr
      .split(',')
      .map(h => h.trim())
      .filter(Boolean)
      .map(host => ({
        host,
        port: this.primaryConfig.port,
        username: this.primaryConfig.username,
        password: this.primaryConfig.password,
        database: this.primaryConfig.database,
        connectionTimeout: 5000,
        retryAttempts: 5,
        retryDelay: 1000,
      }));
  }

  private async initializeCluster() {
    this.logger.log(`🔌 Connecting to PostgreSQL Primary: ${this.primaryConfig.host}:${this.primaryConfig.port}`);
    
    try {
      // Initialize primary connection
      this.primaryPool = new Pool({
        host: this.primaryConfig.host,
        port: this.primaryConfig.port,
        user: this.primaryConfig.username,
        password: this.primaryConfig.password,
        database: this.primaryConfig.database,
        connectionTimeoutMillis: this.primaryConfig.connectionTimeout,
        max: 10,
        idleTimeoutMillis: 30000,
        query_timeout: 5000,
      });

      // ✅ REQUIRED: Wait for primary connection
      await this.testConnection(this.primaryPool);
      this.logger.log('✅ PostgreSQL Primary connected successfully');

      this.primaryPool.on('error', (err) => {
        this.logger.error(`❌ PostgreSQL Primary error: ${err.message}`);
      });

      // Initialize replica connections (optional)
      if (this.replicaConfigs.length > 0) {
        this.logger.log(`🔌 Connecting to ${this.replicaConfigs.length} PostgreSQL Replicas...`);
        
        for (const replicaConfig of this.replicaConfigs) {
          try {
            const replicaPool = new Pool({
              host: replicaConfig.host,
              port: replicaConfig.port,
              user: replicaConfig.username,
              password: replicaConfig.password,
              database: replicaConfig.database,
              connectionTimeoutMillis: replicaConfig.connectionTimeout,
              max: 5,
              idleTimeoutMillis: 30000,
              query_timeout: 3000,
            });

            await this.testConnection(replicaPool);
            
            replicaPool.on('error', (err) => {
              this.logger.warn(`⚠️ PostgreSQL Replica error (${replicaConfig.host}): ${err.message}`);
            });

            this.replicaPools.push(replicaPool);
            this.logger.log(`✅ PostgreSQL Replica connected: ${replicaConfig.host}`);
          } catch (error) {
            this.logger.warn(`⚠️ Failed to connect to Replica ${replicaConfig.host}: ${error.message}`);
            // Replica connection is optional, continue
          }
        }
      }

      this.logger.log(`🎯 PostgreSQL Cluster initialized: 1 Primary, ${this.replicaPools.length} Replicas`);
      this.logger.log(`✅ PostgreSQL Cluster Service ready for health monitoring`);
    } catch (error) {
      this.logger.error(`❌ CRITICAL: Failed to initialize PostgreSQL Primary: ${error.message}`);
      throw new Error(`PostgreSQL Primary connection failed: ${error.message}`);
    }
  }

  private async testConnection(pool: Pool): Promise<DatabaseConnectionInfo> {
    const startTime = Date.now();
    let client: PoolClient | null = null;
    
    try {
      client = await pool.connect();
      await client.query('SELECT 1');
      const responseTime = Date.now() - startTime;
      
      return {
        isConnected: true,
        responseTime,
      };
    } catch (error) {
      return {
        isConnected: false,
        responseTime: Date.now() - startTime,
        lastError: error.message,
      };
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      const result = await this.testConnection(this.primaryPool);
      return result.isConnected;
    } catch (error) {
      this.logger.error(`❌ PostgreSQL connection check failed: ${error.message}`);
      return false;
    }
  }

  async getClusterStatus(): Promise<PostgresClusterStatus> {
    const primaryStatus = await this.getPrimaryStatus();
    const replicaStatuses = await Promise.all(
      this.replicaPools.map((pool, index) => 
        this.getReplicaStatus(pool, index)
      )
    );

    const healthyReplicas = replicaStatuses.filter(s => s.connected).length;
    const avgLag = replicaStatuses.length > 0
      ? replicaStatuses.reduce((sum, s) => sum + (s.replicationLag || 0), 0) / replicaStatuses.length
      : 0;

    return {
      type: 'postgresql',
      primary: primaryStatus,
      replicas: replicaStatuses,
      totalReplicas: this.replicaPools.length,
      healthyReplicas,
      avgReplicationLag: avgLag,
    };
  }

  async getPrimaryStatus(): Promise<DbNodeStatus> {
    try {
      const connectionInfo = await this.testConnection(this.primaryPool);
      
      if (connectionInfo.isConnected) {
        // Get additional PostgreSQL info
        const client = await this.primaryPool.connect();
        try {
          const versionResult = await client.query('SELECT version()');
          const statsResult = await client.query(`
            SELECT 
              setting::int as max_connections,
              (SELECT count(*) FROM pg_stat_activity) as active_connections
            FROM pg_settings WHERE name = 'max_connections'
          `);
          
          const version = versionResult.rows[0]?.version || 'Unknown';
          const maxConnections = statsResult.rows[0]?.max_connections || 0;
          const activeConnections = statsResult.rows[0]?.active_connections || 0;

          return {
            name: 'primary',
            host: this.primaryConfig.host,
            role: 'primary',
            status: 'ready',
            connected: true,
            responseTime: connectionInfo.responseTime,
            lastCheck: new Date(),
          };
        } finally {
          client.release();
        }
      } else {
        return {
          name: 'primary',
          host: this.primaryConfig.host,
          role: 'primary',
          status: 'error',
          connected: false,
          lastCheck: new Date(),
        };
      }
    } catch (error) {
      return {
        name: 'primary',
        host: this.primaryConfig.host,
        role: 'primary',
        status: 'error',
        connected: false,
        lastCheck: new Date(),
      };
    }
  }

  async getReplicaStatus(pool: Pool, index: number): Promise<DbNodeStatus> {
    try {
      const connectionInfo = await this.testConnection(pool);
      const replicaConfig = this.replicaConfigs[index];
      
      if (connectionInfo.isConnected) {
        // Check if this is actually a replica
        const client = await pool.connect();
        try {
          const replicaResult = await client.query(`
            SELECT 
              pg_is_in_recovery() as is_replica,
              CASE 
                WHEN pg_is_in_recovery() THEN 
                  EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))::int
                ELSE 0 
              END as replication_lag
          `);
          
          const isReplica = replicaResult.rows[0]?.is_replica || false;
          const replicationLag = replicaResult.rows[0]?.replication_lag || 0;

          return {
            name: `replica-${index + 1}`,
            host: replicaConfig.host,
            role: isReplica ? 'replica' : 'primary',
            status: 'ready',
            connected: true,
            responseTime: connectionInfo.responseTime,
            replicationLag: isReplica ? replicationLag : 0,
            lastCheck: new Date(),
          };
        } finally {
          client.release();
        }
      } else {
        return {
          name: `replica-${index + 1}`,
          host: replicaConfig.host,
          role: 'replica',
          status: 'error',
          connected: false,
          lastCheck: new Date(),
        };
      }
    } catch (error) {
      return {
        name: `replica-${index + 1}`,
        host: this.replicaConfigs[index]?.host || 'unknown',
        role: 'replica',
        status: 'error',
        connected: false,
        lastCheck: new Date(),
      };
    }
  }

  private getNextHealthyReplica(): Pool | null {
    if (this.replicaPools.length === 0) {
      return null;
    }

    const replica = this.replicaPools[this.currentReplicaIndex];
    this.currentReplicaIndex = (this.currentReplicaIndex + 1) % this.replicaPools.length;

    // For now, return the replica (health check will be done at query time)
    return replica;
  }

  async executeQuery<T = any>(query: string, params?: any[]): Promise<T[]> {
    try {
      // Try to use replica for read queries if available
      const isReadQuery = query.trim().toLowerCase().startsWith('select');
      const pool = isReadQuery ? this.getNextHealthyReplica() || this.primaryPool : this.primaryPool;
      
      const client = await pool.connect();
      try {
        const result = await client.query(query, params);
        this.logger.debug(`📊 PostgreSQL Query executed: ${query.substring(0, 50)}...`);
        return result.rows;
      } finally {
        client.release();
      }
    } catch (error) {
      this.logger.error(`❌ PostgreSQL Query error: ${error.message}`);
      throw error;
    }
  }

  async onModuleDestroy() {
    this.logger.log('🔌 Disconnecting PostgreSQL Cluster...');
    try {
      if (this.primaryPool) {
        await this.primaryPool.end();
      }
      await Promise.all(this.replicaPools.map(pool => pool.end()));
      this.logger.log('✅ PostgreSQL Cluster disconnected');
    } catch (error) {
      this.logger.error(`❌ Error disconnecting PostgreSQL: ${error.message}`);
    }
  }
}
