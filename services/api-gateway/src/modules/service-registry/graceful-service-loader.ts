// services/api-gateway/src/modules/service-registry/graceful-service-loader.ts

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ServiceRegistryService } from './service-registry.service';

interface ServiceConfig {
  name: string;
  url: string;
  apiKey: string;
  required: boolean; // Zorunlu mu?
  retryAttempts: number;
  retryDelay: number;
}

@Injectable()
export class GracefulServiceLoader implements OnModuleInit {
  private readonly logger = new Logger(GracefulServiceLoader.name);
  
  private services: ServiceConfig[] = [];
  private loadedServices: Set<string> = new Set();
  private failedServices: Map<string, { attempts: number; lastAttempt: Date }> = new Map();

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private serviceRegistry: ServiceRegistryService,
  ) {}

  private initializeServices() {
    // Servisleri tanımla
    this.services = [
      {
        name: 'core',
        url: this.configService.get('CORE_SERVICE_URL'),
        apiKey: this.configService.get('CORE_SERVICE_API_KEY'),
        required: true, // Core service zorunlu
        retryAttempts: 10,
        retryDelay: 5000, // 5 saniye
      },
      {
        name: 'provisioning',
        url: this.configService.get('PROVISIONING_SERVICE_URL'),
        apiKey: this.configService.get('PROVISIONING_SERVICE_API_KEY'),
        required: false,
        retryAttempts: 5,
        retryDelay: 3000,
      },
      {
        name: 'tenant-runtime',
        url: this.configService.get('TENANT_RUNTIME_URL'),
        apiKey: this.configService.get('TENANT_RUNTIME_API_KEY'),
        required: false,
        retryAttempts: 5,
        retryDelay: 3000,
      },
    ];
  }

  async onModuleInit() {
    this.logger.log('🔄 Starting graceful service loading...');
    
    // Initialize services if not already done
    if (this.services.length === 0) {
      this.initializeServices();
    }

    // Servisleri paralel olarak yükle
    await this.loadAllServices();

    // Başarısız servisleri arka planda denemeye devam et
    this.startBackgroundRetry();
  }

  /**
   * Load services synchronously before module initialization
   * This is used by the GraphQL module to ensure services are loaded
   */
  async loadServicesBeforeInit(): Promise<void> {
    if (this.services.length === 0) {
      this.initializeServices();
    }
    
    this.logger.log('🔄 Pre-loading services for GraphQL Gateway...');
    await this.loadAllServices();
  }

  private async loadAllServices() {
    const loadPromises = this.services.map(service => 
      this.loadService(service)
    );

    const results = await Promise.allSettled(loadPromises);

    results.forEach((result, index) => {
      const service = this.services[index];
      
      if (result.status === 'fulfilled' && result.value) {
        this.logger.log(`✅ ${service.name} service loaded successfully`);
        this.loadedServices.add(service.name);
        this.serviceRegistry.registerService(service.name, service.url, service.apiKey);
      } else {
        const errorMsg = result.status === 'rejected' ? result.reason : 'Unknown error';
        
        if (service.required) {
          this.logger.error(
            `❌ CRITICAL: Required service ${service.name} failed to load: ${errorMsg}`
          );
          this.logger.warn(
            `⚠️ API Gateway will continue, but ${service.name} functionality will be unavailable`
          );
        } else {
          this.logger.warn(
            `⚠️ Optional service ${service.name} failed to load: ${errorMsg}`
          );
        }

        // Failed services listesine ekle
        this.failedServices.set(service.name, {
          attempts: 0,
          lastAttempt: new Date(),
        });
      }
    });

    this.logger.log(
      `📊 Service loading complete: ${this.loadedServices.size}/${this.services.length} services available`
    );
  }

  private async loadService(service: ServiceConfig): Promise<boolean> {
    this.logger.debug(`🔌 Attempting to connect to ${service.name}...`);

    try {
      const healthUrl = service.url.replace('/graphql', '/health');
      
      const response = await firstValueFrom(
        this.httpService.get(healthUrl, {
          headers: {
            'x-api-key': service.apiKey,
          },
          timeout: 5000,
        })
      );

      if (response.status === 200) {
        this.logger.log(
          `✅ ${service.name} is healthy (v${response.data?.version || 'unknown'})`
        );
        return true;
      }

      throw new Error(`Health check returned status: ${response.status}`);
    } catch (error) {
      this.logger.debug(
        `❌ Failed to connect to ${service.name}: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Arka planda başarısız servisleri sürekli denemeye devam et
   */
  private startBackgroundRetry() {
    setInterval(async () => {
      if (this.failedServices.size === 0) {
        return; // Tüm servisler yüklü
      }

      this.logger.debug(
        `🔄 Retrying failed services: ${Array.from(this.failedServices.keys()).join(', ')}`
      );

      for (const [serviceName, status] of this.failedServices.entries()) {
        const service = this.services.find(s => s.name === serviceName);
        
        if (!service) continue;

        // Max retry aşıldı mı?
        if (status.attempts >= service.retryAttempts) {
          this.logger.warn(
            `⚠️ ${serviceName} max retry attempts reached (${service.retryAttempts}). ` +
            `Will keep trying indefinitely...`
          );
        }

        try {
          const loaded = await this.loadService(service);
          
          if (loaded) {
            this.logger.log(
              `🎉 ${serviceName} service recovered after ${status.attempts + 1} attempts!`
            );
            
            this.loadedServices.add(serviceName);
            this.failedServices.delete(serviceName);
            this.serviceRegistry.registerService(service.name, service.url, service.apiKey);
            
            // Alert: Service recovered
            await this.sendRecoveryAlert(serviceName);
          }
        } catch (error) {
          status.attempts++;
          status.lastAttempt = new Date();
          
          this.logger.debug(
            `❌ ${serviceName} retry attempt ${status.attempts} failed: ${error.message}`
          );
        }
      }
    }, 10000); // Her 10 saniyede bir dene
  }

  private async sendRecoveryAlert(serviceName: string) {
    this.logger.log(`🚨 ALERT: Service ${serviceName} has recovered!`);
    // TODO: Slack, email, etc.
  }

  // ========================================
  // PUBLIC API
  // ========================================

  isServiceLoaded(serviceName: string): boolean {
    return this.loadedServices.has(serviceName);
  }

  getLoadedServices(): string[] {
    return Array.from(this.loadedServices);
  }

  getFailedServices(): string[] {
    return Array.from(this.failedServices.keys());
  }

  getServiceStatus() {
    return {
      loaded: this.getLoadedServices(),
      failed: Array.from(this.failedServices.entries()).map(([name, status]) => ({
        name,
        attempts: status.attempts,
        lastAttempt: status.lastAttempt,
      })),
      total: this.services.length,
    };
  }
}