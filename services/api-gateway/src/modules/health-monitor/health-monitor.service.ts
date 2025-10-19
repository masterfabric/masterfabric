// services/api-gateway/src/modules/health-monitor/health-monitor.service.ts

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, Interval } from '@nestjs/schedule';
import { ServiceRegistryService } from '../service-registry/service-registry.service';
import { RedisClusterService } from '../cache/redis-cluster.service';
import { PostgreSQLClusterService } from '../databases/postgresql-cluster.service';
import { MongoDBClusterService } from '../databases/mongodb-cluster.service';
import { ConfigService } from '@nestjs/config';

export enum ServiceStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  DOWN = 'down',
  MAINTENANCE = 'maintenance',
}

export interface ServiceCircuitState {
  serviceName: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  nextRetryTime?: Date;
}

@Injectable()
export class HealthMonitorService implements OnModuleInit {
  private readonly logger = new Logger(HealthMonitorService.name);
  
  private readonly FAILURE_THRESHOLD = 5;
  private readonly TIMEOUT_DURATION = 30000;
  private readonly HALF_OPEN_TIMEOUT = 60000;
  
  private circuitStates: Map<string, ServiceCircuitState> = new Map();
  private healthHistory: Map<string, ServiceStatus[]> = new Map();
  
  private monitoringStats = {
    totalChecks: 0,
    failedChecks: 0,
    lastCheckTime: null as Date | null,
    uptimePercentage: 100,
  };

  constructor(
    private serviceRegistry: ServiceRegistryService,
    private redisCluster: RedisClusterService,
    private postgresCluster: PostgreSQLClusterService,
    private mongoCluster: MongoDBClusterService,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    this.logger.log('🚀 Health Monitor Service initialized');
    
    const services = ['core', 'provisioning', 'tenant-runtime'];
    for (const service of services) {
      this.circuitStates.set(service, {
        serviceName: service,
        state: 'CLOSED',
        failureCount: 0,
      });
      this.healthHistory.set(service, []);
    }

    await this.performHealthChecks();
    this.logger.log('✅ Initial health checks completed');
  }

