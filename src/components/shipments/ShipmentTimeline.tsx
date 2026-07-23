import React from 'react';
import { 
  FileCheck, 
  ShieldCheck, 
  Truck, 
  MapPin, 
  Clock, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  FileText,
  RefreshCw,
  ArrowRight,
  Info
} from 'lucide-react';

interface TrackingEvent {
  id: string;
  eventType: string;
  description: string;
  createdAt: string;
  performedBy?: string;
  oldStatus?: string;
  newStatus?: string;
}

interface ShipmentTimelineProps {
  shipment?: {
    id: string;
    referenceNumber: string;
    status: string;
    type: string;
    originPort: string;
    destinationPort: string;
    eta?: string | null;
    etd?: string | null;
    ata?: string | null;
    atd?: string | null;
    createdAt?: string;
    updatedAt?: string;
  };
  events: TrackingEvent[];
}

export function ShipmentTimeline({ shipment, events = [] }: ShipmentTimelineProps) {
  if (!shipment) {
    return (
      <div className="mt-8 text-center p-6 border rounded-lg bg-card text-muted-foreground">
        <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground animate-pulse" />
        <p className="text-sm">Loading shipment timeline details...</p>
      </div>
    );
  }

  // --- MILESTONE EXTRACTION LOGIC ---
  const getBookingMilestone = () => {
    // Find the status change or comment related to booking/creation
    const bookingEvent = [...events].reverse().find(e => 
      e.newStatus === 'Booked' || 
      e.newStatus === 'Draft' || 
      e.description?.toLowerCase().includes('create') || 
      e.description?.toLowerCase().includes('booked')
    );
    const timestamp = bookingEvent?.createdAt || shipment.createdAt || new Date().toISOString();
    
    return {
      title: 'Booking Confirmed',
      status: 'completed' as const,
      timestamp,
      estimatedTime: null,
      icon: FileCheck,
      colorClass: 'text-emerald-500 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800',
      description: 'Shipment booking created & scheduled.'
    };
  };

  const getCustomsMilestone = () => {
    // Customs is cleared if current status is CustomsCleared or Delivered
    const isCompleted = ['CustomsCleared', 'Delivered'].includes(shipment.status);
    const isActive = shipment.status === 'Arrived'; // Typically cleared upon or near arrival
    
    const customsEvent = events.find(e => 
      e.newStatus === 'CustomsCleared' || 
      e.description?.toLowerCase().includes('customs cleared') || 
      e.description?.toLowerCase().includes('customs clearance')
    );
    
    const timestamp = customsEvent?.createdAt || (isCompleted ? shipment.updatedAt : null);
    const estimatedTime = shipment.eta 
      ? new Date(new Date(shipment.eta).getTime() - 24 * 60 * 60 * 1000).toISOString() 
      : null;

    return {
      title: 'Customs Clearance',
      status: isCompleted ? 'completed' as const : (isActive ? 'active' : 'pending' as const),
      timestamp,
      estimatedTime,
      icon: ShieldCheck,
      colorClass: isCompleted 
        ? 'text-emerald-500 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800'
        : (isActive 
            ? 'text-blue-500 border-blue-500 bg-blue-50 animate-pulse dark:bg-blue-950/20 dark:border-blue-800'
            : 'text-zinc-400 border-zinc-200 bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800'),
      description: isCompleted 
        ? 'Customs declaration and documentation cleared.' 
        : (isActive ? 'Customs assessment and release in progress.' : 'Awaiting customs document review.')
    };
  };

  const getInTransitMilestone = () => {
    // In Transit is completed if status is InTransit, Arrived, CustomsCleared, Delivered
    const isCompleted = ['InTransit', 'Arrived', 'CustomsCleared', 'Delivered'].includes(shipment.status);
    const isActive = shipment.status === 'Booked';
    
    const transitEvent = events.find(e => 
      e.newStatus === 'InTransit' || 
      e.description?.toLowerCase().includes('departed') || 
      e.description?.toLowerCase().includes('in transit')
    );
    
    const timestamp = transitEvent?.createdAt || (isCompleted ? shipment.atd || shipment.createdAt : null);
    const estimatedTime = shipment.etd;

    return {
      title: 'In Transit',
      status: isCompleted ? 'completed' as const : (isActive ? 'active' : 'pending' as const),
      timestamp,
      estimatedTime,
      icon: Truck,
      colorClass: isCompleted 
        ? 'text-emerald-500 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800'
        : (isActive 
            ? 'text-blue-500 border-blue-500 bg-blue-50 animate-pulse dark:bg-blue-950/20 dark:border-blue-800'
            : 'text-zinc-400 border-zinc-200 bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800'),
      description: isCompleted 
        ? `Carrier departed origin port: ${shipment.originPort}` 
        : 'Awaiting container loading & carrier dispatch.'
    };
  };

  const getDeliveredMilestone = () => {
    const isCompleted = shipment.status === 'Delivered';
    const isActive = shipment.status === 'CustomsCleared';
    
    const deliveryEvent = events.find(e => 
      e.newStatus === 'Delivered' || 
      e.description?.toLowerCase().includes('delivered') || 
      e.description?.toLowerCase().includes('delivery')
    );
    
    const timestamp = deliveryEvent?.createdAt || (isCompleted ? shipment.ata || shipment.updatedAt : null);
    const estimatedTime = shipment.eta;

    return {
      title: 'Delivered',
      status: isCompleted ? 'completed' as const : (isActive ? 'active' : 'pending' as const),
      timestamp,
      estimatedTime,
      icon: MapPin,
      colorClass: isCompleted 
        ? 'text-emerald-500 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800'
        : (isActive 
            ? 'text-blue-500 border-blue-500 bg-blue-50 animate-pulse dark:bg-blue-950/20 dark:border-blue-800'
            : 'text-zinc-400 border-zinc-200 bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800'),
      description: isCompleted 
        ? `Cargo delivered to destination port: ${shipment.destinationPort}` 
        : 'Final mile delivery and cargo handover pending.'
    };
  };

  const milestones = [
    getBookingMilestone(),
    getCustomsMilestone(),
    getInTransitMilestone(),
    getDeliveredMilestone()
  ];

  const formatTimestamp = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      return {
        date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    } catch {
      return null;
    }
  };

  // Activity Log icons helper
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'Status Change':
        return <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'Document Upload':
        return <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'General Update':
        return <Activity className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'Status Change':
        return 'bg-blue-50 border-blue-200 ring-blue-50 dark:bg-blue-950/30 dark:border-blue-900 dark:ring-blue-950';
      case 'Document Upload':
        return 'bg-emerald-50 border-emerald-200 ring-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900 dark:ring-emerald-950';
      case 'General Update':
        return 'bg-amber-50 border-amber-200 ring-amber-50 dark:bg-amber-950/30 dark:border-amber-900 dark:ring-amber-950';
      default:
        return 'bg-background border-border ring-zinc-50 dark:ring-zinc-950';
    }
  };

  return (
    <div className="mt-8 space-y-8">
      {/* SECTION 1: End-to-End Milestone Visualizer */}
      <div className="border border-border rounded-xl bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-500" />
              End-to-End Shipment Journey
            </h4>
            <p className="text-xs text-muted-foreground">High-level milestones and precise tracking timestamps</p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
            <Info className="w-3.5 h-3.5" />
            <span>Target Sequence</span>
          </div>
        </div>

        {/* Responsive Milestone Stepper Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
          {milestones.map((milestone, idx) => {
            const timeInfo = formatTimestamp(milestone.timestamp);
            const estTimeInfo = formatTimestamp(milestone.estimatedTime);
            const IconComponent = milestone.icon;

            return (
              <div 
                key={idx} 
                className={`relative border rounded-lg p-4 transition-all duration-300 flex flex-col justify-between h-full bg-background/40 hover:bg-background/80
                  ${milestone.status === 'completed' ? 'border-emerald-200 dark:border-emerald-900/40 shadow-[0_2px_8px_rgba(16,185,129,0.02)]' : ''}
                  ${milestone.status === 'active' ? 'border-blue-200 dark:border-blue-900/40 ring-2 ring-blue-500/10 shadow-[0_2px_8px_rgba(59,130,246,0.05)]' : ''}
                  ${milestone.status === 'pending' ? 'border-zinc-200 dark:border-zinc-800 opacity-75' : ''}
                `}
              >
                {/* Connector Line (For Desktop grid rows representation) */}
                {idx < milestones.length - 1 && (
                  <div className="hidden lg:block absolute right-[-10px] top-1/2 -translate-y-1/2 z-20">
                    <ArrowRight className={`w-4 h-4 ${milestone.status === 'completed' ? 'text-emerald-500' : 'text-zinc-300 dark:text-zinc-700'}`} />
                  </div>
                )}

                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`flex items-center justify-center w-9 h-9 rounded-full border-2 ${milestone.colorClass}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    {milestone.status === 'completed' && (
                      <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                        Actual
                      </span>
                    )}
                    {milestone.status === 'active' && (
                      <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400 px-2 py-0.5 rounded-full animate-pulse">
                        In Progress
                      </span>
                    )}
                    {milestone.status === 'pending' && (
                      <span className="text-[10px] font-semibold bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 px-2 py-0.5 rounded-full">
                        Pending
                      </span>
                    )}
                  </div>

                  <h5 className="font-semibold text-sm text-foreground mb-1">{milestone.title}</h5>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mb-4">
                    {milestone.description}
                  </p>
                </div>

                {/* Time Badge Container */}
                <div className="mt-auto border-t border-zinc-100 dark:border-zinc-800/60 pt-3">
                  {timeInfo ? (
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-foreground dark:text-zinc-200">
                        {timeInfo.date}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {timeInfo.time}
                      </div>
                    </div>
                  ) : estTimeInfo ? (
                    <div className="space-y-0.5">
                      <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                        Estimated
                      </div>
                      <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        {estTimeInfo.date}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {estTimeInfo.time}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 italic">
                      Awaiting entry
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Detailed Activity History Stream */}
      <div className="border border-border rounded-xl bg-card p-5 shadow-sm">
        <h4 className="text-sm font-semibold text-foreground mb-6 flex items-center">
          <Activity className="w-4 h-4 mr-2 text-zinc-500" />
          Detailed Activity History
        </h4>
        
        <div className="relative pl-4 sm:pl-6">
          {/* Vertical Line */}
          <div className="absolute left-[11px] sm:left-[19px] top-4 bottom-4 w-px bg-zinc-200 dark:bg-zinc-800"></div>

          <div className="space-y-5">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground italic pl-6">No detailed history logs found.</p>
            ) : (
              events.map((event) => (
                <div key={event.id} className="relative flex items-start group">
                  {/* Timeline Icon */}
                  <div className={`absolute left-[-17px] sm:left-[-13px] flex items-center justify-center w-8 h-8 rounded-full border bg-card ring-4 transition-colors z-10 ${getEventColor(event.eventType)}`}>
                    {getEventIcon(event.eventType)}
                  </div>

                  {/* Content Card */}
                  <div className="ml-8 sm:ml-10 flex-1">
                    <div className="bg-background/40 p-4 rounded-lg border border-border shadow-none transition-all hover:bg-background/80">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-sm">{event.eventType}</span>
                          {event.eventType === 'Status Change' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Status</span>
                          )}
                        </div>
                        <time className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                          {new Date(event.createdAt).toLocaleDateString()} at {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </time>
                      </div>
                      
                      <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed mb-3">
                        {event.description}
                      </p>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
                        {event.oldStatus && event.newStatus ? (
                          <div className="flex items-center gap-2 text-xs font-medium">
                            <span className="text-muted-foreground line-through decoration-zinc-300">{event.oldStatus}</span>
                            <span className="text-zinc-300">&rarr;</span>
                            <span className="text-blue-600 dark:text-blue-400 font-semibold">{event.newStatus}</span>
                          </div>
                        ) : (
                          <div />
                        )}
                        
                        {event.performedBy && (
                          <div className="text-[11px] text-muted-foreground font-medium">
                            By <span className="text-muted-foreground">{event.performedBy}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
