import { Module, Controller, Get } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { DataResolversModule } from './modules/data-resolvers/data-resolvers.module';
import { SchemaManagementModule } from './modules/schema-management/schema-management.module';
import { GqlJwtAuthGuard } from './core/guards/gql-jwt-auth.guard';
import { TenantIsolationGuard } from './core/guards/tenant-isolation.guard';
import { GraphQLExceptionFilter } from './core/filters/graphql-exception.filter';
import { VaultConfigService } from './config/vault-config';

@Controller()
export class HealthController {
  @Get('health')
  getHealth() {
    return { status: 'ok', service: 'tenant-runtime', message: 'Tenant Runtime is running' };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local'],
    }),
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: true,
      context: ({ req }) => ({ req }),
      playground: true,
      introspection: true,
    }),
    PrismaModule,
    AuthModule,
    DataResolversModule,
    SchemaManagementModule,
  ],
  controllers: [HealthController],
  providers: [
    VaultConfigService,
    {
      provide: APP_GUARD,
      useClass: GqlJwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantIsolationGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GraphQLExceptionFilter,
    },
  ],
  exports: [VaultConfigService],
})
export class AppModule {}
