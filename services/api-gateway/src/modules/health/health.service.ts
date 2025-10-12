import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { HealthStatus, SystemHealth } from './entities/health-status.entity';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly httpService: HttpService) {}

  private readonly services = [
    {
      name: 'api-gateway',
      url: process.env.API_GATEWAY_URL || 'http://localhost:3002',
      endpoint: '/api/health',
    },
    {
      name: 'provisioning-service',
      url: process.env.PROVISIONING_SERVICE_URL || 'http://localhost:3003',
      endpoint: '/health',
    },
    {
      name: 'tenant-runtime',
      url: process.env.TENANT_RUNTIME_URL || 'http://localhost:3004',
      endpoint: '/health',
    },
  ];

  async checkServiceHealth(serviceName: string, url: string, endpoint: string): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      const response = await firstValueFrom(
        this.httpService.get<{ status: string; message?: string }>(`${url}${endpoint}`).pipe(
          timeout(5000),
          catchError((error) => {
            throw error;
          })
        )
      );
      
      const responseTime = Date.now() - startTime;
      
      return {
        service: serviceName,
        status: response.data.status === 'ok' ? 'healthy' : 'unhealthy',
        message: response.data.message || 'Service is running',
        timestamp: new Date().toISOString(),
        responseTime,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      this.logger.error(`Health check failed for ${serviceName}: ${error.message}`);
      
      return {
        service: serviceName,
        status: 'unhealthy',
        message: error.message || 'Service is not reachable',
        timestamp: new Date().toISOString(),
        responseTime,
      };
    }
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const healthChecks = await Promise.all(
      this.services.map(service =>
        this.checkServiceHealth(service.name, service.url, service.endpoint)
      )
    );

    const allHealthy = healthChecks.every(check => check.status === 'healthy');
    const overall = allHealthy ? 'healthy' : 'unhealthy';

    return {
      overall,
      services: healthChecks,
      timestamp: new Date().toISOString(),
    };
  }

  async checkSingleService(serviceName: string): Promise<HealthStatus> {
    const service = this.services.find(s => s.name === serviceName);
    
    if (!service) {
      return {
        service: serviceName,
        status: 'unhealthy',
        message: 'Service not found',
        timestamp: new Date().toISOString(),
      };
    }

    return this.checkServiceHealth(service.name, service.url, service.endpoint);
  }
}

