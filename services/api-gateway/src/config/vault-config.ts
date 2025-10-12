import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VaultConfigService {
  private readonly logger = new Logger(VaultConfigService.name);
  private vaultClient: any;
  private secrets: Map<string, any> = new Map();

  constructor(private configService: ConfigService) {}

  async initialize(): Promise<void> {
    try {
      const vaultAddr = this.configService.get('VAULT_ADDR');
      const vaultToken = this.configService.get('VAULT_TOKEN');

      if (!vaultAddr || !vaultToken) {
        this.logger.warn('Vault not configured, using environment variables');
        return;
      }

      // Dynamic import for Vault client
      const { default: vault } = await import('node-vault');
      
      this.vaultClient = vault({
        apiVersion: 'v1',
        endpoint: vaultAddr,
        token: vaultToken,
      });

      await this.loadSecrets();
      this.logger.log('Vault initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Vault:', error);
      this.logger.warn('Falling back to environment variables');
    }
  }

  private async loadSecrets(): Promise<void> {
    try {
      const response = await this.vaultClient.read('secret/data/api-gateway');
      const secrets = response.data.data;
      
      // Store secrets in memory
      Object.entries(secrets).forEach(([key, value]) => {
        this.secrets.set(key, value);
      });

      this.logger.log('Secrets loaded from Vault');
    } catch (error) {
      this.logger.error('Failed to load secrets from Vault:', error);
      throw error;
    }
  }

  getSecret(key: string): string | undefined {
    // First try Vault secrets
    if (this.secrets.has(key)) {
      return this.secrets.get(key);
    }

    // Fallback to environment variables
    return this.configService.get(key);
  }

  getRedisConfig(): { host: string; port: number } {
    return {
      host: this.getSecret('REDIS_HOST') || this.configService.get('REDIS_HOST') || 'localhost',
      port: parseInt(this.getSecret('REDIS_PORT') || this.configService.get('REDIS_PORT') || '6379'),
    };
  }

  getServiceUrls(): {
    coreServiceUrl: string;
    provisioningServiceUrl: string;
    tenantRuntimeUrl: string;
  } {
    return {
      coreServiceUrl: this.getSecret('CORE_SERVICE_URL') || 
                     this.configService.get('CORE_SERVICE_URL') || 
                     'http://localhost:3005/graphql',
      provisioningServiceUrl: this.getSecret('PROVISIONING_SERVICE_URL') || 
                             this.configService.get('PROVISIONING_SERVICE_URL') || 
                             'http://localhost:3003/graphql',
      tenantRuntimeUrl: this.getSecret('TENANT_RUNTIME_URL') || 
                       this.configService.get('TENANT_RUNTIME_URL') || 
                       'http://localhost:3004/graphql',
    };
  }

  getRateLimitConfig(): { ttl: number; max: number } {
    return {
      ttl: parseInt(this.getSecret('RATE_LIMIT_TTL') || this.configService.get('RATE_LIMIT_TTL') || '60000'),
      max: parseInt(this.getSecret('RATE_LIMIT_MAX') || this.configService.get('RATE_LIMIT_MAX') || '100'),
    };
  }

  getCacheConfig(): { ttl: number } {
    return {
      ttl: parseInt(this.getSecret('CACHE_TTL') || this.configService.get('CACHE_TTL') || '300'),
    };
  }
}
