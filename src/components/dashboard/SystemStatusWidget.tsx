import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/data-display/card';
import { Badge } from '@/components/ui/data-display/badge';
import { Button } from '@/components/ui/forms/button';
import { useAuth } from '../../contexts/AuthContext';
import { fetchApi } from '../../lib/api';
import { Skeleton } from '@/components/ui/feedback/skeleton';
import { 
  Server, 
  Activity, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Zap, 
  ShieldCheck 
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toast } from 'sonner';

interface ServiceCheck {
  name: string;
  url: string;
  status: 'Operational' | 'Degraded' | 'Down';
  latency: number;
  timestamp: string;
  lastResponseCode?: number;
}

export function SystemStatusWidget() {
  const { token, profile } = useAuth();
  const [statuses, setStatuses] = useState<ServiceCheck[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pingingService, setPingingService] = useState<string | null>(null);

  const fetchStatus = async (showToast = false) => {
    if (!token) return;
    if (showToast) setIsRefreshing(true);
    
    try {
      const data = await fetchApi('/system-status', token);
      if (data && data.statuses) {
        setStatuses(data.statuses);
        setHistory(data.history || []);
      }
      if (showToast) {
        toast.success('System status refreshed successfully!');
      }
    } catch (err) {
      console.error('Failed to fetch system status:', err);
      if (showToast) {
        toast.error('Failed to update connection metrics.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll every 45 seconds for fresh data
    const interval = setInterval(() => fetchStatus(false), 45000);
    return () => clearInterval(interval);
  }, [token]);

  const handlePingService = async (serviceName: string) => {
    if (!token) return;
    setPingingService(serviceName);
    
    try {
      const response = await fetch('/api/system-status/ping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ serviceName })
      });
      
      if (response.ok) {
        const updatedService: ServiceCheck = await response.json();
        setStatuses(prev => prev.map(s => s.name === serviceName ? updatedService : s));
        toast.success(`Pinged ${serviceName}: ${updatedService.latency}ms (${updatedService.status})`);
        // Refresh full history to update chart
        const data = await fetchApi('/system-status', token);
        if (data && data.history) {
          setHistory(data.history);
        }
      } else {
        toast.error(`Failed to ping ${serviceName}`);
      }
    } catch (err) {
      console.error(err);
      toast.error(`Error connecting to ${serviceName}`);
    } finally {
      setPingingService(null);
    }
  };

  const handlePingAll = async () => {
    if (!token) return;
    setIsRefreshing(true);
    
    try {
      const response = await fetch('/api/system-status/ping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      
      if (response.ok) {
        const data = await response.json();
        setStatuses(data.statuses);
        setHistory(data.history || []);
        toast.success('All services pinged and metrics updated.');
      } else {
        toast.error('Failed to ping all services');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error pinging external logistics APIs');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Helper to determine status style
  const getStatusBadge = (status: 'Operational' | 'Degraded' | 'Down') => {
    switch (status) {
      case 'Operational':
        return (
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border-none font-medium flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Operational
          </Badge>
        );
      case 'Degraded':
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border-none font-medium flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Degraded
          </Badge>
        );
      case 'Down':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 border-none font-medium flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" /> Down
          </Badge>
        );
      default:
        return null;
    }
  };

  // Compute overall health stats
  const totalServices = statuses.length;
  const operationalCount = statuses.filter(s => s.status === 'Operational').length;
  const degradedCount = statuses.filter(s => s.status === 'Degraded').length;
  const downCount = statuses.filter(s => s.status === 'Down').length;

  const isDark = profile?.theme === 'dark';
  const axisColor = isDark ? '#a1a1aa' : '#71717a';
  const gridColor = isDark ? '#27272a' : '#e4e4e7';
  const tooltipBg = isDark ? '#18181b' : '#ffffff';
  const tooltipBorder = isDark ? '#27272a' : '#e4e4e7';
  const tooltipText = isDark ? '#f4f4f5' : '#18181b';

  return (
    <Card id="system-status-widget-card" className="col-span-12 flex flex-col border border-border shadow-sm">
      <CardHeader className="pb-4 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Server className="w-5 h-5 text-blue-500 animate-pulse" /> SCM Integration Gateway Status
          </CardTitle>
          <CardDescription>Real-time uptime, connectivity, and response latency metrics for connected external logistics APIs</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            id="system-status-ping-all-btn"
            variant="outline" 
            size="sm" 
            onClick={handlePingAll} 
            disabled={isRefreshing || isLoading}
            className="text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Pinging Gateway...' : 'Ping All Services'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-6 space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
            <Skeleton className="h-[250px] w-full" />
          </div>
        ) : (
          <>
            {/* Summary Banner */}
            <div 
              id="system-status-summary-banner" 
              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                downCount > 0 
                  ? 'bg-red-50/50 border-red-100 dark:bg-red-950/15 dark:border-red-900/30' 
                  : degradedCount > 0 
                  ? 'bg-amber-50/50 border-amber-100 dark:bg-amber-950/15 dark:border-amber-900/30' 
                  : 'bg-emerald-50/40 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/30'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${
                  downCount > 0 
                    ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
                    : degradedCount > 0 
                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' 
                    : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                }`}>
                  {downCount > 0 ? (
                    <AlertTriangle className="w-5 h-5 animate-bounce" />
                  ) : (
                    <ShieldCheck className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">
                    {downCount > 0 
                      ? `${downCount} API Integration experiencing outages` 
                      : degradedCount > 0 
                      ? 'Some SCM endpoints experiencing elevated latency' 
                      : 'All Connected Logistics APIs Operational'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Uptime statistics and round-trip routing benchmarks are proactively evaluated from the edge gateway container to ensure seamless EDI / tracking transactions.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 shrink-0 font-mono text-xs text-muted-foreground bg-card/60 px-4 py-2 rounded-lg border border-border">
                <div className="flex flex-col items-center">
                  <span className="text-xs text-muted-foreground font-sans">Active Gateway</span>
                  <span className="text-sm font-semibold text-foreground mt-0.5">5 / 5</span>
                </div>
                <div className="h-6 w-px bg-border" />
                <div className="flex flex-col items-center">
                  <span className="text-xs text-muted-foreground font-sans">System Uptime</span>
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {totalServices > 0 ? Math.round(((totalServices - downCount) / totalServices) * 100) : 100}%
                  </span>
                </div>
              </div>
            </div>

            {/* Service Status Cards Grid */}
            <div id="service-status-cards-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {statuses.map((service) => {
                const isPinging = pingingService === service.name;
                const statusColor = service.status === 'Operational' ? 'emerald' : service.status === 'Degraded' ? 'amber' : 'red';
                
                return (
                  <div 
                    key={service.name} 
                    className="p-4 rounded-xl border border-border bg-card hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs font-mono tracking-tight text-foreground truncate max-w-[120px]" title={service.name}>
                          {service.name}
                        </span>
                        {getStatusBadge(service.status)}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate" title={service.url}>
                        {service.url}
                      </p>
                    </div>

                    <div className="flex items-end justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 font-mono text-sm font-semibold">
                          <Zap className={`w-3.5 h-3.5 text-${statusColor}-500`} />
                          <span>{service.status === 'Down' ? '--' : `${service.latency}ms`}</span>
                        </div>
                        <span className="block text-[9px] text-muted-foreground/80">
                          Response Code: {service.lastResponseCode || 'N/A'}
                        </span>
                      </div>

                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7 rounded-md" 
                        disabled={isPinging || isRefreshing}
                        onClick={() => handlePingService(service.name)}
                        title={`Ping ${service.name} manually`}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Historical Latency Graph */}
            <div id="system-status-latency-graph-container" className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-primary" /> Latency Benchmark Trend (ms)
                  </h4>
                  <p className="text-xs text-muted-foreground">Historical trend analysis showing connectivity latency over the last 15 minutes</p>
                </div>
              </div>

              <div className="h-[250px] w-full border border-border rounded-xl p-4 bg-zinc-50/30 dark:bg-zinc-950/10">
                {history.length === 0 ? (
                  <div className="h-full w-full flex flex-col items-center justify-center text-xs text-muted-foreground">
                    <Clock className="w-8 h-8 mb-2 animate-pulse" />
                    <span>Awaiting latency metric history...</span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                      <XAxis dataKey="timestamp" stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft', offset: 0, style: { fontSize: '10px', fill: axisColor } }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText, borderRadius: '6px', fontSize: '11px' }}
                        itemStyle={{ color: tooltipText }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }} />
                      <Line type="monotone" dataKey="Gemini API" stroke="#8b5cf6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="OSRM Routing" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="Open-Meteo Weather" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="DHL API" stroke="#eab308" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="Maersk API" stroke="#f43f5e" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
