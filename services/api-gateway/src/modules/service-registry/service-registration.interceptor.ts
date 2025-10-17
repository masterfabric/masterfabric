// services/api-gateway/src/modules/service-registry/service-registration.interceptor.ts

import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
  } from '@nestjs/common';
  import { Observable } from 'rxjs';
  import { tap } from 'rxjs/operators';
  import { ServiceRegistryService } from './service-registry.service';
  
  /**
   * Her GraphQL request'inde servislerin durumunu kontrol eder
   */
  @Injectable()
  export class ServiceRegistrationInterceptor implements NestInterceptor {
    private readonly logger = new Logger(ServiceRegistrationInterceptor.name);
  
    constructor(private serviceRegistry: ServiceRegistryService) {}
  
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      const startTime = Date.now();
      const request = context.switchToHttp().getRequest();
      
      // GraphQL operation bilgisi
      const operationName = request.body?.operationName || 'unknown';
      const serviceName = this.extractServiceFromOperation(request);
  
      return next.handle().pipe(
        tap({
          next: () => {
            const responseTime = Date.now() - startTime;
            
            // Request'i logla
            if (serviceName) {
              this.serviceRegistry.logRequest(
                serviceName,
                operationName,
                request.user?.userId
              ).catch(err => {
                this.logger.error(`Failed to log request: ${err.message}`);
              });
            }
  
            this.logger.debug(
              `✅ ${operationName} completed in ${responseTime}ms`
            );
          },
          error: (error) => {
            const responseTime = Date.now() - startTime;
            
            this.logger.error(
              `❌ ${operationName} failed after ${responseTime}ms: ${error.message}`
            );
          },
        })
      );
    }
  
    private extractServiceFromOperation(request: any): string | null {
      // GraphQL query'den hangi servise gidildiğini çıkar
      const query = request.body?.query || '';
      
      if (query.includes('@core')) return 'core';
      if (query.includes('@provisioning')) return 'provisioning';
      if (query.includes('@tenantRuntime')) return 'tenant-runtime';
      
      return null;
    }
  }