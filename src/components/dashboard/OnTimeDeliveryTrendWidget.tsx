import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { 
  Activity, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Ship, 
  Plane, 
  Truck, 
  Train, 
  Calendar, 
  ArrowRight, 
  Search, 
  Database, 
  Cpu, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Info, 
  Building2, 
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { Dialog, DialogContent } from '@/components/ui/overlays/dialog';
import { Badge } from '@/components/ui/data-display/badge';
import { Input } from '@/components/ui/forms/input';
import { Button } from '@/components/ui/forms/button';
import { Switch } from '@/components/ui/forms/switch';
import { Label } from '@/components/ui/forms/label';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

interface OnTimeDeliveryTrendWidgetProps {
  shipments?: any[];
}

// A simple seedable pseudo-random number generator to make mock data 100% stable
function seedRandom(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return function() {
    const x = Math.sin(hash++) * 10000;
    return x - Math.floor(x);
  };
}

const getCarrierName = (carrierId: string) => {
  const map: Record<string, string> = {
    '33333333-3333-3333-3333-111111111111': 'DHL Express Service',
    '33333333-3333-3333-3333-222222222222': 'Maersk Line Ocean',
    '33333333-3333-3333-3333-333333333333': 'CMA CGM Shipping',
    '33333333-3333-3333-3333-444444444444': 'LATAM Cargo'
  };
  return map[carrierId] || 'Alliance Partner';
};

function generateDeterministicShipments(date: Date, onTimeRate: number, leadTime: number, realShipments: any[]) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const rng = seedRandom(dateStr);
  
  // Map and label real shipments
  const dayShipments = realShipments.map(s => {
    let computedLeadTime = Math.round(leadTime);
    if (s.etd && (s.ata || s.eta)) {
      const diff = new Date(s.ata || s.eta).getTime() - new Date(s.etd).getTime();
      if (diff > 0) {
        computedLeadTime = Math.round(diff / (1000 * 60 * 60 * 24));
      }
    }
    
    return {
      id: s.id,
      referenceNumber: s.referenceNumber || `SHP-${s.id.substring(0, 8).toUpperCase()}`,
      trackingNumber: s.trackingNumber || 'TRK-LIVE-999',
      priority: s.priority || 'Normal',
      type: s.type || 'Sea',
      status: s.status || 'In Transit',
      shipperName: s.shipper?.companyName || 'Global Shipping Corp',
      consigneeName: s.consignee?.companyName || 'North America Importers',
      carrierName: getCarrierName(s.carrierId),
      originPort: s.originPort || s.origin || 'Shanghai, CN',
      destinationPort: s.destinationPort || s.destination || 'Miami, USA',
      etd: s.etd ? new Date(s.etd).toISOString() : subDays(date, computedLeadTime).toISOString(),
      eta: s.eta ? new Date(s.eta).toISOString() : date.toISOString(),
      ata: s.ata ? new Date(s.ata).toISOString() : (s.status === 'Delivered' ? date.toISOString() : null),
      computedLeadTime,
      telematicsLog: s.predictiveReason || 'Standard logistics trajectory verified. No exceptions logged.',
      isMock: false
    };
  });
  
  // Decide how many total shipments we want (e.g. 3 to 5)
  const targetCount = Math.floor(rng() * 2) + 3; // 3 or 4 shipments per day
  
  const shippers = ['Pacific Trading Ltd', 'Andes Agroindustrial', 'Apex Logistics', 'SinoTrade Ltd', 'Euro Distribution NV'];
  const consignees = ['Valparaíso Retail', 'Metro Distribution', 'Atlantic Goods', 'Southern Imports Ltd', 'Western Supply Co'];
  const carriers = ['DHL Express Service', 'Maersk Line Ocean', 'CMA CGM Shipping', 'LATAM Cargo'];
  const modes = ['Air', 'Sea', 'Road', 'Rail'];
  const ports = ['Shanghai, CN', 'Rotterdam, NL', 'Miami, USA', 'Hamburg, DE', 'Valparaiso, CL', 'Santiago, CL'];

  while (dayShipments.length < targetCount) {
    const index = dayShipments.length;
    const id = `SIM-SHP-${format(date, 'MMdd')}-${index + 1}`;
    const ref = `FFW-${date.getFullYear()}-${100 + Math.floor(rng() * 900)}`;
    const trk = `TRK-${date.getFullYear()}-${9000 + Math.floor(rng() * 1000)}`;
    const type = modes[Math.floor(rng() * modes.length)];
    
    // Balance on-time status based on target rate
    const currentOnTime = dayShipments.filter(s => s.status !== 'Delayed').length;
    const currentTotal = dayShipments.length;
    const shouldBeOnTime = currentTotal === 0 || (currentOnTime / currentTotal) * 100 < onTimeRate;
    const status = shouldBeOnTime ? 'Delivered' : 'Delayed';
    
    const shipperName = shippers[Math.floor(rng() * shippers.length)];
    const consigneeName = consignees[Math.floor(rng() * consignees.length)];
    const carrierName = carriers[Math.floor(rng() * carriers.length)];
    const originPort = ports[Math.floor(rng() * ports.length)];
    let destinationPort = ports[Math.floor(rng() * ports.length)];
    while (destinationPort === originPort) {
      destinationPort = ports[Math.floor(rng() * ports.length)];
    }

    const shipmentLeadTime = Math.max(1, Math.round(leadTime + (rng() * 4 - 2)));
    const etd = subDays(date, shipmentLeadTime);
    const eta = date;

    // Generate realistic logs
    let telematicsLog = '';
    if (status === 'Delayed') {
      const delays = [
        'Port terminal congestion leading to severe berthing delays.',
        'Customs clearing inspection backlog at importing terminal.',
        'Adverse meteorological conditions forcing tactical route rerouting.',
        'Delayed carrier connection at secondary routing transshipment hub.'
      ];
      telematicsLog = delays[Math.floor(rng() * delays.length)];
    } else {
      const logs = [
        'Cargo arrived on scheduled carrier, cleared import customs, and completed priority discharge.',
        'Local distribution carrier completed tail-gate delivery to regional depot.',
        'Successfully processed through port cargo check-point; final handoff confirmed.',
        'Optimal transit corridor utilized; arrived ahead of estimated threshold.'
      ];
      telematicsLog = logs[Math.floor(rng() * logs.length)];
    }

    dayShipments.push({
      id,
      referenceNumber: ref,
      trackingNumber: trk,
      priority: rng() > 0.7 ? 'High' : 'Normal',
      type,
      status,
      shipperName,
      consigneeName,
      carrierName,
      originPort,
      destinationPort,
      etd: etd.toISOString(),
      eta: eta.toISOString(),
      ata: status === 'Delivered' ? eta.toISOString() : null,
      computedLeadTime: shipmentLeadTime,
      telematicsLog,
      isMock: true
    });
  }

  return dayShipments;
}

