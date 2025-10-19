// services/core-service/src/app.module.ts

import { Module, Controller, Get } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

// Prisma
import { PrismaModule } from './prisma/prisma.module';

// Guards
import { ApiKeyGuard } from './common/guards/api-key.guard';

// Interceptors
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

// Decorators
import { Public } from './common/decorators/public.decorator';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ProjectsModule } from './modules/projects/projects.module';

@Controller()
export class HealthController {
  @Public()
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'core-service',
      message: 'Core Service is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      features: {
        users: true,
        organizations: true,
        projects: true,
        auth: true,
        rbac: true,
        audit: true,
      },
      license: 'GNU AGPL-3.0',
      copyright: '© 2025 MASTERFABRIC Bilişim Teknolojileri A.Ş.',
      author: '@gurkanfikretgunak',
      repository: 'https://github.com/masterfabric/masterfabric',
    };
  }

  @Public()
  @Get('ready')
  getReady() {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
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
          path: 'src/graphql/schema.gql',
          federation: 2, // ✅ Federation v2
        },
        sortSchema: true,
        playground: configService.get('NODE_ENV') !== 'production',
        introspection: true,
        context: ({ req }) => {
          return {
            req,
            user: req.user,
            organizationId: req.headers['x-organization-id'],
            projectId: req.headers['x-project-id'],
          };
        },
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
    // DATABASE
    // ========================================
    PrismaModule,

    // ========================================
    // FEATURE MODULES
    // ========================================
    AuthModule,
    UsersModule,
    OrganizationsModule,
    ProjectsModule,
    // RolesModule,
    // PermissionsModule,
    // AuditModule,
  ],

  controllers: [HealthController],

  providers: [
    // ========================================
    // GLOBAL GUARDS
    // ========================================
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard, // API Gateway authentication
    },

    // ========================================
    // GLOBAL INTERCEPTORS
    // ========================================
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}