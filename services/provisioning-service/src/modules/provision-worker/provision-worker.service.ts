import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CloudflareService } from '../dns-manager/cloudflare.service';

@Injectable()
export class ProvisionWorkerService {
  private readonly logger = new Logger(ProvisionWorkerService.name);

  constructor(
    private prisma: PrismaService,
    private cloudflareService: CloudflareService,
  ) {}

  async provisionOrganization(organizationId: string, slug: string): Promise<void> {
    this.logger.log(`Starting provisioning for organization: ${slug}`);

    try {
      // Create provisioning job record
      const job = await this.prisma.provisioningJob.create({
        data: {
          tenantId: organizationId,
          type: 'organization',
          status: 'in_progress',
          configuration: {
            slug,
            organizationId,
          },
        },
      });

      try {
        // 1. Create Cloudflare DNS record
        await this.cloudflareService.createCNAME(slug);
        
        // 2. Update job status
        await this.prisma.provisioningJob.update({
          where: { id: job.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
            result: {
              slug,
              dnsCreated: true,
              timestamp: new Date().toISOString(),
            },
          },
        });

        this.logger.log(`Successfully provisioned organization: ${slug}`);
      } catch (error) {
        // Update job with error
        await this.prisma.provisioningJob.update({
          where: { id: job.id },
          data: {
            status: 'failed',
            error: error.message,
            completedAt: new Date(),
          },
        });

        throw error;
      }
    } catch (error) {
      this.logger.error(`Provisioning failed for ${slug}:`, error.message);
      throw error;
    }
  }

  async createDnsRecord(domain: string, subdomain: string, type: string, value: string, tenantId: string): Promise<void> {
    this.logger.log(`Creating DNS record: ${subdomain}.${domain} -> ${value}`);

    try {
      // Create DNS record job
      const job = await this.prisma.provisioningJob.create({
        data: {
          tenantId,
          type: 'dns_record',
          status: 'in_progress',
          configuration: {
            domain,
            subdomain,
            type,
            value,
          },
        },
      });

      try {
        // Create DNS record in provider (Cloudflare)
        const recordId = await this.cloudflareService.createRecord(subdomain, domain, type, value);

        // Store in database
        await this.prisma.dnsRecord.create({
          data: {
            tenantId,
            domain,
            subdomain,
            type,
            value,
            status: 'active',
            cloudflareId: recordId,
          },
        });

        // Update job
        await this.prisma.provisioningJob.update({
          where: { id: job.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
            result: {
              recordId,
              created: true,
            },
          },
        });

        this.logger.log(`Successfully created DNS record: ${subdomain}.${domain}`);
      } catch (error) {
        await this.prisma.provisioningJob.update({
          where: { id: job.id },
          data: {
            status: 'failed',
            error: error.message,
            completedAt: new Date(),
          },
        });

        throw error;
      }
    } catch (error) {
      this.logger.error(`Failed to create DNS record:`, error.message);
      throw error;
    }
  }
}
