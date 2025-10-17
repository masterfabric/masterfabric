// services/api-gateway/src/modules/auth/auth.service.ts

import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RedisClusterService } from '../cache/redis-cluster.service';

export interface ServiceAuthPayload {
  serviceName: string;
  apiKey: string;
  permissions: string[];
}

export interface UserAuthPayload {
  userId: string;
  email: string;
  tenantId?: string;
  roles: string[];
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  
  private readonly serviceApiKeys: Map<string, string>;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisCluster: RedisClusterService,
  ) {
    // Service API Keys yükle
    this.serviceApiKeys = new Map([
      ['core', this.configService.get('CORE_SERVICE_API_KEY')],
      ['provisioning', this.configService.get('PROVISIONING_SERVICE_API_KEY')],
      ['tenant-runtime', this.configService.get('TENANT_RUNTIME_API_KEY')],
    ]);
  }

  // ========================================
  // SERVICE-TO-SERVICE AUTHENTICATION
  // ========================================

  async validateServiceApiKey(apiKey: string): Promise<ServiceAuthPayload | null> {
    if (!apiKey) {
      return null;
    }

    // Cache'de kontrol et
    const cacheKey = `service-auth:${apiKey}`;
    const cached = await this.redisCluster.get<ServiceAuthPayload>(cacheKey);
    if (cached) {
      this.logger.debug(`✅ Service API Key validated from cache`);
      return cached;
    }

    // API Key'i kontrol et
    for (const [serviceName, validApiKey] of this.serviceApiKeys.entries()) {
      if (apiKey === validApiKey) {
        const payload: ServiceAuthPayload = {
          serviceName,
          apiKey,
          permissions: this.getServicePermissions(serviceName),
        };

        // Cache'e kaydet (1 saat)
        await this.redisCluster.set(cacheKey, payload, 3600);
        
        this.logger.log(`✅ Service authenticated: ${serviceName}`);
        return payload;
      }
    }

    this.logger.warn(`❌ Invalid service API key attempted`);
    return null;
  }

  private getServicePermissions(serviceName: string): string[] {
    const permissions = {
      'core': ['read:platform', 'write:platform', 'admin:platform'],
      'provisioning': ['read:tenants', 'write:tenants', 'provision:tenants'],
      'tenant-runtime': ['read:tenant-data', 'write:tenant-data'],
    };
    return permissions[serviceName] || [];
  }

  // ========================================
  // USER JWT AUTHENTICATION
  // ========================================

  async validateJwtToken(token: string): Promise<UserAuthPayload> {
    try {
      // Cache'de blacklist kontrolü
      const blacklisted = await this.redisCluster.exists(`blacklist:${token}`);
      if (blacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      this.logger.debug(`✅ JWT validated for user: ${payload.userId}`);
      return {
        userId: payload.sub || payload.userId,
        email: payload.email,
        tenantId: payload.tenantId,
        roles: payload.roles || [],
      };
    } catch (error) {
      this.logger.warn(`❌ JWT validation failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async generateJwtToken(payload: UserAuthPayload): Promise<string> {
    return this.jwtService.signAsync({
      sub: payload.userId,
      email: payload.email,
      tenantId: payload.tenantId,
      roles: payload.roles,
    });
  }

  async revokeToken(token: string): Promise<void> {
    const decoded = this.jwtService.decode(token) as any;
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
    
    if (expiresIn > 0) {
      await this.redisCluster.set(`blacklist:${token}`, true, expiresIn);
      this.logger.log(`🚫 Token revoked for user: ${decoded.userId}`);
    }
  }

  // ========================================
  // AUTHORIZATION HELPERS
  // ========================================

  hasPermission(user: UserAuthPayload, requiredPermission: string): boolean {
    // Admin her şeyi yapabilir
    if (user.roles.includes('admin')) {
      return true;
    }

    // Role-based permission check
    const rolePermissions = {
      'admin': ['*'],
      'tenant-admin': ['read:tenant-data', 'write:tenant-data', 'manage:tenant-users'],
      'user': ['read:tenant-data', 'write:own-data'],
    };

    for (const role of user.roles) {
      const permissions = rolePermissions[role] || [];
      if (permissions.includes('*') || permissions.includes(requiredPermission)) {
        return true;
      }
    }

    return false;
  }
}