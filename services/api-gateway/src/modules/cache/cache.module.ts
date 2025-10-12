import { Module, CacheModule as NestCacheModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-ioredis';

@Module({
  imports: [
    NestCacheModule.registerAsync({
      useFactory: (config: ConfigService) => {
        const redisHost = config.get('REDIS_HOST') || 'localhost';
        const redisPort = parseInt(config.get('REDIS_PORT') || '6379');
        const ttl = parseInt(config.get('CACHE_TTL') || '300');

        return {
          store: redisStore,
          host: redisHost,
          port: redisPort,
          ttl,
        };
      },
      inject: [ConfigService],
    }),
  ],
  exports: [NestCacheModule],
})
export class CacheModule {}
