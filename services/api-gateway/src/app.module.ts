// services/api-gateway/src/app.module.ts

import { Module, Controller, Get } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloGatewayDriver, ApolloGatewayDriverConfig } from '@nestjs/apollo';
import { IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import { ThrottlerGuard } from '@nestjs/throttler';
import { HttpModule } from '@nestjs/axios';

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

/**
 * Health Check Controller
 * Provides basic health endpoint for monitoring
 */
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
 * Authenticated DataSource for GraphQL Federation
 * Handles service-to-service authentication and context forwarding
 */
class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    super();
  }

  /**
   * Intercept requests to subgraphs and add authentication headers
   */
  override willSendRequest({ request, context }: any) {
    const url = this.url || '';
    
    // Determine service key from URL
    let serviceKey = 'CORE';
    if (url.includes('3005') || url.includes('core')) {
      serviceKey = 'CORE';
    } else if (url.includes('3003') || url.includes('provisioning')) {
      serviceKey = 'PROVISIONING';
    } else if (url.includes('3004') || url.includes('tenant-runtime')) {
      serviceKey = 'TENANT_RUNTIME';
    }
    
    // Add service API key
    const apiKey = this.configService.get(`${serviceKey}_SERVICE_API_KEY`);
    if (apiKey) {
      request.http.headers.set('x-api-key', apiKey);
    }

    // Forward user JWT token
    if (context.req?.headers?.authorization) {
      request.http.headers.set('authorization', context.req.headers.authorization);
    }

    // Forward tenant ID
    if (context.req?.headers?.['x-tenant-id']) {
      request.http.headers.set('x-tenant-id', context.req.headers['x-tenant-id']);
    }
  }
}

/**
 * Main Application Module
 * Orchestrates all microservices through GraphQL Federation
 */
