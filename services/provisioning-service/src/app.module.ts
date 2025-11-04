import { Module, Controller, Get } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { ProvisionWorkerModule } from './modules/provision-worker/provision-worker.module';
import { DnsManagerModule } from './modules/dns-manager/dns-manager.module';
import { ProvisioningGraphQLModule } from './graphql/graphql.module';
import { ApiKeyGuard } from './core/guards/api-key.guard';
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
      service: 'provisioning-service',
      message: 'Provisioning Service is running',
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
    // MODULES
    // ========================================
    ProvisioningGraphQLModule,
    PrismaModule,
    ProvisionWorkerModule,
    DnsManagerModule,
  ],

  controllers: [HealthController],

  providers: [
    VaultConfigService,

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

  exports: [VaultConfigService],
})
export class AppModule {}
