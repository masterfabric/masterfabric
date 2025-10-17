// services/api-gateway/src/modules/cache/cache.module.ts

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisClusterService } from './redis-cluster.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [RedisClusterService],
  exports: [RedisClusterService],
})
export class CacheModule {}