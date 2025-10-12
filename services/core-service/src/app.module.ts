import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { UsersModule } from './modules/users/users.module';
import { TenantUsersModule } from './modules/tenant-users/tenant-users.module';
import { ProjectSchemasModule } from './modules/project-schemas/project-schemas.module';
import { HealthModule } from './modules/health/health.module';
import { VaultConfigService } from './config/vault-config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local'],
    }),
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: true,
      playground: true,
      introspection: true,
      context: ({ req }) => ({ req }),
    }),
    PrismaModule,
    AuthModule,
    OrganizationsModule,
    ProjectsModule,
    UsersModule,
    TenantUsersModule,
    ProjectSchemasModule,
    HealthModule,
  ],
  providers: [VaultConfigService],
  exports: [VaultConfigService],
})
export class AppModule {}
