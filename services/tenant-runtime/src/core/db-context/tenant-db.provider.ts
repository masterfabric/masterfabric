import { Injectable, Scope, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { REQUEST } from '@nestjs/core';

@Injectable({ scope: Scope.REQUEST })
export class TenantDbProvider {
  private prismaClient: PrismaClient;

  constructor(@Inject(REQUEST) private request: any) {
    // In single-DB approach, same connection but context differs
    this.prismaClient = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } }
    });
  }

  getClient() {
    return this.prismaClient;
  }

  getOrgId() {
    return this.request.user?.organizationId;
  }

  async onModuleDestroy() {
    await this.prismaClient.$disconnect();
  }
}
