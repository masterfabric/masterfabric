// services/api-gateway/src/modules/health-monitor/health-monitor.module.ts

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthMonitorService } from './health-monitor.service';
import { HealthMonitorResolver } from './health-monitor.resolver';
import { ServiceRegistryModule } from '../service-registry/service-registry.module';
import { CacheModule } from '../cache/cache.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ScheduleModule.forRoot(), // Cron job'lar ve interval'ler için
    ServiceRegistryModule,
    CacheModule,
    AuthModule,
  ],
  providers: [HealthMonitorService, HealthMonitorResolver],
  exports: [HealthMonitorService],
})
export class HealthMonitorModule {}