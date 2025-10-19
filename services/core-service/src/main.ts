// services/core-service/src/main.ts

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
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

    const port = configService.get('PORT', 3005);
    await app.listen(port);

    logger.log('');
    logger.log('═══════════════════════════════════════════════════');
    logger.log('🚀 MasterFabric Core Service');
    logger.log('═══════════════════════════════════════════════════');
    logger.log(`📡 Server running on: http://localhost:${port}`);
    logger.log(`🎮 GraphQL Playground: http://localhost:${port}/graphql`);
    logger.log(`🏥 Health Check: http://localhost:${port}/health`);
    logger.log('');
    logger.log('📋 Features:');
    logger.log('   ✅ User Management');
    logger.log('   ✅ Organization Management (Multi-tenant)');
    logger.log('   ✅ Project Management');
    logger.log('   ✅ Authentication (JWT)');
    logger.log('   ✅ RBAC (Role-Based Access Control)');
    logger.log('   ✅ Audit Logging');
    logger.log('');
    logger.log('🔐 GraphQL Federation Subgraph: Active');
    logger.log(`🔗 API Gateway: ${configService.get('API_GATEWAY_URL', 'http://localhost:3002')}`);
    logger.log('═══════════════════════════════════════════════════');
    logger.log('');
    logger.log('📖 License: GNU AGPL-3.0');
    logger.log('© 2025 MASTERFABRIC Bilişim Teknolojileri A.Ş.');
    logger.log('👨‍💻 Author: @gurkanfikretgunak');
    logger.log('');
    
  } catch (error) {
    logger.error('❌ Failed to start Core Service:', error);
    process.exit(1);
  }
}

bootstrap();