// services/api-gateway/src/modules/databases/database-types.ts

export interface DbNodeStatus {
  name: string;
  host: string;
  status: string;
  role: 'primary' | 'replica' | 'secondary';
  connected: boolean;
  responseTime?: number;
  replicationLag?: number;
  lastCheck: Date;
}

export interface DbClusterStatus {
  type: 'postgresql' | 'mongodb' | 'redis';
  primary: DbNodeStatus;
  replicas: DbNodeStatus[];
  totalReplicas: number;
  healthyReplicas: number;
  avgReplicationLag: number;
}

export interface PostgresClusterStatus extends DbClusterStatus {
  type: 'postgresql';
  version?: string;
  maxConnections?: number;
  activeConnections?: number;
}

export interface MongoClusterStatus extends DbClusterStatus {
  type: 'mongodb';
  replicaSetName?: string;
  version?: string;
  isMaster?: boolean;
}

export interface DatabaseHealthConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  database?: string;
  connectionTimeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface DatabaseConnectionInfo {
  isConnected: boolean;
  responseTime: number;
  lastError?: string;
  connectionString?: string;
}
