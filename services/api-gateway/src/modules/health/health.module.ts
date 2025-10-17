import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HealthService } from './health.service';
import { HealthResolver } from './health.resolver';
import { StandbyResolver } from './standby.resolver';

@Module({
  imports: [HttpModule],
  providers: [HealthService, HealthResolver, StandbyResolver],
  exports: [HealthService, StandbyResolver],
})
export class HealthModule {}