  @Interval(10000)
  async performHealthChecks() {
    const startTime = Date.now();
    this.logger.debug('🔍 Starting scheduled health checks...');

    try {
      const services = ['core', 'provisioning', 'tenant-runtime'];
      const results = await Promise.allSettled(
        services.map(service => this.checkServiceWithCircuitBreaker(service))
      );

      let successCount = 0;
      let failureCount = 0;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          successCount++;
        } else {
          failureCount++;
          this.logger.warn(`❌ Health check failed for ${services[index]}`);
        }
      });

      this.monitoringStats.totalChecks += services.length;
      this.monitoringStats.failedChecks += failureCount;
      this.monitoringStats.lastCheckTime = new Date();
      this.monitoringStats.uptimePercentage = 
        ((this.monitoringStats.totalChecks - this.monitoringStats.failedChecks) / 
         this.monitoringStats.totalChecks) * 100;

      const duration = Date.now() - startTime;
      this.logger.log(
        `✅ Health checks completed: ${successCount}/${services.length} healthy (${duration}ms)`
      );

      await this.saveSystemHealth();

    } catch (error) {
      this.logger.error(`❌ Health check cycle failed: ${error.message}`);
    }
  }

  @Interval(60000)
  async checkRedisClusterHealth() {
    this.logger.debug('🔍 Checking Redis Cluster health...');

    try {
      const clusterStatus = await this.redisCluster.getClusterStatus();
      
      if (!clusterStatus.master.connected) {
        this.logger.error('❌ CRITICAL: Redis Master is DOWN!');
        await this.sendAlert('redis-master-down', 'Redis Master bağlantısı kesildi!');
      }

      const downSubMicroServices = clusterStatus.subMicroServices.filter(
        sms => !sms.connected
      );

      if (downSubMicroServices.length > 0) {
        this.logger.warn(
          `⚠️ ${downSubMicroServices.length} Redis SubMicroService(s) are DOWN`
        );
      }

      await this.redisCluster.set('redis-cluster-health', clusterStatus, 120);
      
      this.logger.log(
        `✅ Redis Cluster: Master=${clusterStatus.master.connected ? 'UP' : 'DOWN'}, ` +
        `SubMicroServices=${clusterStatus.healthySubMicroServices}/${clusterStatus.totalSubMicroServices}`
      );

    } catch (error) {
      this.logger.error(`❌ Redis cluster health check failed: ${error.message}`);
    }
  }

  @Interval(60000)
  async checkDatabasesHealth() {
    this.logger.debug('🔍 Checking Database health...');

    try {
      // Check PostgreSQL health
      await this.checkPostgreSQLHealth();

      // Check MongoDB health (optional)
      await this.checkMongoDBHealth();

    } catch (error) {
      this.logger.error(`❌ Database health check failed: ${error.message}`);
    }
  }

  private async checkPostgreSQLHealth() {
    try {
      const clusterStatus = await this.postgresCluster.getClusterStatus();
      
      if (!clusterStatus.primary.connected) {
        this.logger.error('❌ CRITICAL: PostgreSQL Primary is DOWN!');
        await this.sendAlert('postgres-primary-down', 'PostgreSQL Primary bağlantısı kesildi!');
      }

      const downReplicas = clusterStatus.replicas.filter(
        replica => !replica.connected
      );

      if (downReplicas.length > 0) {
        this.logger.warn(
          `⚠️ ${downReplicas.length} PostgreSQL Replica(s) are DOWN`
        );
      }

      await this.redisCluster.set('postgres-cluster-health', clusterStatus, 120);
      
      this.logger.log(
        `✅ PostgreSQL Cluster: Primary=${clusterStatus.primary.connected ? 'UP' : 'DOWN'}, ` +
        `Replicas=${clusterStatus.healthyReplicas}/${clusterStatus.totalReplicas}`
      );

    } catch (error) {
      this.logger.error(`❌ PostgreSQL cluster health check failed: ${error.message}`);
    }
  }

  private async checkMongoDBHealth() {
    try {
      // Check if MongoDB is configured
      const isConfigured = await this.mongoCluster.isConfigured();
      if (!isConfigured) {
        this.logger.debug('📝 MongoDB not configured - skipping health check');
        return;
      }

      const clusterStatus = await this.mongoCluster.getClusterStatus();
      
      if (!clusterStatus.primary.connected) {
        this.logger.warn('⚠️ MongoDB Primary is DOWN! (Optional service)');
        await this.sendAlert('mongo-primary-down', 'MongoDB Primary bağlantısı kesildi! (Opsiyonel servis)');
      }

      const downReplicas = clusterStatus.replicas.filter(
        replica => !replica.connected
      );

      if (downReplicas.length > 0) {
        this.logger.warn(
          `⚠️ ${downReplicas.length} MongoDB Replica(s) are DOWN (Optional service)`
        );
      }

      await this.redisCluster.set('mongo-cluster-health', clusterStatus, 120);
      
      this.logger.log(
        `✅ MongoDB Cluster: Primary=${clusterStatus.primary.connected ? 'UP' : 'DOWN'}, ` +
        `Replicas=${clusterStatus.healthyReplicas}/${clusterStatus.totalReplicas} (Optional)`
      );

    } catch (error) {
      this.logger.warn(`⚠️ MongoDB cluster health check failed: ${error.message} (Optional service)`);
    }
  }

  @Cron('0 3 * * *')
  async generateDailyHealthReport() {
    this.logger.log('📊 Generating daily health report...');

    try {
      const report = {
        date: new Date().toISOString().split('T')[0],
        totalChecks: this.monitoringStats.totalChecks,
        failedChecks: this.monitoringStats.failedChecks,
        uptimePercentage: this.monitoringStats.uptimePercentage.toFixed(2),
        services: {} as Record<string, any>,
      };

      for (const [serviceName, history] of this.healthHistory.entries()) {
        const healthyCount = history.filter(s => s === ServiceStatus.HEALTHY).length;
        const downCount = history.filter(s => s === ServiceStatus.DOWN).length;
        
        report.services[serviceName] = {
          totalChecks: history.length,
          healthyCount,
          downCount,
          uptimePercentage: ((healthyCount / history.length) * 100).toFixed(2),
        };
      }

      await this.redisCluster.set(
        `health-report:${report.date}`,
        report,
        86400 * 30
      );

      this.logger.log(`✅ Daily health report generated and saved`);

      this.monitoringStats.totalChecks = 0;
      this.monitoringStats.failedChecks = 0;
      this.healthHistory.clear();

    } catch (error) {
      this.logger.error(`❌ Failed to generate daily report: ${error.message}`);
    }
  }

  private async checkServiceWithCircuitBreaker(serviceName: string): Promise<boolean> {
    const circuit = this.circuitStates.get(serviceName);

    if (!circuit) {
      this.logger.warn(`⚠️ Circuit breaker not found for ${serviceName}`);
      return false;
    }

    if (circuit.state === 'OPEN') {
      if (circuit.nextRetryTime && new Date() >= circuit.nextRetryTime) {
        this.logger.log(`🔄 Circuit HALF_OPEN for ${serviceName}, attempting retry...`);
        circuit.state = 'HALF_OPEN';
      } else {
        this.logger.debug(`⏸️ Circuit OPEN for ${serviceName}, skipping health check`);
        return false;
      }
    }

    try {
      const health = await this.serviceRegistry.checkServiceHealth(serviceName);
      
      if (health.status === 'healthy') {
        this.onServiceSuccess(serviceName);
        this.recordHealthStatus(serviceName, ServiceStatus.HEALTHY);
        return true;
      } else {
        this.onServiceFailure(serviceName);
        this.recordHealthStatus(serviceName, ServiceStatus.DEGRADED);
        return false;
      }

    } catch (error) {
      this.onServiceFailure(serviceName);
      this.recordHealthStatus(serviceName, ServiceStatus.DOWN);
      this.logger.error(`❌ ${serviceName} health check error: ${error.message}`);
      return false;
    }
  }

  private onServiceSuccess(serviceName: string) {
    const circuit = this.circuitStates.get(serviceName);
    if (!circuit) return;

    circuit.failureCount = 0;
    circuit.lastSuccessTime = new Date();
    
    if (circuit.state === 'HALF_OPEN') {
      circuit.state = 'CLOSED';
      this.logger.log(`✅ Circuit CLOSED for ${serviceName} (service recovered)`);
    }
  }

  private onServiceFailure(serviceName: string) {
    const circuit = this.circuitStates.get(serviceName);
    if (!circuit) return;

    circuit.failureCount++;
    circuit.lastFailureTime = new Date();

    if (circuit.failureCount >= this.FAILURE_THRESHOLD && circuit.state === 'CLOSED') {
      circuit.state = 'OPEN';
      circuit.nextRetryTime = new Date(Date.now() + this.HALF_OPEN_TIMEOUT);
      
      this.logger.error(
        `🚨 Circuit OPEN for ${serviceName} after ${circuit.failureCount} failures. ` +
        `Next retry at: ${circuit.nextRetryTime.toISOString()}`
      );

      this.sendAlert(
        'circuit-breaker-open',
        `Circuit breaker açıldı: ${serviceName} servisi ${this.FAILURE_THRESHOLD} kez başarısız oldu`
      );
    }
  }

  private recordHealthStatus(serviceName: string, status: ServiceStatus) {
    const history = this.healthHistory.get(serviceName) || [];
    history.push(status);
    
    if (history.length > 100) {
      history.shift();
    }
    
    this.healthHistory.set(serviceName, history);
  }

  private async saveSystemHealth() {
    const systemHealth = {
      timestamp: new Date(),
      overall: this.calculateOverallHealth(),
      services: Array.from(this.circuitStates.entries()).map(([name, circuit]) => ({
        name,
        state: circuit.state,
        failureCount: circuit.failureCount,
        lastCheck: circuit.lastSuccessTime || circuit.lastFailureTime,
      })),
      stats: this.monitoringStats,
    };

    await this.redisCluster.set('system-health', systemHealth, 60);
  }

  private calculateOverallHealth(): ServiceStatus {
    const circuits = Array.from(this.circuitStates.values());
    
    const openCircuits = circuits.filter(c => c.state === 'OPEN').length;
    const totalCircuits = circuits.length;

    if (openCircuits === 0) {
      return ServiceStatus.HEALTHY;
    } else if (openCircuits < totalCircuits / 2) {
      return ServiceStatus.DEGRADED;
    } else {
      return ServiceStatus.DOWN;
    }
  }

  private async sendAlert(type: string, message: string) {
    this.logger.error(`🚨 ALERT [${type}]: ${message}`);

    const alert = {
      type,
      message,
      timestamp: new Date(),
      acknowledged: false,
    };

    await this.redisCluster.hset('alerts', Date.now().toString(), alert);
  }

  // Public API
  getCircuitState(serviceName: string): ServiceCircuitState | undefined {
    return this.circuitStates.get(serviceName);
  }

  getAllCircuitStates(): ServiceCircuitState[] {
    return Array.from(this.circuitStates.values());
  }

  async getMonitoringStats() {
    return {
      ...this.monitoringStats,
      overallHealth: this.calculateOverallHealth(),
      circuits: this.getAllCircuitStates(),
    };
  }

  async forceHealthCheck(serviceName?: string) {
    if (serviceName) {
      this.logger.log(`🔄 Force health check requested for: ${serviceName}`);
      return this.checkServiceWithCircuitBreaker(serviceName);
    } else {
      this.logger.log(`🔄 Force health check requested for all services`);
      return this.performHealthChecks();
    }
  }

  async setServiceMaintenance(serviceName: string, isMaintenanceMode: boolean) {
    const circuit = this.circuitStates.get(serviceName);
    if (!circuit) {
      throw new Error(`Service not found: ${serviceName}`);
    }

    if (isMaintenanceMode) {
      this.logger.warn(`🔧 ${serviceName} set to MAINTENANCE mode`);
      await this.redisCluster.set(`maintenance:${serviceName}`, true, 3600);
    } else {
      this.logger.log(`✅ ${serviceName} removed from MAINTENANCE mode`);
      await this.redisCluster.del(`maintenance:${serviceName}`);
    }
  }

  async isServiceInMaintenance(serviceName: string): Promise<boolean> {
    return await this.redisCluster.exists(`maintenance:${serviceName}`);
  }
}