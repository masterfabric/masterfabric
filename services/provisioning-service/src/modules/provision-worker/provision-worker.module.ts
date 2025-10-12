import { Module } from '@nestjs/common';
import { ProvisionWorkerController } from './provision-worker.controller';
import { ProvisionWorkerService } from './provision-worker.service';
import { DnsManagerModule } from '../dns-manager/dns-manager.module';

@Module({
  imports: [DnsManagerModule],
  controllers: [ProvisionWorkerController],
  providers: [ProvisionWorkerService],
})
export class ProvisionWorkerModule {}
