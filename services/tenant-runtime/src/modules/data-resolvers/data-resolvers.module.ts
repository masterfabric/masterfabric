import { Module } from '@nestjs/common';
import { ProductResolver } from './product.resolver';
import { ProductService } from './product.service';
import { ProductRepository } from './repositories/product.repository';
import { TenantDbProvider } from '../../core/db-context/tenant-db.provider';

@Module({
  providers: [
    ProductResolver,
    ProductService,
    ProductRepository,
    TenantDbProvider,
  ],
  exports: [ProductService],
})
export class DataResolversModule {}
