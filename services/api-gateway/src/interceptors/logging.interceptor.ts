import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('API-Gateway');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req;
    
    const { method, url, headers } = request;
    const userAgent = headers['user-agent'] || 'unknown';
    const ip = headers['x-forwarded-for'] || request.ip;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - now;
          this.logger.log({
            method,
            url,
            userAgent,
            ip,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
          });
        },
        error: (error) => {
          const duration = Date.now() - now;
          this.logger.error({
            method,
            url,
            userAgent,
            ip,
            duration: `${duration}ms`,
            error: error.message,
            timestamp: new Date().toISOString(),
          });
        },
      }),
    );
  }
}