export function OnTimeDeliveryTrendWidget({ shipments = [] }: OnTimeDeliveryTrendWidgetProps) {
  const { profile } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedShipmentId, setExpandedShipmentId] = useState<string | null>(null);
  const [isComparisonMode, setIsComparisonMode] = useState(false);

  // Search and filter inside the drill-down modal
  const [modalSearch, setModalSearch] = useState('');
  const [modalModeFilter, setModalModeFilter] = useState('all');
  const [modalStatusFilter, setModalStatusFilter] = useState('all');
  const [modalSourceFilter, setModalSourceFilter] = useState('all');

  useEffect(() => {
    // Determine target local time
    const baseDate = new Date();
    const today = baseDate.getFullYear() === 2026 ? baseDate : new Date('2026-07-18');
    const mockData = [];
    
    // Seed for background trends
    let currentRate = 88; 
    let currentLeadTime = 12;
    const rng = seedRandom('kpi-trend-baseline');

    for (let i = 29; i >= 0; i--) {
      const date = subDays(today, i);
      const dateLabel = format(date, 'MMM dd');
      
      // 1. Gather any real shipments arriving/arrived on this date
      const matchingReal = shipments.filter(s => {
        const arrivalDate = s.ata ? new Date(s.ata) : (s.eta ? new Date(s.eta) : null);
        if (!arrivalDate) return false;
        return arrivalDate.getFullYear() === date.getFullYear() &&
               arrivalDate.getMonth() === date.getMonth() &&
               arrivalDate.getDate() === date.getDate();
      });

      let onTimeRate = 0;
      let leadTime = 0;
      let dayShipments: any[] = [];

      // Background random walk simulation parameters
      currentRate = Math.max(83, Math.min(98, currentRate + (rng() * 5 - 2.5)));
      currentLeadTime = Math.max(6, Math.min(18, currentLeadTime + (rng() * 2.5 - 1.25)));

      if (matchingReal.length > 0) {
        // Compute actual metrics from DB matching shipments
        const onTimeCount = matchingReal.filter(s => s.status !== 'Delayed').length;
        onTimeRate = Number(((onTimeCount / matchingReal.length) * 100).toFixed(1));
        
        let sumLeadTime = 0;
        let leadTimeCount = 0;
        matchingReal.forEach(s => {
          const start = s.atd ? new Date(s.atd) : (s.etd ? new Date(s.etd) : null);
          const end = s.ata ? new Date(s.ata) : (s.eta ? new Date(s.eta) : null);
          if (start && end) {
            const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays > 0) {
              sumLeadTime += diffDays;
              leadTimeCount++;
            }
          }
        });
        leadTime = leadTimeCount > 0 ? Number((sumLeadTime / leadTimeCount).toFixed(1)) : Number(currentLeadTime.toFixed(1));
        
        // Match with real shipments + deterministic fill
        dayShipments = generateDeterministicShipments(date, onTimeRate, leadTime, matchingReal);
      } else {
        // Fallback to purely simulated day metrics and deterministic shipments
        onTimeRate = Number(currentRate.toFixed(1));
        leadTime = Number(currentLeadTime.toFixed(1));
        dayShipments = generateDeterministicShipments(date, onTimeRate, leadTime, []);
      }

      mockData.push({
        dateObj: date,
        date: dateLabel,
        onTimeRate,
        leadTime,
        target: 95,
        shipmentsList: dayShipments
      });
    }
    
    setData(mockData);
  }, [shipments]);

  const handleChartClick = (state: any) => {
    if (state && state.activeLabel) {
      const clickedDate = state.activeLabel;
      const dayData = data.find(d => d.date === clickedDate);
      if (dayData) {
        setSelectedDay(dayData);
        setModalSearch('');
        setModalModeFilter('all');
        setModalStatusFilter('all');
        setModalSourceFilter('all');
        setExpandedShipmentId(null);
        setIsModalOpen(true);
      }
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode?.toLowerCase()) {
      case 'air':
        return <Plane className="w-4 h-4 text-sky-500" />;
      case 'sea':
      case 'ocean':
        return <Ship className="w-4 h-4 text-indigo-500" />;
      case 'road':
      case 'truck':
        return <Truck className="w-4 h-4 text-emerald-500" />;
      case 'rail':
      case 'train':
        return <Train className="w-4 h-4 text-amber-500" />;
      default:
        return <Ship className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Delivered':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900" variant="outline">Delivered</Badge>;
      case 'Delayed':
        return <Badge className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900" variant="outline">Delayed</Badge>;
      case 'In Transit':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900" variant="outline">In Transit</Badge>;
      default:
        return <Badge className="bg-zinc-100 text-zinc-700 border-zinc-200" variant="outline">{status}</Badge>;
    }
  };

  // Filter local shipments inside drill-down
  const filteredModalShipments = selectedDay?.shipmentsList?.filter((s: any) => {
    const query = modalSearch.toLowerCase();
    const matchesSearch = 
      s.referenceNumber.toLowerCase().includes(query) ||
      s.trackingNumber.toLowerCase().includes(query) ||
      s.originPort.toLowerCase().includes(query) ||
      s.destinationPort.toLowerCase().includes(query) ||
      s.shipperName.toLowerCase().includes(query) ||
      s.consigneeName.toLowerCase().includes(query);

    const matchesMode = modalModeFilter === 'all' || s.type.toLowerCase().includes(modalModeFilter);
    const matchesStatus = modalStatusFilter === 'all' || s.status === modalStatusFilter;
    const matchesSource = modalSourceFilter === 'all' || 
      (modalSourceFilter === 'live' && !s.isMock) || 
      (modalSourceFilter === 'simulated' && s.isMock);

    return matchesSearch && matchesMode && matchesStatus && matchesSource;
  }) || [];

  const isDark = profile?.theme === 'dark' || document.documentElement.classList.contains('dark');
  const gridColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(148, 163, 184, 0.12)";
  const axisColor = isDark ? "#a1a1aa" : "#64748b";
  const tooltipBg = isDark ? "#18181b" : "#ffffff";
  const tooltipBorder = isDark ? "#27272a" : "#e4e4e7";
  const tooltipText = isDark ? "#f4f4f5" : "#18181b";

  return (
    <>
      <Card id="kpi-trends-widget" className="h-full shadow-sm border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" /> KPI Trends
            </span>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch id="comparison-mode-toggle" checked={isComparisonMode} onCheckedChange={setIsComparisonMode} />
                <Label htmlFor="comparison-mode-toggle" className="text-xs font-semibold cursor-pointer text-muted-foreground hover:text-foreground transition-colors">Comparison Mode</Label>
              </div>
              <Badge className="bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-150 dark:border-blue-900/50 text-[10px] py-0 px-2 flex items-center gap-1 hidden sm:flex">
                <Info className="w-3.5 h-3.5" /> Interactive Drill-down Enabled
              </Badge>
            </div>
          </CardTitle>
          <CardDescription>
            30-day historical performance. <strong>Click any chart node</strong> to drill down into the underlying shipments.
          </CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          <div className="h-[250px] w-full relative">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <ComposedChart 
                data={data} 
                onClick={handleChartClick}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: axisColor, fontSize: 12 }} 
                  minTickGap={20}
                />
                <YAxis 
                  yAxisId="left"
                  domain={[70, 100]} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: axisColor, fontSize: 12 }} 
                  tickFormatter={(value) => `${value}%`}
                />
                {isComparisonMode && (
                  <YAxis 
                    yAxisId="right"
                  orientation="right"
                  domain={[5, 25]} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: axisColor, fontSize: 12 }} 
                  tickFormatter={(value) => `${value}d`}
                  />
                )}
                <Tooltip 
                  cursor={{ stroke: axisColor, strokeWidth: 1, strokeDasharray: '3 3' }}
                  content={<CustomTooltip />}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="target" 
                  name="Target Rate" 
                  stroke="#94a3b8" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
                
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="onTimeRate" 
                  name="On-Time Rate" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
                />
                
                {isComparisonMode && (
                  <Area 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="leadTime" 
                    name="Avg Lead Time (Days)" 
                    fill="#3b82f6" 
                    stroke="#3b82f6" 
                    fillOpacity={0.1}
                    strokeWidth={2}
                    dot={{ r: 2, fill: "#3b82f6", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#3b82f6", stroke: "#fff", strokeWidth: 2 }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Drill-down shipment ledger modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-xl p-0">
          {selectedDay && (
            <div className="flex flex-col h-full divide-y divide-zinc-100 dark:divide-zinc-850">
              
              {/* Header block */}
              <div className="p-6 bg-zinc-50/50 dark:bg-zinc-900/20">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-500" />
                      KPI Audit Ledger: {format(selectedDay.dateObj, 'MMMM dd, yyyy')}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Operational audit list of shipment records that contributed to the metrics on this date.
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                  >
                    <X className="w-4 h-4 text-zinc-500" />
                  </button>
                </div>

                {/* Day Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                  <div className="p-4 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-150 dark:border-zinc-850/60 shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-emerald-100/60 dark:bg-emerald-950/30 rounded-lg text-emerald-600 dark:text-emerald-400 shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">On-Time Delivery Rate</p>
                      <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">{selectedDay.onTimeRate}%</p>
                    </div>
                  </div>

                  <div className="p-4 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-150 dark:border-zinc-850/60 shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-blue-100/60 dark:bg-blue-950/30 rounded-lg text-blue-600 dark:text-blue-400 shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Average Lead Time</p>
                      <p className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono">{selectedDay.leadTime} Days</p>
                    </div>
                  </div>

                  <div className="p-4 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-150 dark:border-zinc-850/60 shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-zinc-100/80 dark:bg-zinc-900 rounded-lg text-zinc-600 dark:text-zinc-350 shrink-0">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Contributing Shipments</p>
                      <p className="text-lg font-black text-foreground font-mono">{selectedDay.shipmentsList.length} Units</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filtering Controls inside Modal */}
              <div className="px-6 py-4 flex flex-wrap items-center gap-3 bg-zinc-50/20 dark:bg-zinc-950/40">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="modal-shipment-search"
                    type="search"
                    placeholder="Search by ref, tracker, ports, clients..."
                    className="pl-8 h-8 text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850"
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-md px-2 h-8">
                    <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <select
                      id="modal-mode-filter"
                      className="border-0 rounded-md bg-transparent text-xs text-foreground focus:outline-none focus:ring-0 cursor-pointer pr-1"
                      value={modalModeFilter}
                      onChange={(e) => setModalModeFilter(e.target.value)}
                    >
                      <option value="all">All Modes</option>
                      <option value="air">Air</option>
                      <option value="sea">Sea</option>
                      <option value="road">Road</option>
                      <option value="rail">Rail</option>
                    </select>
                  </div>

                  <select
                    id="modal-status-filter"
                    className="h-8 px-2 border border-zinc-200 dark:border-zinc-850 rounded-md bg-white dark:bg-zinc-950 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    value={modalStatusFilter}
                    onChange={(e) => setModalStatusFilter(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Delayed">Delayed</option>
                    <option value="In Transit">In Transit</option>
                  </select>

                  <select
                    id="modal-source-filter"
                    className="h-8 px-2 border border-zinc-200 dark:border-zinc-850 rounded-md bg-white dark:bg-zinc-950 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    value={modalSourceFilter}
                    onChange={(e) => setModalSourceFilter(e.target.value)}
                  >
                    <option value="all">All Sources</option>
                    <option value="live">Live DB Shipments</option>
                    <option value="simulated">Simulated Cargo</option>
                  </select>

                  {(modalSearch || modalModeFilter !== 'all' || modalStatusFilter !== 'all' || modalSourceFilter !== 'all') && (
                    <Button
                      id="reset-modal-filters"
                      variant="ghost"
                      className="h-8 px-2.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                      onClick={() => {
                        setModalSearch('');
                        setModalModeFilter('all');
                        setModalStatusFilter('all');
                        setModalSourceFilter('all');
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {/* Shipments Table List */}
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse" id="audit-ledger-shipments-table">
                  <thead>
                    <tr className="bg-zinc-50/50 dark:bg-zinc-900/40 border-b border-zinc-150 dark:border-zinc-850/60 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      <th className="py-3 px-6">Reference ID</th>
                      <th className="py-3 px-4">Ledger Source</th>
                      <th className="py-3 px-4">Transit Path</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-center">Transit Days</th>
                      <th className="py-3 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredModalShipments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-muted-foreground">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <AlertTriangle className="w-8 h-8 text-zinc-300" />
                            <p className="text-sm font-semibold">No shipments match current filters</p>
                            <p className="text-xs text-zinc-400">Try modifying your search or filters within this date ledger.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredModalShipments.map((s: any) => {
                        const isExpanded = expandedShipmentId === s.id;
                        return (
                          <React.Fragment key={s.id}>
                            <tr 
                              className={`group hover:bg-zinc-50/60 dark:hover:bg-zinc-900/20 border-b border-zinc-100 dark:border-zinc-850/40 cursor-pointer transition-colors ${
                                isExpanded ? 'bg-zinc-50/40 dark:bg-zinc-900/10' : ''
                              }`}
                              onClick={() => setExpandedShipmentId(isExpanded ? null : s.id)}
                            >
                              <td className="py-4 px-6 font-bold text-sm text-foreground">
                                <div className="flex items-center gap-2">
                                  <div className="p-1 bg-zinc-100 dark:bg-zinc-800 rounded shrink-0">
                                    {getModeIcon(s.type)}
                                  </div>
                                  <div>
                                    <span className="block hover:underline">{s.referenceNumber}</span>
                                    <span className="text-[10px] text-muted-foreground font-mono font-normal">
                                      {s.trackingNumber}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td className="py-4 px-4">
                                {s.isMock ? (
                                  <Badge className="bg-zinc-100 dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800 text-[10px] font-normal" variant="outline">
                                    <Cpu className="w-3 h-3 text-zinc-400 mr-1" /> Simulated
                                  </Badge>
                                ) : (
                                  <Badge className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/60 text-[10px] font-semibold animate-pulse" variant="outline">
                                    <Database className="w-3 h-3 text-blue-500 dark:text-blue-400 mr-1" /> Live DB
                                  </Badge>
                                )}
                              </td>

                              <td className="py-4 px-4 text-xs font-semibold">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-zinc-800 dark:text-zinc-200">{s.originPort}</span>
                                  <ArrowRight className="w-3 h-3 text-zinc-400" />
                                  <span className="text-zinc-800 dark:text-zinc-200">{s.destinationPort}</span>
                                </div>
                              </td>

                              <td className="py-4 px-4">
                                {getStatusBadge(s.status)}
                              </td>

                              <td className="py-4 px-4 text-center font-bold font-mono text-xs text-foreground">
                                {s.computedLeadTime}d
                              </td>

                              <td className="py-4 px-6 text-right">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200"
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </Button>
                              </td>
                            </tr>

                            {/* Expanded Detail Panel */}
                            {isExpanded && (
                              <tr>
                                <td colSpan={6} className="p-0 bg-zinc-50/50 dark:bg-zinc-900/5">
                                  <div className="px-6 py-5 border-b border-zinc-150 dark:border-zinc-850/60 grid grid-cols-1 md:grid-cols-12 gap-5 text-xs">
                                    
                                    {/* Partner and Dispatch information */}
                                    <div className="md:col-span-5 space-y-3">
                                      <div className="flex items-center gap-1.5 font-bold text-zinc-400 uppercase tracking-wider text-[10px]">
                                        <Building2 className="w-3.5 h-3.5" /> Stakeholders & Carrier
                                      </div>
                                      
                                      <div className="p-3 bg-white dark:bg-zinc-950 rounded-lg border border-zinc-150 dark:border-zinc-850/50 space-y-2.5">
                                        <div>
                                          <p className="text-[10px] text-muted-foreground">Consigner (Shipper)</p>
                                          <p className="font-bold text-foreground text-sm">{s.shipperName}</p>
                                        </div>
                                        <div>
                                          <p className="text-[10px] text-muted-foreground">Consignee (Importer)</p>
                                          <p className="font-bold text-foreground text-sm">{s.consigneeName}</p>
                                        </div>
                                        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900">
                                          <p className="text-[10px] text-muted-foreground">Assigned Carrier</p>
                                          <p className="font-bold text-blue-600 dark:text-blue-400">{s.carrierName}</p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Operational Milestones & Routing */}
                                    <div className="md:col-span-4 space-y-3">
                                      <div className="flex items-center gap-1.5 font-bold text-zinc-400 uppercase tracking-wider text-[10px]">
                                        <Calendar className="w-3.5 h-3.5" /> Timestamps Manifest
                                      </div>

                                      <div className="p-3 bg-white dark:bg-zinc-950 rounded-lg border border-zinc-150 dark:border-zinc-850/50 space-y-3">
                                        <div className="flex justify-between items-center">
                                          <div>
                                            <p className="text-[10px] text-muted-foreground">Planned Departure (ETD)</p>
                                            <p className="font-bold text-foreground">{s.etd ? new Date(s.etd).toLocaleDateString() : 'N/A'}</p>
                                          </div>
                                          <ArrowRight className="w-3.5 h-3.5 text-zinc-300" />
                                          <div className="text-right">
                                            <p className="text-[10px] text-muted-foreground">Planned Arrival (ETA)</p>
                                            <p className="font-bold text-foreground">{s.eta ? new Date(s.eta).toLocaleDateString() : 'N/A'}</p>
                                          </div>
                                        </div>

                                        {s.ata && (
                                          <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-900">
                                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Actual Arrival (ATA)</p>
                                            <p className="font-bold text-emerald-600 dark:text-emerald-400">
                                              {new Date(s.ata).toLocaleDateString()} at {new Date(s.ata).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* AI Telematics & Delay Analysis */}
                                    <div className="md:col-span-3 space-y-3">
                                      <div className="flex items-center gap-1.5 font-bold text-zinc-400 uppercase tracking-wider text-[10px]">
                                        <Activity className="w-3.5 h-3.5" /> Operations Telematics
                                      </div>

                                      <div className={`p-3 rounded-lg border h-[110px] overflow-y-auto ${
                                        s.status === 'Delayed'
                                          ? 'bg-red-500/[0.01] border-red-200 dark:border-red-950/50 text-red-700 dark:text-red-400'
                                          : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-150 dark:border-zinc-850 text-zinc-600 dark:text-zinc-300'
                                      }`}>
                                        <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                                          {s.status === 'Delayed' ? 'Exception Incident Report' : 'Status Dispatch Logs'}
                                        </p>
                                        <p className="text-xs leading-relaxed font-medium">
                                          {s.telematicsLog}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Bottom Info bar */}
                                    <div className="col-span-12 flex justify-between items-center pt-2.5 border-t border-zinc-100 dark:border-zinc-900/50">
                                      <div className="text-[10px] font-mono text-muted-foreground">
                                        Cargo ID: {s.id} | Priority Rating: {s.priority}
                                      </div>

                                      {!s.isMock && (
                                        <Button 
                                          variant="outline" 
                                          size="xs" 
                                          className="text-[10px] h-6 flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 dark:hover:bg-blue-950/20 dark:border-blue-900"
                                          onClick={() => {
                                            toast.success(`Active control panel centered on Live DB cargo ${s.referenceNumber}`);
                                            setIsModalOpen(false);
                                          }}
                                        >
                                          Center in Operational View <ArrowUpRight className="w-3 h-3" />
                                        </Button>
                                      )}
                                    </div>

                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer Block */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/20 flex items-center justify-between text-xs text-muted-foreground rounded-b-xl">
                <div className="flex items-center gap-1 font-medium">
                  <Database className="w-3.5 h-3.5 text-zinc-400" />
                  Audit logs synced with SCM Core Control Tower database.
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-xs font-semibold"
                  onClick={() => setIsModalOpen(false)}
                >
                  Close Audit Ledger
                </Button>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Custom Tooltip with Interactive Instructions
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border p-3 rounded-lg shadow-md text-popover-foreground">
        <p className="font-bold text-xs text-foreground mb-1.5 border-b border-border pb-1">{label}</p>
        {payload.map((entry: any, index: number) => {
          if (entry.name === 'Target Rate') {
            return (
              <div key={index} className="flex items-center justify-between gap-4 text-xs font-medium my-1">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  {entry.name}:
                </span>
                <span className="font-mono text-slate-400 font-bold">
                  {entry.value}%
                </span>
              </div>
            );
          }
          return (
            <div key={index} className="flex items-center justify-between gap-4 text-xs font-medium my-1">
              <span className="flex items-center gap-1.5" style={{ color: entry.color || entry.stroke }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color || entry.stroke }} />
                {entry.name}:
              </span>
              <span className="font-mono text-foreground font-black">
                {entry.value}{entry.name.includes('Rate') ? '%' : 'd'}
              </span>
            </div>
          );
        })}
        <div className="mt-2.5 pt-1.5 border-t border-zinc-100 dark:border-zinc-850/60 text-[10px] text-blue-500 font-bold flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> Click data node to audit shipments
        </div>
      </div>
    );
  }
  return null;
};
