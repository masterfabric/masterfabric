// services/api-gateway/src/modules/service-registry/service-registry.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisClusterService } from '../cache/redis-cluster.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface ServiceHealthStatus {
  name: string;
  url: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  lastCheck: Date;
  authorized: boolean;
  version?: string;
  uptime?: number;
}

export interface SystemDashboard {
  timestamp: Date;
  totalRequests: number;
  activeServices: number;
  failedServices: number;
  avgResponseTime: number;
  services: ServiceHealthStatus[];
  redis: {
    master: { status: string; connected: boolean };
    subMicroServices: Array<{ name: string; status: string; connected: boolean; lag: number }>;
  };
  database: {
    status: string;
    connections: number;
    responseTime: number;
  };
}

@Injectable()
export class ServiceRegistryService {
  private readonly logger = new Logger(ServiceRegistryService.name);
  
  private registeredServices: Map<string, { url: string; apiKey: string }> = new Map();
  private serviceHealthCache: Map<string, ServiceHealthStatus> = new Map();

  constructor(
    private configService: ConfigService,
    private redisCluster: RedisClusterService,
    private httpService: HttpService,
  ) {
    this.initializeServices();
  }

  private initializeServices() {
    // GraphQL SubGraph Services
    this.registeredServices.set('core', {
      url: this.configService.get('CORE_SERVICE_URL'),
      apiKey: this.configService.get('CORE_SERVICE_API_KEY'),
    });

    this.registeredServices.set('provisioning', {
      url: this.configService.get('PROVISIONING_SERVICE_URL'),
      apiKey: this.configService.get('PROVISIONING_SERVICE_API_KEY'),
    });

    this.registeredServices.set('tenant-runtime', {
      url: this.configService.get('TENANT_RUNTIME_URL'),
      apiKey: this.configService.get('TENANT_RUNTIME_API_KEY'),
    });

    this.logger.log(`📋 Registered ${this.registeredServices.size} services`);
  }

  // ========================================
  // HEALTH CHECK
  // ========================================

  async checkServiceHealth(serviceName: string): Promise<ServiceHealthStatus> {
    const service = this.registeredServices.get(serviceName);
    
    if (!service) {
      return {
        name: serviceName,
        url: 'unknown',
        status: 'down',
        responseTime: 0,
        lastCheck: new Date(),
        authorized: false,
      };
    }

    const startTime = Date.now();

    try {
      // Health endpoint kontrolü (her servisin /health endpoint'i olmalı)
      const healthUrl = service.url.replace('/graphql', '/health');
      
      const response = await firstValueFrom(
        this.httpService.get(healthUrl, {
          headers: {
            'x-api-key': service.apiKey,
          },
          timeout: 5000,
        })
      );

      const responseTime = Date.now() - startTime;

      const healthStatus: ServiceHealthStatus = {
        name: serviceName,
        url: service.url,
        status: response.status === 200 ? 'healthy' : 'degraded',
        responseTime,
        lastCheck: new Date(),
        authorized: true,
        version: response.data?.version,
        uptime: response.data?.uptime,
      };

      // Cache'e kaydet
      this.serviceHealthCache.set(serviceName, healthStatus);
      await this.redisCluster.set(`service-health:${serviceName}`, healthStatus, 60);

      this.logger.debug(`✅ Service ${serviceName} is ${healthStatus.status} (${responseTime}ms)`);
      
      return healthStatus;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      const healthStatus: ServiceHealthStatus = {
        name: serviceName,
        url: service.url,
        status: 'down',
        responseTime,
        lastCheck: new Date(),
        authorized: false,
      };

      this.serviceHealthCache.set(serviceName, healthStatus);
      this.logger.error(`❌ Service ${serviceName} health check failed: ${error.message}`);
      
      return healthStatus;
    }
  }

  async checkAllServices(): Promise<ServiceHealthStatus[]> {
    const serviceNames = Array.from(this.registeredServices.keys());
    
    return Promise.all(
      serviceNames.map(name => this.checkServiceHealth(name))
    );
  }

  // ========================================
  // DASHBOARD
  // ========================================

  async getSystemDashboard(): Promise<SystemDashboard> {
    // Service health checks
    const services = await this.checkAllServices();
    
    // Redis cluster status
    const redisStatus = await this.redisCluster.getClusterStatus();
    
    // Statistics
    const activeServices = services.filter(s => s.status === 'healthy').length;
    const failedServices = services.filter(s => s.status === 'down').length;
    const avgResponseTime = services.reduce((sum, s) => sum + s.responseTime, 0) / services.length;
    
    // Total requests from Redis
    const totalRequests = await this.getTotalRequests();

    return {
      timestamp: new Date(),
      totalRequests,
      activeServices,
      failedServices,
      avgResponseTime: Math.round(avgResponseTime),
      services,
      redis: {
        master: {
          status: redisStatus.master.status,
          connected: redisStatus.master.connected,
        },
        subMicroServices: redisStatus.subMicroServices.map(sms => ({
          name: sms.name,
          status: sms.status,
          connected: sms.connected,
          lag: sms.replicationLag || 0,
        })),
      },
      database: await this.getDatabaseStatus(),
    };
  }

  // ========================================
  // REQUEST TRACKING
  // ========================================

  async logRequest(serviceName: string, operation: string, userId?: string): Promise<void> {
    const key = `requests:${serviceName}:${new Date().toISOString().split('T')[0]}`;
    
    try {
      // Increment daily counter
      const current = await this.redisCluster.get<number>(key) || 0;
      await this.redisCluster.set(key, current + 1, 86400); // 24 saat TTL

      // Log to Redis hash
      await this.redisCluster.hset(
        `request-log:${serviceName}`,
        Date.now().toString(),
        {
          operation,
          userId: userId || 'anonymous',
          timestamp: new Date().toISOString(),
        }
      );

      this.logger.debug(`📊 Request logged: ${serviceName} - ${operation}`);
    } catch (error) {
      this.logger.error(`Failed to log request: ${error.message}`);
    }
  }

  private async getTotalRequests(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    let total = 0;

    const services = ['core', 'provisioning', 'tenant-runtime'];
    for (const serviceName of services) {
      const key = `requests:${serviceName}:${today}`;
      const count = await this.redisCluster.get<number>(key) || 0;
      total += count;
    }

    return total;
  }

  private async getDatabaseStatus() {
    // Bu kısım Prisma ile entegre edilecek
    return {
      status: 'healthy',
      connections: 10,
      responseTime: 5,
    };
  }

  // ========================================
  // SERVICE REGISTRATION
  // ========================================

  registerService(name: string, url: string, apiKey: string): void {
    this.registeredServices.set(name, { url, apiKey });
    this.logger.log(`✅ Service registered: ${name} - ${url}`);
  }

  unregisterService(name: string): void {
    this.registeredServices.delete(name);
    this.serviceHealthCache.delete(name);
    this.logger.log(`🗑️ Service unregistered: ${name}`);
  }

  getRegisteredServices(): string[] {
    return Array.from(this.registeredServices.keys());
  }
}