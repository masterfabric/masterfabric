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
      const response = await this.vaultClient.read('secret/data/provisioning-service');
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

  getDatabaseUrl(): string {
    return this.getSecret('DATABASE_URL') || 
           this.configService.get('DATABASE_URL') || 
           'postgresql://postgres:postgres123@localhost:5432/masterfabric';
  }

  getRedisConfig(): { host: string; port: number } {
    return {
      host: this.getSecret('REDIS_HOST') || this.configService.get('REDIS_HOST') || 'localhost',
      port: parseInt(this.getSecret('REDIS_PORT') || this.configService.get('REDIS_PORT') || '6379'),
    };
  }

  getCloudflareConfig(): { apiToken: string; zoneId: string } {
    return {
      apiToken: this.getSecret('CLOUDFLARE_API_TOKEN') || this.configService.get('CLOUDFLARE_API_TOKEN') || '',
      zoneId: this.getSecret('CLOUDFLARE_ZONE_ID') || this.configService.get('CLOUDFLARE_ZONE_ID') || '',
    };
  }
}
