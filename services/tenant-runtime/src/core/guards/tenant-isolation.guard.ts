import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantIsolationGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const gqlContext = GqlExecutionContext.create(context);
    const { req } = gqlContext.getContext();
    
    // Skip auth for public endpoints
    if (req.body?.operationName === 'tenantRegister' || 
        req.body?.operationName === 'tenantLogin') {
      return true;
    }

    const hostSlug = req.headers.host?.split('.')[0];
    const tokenOrgId = req.user?.organizationId;
    
    if (!hostSlug || !tokenOrgId) {
      throw new ForbiddenException('Missing tenant context');
    }

    // Fetch org by ID and compare slug
    const org = await this.prisma.organization.findUnique({
      where: { id: tokenOrgId }
    });
    
    if (!org || org.slug !== hostSlug) {
      throw new ForbiddenException('Token/subdomain mismatch');
    }
    
    return true;
  }
}
