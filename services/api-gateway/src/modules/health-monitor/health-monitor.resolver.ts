// services/api-gateway/src/modules/health-monitor/health-monitor.resolver.ts

import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { HealthMonitorService } from './health-monitor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Resolver()
export class HealthMonitorResolver {
  constructor(private healthMonitor: HealthMonitorService) {}

  /**
   * Tüm servislerin circuit breaker durumunu getir
   */
  @Query(() => [Object])
  @UseGuards(JwtAuthGuard)
  async circuitStates() {
    return this.healthMonitor.getAllCircuitStates();
  }

  /**
   * Belirli bir servisin circuit breaker durumu
   */
  @Query(() => Object, { nullable: true })
  @UseGuards(JwtAuthGuard)
  async circuitState(@Args('serviceName') serviceName: string) {
    return this.healthMonitor.getCircuitState(serviceName);
  }

  /**
   * Monitoring istatistikleri
   */
  @Query(() => Object)
  @UseGuards(JwtAuthGuard)
  async monitoringStats() {
    return this.healthMonitor.getMonitoringStats();
  }

  /**
   * Manuel health check tetikle
   */
  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async forceHealthCheck(
    @Args('serviceName', { nullable: true }) serviceName?: string
  ) {
    await this.healthMonitor.forceHealthCheck(serviceName);
    return true;
  }

  /**
   * Servisi maintenance moduna al/çıkar
   */
  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async setServiceMaintenance(
    @Args('serviceName') serviceName: string,
    @Args('enabled') enabled: boolean,
  ) {
    await this.healthMonitor.setServiceMaintenance(serviceName, enabled);
    return true;
  }

  /**
   * Servisi maintenance modunda mı kontrol et
   */
  @Query(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async isServiceInMaintenance(@Args('serviceName') serviceName: string) {
    return this.healthMonitor.isServiceInMaintenance(serviceName);
  }
}