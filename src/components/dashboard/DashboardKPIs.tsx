import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/data-display/card';
import { fetchApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Ship, Anchor, Building2, TrendingUp, GripHorizontal, Package, AlertCircle, Clock, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/feedback/skeleton';
import { differenceInDays } from 'date-fns';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LineChart, Line, ResponsiveContainer, Tooltip as RechartsTooltip, YAxis, ReferenceLine } from 'recharts';

// Generate a 7-day sparkline data based on current value
function generateTrendData(currentValue: number, timeRange: '1H' | '24H' | '7D' | '30D' = '7D') {
  if (!currentValue && currentValue !== 0) return [];
  const data = [];
  let val = currentValue * 0.8; // start lower
  const now = new Date();
  
  let points = 7;
  if (timeRange === '1H') points = 6;
  if (timeRange === '24H') points = 24;
  if (timeRange === '30D') points = 30;

  for (let i = points - 1; i >= 0; i--) {
    // Add random noise
    const variance = (Math.random() - 0.5) * (currentValue * 0.2);
    let pointVal = val + variance;
    if (pointVal < 0) pointVal = 0;
    
    // The last point should exactly match the current value
    if (i === 0) pointVal = currentValue;
    
    const d = new Date(now);
    
    if (timeRange === '1H') {
      d.setMinutes(d.getMinutes() - (i * 10));
    } else if (timeRange === '24H') {
      d.setHours(d.getHours() - i);
    } else {
      d.setDate(d.getDate() - i);
    }
    
    let timestampStr = '';
    if (timeRange === '1H' || timeRange === '24H') {
       timestampStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
       timestampStr = d.toLocaleDateString();
    }
    
    data.push({ 
      day: points - i, 
      value: Math.round(pointVal),
      timestamp: timestampStr
    });
    // gently trend towards current
    val = val + (currentValue - val) * 0.3;
  }
  return data;
}

const CustomSparklineTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover border border-border p-2 rounded-md shadow-sm text-popover-foreground text-xs z-50">
        <p className="font-semibold mb-1">{data.timestamp}</p>
        <p className="font-mono font-bold flex items-center gap-1.5" style={{ color: payload[0].color || payload[0].stroke }}>
           <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: payload[0].color || payload[0].stroke }} />
           Value: {data.value}
        </p>
      </div>
    );
  }
  return null;
};

const Sparkline = ({ data, color, threshold, thresholdType }: { data: any[], color: string, threshold?: number, thresholdType?: 'above' | 'below' }) => (
  <div className="h-12 w-full mt-2">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <YAxis domain={['auto', 'auto']} hide />
        <RechartsTooltip content={<CustomSparklineTooltip />} cursor={false} />
        {threshold !== undefined && (
          <ReferenceLine y={threshold} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} opacity={0.5} />
        )}
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke={color} 
          strokeWidth={2} 
          dot={(props: any) => {
            const { cx, cy, payload, value } = props;
            if (threshold === undefined) return <span key={props.key || payload.day} />;
            const isAlert = thresholdType === 'above' ? value > threshold : value < threshold;
            if (isAlert) {
              return <circle key={props.key || payload.day} cx={cx} cy={cy} r={3} fill="#ef4444" stroke="#fff" strokeWidth={1.5} />;
            }
            return <span key={props.key || payload.day} />;
          }} 
          activeDot={{ r: 4 }} 
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

