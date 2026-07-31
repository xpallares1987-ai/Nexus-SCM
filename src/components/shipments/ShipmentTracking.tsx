import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { CheckCircle2, Clock, MapPin, Navigation, PackageCheck, Ship, RefreshCcw } from 'lucide-react';
import { Badge } from '@/components/ui/data-display/badge';
import { Button } from '@/components/ui/forms/button';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';

interface TrackingEvent {
  id: string;
  eventType: string;
  description: string;
  createdAt: string;
  performedBy?: string;
  oldStatus?: string;
  newStatus?: string;
}

interface ShipmentTrackingProps {
  shipment: {
    id: string;
    referenceNumber: string;
    status: string;
    originPort: string;
    destinationPort: string;
    eta: string;
  };
  events: TrackingEvent[];
}

const MILESTONES = ['Draft', 'Booked', 'InTransit', 'Arrived', 'CustomsCleared', 'Delivered'];

export function ShipmentTracking({ shipment, events }: ShipmentTrackingProps) {
  const currentStatusIndex = MILESTONES.indexOf(shipment.status);
  const [isSimulating, setIsSimulating] = useState(false);
  
  const getMilestoneIcon = (status: string, index: number) => {
    if (index < currentStatusIndex || shipment.status === 'Delivered') {
      return <CheckCircle2 className="w-5 h-5 text-primary" />;
    }
    if (index === currentStatusIndex) {
      if (status === 'InTransit') return <Navigation className="w-5 h-5 text-blue-500 fill-blue-100" />;
      if (status === 'Arrived') return <MapPin className="w-5 h-5 text-amber-500 fill-amber-100" />;
      if (status === 'CustomsCleared') return <PackageCheck className="w-5 h-5 text-emerald-500 fill-emerald-100" />;
      if (status === 'Delivered') return <CheckCircle2 className="w-5 h-5 text-green-500 fill-green-100" />;
      return <Clock className="w-5 h-5 text-blue-500" />;
    }
    return <div className="w-3 h-3 rounded-full bg-zinc-200 border-2 border-border" />;
  };

  const handleSimulateUpdate = async () => {
    try {
      setIsSimulating(true);
      const token = localStorage.getItem('scm_token');
      await fetchApi(`/shipments/${shipment.id}/tracking/simulate`, token, {
        method: 'POST',
        body: JSON.stringify({
          location: 'Lat: ' + (Math.random() * 90).toFixed(4) + ', Lng: ' + (Math.random() * 180).toFixed(4),
          description: 'Automated GPS Ping received from vessel.'
        })
      });
      // Event will come through websocket
    } catch (e: any) {
      toast.error('Failed to simulate update');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-muted-foreground" /> Live Tracking Progress
            </span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleSimulateUpdate} disabled={isSimulating}>
                <RefreshCcw className={`w-3 h-3 mr-2 ${isSimulating ? 'animate-spin' : ''}`} />
                Simulate Location Ping
              </Button>
              {shipment.status === 'InTransit' && (
                <Badge variant="secondary" className="animate-pulse bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50">
                  Live Updates Active
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative pt-6 pb-2">
            {/* Connecting line background */}
            <div className="absolute left-8 right-8 top-10 h-0.5 bg-muted" />
            
            {/* Active connecting line */}
            <div 
              className="absolute left-8 top-10 h-0.5 bg-primary transition-all duration-500" 
              style={{ width: `calc(${Math.max(0, (currentStatusIndex / (MILESTONES.length - 1)) * 100)}% - 2rem)` }} 
            />

            <div className="relative flex justify-between">
              {MILESTONES.map((milestone, index) => {
                const isCompleted = index <= currentStatusIndex;
                const isCurrent = index === currentStatusIndex;
                
                return (
                  <div key={milestone} className="flex flex-col items-center group">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-card border-2 z-10 transition-colors
                      ${isCompleted ? 'border-primary' : 'border-border'}
                      ${isCurrent ? 'ring-4 ring-primary/20 shadow-md' : ''}
                    `}>
                      {getMilestoneIcon(milestone, index)}
                    </div>
                    <div className="mt-3 text-center">
                      <p className={`text-xs font-semibold ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {milestone}
                      </p>
                      {isCurrent && milestone === 'InTransit' && (
                        <p className="text-[10px] text-muted-foreground mt-1 max-w-[80px] leading-tight">
                          En route to {shipment.destinationPort}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Tracking Events History</CardTitle>
          <CardDescription>Recent updates for {shipment.referenceNumber}</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-sm text-muted-foreground italic py-4 text-center">No tracking events recorded yet.</div>
          ) : (
            <div className="space-y-4">
              {[...events].reverse().map((evt) => (
                <div key={evt.id} className="flex gap-4 items-start pb-4 border-b border-border last:border-0 last:pb-0">
                  <div className="mt-1">
                    {evt.eventType === 'Location Update' ? (
                      <MapPin className="w-4 h-4 text-blue-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{evt.eventType}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(evt.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{evt.description}</p>
                    {evt.oldStatus && evt.newStatus && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Status changed: {evt.oldStatus} &rarr; {evt.newStatus}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Map Placeholder / External API Simulation */}
      {shipment.status === 'InTransit' && (
        <div className="relative h-48 rounded-lg overflow-hidden border border-border bg-background flex items-center justify-center">
           <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
           <div className="text-center space-y-2 z-10 p-4 bg-card/80 backdrop-blur-sm rounded-md shadow-sm border border-border">
             <Ship className="w-8 h-8 text-blue-500 mx-auto animate-bounce" />
             <p className="text-sm font-medium text-foreground">Vessel in Transit</p>
             <p className="text-xs text-muted-foreground">Live location tracking via external API integration enabled.</p>
           </div>
        </div>
      )}
    </div>
  );
}
