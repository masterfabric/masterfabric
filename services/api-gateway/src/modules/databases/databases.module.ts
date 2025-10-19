// services/api-gateway/src/modules/databases/databases.module.ts

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PostgreSQLClusterService } from './postgresql-cluster.service';
import { MongoDBClusterService } from './mongodb-cluster.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    PostgreSQLClusterService,
    MongoDBClusterService,
  ],
  exports: [
    PostgreSQLClusterService,
    MongoDBClusterService,
  ],
})
export class DatabasesModule {}
