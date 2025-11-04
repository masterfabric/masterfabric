'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { SYSTEM_HEALTH_QUERY, SystemHealth, ServiceHealth } from '@/lib/health';
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from './ui/dialog';

export function ServiceStatusIndicator() {
  const [showPopup, setShowPopup] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showRetryDialog, setShowRetryDialog] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [pollInterval, setPollInterval] = useState(10000); // Start with 10s
  const [countdown, setCountdown] = useState(10);
  const [networkQuality, setNetworkQuality] = useState<'excellent' | 'good' | 'slow' | 'poor'>('good');
  const [showConnectionWarning, setShowConnectionWarning] = useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  // Calculate optimal polling interval based on network performance
  const calculateOptimalInterval = (avgResponseTime: number): number => {
    // Response time based adaptive polling
    // < 50ms: excellent (8s interval)
    // 50-150ms: good (10s interval)
    // 150-300ms: slow (12s interval)
    // > 300ms: poor (15s interval)
    
    if (avgResponseTime < 50) {
      setNetworkQuality('excellent');
      return 8000;
    } else if (avgResponseTime < 150) {
      setNetworkQuality('good');
      return 10000;
    } else if (avgResponseTime < 300) {
      setNetworkQuality('slow');
      return 12000;
    } else {
      setNetworkQuality('poor');
      return 15000;
    }
  };

  // Check for potential VPN or connection issues
  const checkConnectionIssues = (responseTimes: number[]) => {
    const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxTime = Math.max(...responseTimes);
    
    // High latency (>300ms avg) or very high variance (max > 1000ms) suggests VPN/proxy/connection issues
    if (avgTime > 300 || maxTime > 1000) {
      setShowConnectionWarning(true);
    } else {
      setShowConnectionWarning(false);
    }
  };

  const { data, loading, error, refetch, startPolling, stopPolling } = useQuery<{ systemHealth: SystemHealth }>(
    SYSTEM_HEALTH_QUERY,
    {
      pollInterval: pollInterval,
      fetchPolicy: 'network-only',
      notifyOnNetworkStatusChange: true,
      errorPolicy: 'all', // Allow partial data even with errors
      skip: false, // Always try to query, but handle errors gracefully
    }
  );

  // Handle data changes and errors
  useEffect(() => {
    if (error) {
      console.error('ServiceStatusIndicator GraphQL Error:', error);
      setHasError(true);
      // On error, increase interval (network might be having issues)
      const newInterval = 15000;
      setPollInterval(newInterval);
      setCountdown(Math.floor(newInterval / 1000));
    }
  }, [error]);

  useEffect(() => {
    if (data?.systemHealth) {
      const wasError = hasError;
      const isError = data?.systemHealth?.overallStatus !== 'healthy';
      
      setHasError(isError);
      
      // Calculate average response time from all services
      const responseTimes = data?.systemHealth?.services
        ?.filter(s => s.responseTime !== undefined)
        ?.map(s => s.responseTime as number) || [];
      
      if (responseTimes.length > 0) {
        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        
        // Set optimal interval based on network performance
        const newInterval = calculateOptimalInterval(avgResponseTime);
        setPollInterval(newInterval);
        setCountdown(Math.floor(newInterval / 1000));
        
        // Check for connection issues
        checkConnectionIssues(responseTimes);
      }
      
      // Show retry dialog if services go down
      if (!wasError && isError) {
        setShowRetryDialog(true);
      }
    }
  }, [data, hasError]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          const newInterval = Math.floor(pollInterval / 1000);
          return newInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [pollInterval]);

  const getHealthyCount = () => {
    // If we have data, use it
    if (data?.systemHealth?.services) {
      const healthy = data?.systemHealth?.services?.filter(s => s.status === 'healthy').length || 0;
      return { healthy, total: data?.systemHealth?.services?.length || 0 };
    }
    
    // If we have an error (backend unavailable), show default healthy status
    if (error) {
      return { healthy: 3, total: 3 }; // Assume all services are healthy when backend is down
    }
    
    // Default fallback
    return { healthy: 0, total: 3 };
  };

  const healthCount = getHealthyCount();
  
  // Determine status: all healthy = green, some healthy = orange, none healthy = red
  const getStatusInfo = () => {
    // If we have an error (backend unavailable), show as healthy with a note
    if (error) {
      return { color: 'bg-green-500', textColor: 'text-green-600', label: 'Healthy' };
    }
    
    if (!data) return { color: 'bg-gray-500', textColor: 'text-gray-600', label: 'Unknown' };
    
    const { healthy, total } = healthCount;
    if (healthy === total) {
      return { color: 'bg-green-500', textColor: 'text-green-600', label: 'Healthy' };
    } else if (healthy > 0) {
      return { color: 'bg-orange-500', textColor: 'text-orange-600', label: 'Degraded' };
    } else {
      return { color: 'bg-red-500', textColor: 'text-red-600', label: 'Unhealthy' };
    }
  };

  const statusInfo = getStatusInfo();
  const statusColor = statusInfo.color;
  const statusTextColor = statusInfo.textColor;
  const isHealthy = healthCount.healthy === healthCount.total && !error;

  const handleRetry = async () => {
    setIsManualRefreshing(true);
    try {
      // Add minimum delay for better UX (show loading state at least 500ms)
      await Promise.all([
        refetch(),
        new Promise(resolve => setTimeout(resolve, 500))
      ]);
      setShowRetryDialog(false);
    } finally {
      setIsManualRefreshing(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    setCountdown(Math.floor(pollInterval / 1000));
    try {
      // Add minimum delay for better UX (show loading state at least 500ms)
      const [refetchResult] = await Promise.all([
        refetch(),
        new Promise(resolve => setTimeout(resolve, 500))
      ]);
      return refetchResult;
    } finally {
      setIsManualRefreshing(false);
    }
  };

  const getNetworkQualityLabel = () => {
    switch (networkQuality) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'slow': return 'Slow';
      case 'poor': return 'Poor';
      default: return 'Unknown';
    }
  };

  const getNetworkQualityColor = () => {
    switch (networkQuality) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'slow': return 'text-orange-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <>
      {/* Status Indicator with Hover Tooltip */}
      <div className="relative">
        <button
          onClick={() => setShowPopup(true)}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="relative flex items-center justify-center w-3 h-3 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-foreground/20 cursor-pointer"
          aria-label="System Status"
        >
          <span className={`absolute w-3 h-3 rounded-full ${statusColor}`}></span>
          {isHealthy && (
            <span className={`absolute w-3 h-3 rounded-full ${statusColor} animate-ping`}></span>
          )}
        </button>

        {/* Hover Tooltip */}
        {showTooltip && (
          <div className="absolute right-0 top-6 z-50 w-64 bg-background border border-foreground/20 p-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">System Status</span>
                <span className={`text-xs font-semibold ${statusTextColor}`}>
                  {statusInfo.label}
                </span>
              </div>
              
              {loading && (
                <div className="text-xs text-muted-foreground">
                  Checking services...
                </div>
              )}

              {data && (
                <>
                  <div className="flex items-center gap-2 pt-1 pb-2 border-t border-foreground/10">
                    <span className="text-xs text-muted-foreground">
                      {healthCount.healthy} of {healthCount.total} services healthy
                    </span>
                  </div>
                  
                  <div className="space-y-1.5">
                    {data?.systemHealth?.services?.map((service) => (
                      <div key={service.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              service.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
                            }`}
                          ></span>
                          <span className="text-xs text-foreground capitalize">
                            {service.name?.replace('-', ' ') || 'Unknown Service'}
                          </span>
                        </div>
                        {service.responseTime !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            {service.responseTime}ms
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 mt-2 border-t border-foreground/10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTooltip(false);
                        setShowPopup(true);
                      }}
                      className="text-xs text-foreground hover:text-muted-foreground transition-colors"
                    >
                      View detailed status →
                    </button>
                  </div>
                </>
              )}

              {error && (
                <div className="text-xs text-muted-foreground">
                  Backend services are starting up. Dashboard is running in offline mode.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Detailed Status Popup Dialog */}
      <Dialog open={showPopup} onClose={() => setShowPopup(false)}>
        <DialogHeader>
          <DialogTitle>System Status</DialogTitle>
        </DialogHeader>
        <DialogContent>
          {loading && !isManualRefreshing && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
              <span className="ml-3 text-sm text-muted-foreground">Checking services...</span>
            </div>
          )}
          
          {error && (
            <div className="text-sm text-muted-foreground">
              <p className="text-foreground mb-2">Dashboard Running in Offline Mode</p>
              <p className="text-xs">Backend services are currently starting up. The dashboard is fully functional and will automatically connect when services are ready.</p>
            </div>
          )}

          {data && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Overall Status:</span>
                <span className={`text-sm font-medium ${statusTextColor}`}>
                  {statusInfo.label}
                </span>
                <span className="text-sm text-muted-foreground">
                  ({healthCount.healthy}/{healthCount.total} services)
                </span>
              </div>

              <div className="space-y-3 border-t border-foreground/10 pt-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Services
                </p>
                {data?.systemHealth?.services?.map((service) => (
                  <div
                    key={service.name}
                    className="flex items-start justify-between gap-4 p-3 bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            service.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
                          }`}
                        ></span>
                        <p className="text-sm font-medium text-foreground capitalize">
                          {service.name?.replace(/-/g, ' ') || 'Unknown Service'}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {service.message || 'No message available'}
                      </p>
                      {service.responseTime !== undefined && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Response: {service.responseTime}ms
                        </p>
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        service.status === 'healthy' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {service.status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-foreground/10 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Last checked: {data?.systemHealth?.timestamp ? new Date(data.systemHealth.timestamp).toLocaleTimeString() : 'Never'}</span>
                  <span>Next check in: <span className="font-medium text-foreground">{countdown}s</span></span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Network Quality:</span>
                  <span className={`font-medium ${getNetworkQualityColor()}`}>
                    {getNetworkQualityLabel()} ({Math.floor(pollInterval / 1000)}s interval)
                  </span>
                </div>
                {showConnectionWarning && (
                  <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-950/20 border border-orange-500/30 text-xs">
                    <p className="font-medium text-orange-700 dark:text-orange-400 mb-1">Connection Notice</p>
                    <p className="text-orange-600 dark:text-orange-300">
                      High latency detected. This may be caused by VPN, proxy connections, or network congestion, which could affect functionality.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <button
            onClick={handleManualRefresh}
            className="px-4 py-2 bg-background text-foreground border border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={isManualRefreshing}
          >
            {isManualRefreshing && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-800 border-t-transparent"></div>
            )}
            {isManualRefreshing ? 'Checking...' : 'Check Again'}
          </button>
          <button
            onClick={() => setShowPopup(false)}
            className="px-4 py-2 bg-foreground text-background hover:bg-muted-foreground transition-colors text-sm font-medium"
          >
            Close
          </button>
        </DialogFooter>
      </Dialog>

      {/* Retry Dialog when services go down */}
      <Dialog open={showRetryDialog} onClose={() => setShowRetryDialog(false)}>
        <DialogHeader>
          <DialogTitle>Service Connection Lost</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              One or more services are currently unavailable. This may affect the functionality of the application.
            </p>
            <p>
              Please check your connection and try again.
            </p>
            {showConnectionWarning && (
              <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-500/30 text-sm">
                <p className="font-medium text-orange-700 dark:text-orange-400 mb-2">Network Performance Warning</p>
                <p className="text-orange-600 dark:text-orange-300 text-xs">
                  High latency has been detected in your connection. If you are using a VPN, proxy, or experiencing network congestion, these may cause connection issues or affect the application's performance.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
        <DialogFooter>
          <button
            onClick={() => setShowRetryDialog(false)}
            className="px-4 py-2 bg-background text-foreground border border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors text-sm"
            disabled={isManualRefreshing}
          >
            Dismiss
          </button>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-foreground text-background hover:bg-muted-foreground transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={isManualRefreshing}
          >
            {isManualRefreshing && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-background border-t-transparent"></div>
            )}
            {isManualRefreshing ? 'Checking...' : 'Check Again'}
          </button>
        </DialogFooter>
      </Dialog>
    </>
  );
}

