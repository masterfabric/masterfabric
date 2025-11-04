import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule as NestGraphQLModule } from '@nestjs/graphql';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { ProvisioningResolver } from './provisioning.resolver';

@Module({
  imports: [
    NestGraphQLModule.forRootAsync<ApolloFederationDriverConfig>({
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
          organizationId: req.headers['x-organization-id'],
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
  ],
  providers: [ProvisioningResolver],
})
export class ProvisioningGraphQLModule {}
