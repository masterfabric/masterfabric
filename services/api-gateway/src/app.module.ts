// services/api-gateway/src/app.module.ts

import { Module, Controller, Get } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloGatewayDriver, ApolloGatewayDriverConfig } from '@nestjs/apollo';
import { IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import { ThrottlerGuard } from '@nestjs/throttler';
import { HttpModule } from '@nestjs/axios'; // ✅ BUNU EKLE

// Modules
import { HealthModule } from './modules/health/health.module';
import { RateLimitModule } from './modules/rate-limit/rate-limit.module';
import { CacheModule } from './modules/cache/cache.module';
import { AuthModule } from './modules/auth/auth.module';
import { ServiceRegistryModule } from './modules/service-registry/service-registry.module';
import { HealthMonitorModule } from './modules/health-monitor/health-monitor.module';

// Interceptors & Guards
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TenantExtractorInterceptor } from './core/routing/tenant-extractor.interceptor';
import { ServiceRegistrationInterceptor } from './modules/service-registry/service-registration.interceptor';

// Services
import { VaultConfigService } from './config/vault-config';
import { GracefulServiceLoader } from './modules/service-registry/graceful-service-loader';
import { AuthService } from './modules/auth/auth.service';

@Controller()
export class HealthController {
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'api-gateway',
      message: 'API Gateway is running',
      timestamp: new Date().toISOString(),
      license: 'GNU AGPL-3.0',
      copyright: '© 2025 MASTERFABRIC Bilişim Teknolojileri A.Ş.',
      author: '@gurkanfikretgunak',
      repository: 'https://github.com/masterfabric/masterfabric',
    };
  }
}

/**
 * Custom DataSource for authenticated subgraph communication
 */
class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  private serviceName: string;

  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    super();
  }

  override willSendRequest({ request, context }: any) {
    const url = this.url || '';
    
    let serviceKey = 'CORE';
    if (url.includes('3005') || url.includes('core')) {
      serviceKey = 'CORE';
    } else if (url.includes('3003') || url.includes('provisioning')) {
      serviceKey = 'PROVISIONING';
    } else if (url.includes('3004') || url.includes('tenant-runtime')) {
      serviceKey = 'TENANT_RUNTIME';
    }
    
    const apiKey = this.configService.get(`${serviceKey}_SERVICE_API_KEY`);
    
    if (apiKey) {
      request.http.headers.set('x-api-key', apiKey);
    }

    if (context.req?.headers?.authorization) {
      request.http.headers.set(
        'authorization',
        context.req.headers.authorization
      );
    }

    if (context.req?.headers?.['x-tenant-id']) {
      request.http.headers.set(
        'x-tenant-id',
        context.req.headers['x-tenant-id']
      );
    }
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local'],
    }),

    // ✅ HttpModule'ü ekle (GracefulServiceLoader için gerekli)
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 3,
    }),
    
    // GraphQL Federation Gateway with graceful failure handling
    GraphQLModule.forRootAsync<ApolloGatewayDriverConfig>({
      driver: ApolloGatewayDriver,
      imports: [ConfigModule, AuthModule, ServiceRegistryModule],
      inject: [ConfigService, AuthService, GracefulServiceLoader],
      useFactory: async (
        configService: ConfigService,
        authService: AuthService,
        serviceLoader: GracefulServiceLoader,
      ) => {
        // Servisler yüklenene kadar bekle
        await new Promise(resolve => setTimeout(resolve, 2000));

        const loadedServices = serviceLoader.getLoadedServices();
        const failedServices = serviceLoader.getFailedServices();

        console.log('📊 GraphQL Gateway Configuration:');
        console.log(`   ✅ Loaded: ${loadedServices.join(', ') || 'none'}`);
        if (failedServices.length > 0) {
          console.log(`   ⚠️  Failed: ${failedServices.join(', ')} (will retry in background)`);
        }

        const serviceConfig = {
          core: {
            name: 'core',
            url: configService.get('CORE_SERVICE_URL'),
          },
          provisioning: {
            name: 'provisioning',
            url: configService.get('PROVISIONING_SERVICE_URL'),
          },
          'tenant-runtime': {
            name: 'tenant-runtime',
            url: configService.get('TENANT_RUNTIME_URL'),
          },
        };

        const subgraphs = loadedServices
          .map(serviceName => serviceConfig[serviceName])
          .filter(Boolean);

        if (subgraphs.length === 0) {
          console.warn('⚠️  No services loaded, adding placeholder subgraph');
          subgraphs.push({
            name: 'placeholder',
            url: 'http://localhost:9999/graphql',
          });
        }

        return {
          gateway: {
            supergraphSdl: new IntrospectAndCompose({
              subgraphs,
              introspectionHeaders: {
                'x-api-key': configService.get('CORE_SERVICE_API_KEY') || 'placeholder',
              },
            }),
            buildService({ url }) {
              const dataSource = new AuthenticatedDataSource(authService, configService);
              dataSource.url = url;
              return dataSource;
            },
            serviceHealthCheck: true,
            experimental_approximateQueryPlanStoreMiB: 100,
          },
          server: {
            context: ({ req }) => ({ req }),
            formatError: (error) => {
              console.error('GraphQL Error:', error);
              return error;
            },
          },
          playground: true,
          introspection: true,
        };
      },
    }),

    // Core Modules
    CacheModule,
    AuthModule,
    RateLimitModule,
    HealthModule,
    ServiceRegistryModule,
    HealthMonitorModule,
  ],

  controllers: [HealthController],

  providers: [
    VaultConfigService,
    GracefulServiceLoader,
    
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
    {
      provide: APP_INTERCEPTOR,
      useClass: ServiceRegistrationInterceptor,
    },
  ],

  exports: [VaultConfigService, GracefulServiceLoader],
})
export class AppModule {}