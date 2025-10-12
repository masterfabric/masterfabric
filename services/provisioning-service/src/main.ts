import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  // Create hybrid application (HTTP + Microservice)
  const app = await NestFactory.create(AppModule);
  
  // Connect Redis microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.REDIS,
    options: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
  });

  // Enable CORS
  app.enableCors({
    origin: ['http://localhost:3002', 'http://localhost:3000'],
    credentials: true,
  });

  // Start all microservices
  await app.startAllMicroservices();
  
  // Start HTTP server for health checks
  const port = process.env.PORT || 3003;
  await app.listen(port);
  
  console.log(`🚀 Provisioning Service is running on port ${port}`);
  console.log('📡 Redis microservice is listening for messages...');
}

bootstrap();
