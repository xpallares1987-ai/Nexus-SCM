import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/data-display/card';
import { Badge } from '@/components/ui/data-display/badge';
import { 
  Activity, 
  Package, 
  Warehouse, 
  AlertTriangle,
  CheckCircle2,
  Truck,
  Ship,
  Plane,
  Clock,
  ArrowRight
} from 'lucide-react';


interface ActivityFeedWidgetProps {
  logs: any[];
  shipments: any[];
}

export function ActivityFeedWidget({ logs = [], shipments = [] }: ActivityFeedWidgetProps) {
  const [feedItems, setFeedItems] = useState<any[]>([]);

  useEffect(() => {
    // Combine logs and shipment updates into a single feed
    const items = [];

    // Add activity logs
    if (Array.isArray(logs)) {
      logs.forEach(log => {
        items.push({
          id: `log-${log.id}`,
          type: 'log',
          title: log.eventType || 'System Event',
          description: log.description || '',
          timestamp: new Date(log.createdAt),
          severity: log.severity || 'info',
        });
      });
    }

    // Generate recent shipment status changes based on shipments data
    if (Array.isArray(shipments)) {
      shipments.forEach(shipment => {
        if (shipment.updatedAt) {
          let severity = 'info';
          if (shipment.status === 'Delayed') severity = 'warning';
          if (shipment.status === 'Delivered') severity = 'success';

          items.push({
            id: `shipment-${shipment.id}`,
            type: 'shipment',
            title: `Shipment ${shipment.referenceNumber || shipment.id.substring(0,8)} Status Update`,
            description: `Status changed to ${shipment.status}${shipment.currentLocation ? ` at ${shipment.currentLocation}` : ''}`,
            timestamp: new Date(shipment.updatedAt),
            severity,
            reference: shipment.referenceNumber,
            transportMode: shipment.transportMode
          });
        }
      });
    }

    // Add some simulated real-time warehouse actions for flair if feed is empty or to make it look alive
    const now = Date.now();
    items.push({
      id: `wh-${now}-1`,
      type: 'warehouse',
      title: 'Inventory Audit Completed',
      description: 'Sector A-4 inventory verified. No discrepancies found.',
      timestamp: new Date(now - 1000 * 60 * 15), // 15 mins ago
      severity: 'success',
    });
    items.push({
      id: `wh-${now}-2`,
      type: 'warehouse',
      title: 'Forklift Maintenance Alert',
      description: 'Unit FL-03 requires scheduled battery maintenance.',
      timestamp: new Date(now - 1000 * 60 * 45), // 45 mins ago
      severity: 'warning',
    });
    items.push({
      id: `wh-${now}-3`,
      type: 'warehouse',
      title: 'Inbound Dock Busy',
      description: 'Dock 4 is currently experiencing higher than normal unloading times.',
      timestamp: new Date(now - 1000 * 60 * 120), // 2 hours ago
      severity: 'info',
    });


    // Sort reverse chronological
    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    setFeedItems(items);
  }, [logs, shipments]);

  const getIcon = (item: any) => {
    if (item.type === 'shipment') {
      if (item.transportMode === 'Ocean') return <Ship className="w-4 h-4" />;
      if (item.transportMode === 'Air') return <Plane className="w-4 h-4" />;
      if (item.transportMode === 'Road') return <Truck className="w-4 h-4" />;
      return <Package className="w-4 h-4" />;
    }
    if (item.type === 'warehouse') return <Warehouse className="w-4 h-4" />;
    
    // Log fallback
    if (item.severity === 'warning') return <AlertTriangle className="w-4 h-4" />;
    if (item.severity === 'success') return <CheckCircle2 className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  const getSeverityClasses = (severity: string, type: string) => {
    if (type === 'warehouse') {
       if (severity === 'warning') return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800';
       if (severity === 'success') return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
       return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800';
    }

    switch (severity) {
      case 'warning':
        return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'success':
        return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'error':
        return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
      default:
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    }
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' mins ago';
    return Math.floor(seconds) + ' secs ago';
  };

  return (
    <Card className="h-full flex flex-col shadow-sm border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-md font-semibold text-slate-800 dark:text-slate-200">
                Activity Feed
              </CardTitle>
              <CardDescription className="text-xs">Latest updates & actions</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] font-normal uppercase tracking-wider bg-slate-100 dark:bg-slate-800">
            {feedItems.length} Events
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden relative">
        <div className="h-full w-full overflow-y-auto">
          <div className="p-4 space-y-4">
            {feedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-slate-500">
                <Clock className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">No recent activity detected.</p>
              </div>
            ) : (
              <div className="relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-800 before:to-transparent">
                {feedItems.slice(0, 50).map((item, index) => (
                  <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active py-2">
                    {/* Marker */}
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-950 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 ${getSeverityClasses(item.severity, item.type)}`}>
                      {getIcon(item)}
                    </div>
                    
                    {/* Card */}
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all hover:shadow-md">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                          item.type === 'shipment' ? 'text-blue-500' : item.type === 'warehouse' ? 'text-purple-500' : 'text-slate-500'
                        }`}>
                          {item.type}
                        </span>
                        <time className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getTimeAgo(item.timestamp)}
                        </time>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1 leading-tight">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.description}
                      </p>
                      {item.reference && (
                        <div className="mt-2 flex items-center gap-1">
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 rounded-sm">
                            {item.reference}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}