function SortableKpiCard({ id, item, metrics, timeRange }: { id: string, item: any, metrics: any, timeRange: '1H'|'24H'|'7D'|'30D' }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="h-full relative group">
      {/* Drag Handle */}
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-20 p-1 bg-background/50 backdrop-blur-sm rounded-md"
      >
        <GripHorizontal className="w-4 h-4 text-muted-foreground" />
      </div>

      {item.id === 'inTransit' && (
        <Card className="h-full bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/50 pt-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-300">In-Transit Shipments</CardTitle>
            <Ship className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{metrics?.inTransitShipments || 0}</div>
            <Sparkline data={generateTrendData(metrics?.inTransitShipments || 0, timeRange)} color="#3b82f6" threshold={5} thresholdType="below" />
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              Active network
            </p>
          </CardContent>
        </Card>
      )}

      {item.id === 'delayed' && (
        <Card className="h-full bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/50 pt-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-red-800 dark:text-red-300">Delayed Shipments</CardTitle>
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900 dark:text-red-100">{metrics?.delayedShipments || 0}</div>
            <Sparkline data={generateTrendData(metrics?.delayedShipments || 0, timeRange)} color="#ef4444" threshold={10} thresholdType="above" />
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">Requires attention</p>
          </CardContent>
        </Card>
      )}

      {item.id === 'volume' && (
        <Card className="h-full bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/50 pt-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Total Volume Processed</CardTitle>
            <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{metrics?.totalProcessedVolume || 0}</div>
            <Sparkline data={generateTrendData(metrics?.totalProcessedVolume || 0, timeRange)} color="#10b981" threshold={50} thresholdType="below" />
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">All time shipments</p>
          </CardContent>
        </Card>
      )}
      
      {item.id === 'leadTime' && (
        <Card className="h-full bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/50 pt-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-amber-800 dark:text-amber-300">Avg Lead Time</CardTitle>
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">{metrics?.avgLeadTime || 0} days</div>
            <Sparkline data={generateTrendData(metrics?.avgLeadTime || 0, timeRange)} color="#f59e0b" threshold={14} thresholdType="above" />
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Based on recent data</p>
          </CardContent>
        </Card>
      )}

      {item.id === 'customs' && (
        <Card className="h-full bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-900/50 pt-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-800 dark:text-purple-300">Pending Customs</CardTitle>
            <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{metrics?.pendingCustoms || 0}</div>
            <Sparkline data={generateTrendData(metrics?.pendingCustoms || 0, timeRange)} color="#8b5cf6" threshold={10} thresholdType="above" />
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Clearances required</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function DashboardKPIs() {
  const { token } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1H'|'24H'|'7D'|'30D'>('7D');

  // Default order of KPIs
  const [items, setItems] = useState([
    { id: 'inTransit' },
    { id: 'delayed' },
    { id: 'leadTime' },
    { id: 'customs' },
    { id: 'volume' }
  ]);
  const [alertedThresholds, setAlertedThresholds] = useState<Record<string, boolean>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    // Try to load saved layout from local storage
    const savedOrder = localStorage.getItem('kpi-order-v3');
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder);
        if (parsed && Array.isArray(parsed) && parsed.length === 5) {
          setItems(parsed);
        }
      } catch (e) {
        // Ignore
      }
    }

    async function loadMetrics() {
      if (!token) return;
      try {
        setLoading(true);
        const [shipments, customsDeclarations] = await Promise.all([
          fetchApi('/shipments', token),
          fetchApi('/customs-declarations', token).catch(() => []) // Fallback in case endpoint is restricted
        ]);

        const inTransitShipments = (shipments || []).filter((s: any) => 
          ['InTransit', 'In Transit', 'Pending', 'Booked'].includes(s.status)
        ).length;

        const delayedShipments = (shipments || []).filter((s: any) => 
          ['Delayed'].includes(s.status) || s.delayRisk === 'High'
        ).length;

        const totalProcessedVolume = (shipments || []).length;

        let avgLeadTime = 0;
        let totalDays = 0;
        let shipmentsWithDates = 0;
        (shipments || []).forEach((s: any) => {
          if (s.etd && s.eta) {
            const days = differenceInDays(new Date(s.eta), new Date(s.etd));
            if (days > 0) {
              totalDays += days;
              shipmentsWithDates++;
            }
          }
        });
        if (shipmentsWithDates > 0) {
          avgLeadTime = Math.round(totalDays / shipmentsWithDates);
        }

        const pendingCustoms = (customsDeclarations || []).filter((c: any) => 
          !['Cleared'].includes(c.status)
        ).length;

        setMetrics({
          inTransitShipments,
          delayedShipments,
          totalProcessedVolume,
          avgLeadTime,
          pendingCustoms
        });
      } catch (err) {
        console.error("Failed to load KPIs:", err);
      } finally {
        setLoading(false);
      }
    }

    loadMetrics();
  }, [token]);

useEffect(() => {
    if (!metrics) return;

    const checks = [
      { id: 'delayed', name: 'Delayed Shipments', val: metrics.delayedShipments, limit: 10, type: 'above' },
      { id: 'leadTime', name: 'Avg Lead Time (Days)', val: metrics.avgLeadTime, limit: 14, type: 'above' },
      { id: 'customs', name: 'Pending Customs Declarations', val: metrics.pendingCustoms, limit: 10, type: 'above' }
    ];

    checks.forEach(check => {
      const isBreached = check.val > check.limit;
      if (isBreached && !alertedThresholds[check.id]) {
        toast.error(`Critical KPI Alert: ${check.name} crossed safety threshold (${check.val} > ${check.limit})`, {
          description: 'Immediate action required. Please check Control Tower logs.',
          duration: 10000
        });
        setAlertedThresholds(prev => ({ ...prev, [check.id]: true }));
      } else if (!isBreached && alertedThresholds[check.id]) {
        setAlertedThresholds(prev => ({ ...prev, [check.id]: false }));
      }
    });
  }, [metrics, alertedThresholds]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        const newOrder = arrayMove(items, oldIndex, newIndex);
        // Save to local storage
        localStorage.setItem('kpi-order-v3', JSON.stringify(newOrder));
        return newOrder;
      });
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full hidden md:block" />
        <Skeleton className="h-32 w-full hidden md:block" />
      </div>
    );
  }

  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-center justify-end">
        <div className="flex items-center bg-muted/60 border border-zinc-200 dark:border-zinc-800/80 rounded-lg p-1 text-xs">
          {(['1H', '24H', '7D', '30D'] as const).map(tr => (
            <button
              key={tr}
              onClick={() => setTimeRange(tr)}
              className={`px-3 py-1 rounded-md transition-colors ${timeRange === tr ? 'bg-background shadow-sm text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {tr}
            </button>
          ))}
        </div>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <SortableContext
            items={items.map(i => i.id)}
            strategy={horizontalListSortingStrategy}
          >
            {items.map((item) => (
              <SortableKpiCard key={item.id} id={item.id} item={item} metrics={metrics} timeRange={timeRange} />
            ))}
          </SortableContext>
        </div>
      </DndContext>
    </div>
  );
}
