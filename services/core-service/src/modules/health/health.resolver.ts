import { Resolver, Query } from '@nestjs/graphql';
import { HealthService } from './health.service';
import { SystemHealth } from './entities/system-health.entity';

@Resolver(() => SystemHealth)
export class HealthResolver {
  constructor(private readonly healthService: HealthService) {}

  @Query(() => SystemHealth, { name: 'systemHealth' })
  async getSystemHealth(): Promise<SystemHealth> {
    return this.healthService.getSystemHealth();
  }
}
