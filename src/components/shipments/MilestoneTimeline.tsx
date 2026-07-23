import React from 'react';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/data-display/badge';

interface MilestoneTimelineProps {
  shipment: any;
}

export function MilestoneTimeline({ shipment }: MilestoneTimelineProps) {
  if (!shipment) return null;

  const milestones = [
    {
      title: 'Booking Confirmed',
      planned: shipment.createdAt || new Date(new Date(shipment.etd).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      actual: shipment.createdAt || new Date(new Date(shipment.etd).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'completed'
    },
    {
      title: 'Departure (ETD/ATD)',
      planned: shipment.etd,
      actual: shipment.atd,
      status: shipment.atd ? 'completed' : (new Date() > new Date(shipment.etd) ? 'delayed' : 'pending')
    },
    {
      title: 'Arrival (ETA/ATA)',
      planned: shipment.eta,
      actual: shipment.ata,
      status: shipment.ata ? 'completed' : (new Date() > new Date(shipment.eta) ? 'delayed' : 'pending')
    },
    {
      title: 'Delivery',
      planned: new Date(new Date(shipment.eta).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      actual: shipment.status === 'Delivered' ? new Date(new Date(shipment.ata || shipment.eta).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString() : null,
      status: shipment.status === 'Delivered' ? 'completed' : 'pending'
    }
  ];

  return (
    <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
      {milestones.map((m, idx) => {
        const isCompleted = m.status === 'completed';
        const isDelayed = m.status === 'delayed';
        
        let Icon = Clock;
        let colorClass = 'text-slate-400 bg-white dark:bg-slate-900 border-slate-300';
        
        if (isCompleted) {
          Icon = CheckCircle2;
          colorClass = 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500';
        } else if (isDelayed) {
          Icon = AlertCircle;
          colorClass = 'text-red-500 bg-red-50 dark:bg-red-900/30 border-red-500';
        }

        const formatDate = (dateStr: string | null | undefined) => {
          if (!dateStr) return 'TBD';
          return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        };

        return (
          <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow sm:h-12 sm:w-12 z-10 ${colorClass}`}>
              <Icon className="w-5 h-5 sm:h-6 sm:w-6" />
            </div>
            
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border bg-card shadow">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-semibold text-sm">{m.title}</h4>
                {isDelayed && <Badge variant="destructive" className="text-[10px] h-5">Delayed</Badge>}
                {isCompleted && <Badge variant="outline" className="text-[10px] h-5 text-emerald-600 border-emerald-200">Done</Badge>}
              </div>
              <div className="text-xs text-muted-foreground flex justify-between mt-2">
                <div>
                  <span className="font-medium block mb-0.5">Planned</span>
                  <span>{formatDate(m.planned)}</span>
                </div>
                <div className="text-right">
                  <span className="font-medium block mb-0.5">Actual</span>
                  <span className={isDelayed && !m.actual ? "text-red-500 font-medium" : ""}>
                    {formatDate(m.actual)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
