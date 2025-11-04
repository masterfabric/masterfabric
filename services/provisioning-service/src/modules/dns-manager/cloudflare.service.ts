import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class CloudflareService {
  private readonly logger = new Logger(CloudflareService.name);
  private readonly apiToken: string;
  private readonly zoneId: string;
  private readonly baseUrl = 'https://api.cloudflare.com/client/v4';

  constructor() {
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN;
    this.zoneId = process.env.CLOUDFLARE_ZONE_ID;

    if (!this.apiToken || !this.zoneId) {
      this.logger.warn('Cloudflare credentials not provided. DNS management will be disabled.');
    }
  }

  async createCNAME(slug: string): Promise<void> {
    if (!this.apiToken || !this.zoneId) {
      this.logger.warn('Skipping DNS creation - Cloudflare credentials not configured');
      return;
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/zones/${this.zoneId}/dns_records`,
        {
          type: 'CNAME',
          name: slug,
          content: 'api-gateway.masterfabric.co', // This should be your actual gateway domain
          ttl: 1, // Auto TTL
          proxied: true, // Enable Cloudflare proxy for SSL
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.data.success) {
        this.logger.log(`Successfully created CNAME record for ${slug}`);
      } else {
        throw new Error(`Cloudflare API error: ${response.data.errors}`);
      }
    } catch (error) {
      this.logger.error(`Failed to create CNAME record for ${slug}:`, error.message);
      throw error;
    }
  }

  async createRecord(
    subdomain: string,
    domain: string,
    type: string,
    value: string,
    ttl: number = 1,
    proxied: boolean = true,
  ): Promise<string> {
    if (!this.apiToken || !this.zoneId) {
      this.logger.warn('Skipping DNS creation - Cloudflare credentials not configured');
      return 'mock-record-id';
    }

    try {
      const name = subdomain ? `${subdomain}.${domain}` : domain;
      
      const response = await axios.post(
        `${this.baseUrl}/zones/${this.zoneId}/dns_records`,
        {
          type: type.toUpperCase(),
          name,
          content: value,
          ttl,
          proxied: type.toUpperCase() === 'CNAME' || type.toUpperCase() === 'A' ? proxied : false,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.data.success) {
        this.logger.log(`Successfully created ${type} record: ${name} -> ${value}`);
        return response.data.result.id;
      } else {
        throw new Error(`Cloudflare API error: ${JSON.stringify(response.data.errors)}`);
      }
    } catch (error) {
      this.logger.error(`Failed to create DNS record:`, error.message);
      throw error;
    }
  }

  async deleteCNAME(slug: string): Promise<void> {
    if (!this.apiToken || !this.zoneId) {
      this.logger.warn('Skipping DNS deletion - Cloudflare credentials not configured');
      return;
    }

    try {
      // First, find the DNS record
      const listResponse = await axios.get(
        `${this.baseUrl}/zones/${this.zoneId}/dns_records`,
        {
          params: {
            type: 'CNAME',
            name: slug,
          },
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
          },
        },
      );

      if (listResponse.data.success && listResponse.data.result.length > 0) {
        const recordId = listResponse.data.result[0].id;

        // Delete the record
        const deleteResponse = await axios.delete(
          `${this.baseUrl}/zones/${this.zoneId}/dns_records/${recordId}`,
          {
            headers: {
              Authorization: `Bearer ${this.apiToken}`,
            },
          },
        );

        if (deleteResponse.data.success) {
          this.logger.log(`Successfully deleted CNAME record for ${slug}`);
        } else {
          throw new Error(`Cloudflare API error: ${deleteResponse.data.errors}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to delete CNAME record for ${slug}:`, error.message);
      throw error;
    }
  }

  async deleteRecord(recordId: string): Promise<void> {
    if (!this.apiToken || !this.zoneId) {
      this.logger.warn('Skipping DNS deletion - Cloudflare credentials not configured');
      return;
    }

    try {
      const response = await axios.delete(
        `${this.baseUrl}/zones/${this.zoneId}/dns_records/${recordId}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
          },
        },
      );

      if (response.data.success) {
        this.logger.log(`Successfully deleted DNS record: ${recordId}`);
      } else {
        throw new Error(`Cloudflare API error: ${JSON.stringify(response.data.errors)}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete DNS record:`, error.message);
      throw error;
    }
  }
}
