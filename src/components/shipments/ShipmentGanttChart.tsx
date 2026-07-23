import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/data-display/card';

interface ShipmentGanttChartProps {
  shipments: any[];
}

export function ShipmentGanttChart({ shipments }: ShipmentGanttChartProps) {
  const chartData = useMemo(() => {
    // Filter shipments that have both ETD and ETA
    const validShipments = shipments.filter(s => s.etd && s.eta);
    
    if (validShipments.length === 0) return { minDate: new Date(), maxDate: new Date(), rows: [] };

    const rows = validShipments.map(s => {
      return {
        id: s.id,
        referenceNumber: s.referenceNumber,
        status: s.status,
        type: s.type,
        start: new Date(s.etd),
        end: new Date(s.eta)
      };
    }).sort((a, b) => a.start.getTime() - b.start.getTime());

    const minDate = new Date(Math.min(...rows.map(r => r.start.getTime())));
    const maxDate = new Date(Math.max(...rows.map(r => r.end.getTime())));

    // Add some padding
    minDate.setDate(minDate.getDate() - 2);
    maxDate.setDate(maxDate.getDate() + 2);

    return { minDate, maxDate, rows };
  }, [shipments]);

  const { minDate, maxDate, rows } = chartData;
  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No shipments with valid ETD and ETA dates available for timeline view.
        </CardContent>
      </Card>
    );
  }

  // Generate days array for the header
  const days = [];
  for (let i = 0; i <= totalDays; i++) {
    const d = new Date(minDate);
    d.setDate(minDate.getDate() + i);
    days.push(d);
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-zinc-300';
      case 'Booked': return 'bg-blue-300';
      case 'InTransit': return 'bg-blue-500';
      case 'Arrived': return 'bg-emerald-400';
      case 'CustomsCleared': return 'bg-emerald-500';
      case 'Delivered': return 'bg-emerald-600';
      default: return 'bg-zinc-400';
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0 overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header */}
          <div className="flex border-b border-border bg-background">
            <div className="w-48 shrink-0 p-3 font-medium text-sm text-muted-foreground border-r border-border sticky left-0 bg-background z-10">
              Shipment
            </div>
            <div className="flex-1 relative flex">
              {days.map((day, i) => (
                <div key={i} className="flex-1 min-w-[40px] text-center border-r border-border py-2">
                  <div className="text-[10px] text-muted-foreground">{day.toLocaleString('default', { month: 'short' })}</div>
                  <div className="text-xs font-medium text-muted-foreground">{day.getDate()}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          <div className="flex flex-col">
            {rows.map((row, index) => {
              const startOffsetDays = (row.start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
              const durationDays = (row.end.getTime() - row.start.getTime()) / (1000 * 60 * 60 * 24);
              
              const leftPercent = (startOffsetDays / totalDays) * 100;
              const widthPercent = Math.max((durationDays / totalDays) * 100, 1); // Ensure at least 1% width

              return (
                <div key={row.id} className={`flex border-b border-border hover:bg-background ${index % 2 === 0 ? 'bg-card' : 'bg-background/30'}`}>
                  <div className="w-48 shrink-0 p-3 border-r border-border sticky left-0 bg-inherit z-10">
                    <div className="text-sm font-medium text-foreground truncate" title={row.referenceNumber}>{row.referenceNumber}</div>
                    <div className="text-xs text-muted-foreground">{row.type}</div>
                  </div>
                  <div className="flex-1 relative py-3 h-14">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {days.map((_, i) => (
                        <div key={i} className="flex-1 border-r border-border" />
                      ))}
                    </div>
                    
                    {/* Bar */}
                    <div 
                      className={`absolute h-8 rounded-md ${getStatusColor(row.status)} shadow-sm group flex items-center justify-center transition-all hover:brightness-110 cursor-pointer`}
                      style={{ 
                        left: `${leftPercent}%`, 
                        width: `${widthPercent}%`,
                        top: '12px'
                      }}
                      title={`${row.referenceNumber} - ${row.status}\nStart: ${row.start.toLocaleDateString()}\nEnd: ${row.end.toLocaleDateString()}`}
                    >
                      <span className="text-[10px] text-white font-medium px-2 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                        {row.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
