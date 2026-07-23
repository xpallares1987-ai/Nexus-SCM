import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/data-display/card';
import { CheckCircle2, Clock, MapPin, Navigation, PackageCheck, Ship } from 'lucide-react';
import { Badge } from '@/components/ui/data-display/badge';

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-muted-foreground" /> Live Tracking Progress
            </span>
            {shipment.status === 'InTransit' && (
              <Badge variant="secondary" className="animate-pulse bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50">
                Live Updates Active
              </Badge>
            )}
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
      
      {/* Live Map Placeholder / External API Simulation */}
      {shipment.status === 'InTransit' && (
        <div className="relative h-48 rounded-lg overflow-hidden border border-border bg-background flex items-center justify-center">
           <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
           <div className="text-center space-y-2 z-10 p-4 bg-card/80 backdrop-blur-sm rounded-md shadow-sm border border-border">
             <Ship className="w-8 h-8 text-blue-500 mx-auto animate-bounce" />
             <p className="text-sm font-medium text-foreground">Vessel in Transit</p>
             <p className="text-xs text-muted-foreground">Live location tracking via external API integration enabled.</p>
             <p className="text-xs text-muted-foreground font-mono mt-2">Lat: 34.0522, Lng: -118.2437</p>
           </div>
        </div>
      )}
    </div>
  );
}
