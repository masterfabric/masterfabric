// services/tenant-runtime/src/core/interceptors/logging.interceptor.ts

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('TenantRuntime');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = GqlExecutionContext.create(context);
    const info = ctx.getInfo();
    const request = ctx.getContext().req;

    const now = Date.now();
    const operation = info?.fieldName || 'unknown';
    const tenantId = request?.headers?.['x-tenant-id'] || 'no-tenant';

    return next.handle().pipe(
      tap({
        next: () => {
          const delay = Date.now() - now;
          this.logger.log(
            `✅ [${tenantId}] ${operation} - ${delay}ms`
          );
        },
        error: (error) => {
          const delay = Date.now() - now;
          this.logger.error(
            `❌ [${tenantId}] ${operation} - ${delay}ms - Error: ${error.message}`
          );
        },
      })
    );
  }
}

