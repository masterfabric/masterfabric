import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantDbProvider } from '../../../core/db-context/tenant-db.provider';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';

@Injectable()
export class ProductRepository {
  constructor(private tenantDb: TenantDbProvider) {}

  async create(createProductDto: CreateProductDto) {
    const orgId = this.tenantDb.getOrgId();
    
    if (!orgId) {
      throw new Error('Organization ID not found in request context');
    }

    const { name, price } = createProductDto;

    const result = await this.tenantDb.getClient().$executeRaw`
      INSERT INTO products_${orgId} (name, price, organization_id, created_at)
      VALUES (${name}, ${price}, ${orgId}, NOW())
      RETURNING id, name, price, organization_id, created_at
    `;

    return Array.isArray(result) && result.length > 0 ? result[0] : null;
  }

  async findAll() {
    const orgId = this.tenantDb.getOrgId();
    
    if (!orgId) {
      throw new Error('Organization ID not found in request context');
    }

    const result = await this.tenantDb.getClient().$queryRaw`
      SELECT id, name, price, organization_id, created_at
      FROM products_${orgId}
      WHERE organization_id = ${orgId}
      ORDER BY created_at DESC
    `;

    return Array.isArray(result) ? result : [];
  }

  async findOne(id: string) {
    const orgId = this.tenantDb.getOrgId();
    
    if (!orgId) {
      throw new Error('Organization ID not found in request context');
    }

    const result = await this.tenantDb.getClient().$queryRaw`
      SELECT id, name, price, organization_id, created_at
      FROM products_${orgId}
      WHERE id = ${id} AND organization_id = ${orgId}
      LIMIT 1
    `;

    return Array.isArray(result) && result.length > 0 ? result[0] : null;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const orgId = this.tenantDb.getOrgId();
    
    if (!orgId) {
      throw new Error('Organization ID not found in request context');
    }

    const { name, price } = updateProductDto;
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = $' + (values.length + 1));
      values.push(name);
    }
    if (price !== undefined) {
      updates.push('price = $' + (values.length + 1));
      values.push(price);
    }

    if (updates.length === 0) {
      return this.findOne(id);
    }

    values.push(id, orgId);

    const result = await this.tenantDb.getClient().$executeRaw`
      UPDATE products_${orgId}
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${values.length - 1} AND organization_id = $${values.length}
      RETURNING id, name, price, organization_id, created_at
    `;

    return Array.isArray(result) && result.length > 0 ? result[0] : null;
  }

  async remove(id: string) {
    const orgId = this.tenantDb.getOrgId();
    
    if (!orgId) {
      throw new Error('Organization ID not found in request context');
    }

    const result = await this.tenantDb.getClient().$executeRaw`
      DELETE FROM products_${orgId}
      WHERE id = ${id} AND organization_id = ${orgId}
      RETURNING id, name, price, organization_id, created_at
    `;

    return Array.isArray(result) && result.length > 0 ? result[0] : null;
  }
}
