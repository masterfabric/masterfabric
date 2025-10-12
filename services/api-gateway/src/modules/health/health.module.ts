import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HealthService } from './health.service';
import { HealthResolver } from './health.resolver';

@Module({
  imports: [HttpModule],
  providers: [HealthService, HealthResolver],
  exports: [HealthService],
})
export class HealthModule {}

