import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProvisionWorkerService } from './provision-worker.service';

@Controller()
export class ProvisionWorkerController {
  private readonly logger = new Logger(ProvisionWorkerController.name);

  constructor(private readonly provisionWorkerService: ProvisionWorkerService) {}

  @MessagePattern('ORG_CREATE_REQUEST')
  async handleOrgCreation(@Payload() data: { organizationId: string; slug: string }) {
    this.logger.log(`Received organization creation request for: ${data.slug}`);
    
    try {
      await this.provisionWorkerService.provisionOrganization(data.organizationId, data.slug);
      this.logger.log(`Successfully provisioned organization: ${data.slug}`);
    } catch (error) {
      this.logger.error(`Failed to provision organization ${data.slug}:`, error.message);
      // The service will handle marking the organization as FAILED
    }
  }
}
