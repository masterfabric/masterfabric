// services/api-gateway/src/modules/health/standby.resolver.ts (YENİ DOSYA)

import { Resolver, Query } from '@nestjs/graphql';

@Resolver()
export class StandbyResolver {
  @Query(() => String, { 
    description: 'API Gateway health status when no services are available' 
  })
  gatewayStatus(): string {
    return 'API Gateway is running in standby mode. Waiting for microservices to connect...';
  }

  @Query(() => [String], { 
    description: 'List of services that should be available' 
  })
  expectedServices(): string[] {
    return ['core', 'provisioning', 'tenant-runtime'];
  }

  @Query(() => String)
  gatewayVersion(): string {
    return '1.0.0';
  }
}