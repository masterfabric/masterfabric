import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';

@Injectable()
export class TenantExtractorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Check if it's a GraphQL request
    const gqlContext = GqlExecutionContext.create(context);
    const ctx = gqlContext.getContext();
    
    let request;
    if (ctx && ctx.req) {
      // GraphQL request
      request = ctx.req;
    } else {
      // HTTP request
      request = context.switchToHttp().getRequest();
    }
    
    if (request && request.headers) {
      const host = request.headers.host || '';
      
      // Extract subdomain: tenant-prod.masterfabric.co -> tenant-prod
      // For localhost development: localhost:3000 -> localhost
      const subdomain = host.split('.')[0];
      
      // Attach to request for downstream use
      request.tenantSlug = subdomain;
    }
    
    return next.handle();
  }
}
