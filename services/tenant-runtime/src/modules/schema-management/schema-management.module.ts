import { Module } from '@nestjs/common';
import { SchemaResolver } from './schema.resolver';
import { SchemaService } from './schema.service';
import { TenantDbProvider } from '../../core/db-context/tenant-db.provider';

@Module({
  providers: [
    SchemaResolver,
    SchemaService,
    TenantDbProvider,
  ],
  exports: [SchemaService],
})
export class SchemaManagementModule {}
