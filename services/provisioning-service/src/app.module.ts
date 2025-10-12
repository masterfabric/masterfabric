import { Module, Controller, Get } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { ProvisionWorkerModule } from './modules/provision-worker/provision-worker.module';
import { DnsManagerModule } from './modules/dns-manager/dns-manager.module';
import { ProvisioningGraphQLModule } from './graphql/graphql.module';
import { VaultConfigService } from './config/vault-config';

@Controller()
export class HealthController {
  @Get('health')
  getHealth() {
    return { status: 'ok', service: 'provisioning-service', message: 'Provisioning Service is running' };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local'],
    }),
    ProvisioningGraphQLModule,
    PrismaModule,
    ProvisionWorkerModule,
    DnsManagerModule,
  ],
  controllers: [HealthController],
  providers: [VaultConfigService],
  exports: [VaultConfigService],
})
export class AppModule {}
