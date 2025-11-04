import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    // Create hybrid application (HTTP + Microservice)
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    const configService = app.get(ConfigService);

    // Security: Helmet middleware
    app.use(
      helmet({
        contentSecurityPolicy: false, // GraphQL için
        crossOriginEmbedderPolicy: false,
      }),
    );

    // Connect Redis microservice
    const redisHost = configService.get('REDIS_HOST', 'localhost');
    const redisPort = parseInt(configService.get('REDIS_PORT', '6379'));

    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.REDIS,
      options: {
        host: redisHost,
        port: redisPort,
      },
    });

    // CORS Configuration
    const corsOrigins = configService.get('CORS_ORIGINS')?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3002',
    ];

    app.enableCors({
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-API-Key',
        'X-Tenant-ID',
        'X-Organization-ID',
        'X-Project-ID',
      ],
    });

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // Start all microservices
    await app.startAllMicroservices();

    const port = configService.get('PORT', 3003);
    await app.listen(port);

    logger.log('');
    logger.log('═══════════════════════════════════════════════════');
    logger.log('🚀 MasterFabric Provisioning Service');
    logger.log('═══════════════════════════════════════════════════');
    logger.log(`📡 HTTP Server: http://localhost:${port}`);
    logger.log(`🔍 GraphQL endpoint: http://localhost:${port}/graphql`);
    logger.log(`🏥 Health check: http://localhost:${port}/health`);
    logger.log(`📨 Redis Microservice: ${redisHost}:${redisPort}`);
    logger.log('');
    logger.log('📋 Environment:');
    logger.log(`   - NODE_ENV: ${configService.get('NODE_ENV', 'development')}`);
    logger.log(`   - CORS Origins: ${corsOrigins.join(', ')}`);
    logger.log('');
    logger.log('License: GNU AGPL-3.0');
    logger.log('© 2025 MASTERFABRIC Information Technologies Inc.');
    logger.log('Author: @gurkanfikretgunak');
    logger.log('═══════════════════════════════════════════════════');
    logger.log('');
  } catch (error) {
    logger.error('❌ Failed to start Provisioning Service:', error);
    process.exit(1);
  }
}

bootstrap();
