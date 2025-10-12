import { Resolver, Query, Args } from '@nestjs/graphql';
import { HealthService } from './health.service';
import { HealthStatus, SystemHealth } from './entities/health-status.entity';

@Resolver()
export class HealthResolver {
  constructor(private readonly healthService: HealthService) {}

  @Query(() => SystemHealth, { name: 'systemHealth' })
  async getSystemHealth(): Promise<SystemHealth> {
    return this.healthService.getSystemHealth();
  }

  @Query(() => HealthStatus, { name: 'serviceHealth' })
  async getServiceHealth(@Args('serviceName') serviceName: string): Promise<HealthStatus> {
    return this.healthService.checkSingleService(serviceName);
  }
}

