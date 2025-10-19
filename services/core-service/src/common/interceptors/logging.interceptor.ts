// services/core-service/src/common/interceptors/logging.interceptor.ts

import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
  } from '@nestjs/common';
  import { Observable } from 'rxjs';
  import { tap } from 'rxjs/operators';
  import { GqlExecutionContext } from '@nestjs/graphql';
  
  @Injectable()
  export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger('GraphQL');
  
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      const now = Date.now();
      
      try {
        const ctx = GqlExecutionContext.create(context);
        const info = ctx.getInfo();
        
        const operationName = info?.fieldName || 'unknown';
        const operationType = info?.operation?.operation || 'query';
  
        return next.handle().pipe(
          tap(() => {
            const duration = Date.now() - now;
            this.logger.log(
              `${operationType.toUpperCase()} ${operationName} - ${duration}ms`
            );
          }),
        );
      } catch (error) {
        return next.handle();
      }
    }
  }