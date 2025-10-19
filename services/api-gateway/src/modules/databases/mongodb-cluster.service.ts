// services/api-gateway/src/modules/databases/mongodb-cluster.service.ts

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoClient, Db, MongoClientOptions } from 'mongodb';
import { 
  DbNodeStatus, 
  MongoClusterStatus, 
  DatabaseHealthConfig,
  DatabaseConnectionInfo 
} from './database-types';

@Injectable()
export class MongoDBClusterService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MongoDBClusterService.name);
  
  private primaryClient: MongoClient;
  private replicaClients: MongoClient[] = [];
  private currentReplicaIndex = 0;
  
  private primaryConfig: DatabaseHealthConfig;
  private replicaConfigs: DatabaseHealthConfig[] = [];
  private isOptional: boolean = true; // MongoDB is optional by default

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.logger.log('🚀 Initializing MongoDB Cluster Service...');
    
    // Parse configuration from environment variables
    this.primaryConfig = this.parsePrimaryConfig();
    this.replicaConfigs = this.parseReplicaConfigs();

    this.logger.log(`📋 MongoDB Configuration:`);
    this.logger.log(`   Host: ${this.primaryConfig.host || 'not-configured'}`);
    this.logger.log(`   Port: ${this.primaryConfig.port}`);
    this.logger.log(`   Database: ${this.primaryConfig.database}`);
    this.logger.log(`   Username: ${this.primaryConfig.username || 'not-set'}`);
    this.logger.log(`   Replicas: ${this.replicaConfigs.length}`);

    // MongoDB connection is OPTIONAL - log warning but don't crash if not configured
    if (!this.primaryConfig.host) {
      this.logger.warn('⚠️ MongoDB not configured - skipping initialization');
      this.logger.warn('   To enable MongoDB, set MONGODB_URI or MONGODB_HOST in .env.local');
      return;
    }

    await this.initializeCluster();
  }

  private parsePrimaryConfig(): DatabaseHealthConfig {
    const mongoUri = this.configService.get('MONGODB_URI');
    
    if (mongoUri) {
      // Parse MONGODB_URI format: mongodb://user:password@host:port/database
      try {
        const url = new URL(mongoUri);
        return {
          host: url.hostname,
          port: parseInt(url.port) || 27017,
          username: url.username,
          password: url.password,
          database: url.pathname.slice(1), // Remove leading slash
          connectionTimeout: 10000,
          retryAttempts: 5,
          retryDelay: 1000,
        };
      } catch (error) {
        this.logger.warn(`⚠️ Invalid MONGODB_URI format: ${error.message}`);
      }
    }

    // Fallback to individual environment variables
    return {
      host: this.configService.get('MONGODB_HOST') || '',
      port: this.configService.get('MONGODB_PORT', 27017),
      username: this.configService.get('MONGODB_USER'),
      password: this.configService.get('MONGODB_PASSWORD'),
      database: this.configService.get('MONGODB_DATABASE') || 'masterfabric',
      connectionTimeout: 10000,
      retryAttempts: 5,
      retryDelay: 1000,
    };
  }

  private parseReplicaConfigs(): DatabaseHealthConfig[] {
    const replicaHostsStr = this.configService.get('MONGODB_REPLICA_HOSTS', '');
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
        retryAttempts: 3,
        retryDelay: 1000,
      }));
  }

  private async initializeCluster() {
    this.logger.log(`🔌 Connecting to MongoDB Primary: ${this.primaryConfig.host}:${this.primaryConfig.port}`);
    
    try {
      // Initialize primary connection
      const mongoOptions: MongoClientOptions = {
        serverSelectionTimeoutMS: this.primaryConfig.connectionTimeout,
        connectTimeoutMS: this.primaryConfig.connectionTimeout,
        socketTimeoutMS: 5000,
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 30000,
        retryWrites: true,
        retryReads: true,
      };

      const connectionString = this.buildConnectionString(this.primaryConfig);
      this.primaryClient = new MongoClient(connectionString, mongoOptions);

      // ✅ Test primary connection
      await this.testConnection(this.primaryClient);
      this.logger.log('✅ MongoDB Primary connected successfully');

      this.primaryClient.on('error', (err) => {
        this.logger.error(`❌ MongoDB Primary error: ${err.message}`);
      });

      this.primaryClient.on('close', () => {
        this.logger.warn('⚠️ MongoDB Primary connection closed');
      });

      // Initialize replica connections (optional)
      if (this.replicaConfigs.length > 0) {
        this.logger.log(`🔌 Connecting to ${this.replicaConfigs.length} MongoDB Replicas...`);
        
        for (const replicaConfig of this.replicaConfigs) {
          try {
            const replicaOptions: MongoClientOptions = {
              serverSelectionTimeoutMS: replicaConfig.connectionTimeout,
              connectTimeoutMS: replicaConfig.connectionTimeout,
              socketTimeoutMS: 3000,
              maxPoolSize: 5,
              minPoolSize: 1,
              maxIdleTimeMS: 30000,
              retryWrites: true,
              retryReads: true,
            };

            const replicaConnectionString = this.buildConnectionString(replicaConfig);
            const replicaClient = new MongoClient(replicaConnectionString, replicaOptions);

            await this.testConnection(replicaClient);
            
            replicaClient.on('error', (err) => {
              this.logger.warn(`⚠️ MongoDB Replica error (${replicaConfig.host}): ${err.message}`);
            });

            this.replicaClients.push(replicaClient);
            this.logger.log(`✅ MongoDB Replica connected: ${replicaConfig.host}`);
          } catch (error) {
            this.logger.warn(`⚠️ Failed to connect to Replica ${replicaConfig.host}: ${error.message}`);
            // Replica connection is optional, continue
          }
        }
      }

      this.logger.log(`🎯 MongoDB Cluster initialized: 1 Primary, ${this.replicaClients.length} Replicas`);
      this.logger.log(`✅ MongoDB Cluster Service ready for health monitoring`);
    } catch (error) {
      this.logger.warn(`⚠️ Failed to initialize MongoDB Primary: ${error.message}`);
      this.logger.warn('   MongoDB is optional - continuing without MongoDB support');
      // Don't throw error for MongoDB - it's optional
    }
  }

  private buildConnectionString(config: DatabaseHealthConfig): string {
    const auth = config.username && config.password 
      ? `${config.username}:${config.password}@` 
      : '';
    return `mongodb://${auth}${config.host}:${config.port}/${config.database}`;
  }

  private async testConnection(client: MongoClient): Promise<DatabaseConnectionInfo> {
    const startTime = Date.now();
    
    try {
      await client.connect();
      await client.db().admin().ping();
      const responseTime = Date.now() - startTime;
      
      return {
        isConnected: true,
        responseTime,
        connectionString: this.buildConnectionString(this.primaryConfig),
      };
    } catch (error) {
      return {
        isConnected: false,
        responseTime: Date.now() - startTime,
        lastError: error.message,
        connectionString: this.buildConnectionString(this.primaryConfig),
      };
    }
  }

  async checkConnection(): Promise<boolean> {
    if (!this.primaryClient) {
      return false;
    }

    try {
      const result = await this.testConnection(this.primaryClient);
      return result.isConnected;
    } catch (error) {
      this.logger.error(`❌ MongoDB connection check failed: ${error.message}`);
      return false;
    }
  }

  async getClusterStatus(): Promise<MongoClusterStatus> {
    if (!this.primaryClient) {
      return {
        type: 'mongodb',
        primary: {
          name: 'primary',
          host: 'not-configured',
          role: 'primary',
          status: 'not-configured',
          connected: false,
          lastCheck: new Date(),
        },
        replicas: [],
        totalReplicas: 0,
        healthyReplicas: 0,
        avgReplicationLag: 0,
      };
    }

    const primaryStatus = await this.getPrimaryStatus();
    const replicaStatuses = await Promise.all(
      this.replicaClients.map((client, index) => 
        this.getReplicaStatus(client, index)
      )
    );

    const healthyReplicas = replicaStatuses.filter(s => s.connected).length;
    const avgLag = replicaStatuses.length > 0
      ? replicaStatuses.reduce((sum, s) => sum + (s.replicationLag || 0), 0) / replicaStatuses.length
      : 0;

    return {
      type: 'mongodb',
      primary: primaryStatus,
      replicas: replicaStatuses,
      totalReplicas: this.replicaClients.length,
      healthyReplicas,
      avgReplicationLag: avgLag,
    };
  }

  async getPrimaryStatus(): Promise<DbNodeStatus> {
    if (!this.primaryClient) {
      return {
        name: 'primary',
        host: 'not-configured',
        role: 'primary',
        status: 'not-configured',
        connected: false,
        lastCheck: new Date(),
      };
    }

    try {
      const connectionInfo = await this.testConnection(this.primaryClient);
      
      if (connectionInfo.isConnected) {
        // Get additional MongoDB info
        const db = this.primaryClient.db(this.primaryConfig.database);
        const serverStatus = await db.admin().serverStatus();
        const replicaSetStatus = await db.admin().replSetGetStatus().catch(() => null);

        return {
          name: 'primary',
          host: this.primaryConfig.host,
          role: replicaSetStatus?.myState === 1 ? 'primary' : 'secondary',
          status: 'ready',
          connected: true,
          responseTime: connectionInfo.responseTime,
          lastCheck: new Date(),
        };
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

  async getReplicaStatus(client: MongoClient, index: number): Promise<DbNodeStatus> {
    try {
      const connectionInfo = await this.testConnection(client);
      const replicaConfig = this.replicaConfigs[index];
      
      if (connectionInfo.isConnected) {
        // Check replica set status
        const db = client.db(this.primaryConfig.database);
        const replicaSetStatus = await db.admin().replSetGetStatus().catch(() => null);
        
        const isPrimary = replicaSetStatus?.myState === 1;
        const replicationLag = replicaSetStatus?.optimeDate 
          ? Date.now() - replicaSetStatus.optimeDate.getTime() 
          : 0;

        return {
          name: `replica-${index + 1}`,
          host: replicaConfig.host,
          role: isPrimary ? 'primary' : 'secondary',
          status: 'ready',
          connected: true,
          responseTime: connectionInfo.responseTime,
          replicationLag: isPrimary ? 0 : replicationLag,
          lastCheck: new Date(),
        };
      } else {
        return {
          name: `replica-${index + 1}`,
          host: replicaConfig.host,
          role: 'secondary',
          status: 'error',
          connected: false,
          lastCheck: new Date(),
        };
      }
    } catch (error) {
      return {
        name: `replica-${index + 1}`,
        host: this.replicaConfigs[index]?.host || 'unknown',
        role: 'secondary',
        status: 'error',
        connected: false,
        lastCheck: new Date(),
      };
    }
  }

  private getNextHealthyReplica(): MongoClient | null {
    if (this.replicaClients.length === 0) {
      return null;
    }

    const client = this.replicaClients[this.currentReplicaIndex];
    this.currentReplicaIndex = (this.currentReplicaIndex + 1) % this.replicaClients.length;

    // For now, return the client (health check will be done at query time)
    return client;
  }

  async executeQuery<T = any>(collection: string, operation: string, query: any = {}): Promise<T[]> {
    if (!this.primaryClient) {
      throw new Error('MongoDB not configured');
    }

    try {
      // Try to use replica for read operations if available
      const isReadOperation = ['find', 'findOne', 'count', 'aggregate'].includes(operation);
      const client = isReadOperation ? this.getNextHealthyReplica() || this.primaryClient : this.primaryClient;
      
      const db = client.db(this.primaryConfig.database);
      const coll = db.collection(collection);
      
      let result;
      switch (operation) {
        case 'find':
          result = await coll.find(query).toArray();
          break;
        case 'findOne':
          result = await coll.findOne(query);
          break;
        case 'count':
          result = await coll.countDocuments(query);
          break;
        case 'aggregate':
          result = await coll.aggregate(query).toArray();
          break;
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }
      
      this.logger.debug(`📊 MongoDB Query executed: ${operation} on ${collection}`);
      return Array.isArray(result) ? result : [result];
    } catch (error) {
      this.logger.error(`❌ MongoDB Query error: ${error.message}`);
      throw error;
    }
  }

  async isConfigured(): Promise<boolean> {
    return !!this.primaryClient;
  }

  async onModuleDestroy() {
    this.logger.log('🔌 Disconnecting MongoDB Cluster...');
    try {
      if (this.primaryClient) {
        await this.primaryClient.close();
      }
      await Promise.all(this.replicaClients.map(client => client.close()));
      this.logger.log('✅ MongoDB Cluster disconnected');
    } catch (error) {
      this.logger.error(`❌ Error disconnecting MongoDB: ${error.message}`);
    }
  }
}
