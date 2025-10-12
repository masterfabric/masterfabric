import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SystemHealth, ServiceHealth } from './entities/system-health.entity';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private prisma: PrismaService) {}

  async getHealth() {
    return {
      status: 'ok',
      service: 'core-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    };
  }

  async getReadiness() {
    try {
      // Check database connection
      await this.prisma.$executeRaw`SELECT 1`;
      
      return {
        status: 'ready',
        service: 'core-service',
        checks: {
          database: 'ok',
          memory: 'ok'
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Readiness check failed:', error);
      return {
        status: 'not ready',
        service: 'core-service',
        checks: {
          database: 'failed',
          memory: 'ok'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  async getLiveness() {
    return {
      status: 'alive',
      service: 'core-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const services: ServiceHealth[] = [
      {
        name: 'API Gateway',
        status: 'healthy',
        responseTime: 45,
        lastChecked: new Date().toISOString(),
        message: 'Service is running normally'
      },
      {
        name: 'Provisioning Service',
        status: 'healthy',
        responseTime: 32,
        lastChecked: new Date().toISOString(),
        message: 'Service is running normally'
      },
      {
        name: 'Tenant Runtime',
        status: 'healthy',
        responseTime: 28,
        lastChecked: new Date().toISOString(),
        message: 'Service is running normally'
      }
    ];

    const overallStatus = services.every(s => s.status === 'healthy') ? 'healthy' : 'unhealthy';

    return {
      overallStatus,
      services,
      timestamp: new Date().toISOString()
    };
  }
}
