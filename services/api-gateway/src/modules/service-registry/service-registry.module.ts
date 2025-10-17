// services/api-gateway/src/modules/service-registry/service-registry.module.ts

import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ServiceRegistryService } from './service-registry.service';
import { ServiceRegistryResolver } from './service-registry.resolver';
import { GracefulServiceLoader } from './graceful-service-loader';
import { ServiceRegistrationInterceptor } from './service-registration.interceptor';
import { CacheModule } from '../cache/cache.module';
import { AuthModule } from '../auth/auth.module';

@Global()
@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 3,
    }),
    CacheModule,
    AuthModule,
  ],
  providers: [
    ServiceRegistryService,
    ServiceRegistryResolver,
    GracefulServiceLoader,
    ServiceRegistrationInterceptor,
  ],
  exports: [
    ServiceRegistryService,
    GracefulServiceLoader,
    ServiceRegistrationInterceptor,
  ],
})
export class ServiceRegistryModule {}