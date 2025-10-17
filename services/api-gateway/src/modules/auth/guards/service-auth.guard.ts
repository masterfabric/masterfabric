// services/api-gateway/src/modules/auth/guards/service-auth.guard.ts

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthService } from '../auth.service';

@Injectable()
export class ServiceAuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const { req } = ctx.getContext();

    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      throw new UnauthorizedException('Service API Key required');
    }

    const serviceAuth = await this.authService.validateServiceApiKey(apiKey);
    
    if (!serviceAuth) {
      throw new UnauthorizedException('Invalid Service API Key');
    }

    // Context'e ekle
    req.service = serviceAuth;
    
    return true;
  }
}