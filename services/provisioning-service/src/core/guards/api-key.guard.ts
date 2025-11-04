// services/provisioning-service/src/core/guards/api-key.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

export const IS_PUBLIC_KEY = 'isPublic';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(
    private configService: ConfigService,
    private reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Get request from GraphQL context
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req;

    const apiKey = request.headers['x-api-key'];
    const expectedApiKey = this.configService.get('SERVICE_API_KEY') || 
                          this.configService.get('PROVISIONING_SERVICE_API_KEY');

    if (!apiKey) {
      this.logger.warn('API Key missing in request headers');
      throw new UnauthorizedException('API Key is required');
    }

    if (apiKey !== expectedApiKey) {
      this.logger.warn(`Invalid API Key attempted: ${apiKey.substring(0, 10)}...`);
      throw new UnauthorizedException('Invalid API Key');
    }

    this.logger.debug('✅ API Key validated successfully');
    return true;
  }
}

