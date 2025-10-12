import { Module, Controller, Get } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloGatewayDriver, ApolloGatewayDriverConfig } from '@nestjs/apollo';
import { IntrospectAndCompose } from '@apollo/gateway';
import { ThrottlerGuard } from '@nestjs/throttler';
import { HealthModule } from './modules/health/health.module';
import { RateLimitModule } from './modules/rate-limit/rate-limit.module';
import { CacheModule } from './modules/cache/cache.module';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TenantExtractorInterceptor } from './core/routing/tenant-extractor.interceptor';
import { VaultConfigService } from './config/vault-config';

@Controller()
export class HealthController {
  @Get('health')
  getHealth() {
    return { 
      status: 'ok', 
      service: 'api-gateway', 
      message: 'API Gateway is running',
      license: 'GNU AGPL-3.0',
      copyright: '© 2024 MASTERFABRIC Bilişim Teknolojileri A.Ş.',
      author: '@gurkanfikretgunak',
      repository: 'https://github.com/masterfabric/masterfabric'
    };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local'],
    }),
    GraphQLModule.forRoot<ApolloGatewayDriverConfig>({
      driver: ApolloGatewayDriver,
      gateway: {
        supergraphSdl: new IntrospectAndCompose({
          subgraphs: [
            { 
              name: 'core', 
              url: process.env.CORE_SERVICE_URL || 'http://localhost:3005/graphql' 
            },
            { 
              name: 'provisioning', 
              url: process.env.PROVISIONING_SERVICE_URL || 'http://localhost:3003/graphql' 
            },
            { 
              name: 'tenant-runtime', 
              url: process.env.TENANT_RUNTIME_URL || 'http://localhost:3004/graphql' 
            },
          ],
        }),
      },
    }),
    RateLimitModule,
    CacheModule,
    HealthModule,
  ],
  controllers: [HealthController],
  providers: [
    VaultConfigService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantExtractorInterceptor,
    },
  ],
  exports: [VaultConfigService],
})
export class AppModule {}
