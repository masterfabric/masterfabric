import { Resolver, Query } from '@nestjs/graphql';
import { HealthService } from './health.service';
import { SystemHealth } from './entities/system-health.entity';
import { Public } from '../../common/decorators/public.decorator';

@Resolver(() => SystemHealth)
export class HealthResolver {
  constructor(private readonly healthService: HealthService) {}

  @Public() // Allow public access without API key
  @Query(() => SystemHealth, { name: 'systemHealth' })
  async getSystemHealth(): Promise<SystemHealth> {
    return this.healthService.getSystemHealth();
  }
}
