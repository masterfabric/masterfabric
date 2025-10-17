// services/api-gateway/src/modules/service-registry/service-registry.resolver.ts

import { Resolver, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ServiceRegistryService } from './service-registry.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Resolver()
export class ServiceRegistryResolver {
  constructor(private serviceRegistry: ServiceRegistryService) {}

  @Query(() => Object)
  @UseGuards(JwtAuthGuard)
  async dashboard() {
    return this.serviceRegistry.getSystemDashboard();
  }

  @Query(() => [Object])
  @UseGuards(JwtAuthGuard)
  async servicesHealth() {
    return this.serviceRegistry.checkAllServices();
  }

  @Query(() => Object)
  @UseGuards(JwtAuthGuard)
  async serviceHealth(@Args('serviceName') serviceName: string) {
    return this.serviceRegistry.checkServiceHealth(serviceName);
  }

  @Query(() => [String])
  @UseGuards(JwtAuthGuard)
  async registeredServices() {
    return this.serviceRegistry.getRegisteredServices();
  }
}