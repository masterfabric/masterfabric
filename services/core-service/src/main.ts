import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    const app = await NestFactory.create(AppModule);
    
    // Initialize Vault configuration
    const vaultConfig = app.get('VaultConfigService');
    await vaultConfig.initialize();
    
    // Run database migrations
    const prismaService = app.get(PrismaService);
    logger.log('🔄 Running database migrations...');
    await prismaService.$executeRaw`SELECT 1`; // Test connection
    logger.log('✅ Database connection established');
    
    // Enable CORS for frontend integration
    app.enableCors({
      origin: ['http://localhost:3000', 'http://localhost:3002'],
      credentials: true,
    });

    // Global validation pipe
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    const port = process.env.PORT || 3005;
    await app.listen(port);
    
    logger.log(`🚀 Core Service running on port ${port}`);
    logger.log(`📊 GraphQL Playground: http://localhost:${port}/graphql`);
    logger.log(`🏥 Health Check: http://localhost:${port}/health`);
  } catch (error) {
    logger.error('❌ Failed to start Core Service:', error);
    process.exit(1);
  }
}
bootstrap();
