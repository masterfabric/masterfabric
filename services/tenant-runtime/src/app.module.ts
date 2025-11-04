import { Module, Controller, Get } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { DataResolversModule } from './modules/data-resolvers/data-resolvers.module';
import { SchemaManagementModule } from './modules/schema-management/schema-management.module';
import { ApiKeyGuard } from './core/guards/api-key.guard';
import { GqlJwtAuthGuard } from './core/guards/gql-jwt-auth.guard';
import { TenantIsolationGuard } from './core/guards/tenant-isolation.guard';
import { GraphQLExceptionFilter } from './core/filters/graphql-exception.filter';
import { LoggingInterceptor } from './core/interceptors/logging.interceptor';
import { VaultConfigService } from './config/vault-config';
import { Public } from './core/decorators/public.decorator';

@Controller()
export class HealthController {
  @Public()
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'tenant-runtime',
      message: 'Tenant Runtime is running',
      timestamp: new Date().toISOString(),
      license: 'GNU AGPL-3.0',
      copyright: '© 2025 MASTERFABRIC Information Technologies Inc.',
      author: '@gurkanfikretgunak',
    };
  }
}

@Module({
  imports: [
    // ========================================
    // GLOBAL CONFIGURATION
    // ========================================
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),

    // ========================================
    // GRAPHQL FEDERATION SUBGRAPH
    // ========================================
    GraphQLModule.forRootAsync<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        autoSchemaFile: {
          federation: 2, // Apollo Federation v2
        },
        sortSchema: true,
        playground: configService.get('NODE_ENV') !== 'production',
        introspection: true,
        context: ({ req }) => ({
          req,
          tenantId: req.headers['x-tenant-id'],
          user: req.user,
        }),
        formatError: (error) => {
          console.error('GraphQL Error:', {
            message: error.message,
            path: error.path,
            extensions: error.extensions,
          });
          
          return {
            message: error.message,
            extensions: {
              code: error.extensions?.code || 'INTERNAL_SERVER_ERROR',
              timestamp: new Date().toISOString(),
              ...(configService.get('NODE_ENV') === 'development' && {
                stacktrace: error.extensions?.stacktrace,
              }),
            },
          };
        },
      }),
    }),

    // ========================================
    // MODULES
    // ========================================
    PrismaModule,
    AuthModule,
    DataResolversModule,
    SchemaManagementModule,
  ],

  controllers: [HealthController],

  providers: [
    VaultConfigService,

    // ========================================
    // GLOBAL GUARDS (order matters!)
    // ========================================
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard, // 1. API Gateway authentication
    },
    {
      provide: APP_GUARD,
      useClass: GqlJwtAuthGuard, // 2. User JWT authentication
    },
    {
      provide: APP_GUARD,
      useClass: TenantIsolationGuard, // 3. Tenant isolation
    },

    // ========================================
    // GLOBAL FILTERS
    // ========================================
    {
      provide: APP_FILTER,
      useClass: GraphQLExceptionFilter,
    },

    // ========================================
    // GLOBAL INTERCEPTORS
    // ========================================
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],

  exports: [VaultConfigService],
})
export class AppModule {}
