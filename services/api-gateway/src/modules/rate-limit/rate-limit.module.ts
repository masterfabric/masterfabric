import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      useFactory: (config: ConfigService) => {
        const redisHost = config.get('REDIS_HOST') || 'localhost';
        const redisPort = parseInt(config.get('REDIS_PORT') || '6379');
        const ttl = parseInt(config.get('RATE_LIMIT_TTL') || '60000');
        const limit = parseInt(config.get('RATE_LIMIT_MAX') || '100');

        return {
          throttlers: [
            {
              ttl,
              limit,
            },
          ],
          storage: new Redis({
            host: redisHost,
            port: redisPort,
          }),
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class RateLimitModule {}
