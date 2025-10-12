import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth() {
    const health = await this.healthService.getHealth();
    return {
      ...health,
      license: 'GNU AGPL-3.0',
      copyright: '© 2024 MASTERFABRIC Bilişim Teknolojileri A.Ş.',
      author: '@gurkanfikretgunak',
      repository: 'https://github.com/masterfabric/masterfabric'
    };
  }

  @Get('ready')
  async getReadiness() {
    return this.healthService.getReadiness();
  }

  @Get('live')
  async getLiveness() {
    return this.healthService.getLiveness();
  }
}
