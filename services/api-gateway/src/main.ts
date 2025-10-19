// services/api-gateway/src/main.ts - YENİ HALİ

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Security: Helmet middleware
    app.use(helmet({
      contentSecurityPolicy: false, // GraphQL Playground için
      crossOriginEmbedderPolicy: false,
    }));

    // CORS Configuration
    const corsOrigins = process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
    ];

    app.enableCors({
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-API-Key',
        'X-Tenant-ID',
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

    const port = process.env.PORT || 3002;
    await app.listen(port);

    logger.log('');
    logger.log('═══════════════════════════════════════════════════');
    logger.log('🚀 MasterFabric API Gateway');
    logger.log('═══════════════════════════════════════════════════');
    logger.log(`📡 Server running on: http://localhost:${port}`);
    logger.log(`🎮 GraphQL Playground: http://localhost:${port}/graphql`);
    logger.log(`🏥 Health Check: http://localhost:${port}/health`);
    logger.log('');
    logger.log('📋 Registered Services:');
    logger.log('   - Core Service');
    logger.log('   - Provisioning Service');
    logger.log('   - Tenant Runtime Service');
    logger.log('');
    logger.log('🔐 Authentication: JWT + API Key');
    logger.log('💾 Cache: Redis Master + SubMicroServices');
    logger.log('🗄️  Databases: PostgreSQL (Required) + MongoDB (Optional)');
    logger.log('📊 Monitoring: Real-time Health Checks');
    logger.log('🔄 Circuit Breaker: Enabled');
    logger.log('═══════════════════════════════════════════════════');
    logger.log('');
    
  } catch (error) {
    logger.error('❌ Failed to start API Gateway:', error);
    process.exit(1);
  }
}

bootstrap();