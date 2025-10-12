export { GET_SYSTEM_HEALTH as SYSTEM_HEALTH_QUERY } from './graphql';

export interface ServiceHealth {
  name: string;
  status: string;
  message?: string;
  lastChecked?: string;
  responseTime?: number;
}

export interface SystemHealth {
  overallStatus: string;
  services: ServiceHealth[];
  timestamp: string;
}