@Module({
  imports: [
    // ========================================
    // GLOBAL CONFIGURATION
    // ========================================
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local'],
      cache: true,
    }),

    // ========================================
    // HTTP CLIENT
    // ========================================
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 3,
    }),
    
    // ========================================
    // GRAPHQL FEDERATION GATEWAY
    // ========================================
    GraphQLModule.forRootAsync<ApolloGatewayDriverConfig>({
      driver: ApolloGatewayDriver,
      imports: [ConfigModule, AuthModule, ServiceRegistryModule],
      inject: [ConfigService, AuthService, GracefulServiceLoader],
      useFactory: async (
        configService: ConfigService,
        authService: AuthService,
        serviceLoader: GracefulServiceLoader,
      ) => {
        // Wait for services to load (2 seconds grace period)
        await new Promise(resolve => setTimeout(resolve, 2000));

        const loadedServices = serviceLoader.getLoadedServices();
        const failedServices = serviceLoader.getFailedServices();

        console.log('\n📊 GraphQL Gateway Configuration:');
        console.log(`   ✅ Loaded Services: ${loadedServices.join(', ') || 'none'}`);
        if (failedServices.length > 0) {
          console.log(`   ⚠️  Failed Services: ${failedServices.join(', ')} (retrying in background)`);
        }

        // Service configuration mapping
        const serviceConfig: Record<string, { name: string; url: string }> = {
          core: {
            name: 'core',
            url: configService.get('CORE_SERVICE_URL', 'http://localhost:3005/graphql'),
          },
          provisioning: {
            name: 'provisioning',
            url: configService.get('PROVISIONING_SERVICE_URL', 'http://localhost:3003/graphql'),
          },
          'tenant-runtime': {
            name: 'tenant-runtime',
            url: configService.get('TENANT_RUNTIME_URL', 'http://localhost:3004/graphql'),
          },
        };

        // Build subgraph list from loaded services
        const subgraphs = loadedServices
          .map(serviceName => serviceConfig[serviceName])
          .filter(Boolean);

// ========================================
        // STANDBY MODE: No services available
        // ========================================
        if (subgraphs.length === 0) {
          console.warn('\n⚠️  STANDBY MODE: No services available');
          console.warn('   API Gateway running with minimal Federation schema');
          console.warn('   Services will auto-connect when ready\n');
          
          // ✅ Düzeltilmiş minimal Apollo Federation schema
          const minimalFederationSchema = `
            schema
              @link(url: "https://specs.apollo.dev/link/v1.0")
              @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION)
            {
              query: Query
            }

            directive @join__enumValue(graph: join__Graph!) repeatable on ENUM_VALUE
            directive @join__field(graph: join__Graph, requires: join__FieldSet, provides: join__FieldSet, type: String, external: Boolean, override: String, usedOverridden: Boolean) repeatable on FIELD_DEFINITION | INPUT_FIELD_DEFINITION
            directive @join__graph(name: String!, url: String!) on ENUM_VALUE
            directive @join__implements(graph: join__Graph!, interface: String!) repeatable on OBJECT | INTERFACE
            directive @join__type(graph: join__Graph!, key: join__FieldSet, extension: Boolean! = false, resolvable: Boolean! = true, isInterfaceObject: Boolean! = false) repeatable on OBJECT | INTERFACE | UNION | ENUM | INPUT_OBJECT | SCALAR
            directive @join__unionMember(graph: join__Graph!, member: String!) repeatable on UNION
            directive @link(url: String, as: String, for: link__Purpose, import: [link__Import]) repeatable on SCHEMA

            scalar join__FieldSet
            scalar link__Import

            enum join__Graph {
              STANDBY @join__graph(name: "standby", url: "http://localhost:9999/standby")
            }

            enum link__Purpose {
              SECURITY
              EXECUTION
            }

            type Query
              @join__type(graph: STANDBY)
            {
              _service: _Service! @join__field(graph: STANDBY)
              gatewayStatus: String! @join__field(graph: STANDBY)
              availableServices: [String!]! @join__field(graph: STANDBY)
            }

            type _Service
              @join__type(graph: STANDBY)
            {
              sdl: String
            }
          `;
          
          return {
            gateway: {
              supergraphSdl: minimalFederationSchema,
              serviceHealthCheck: false,
            },
            server: {
              context: ({ req }) => ({ req }),
              formatError: (error) => ({
                message: 'API Gateway is in standby mode. Microservices are not available.',
                extensions: {
                  code: 'STANDBY_MODE',
                  originalError: error.message,
                },
              }),
            },
            playground: true,
            introspection: true,
          };
        }

        // ========================================
        // FEDERATION MODE: Services available
        // ========================================
        console.log(`\n🎯 GraphQL Federation Gateway activated with ${subgraphs.length} service(s)\n`);
        
        return {
          gateway: {
            supergraphSdl: new IntrospectAndCompose({
              subgraphs,
              introspectionHeaders: (service) => ({
                'x-api-key': configService.get(`${service.name.toUpperCase()}_SERVICE_API_KEY`) || '',
              }),
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
              console.error('GraphQL Federation Error:', error.message);
              return {
                message: error.message,
                path: error.path,
                extensions: {
                  code: error.extensions?.code || 'INTERNAL_SERVER_ERROR',
                  serviceName: error.extensions?.serviceName,
                  timestamp: new Date().toISOString(),
                },
              };
            },
          },
          playground: true,
          introspection: true,
        };
      },
    }),

    // ========================================
    // CORE MODULES
    // ========================================
    CacheModule,
    AuthModule,
    RateLimitModule,
    HealthModule,
    ServiceRegistryModule,
    HealthMonitorModule,
  ],

  // ========================================
  // CONTROLLERS
  // ========================================
  controllers: [HealthController],

  // ========================================
  // GLOBAL PROVIDERS
  // ========================================
  providers: [
    VaultConfigService,
    GracefulServiceLoader,
    
    // Global Guards
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    
    // Global Interceptors
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

  // ========================================
  // EXPORTS
  // ========================================
  exports: [VaultConfigService, GracefulServiceLoader],
})
export class AppModule {}