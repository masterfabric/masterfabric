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
      // Execute all provisioning steps in a transaction
      await this.prisma.$transaction(async (tx) => {
        // 1. Create default tenant tables (in shared DB with organization_id filtering)
        await this.createDefaultTenantTables(tx, organizationId);

        // 2. Create project record with tenant configuration
        await tx.project.create({
          data: {
            name: `${slug} Project`,
            description: `Default project for ${slug} organization`,
            organizationId,
            tenantDbUri: process.env.DATABASE_URL, // Same as core DB
            redisUri: process.env.REDIS_URL,
          },
        });

        // 3. Update organization status to READY
        await tx.organization.update({
          where: { id: organizationId },
          data: { status: 'READY' },
        });
      });

      // 4. Create Cloudflare DNS record (outside transaction, non-critical)
      try {
        await this.cloudflareService.createCNAME(slug);
      } catch (error) {
        this.logger.warn(`DNS creation failed for ${slug}, but organization is still provisioned:`, error.message);
      }

      this.logger.log(`Successfully provisioned organization: ${slug}`);
    } catch (error) {
      this.logger.error(`Provisioning failed for ${slug}:`, error.message);
      
      // Mark organization as FAILED
      await this.prisma.organization.update({
        where: { id: organizationId },
        data: { status: 'FAILED' },
      });

      throw error;
    }
  }

  private async createDefaultTenantTables(tx: any, organizationId: string): Promise<void> {
    this.logger.log(`Creating default tenant tables for organization: ${organizationId}`);

    // Sanitize organizationId by replacing hyphens with underscores for table name
    const tableSuffix = organizationId.replace(/-/g, '_');

    // Create the default users table for tenant authentication
    // This will be used by the tenant-runtime for end-user authentication
    await tx.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS users_${tableSuffix} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR UNIQUE NOT NULL,
        password_hash VARCHAR NOT NULL,
        organization_id UUID NOT NULL DEFAULT '${organizationId}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create an index on email for faster lookups
    await tx.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_users_${tableSuffix}_email 
      ON users_${tableSuffix} (email);
    `);

    // Create an index on organization_id (though it's always the same for this table)
    await tx.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_users_${tableSuffix}_org_id 
      ON users_${tableSuffix} (organization_id);
    `);

    this.logger.log(`Created default tenant tables for organization: ${organizationId}`);
  }
}
