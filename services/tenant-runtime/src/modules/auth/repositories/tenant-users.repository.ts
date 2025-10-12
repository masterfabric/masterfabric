import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { TenantDbProvider } from '../../../core/db-context/tenant-db.provider';
import * as bcrypt from 'bcrypt';

@Injectable()
export class TenantUsersRepository {
  constructor(private tenantDb: TenantDbProvider) {}

  async create(email: string, passwordHash: string) {
    const orgId = this.tenantDb.getOrgId();
    
    if (!orgId) {
      throw new Error('Organization ID not found in request context');
    }

    // Check if user already exists
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // All queries automatically filter by organization_id
    return this.tenantDb.getClient().$executeRaw`
      INSERT INTO users_${orgId} (email, password_hash, organization_id)
      VALUES (${email}, ${passwordHash}, ${orgId})
      RETURNING id, email, organization_id, created_at
    `;
  }

  async findByEmail(email: string) {
    const orgId = this.tenantDb.getOrgId();
    
    if (!orgId) {
      throw new Error('Organization ID not found in request context');
    }

    const result = await this.tenantDb.getClient().$queryRaw`
      SELECT id, email, password_hash, organization_id, created_at
      FROM users_${orgId}
      WHERE email = ${email} AND organization_id = ${orgId}
      LIMIT 1
    `;

    return Array.isArray(result) && result.length > 0 ? result[0] : null;
  }

  async findById(id: string) {
    const orgId = this.tenantDb.getOrgId();
    
    if (!orgId) {
      throw new Error('Organization ID not found in request context');
    }

    const result = await this.tenantDb.getClient().$queryRaw`
      SELECT id, email, organization_id, created_at
      FROM users_${orgId}
      WHERE id = ${id} AND organization_id = ${orgId}
      LIMIT 1
    `;

    return Array.isArray(result) && result.length > 0 ? result[0] : null;
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
