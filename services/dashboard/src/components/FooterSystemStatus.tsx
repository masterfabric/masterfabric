'use client';

import { useQuery } from '@apollo/client';
import { SYSTEM_HEALTH_QUERY, SystemHealth } from '@/lib/health';

export function FooterSystemStatus() {
  const { data, loading, error } = useQuery<{ systemHealth: SystemHealth }>(
    SYSTEM_HEALTH_QUERY,
    {
      pollInterval: 30000, // Poll every 30 seconds (less frequent than header indicator)
      fetchPolicy: 'network-only',
      notifyOnNetworkStatusChange: true,
    }
  );

  // Get status color based on service status
  const getStatusColor = (status: string): string => {
    const normalizedStatus = status?.toLowerCase() || 'unknown';
    
    if (normalizedStatus === 'healthy' || normalizedStatus === 'ok' || normalizedStatus === 'up') {
      return 'bg-green-500';
    } else if (normalizedStatus === 'degraded' || normalizedStatus === 'warning') {
      return 'bg-yellow-500';
    } else if (normalizedStatus === 'unhealthy' || normalizedStatus === 'down' || normalizedStatus === 'error') {
      return 'bg-red-500';
    } else {
      return 'bg-gray-400';
    }
  };

  // Build services list with proper ordering
  const buildServicesList = () => {
    const defaultServices = [
      { name: 'Dashboard', status: 'healthy' },
      { name: 'API Gateway', status: 'unknown' },
      { name: 'Core Service', status: 'unknown' },
      { name: 'Tenant Runtime', status: 'unknown' },
    ];

    if (loading || error || !data?.systemHealth?.services) {
      return defaultServices;
    }

    // Map API service names to display names
    const serviceMap: Record<string, string> = {
      'api-gateway': 'API Gateway',
      'API Gateway': 'API Gateway',
      'core-service': 'Core Service',
      'Core Service': 'Core Service',
      'tenant-runtime': 'Tenant Runtime',
      'Tenant Runtime': 'Tenant Runtime',
    };

    // Create a map of services from API response
    const apiServicesMap = new Map<string, string>();
    data.systemHealth.services.forEach(service => {
      const displayName = serviceMap[service.name] || service.name;
      apiServicesMap.set(displayName, service.status);
    });

    // Update default services with actual status
    return defaultServices.map(service => ({
      name: service.name,
      status: apiServicesMap.get(service.name) || service.status,
    }));
  };

  const services = buildServicesList();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">System Status</h3>
      <div className="space-y-2 text-sm">
        {services.map((service) => (
          <div key={service.name} className="flex items-center gap-2">
            <div 
              className={`w-2 h-2 rounded-full ${getStatusColor(service.status)}`}
              aria-label={`${service.name}: ${service.status}`}
              title={`${service.name}: ${service.status}`}
            ></div>
            <span className="text-muted-foreground">{service.name}</span>
          </div>
        ))}
      </div>
      {error && (
        <p className="text-xs text-muted-foreground/60">
          Unable to fetch live status
        </p>
      )}
    </div>
  );
}

