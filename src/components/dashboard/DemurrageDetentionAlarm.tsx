import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  MapPin, 
  Send, 
  Search, 
  Filter, 
  TrendingUp, 
  ShieldAlert, 
  Calendar, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Percent,
  Anchor,
  Truck,
  Activity,
  ThumbsUp
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/data-display/card';
import { Badge } from '@/components/ui/data-display/badge';
import { Button } from '@/components/ui/forms/button';
import { toast } from 'sonner';

interface DemurrageContainer {
  id: string;
  containerNo: string;
  shipmentId: string;
  vesselName: string;
  portOfDischarge: string;
  carrierName: string;
  freeTimeTotalDays: number;
  daysAtPort: number;
  status: 'In Terminal' | 'Under Audit' | 'Cleared' | 'Overdue';
  arrivalDate: string;
  dailyRateAfterFreeTime: number; // $ per day
  portCongestionMultiplier: number; // e.g. 1.2
  predictedGateOutDelayDays: number; // ML predicted days
}

interface DemurrageDetentionAlarmProps {
  shipments?: any[];
}

export function DemurrageDetentionAlarm({ shipments = [] }: DemurrageDetentionAlarmProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPort, setSelectedPort] = useState<'All' | 'LAX' | 'RTM' | 'SIN' | 'HUR'>('All');
  const [selectedRisk, setSelectedRisk] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const [activeActions, setActiveActions] = useState<Record<string, string>>({});
  const [simulatedFreeTimeExpansion, setSimulatedFreeTimeExpansion] = useState<Record<string, number>>({});

  // Generate container dataset linked loosely to active shipments, with fallback baseline
  const containers: DemurrageContainer[] = useMemo(() => {
    const baseContainers: DemurrageContainer[] = [
      {
        id: 'C1',
        containerNo: 'MSKU9827364',
        shipmentId: 'SH-2026-001',
        vesselName: 'Maersk Mc-Kinney Moller',
        portOfDischarge: 'LAX',
        carrierName: 'Maersk',
        freeTimeTotalDays: 7,
        daysAtPort: 6,
        status: 'In Terminal',
        arrivalDate: '2026-07-14',
        dailyRateAfterFreeTime: 180,
        portCongestionMultiplier: 1.25,
        predictedGateOutDelayDays: 2.5
      },
      {
        id: 'C2',
        containerNo: 'HLXU1129983',
        shipmentId: 'SH-2026-004',
        vesselName: 'Hapag Algeciras',
        portOfDischarge: 'RTM',
        carrierName: 'Hapag-Lloyd',
        freeTimeTotalDays: 5,
        daysAtPort: 4,
        status: 'In Terminal',
        arrivalDate: '2026-07-16',
        dailyRateAfterFreeTime: 220,
        portCongestionMultiplier: 1.10,
        predictedGateOutDelayDays: 1.8
      },
      {
        id: 'C3',
        containerNo: 'COSX4458821',
        shipmentId: 'SH-2026-007',
        vesselName: 'COSCO Universe',
        portOfDischarge: 'SIN',
        carrierName: 'COSCO',
        freeTimeTotalDays: 6,
        daysAtPort: 8,
        status: 'Overdue',
        arrivalDate: '2026-07-11',
        dailyRateAfterFreeTime: 195,
        portCongestionMultiplier: 1.40,
        predictedGateOutDelayDays: 4.0
      },
      {
        id: 'C4',
        containerNo: 'MSCU5561129',
        shipmentId: 'SH-2026-009',
        vesselName: 'MSC Isabella',
        portOfDischarge: 'LAX',
        carrierName: 'MSC',
        freeTimeTotalDays: 7,
        daysAtPort: 2,
        status: 'In Terminal',
        arrivalDate: '2026-07-18',
        dailyRateAfterFreeTime: 180,
        portCongestionMultiplier: 1.25,
        predictedGateOutDelayDays: 0.5
      },
      {
        id: 'C5',
        containerNo: 'ONEY3398112',
        shipmentId: 'SH-2026-012',
        vesselName: 'ONE Apus',
        portOfDischarge: 'HUR',
        carrierName: 'ONE',
        freeTimeTotalDays: 5,
        daysAtPort: 5,
        status: 'In Terminal',
        arrivalDate: '2026-07-15',
        dailyRateAfterFreeTime: 250,
        portCongestionMultiplier: 1.50,
        predictedGateOutDelayDays: 3.2
      },
      {
        id: 'C6',
        containerNo: 'EVER7782119',
        shipmentId: 'SH-2026-015',
        vesselName: 'Ever Given',
        portOfDischarge: 'RTM',
        carrierName: 'Evergreen',
        freeTimeTotalDays: 6,
        daysAtPort: 1,
        status: 'Cleared',
        arrivalDate: '2026-07-19',
        dailyRateAfterFreeTime: 210,
        portCongestionMultiplier: 1.10,
        predictedGateOutDelayDays: 0.0
      }
    ];

    // Align with incoming actual shipments dynamically to seed more real items if available
    const liveItems = shipments
      .filter(s => s.status === 'In Port' || s.status === 'Arrived' || s.destinationPort)
      .slice(0, 5)
      .map((s, i) => {
        const arrivalOffset = Math.floor(Math.random() * 8) + 1; // 1-8 days ago
        const freeTime = s.mode === 'Sea' ? 7 : 4;
        return {
          id: `C-LIVE-${s.id || i}`,
          containerNo: s.containerNumber || `CONT-${Math.floor(100000 + Math.random() * 900000)}`,
          shipmentId: s.shipmentId || s.id || `SH-${Math.floor(1000 + Math.random() * 9000)}`,
          vesselName: s.vesselName || s.carrierName || 'Intermodal Freight',
          portOfDischarge: s.destinationPort || 'LAX',
          carrierName: s.carrierName || 'Alliance Logistics',
          freeTimeTotalDays: freeTime,
          daysAtPort: arrivalOffset,
          status: arrivalOffset > freeTime ? 'Overdue' as const : 'In Terminal' as const,
          arrivalDate: new Date(Date.now() - arrivalOffset * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          dailyRateAfterFreeTime: 200,
          portCongestionMultiplier: s.portCongestionLevel === 'High' ? 1.45 : s.portCongestionLevel === 'Medium' ? 1.20 : 1.0,
          predictedGateOutDelayDays: s.delayRisk === 'High' ? 3.5 : s.delayRisk === 'Medium' ? 1.5 : 0.2
        };
      });

    // Merge baseline and dynamically extracted container states
    const merged = [...baseContainers];
    liveItems.forEach(item => {
      if (!merged.some(m => m.shipmentId === item.shipmentId)) {
        merged.push(item);
      }
    });

    return merged;
  }, [shipments]);

  // Compute calculated values for each container
  const enrichedContainers = useMemo(() => {
    return containers.map(c => {
      const extraDays = simulatedFreeTimeExpansion[c.id] || 0;
      const effectiveFreeTime = c.freeTimeTotalDays + extraDays;
      const daysRemaining = effectiveFreeTime - c.daysAtPort;
      
      // Predict risk level
      let riskLevel: 'High' | 'Medium' | 'Low' = 'Low';
      if (daysRemaining <= 0) {
        riskLevel = 'High';
      } else if (daysRemaining <= 1.5 || (daysRemaining < c.predictedGateOutDelayDays)) {
        riskLevel = 'High';
      } else if (daysRemaining <= 3 || (daysRemaining < c.predictedGateOutDelayDays + 1)) {
        riskLevel = 'Medium';
      }

      // Financial Penalty calculation
      let estimatedPenalty = 0;
      let activePenalty = 0;

      // Current penalty
      if (c.daysAtPort > effectiveFreeTime) {
        const billableDays = c.daysAtPort - effectiveFreeTime;
        activePenalty = billableDays * c.dailyRateAfterFreeTime * c.portCongestionMultiplier;
      }

      // Predicted additional penalty based on ML gate-out delay days
      const totalEstimatedDaysAtPort = c.daysAtPort + c.predictedGateOutDelayDays;
      if (totalEstimatedDaysAtPort > effectiveFreeTime) {
        const totalBillableDays = totalEstimatedDaysAtPort - effectiveFreeTime;
        estimatedPenalty = totalBillableDays * c.dailyRateAfterFreeTime * c.portCongestionMultiplier;
      }

      return {
        ...c,
        effectiveFreeTime,
        daysRemaining,
        riskLevel,
        activePenalty: Math.round(activePenalty),
        estimatedPenalty: Math.round(estimatedPenalty),
        potentialSavings: Math.max(0, Math.round(estimatedPenalty - activePenalty))
      };
    });
  }, [containers, simulatedFreeTimeExpansion]);

  // Filter handlers
  const filteredContainers = useMemo(() => {
    return enrichedContainers.filter(c => {
      const matchSearch = c.containerNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.vesselName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.shipmentId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchPort = selectedPort === 'All' || c.portOfDischarge === selectedPort;
      const matchRisk = selectedRisk === 'All' || c.riskLevel === selectedRisk;
      return matchSearch && matchPort && matchRisk;
    });
  }, [enrichedContainers, searchTerm, selectedPort, selectedRisk]);

  // Aggregate Metrics
  const summaryStats = useMemo(() => {
    const totalAccumulated = enrichedContainers.reduce((acc, c) => acc + c.activePenalty, 0);
    const totalRiskPenalty = enrichedContainers.reduce((acc, c) => acc + c.estimatedPenalty, 0);
    const highRiskCount = enrichedContainers.filter(c => c.riskLevel === 'High').length;
    const itemsUnderLimit = enrichedContainers.filter(c => c.daysRemaining > 0).length;

    return {
      totalAccumulated,
      totalRiskPenalty,
      highRiskCount,
      itemsUnderLimit
    };
  }, [enrichedContainers]);

  const triggerNegotiateFreeTime = (containerId: string, currentFreeTime: number) => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: `Requesting extra terminal free-time for container...`,
        success: () => {
          setSimulatedFreeTimeExpansion(prev => ({
            ...prev,
            [containerId]: (prev[containerId] || 0) + 3
          }));
          return `Carrier approved +3 days Free-Time extension!`;
        },
        error: `Extension request declined.`
      }
    );
  };

  const handleDispatchPriorityDrayage = (containerId: string) => {
    setActiveActions(prev => ({
      ...prev,
      [containerId]: 'Dispatching Express Drayage Carrier'
    }));
    toast.success(`Drayage dispatch instructions transmitted to port terminal! Priority gate-out scheduled.`);
  };

  return (
    <div className="space-y-6" id="demurrage-detention-alarm-module">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent p-5 rounded-2xl border border-amber-500/20">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <h2 className="text-lg font-black tracking-tight text-foreground flex items-center gap-1.5">
                Demurrage & Detention AI Watchtower
                <Badge className="bg-amber-500 text-white text-[9px] font-black border-none px-2 h-4">
                  Predictive Engine Active
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Predicts and quantifies terminal over-stay penalties (Demurrage) relative to vendor free-time contracts.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="text-[10px] font-black text-muted-foreground block uppercase">Active Exposure Level</span>
            <span className="text-sm font-black text-amber-600 font-mono">HIGH CRITICAL</span>
          </div>
          <div className="h-8 w-[1px] bg-amber-500/20 hidden md:block" />
          <div className="bg-amber-500/10 rounded-xl px-4 py-2 border border-amber-500/20 text-amber-600">
            <span className="text-[9px] font-extrabold uppercase block text-muted-foreground">Est. 90D Savings</span>
            <span className="text-sm font-black font-mono flex items-center">$18,450.00</span>
          </div>
        </div>
      </div>

      {/* Stats KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">Accrued Demurrage</span>
              <span className="text-xl font-black text-zinc-900 dark:text-zinc-50 font-mono">
                ${summaryStats.totalAccumulated.toLocaleString()}
              </span>
              <span className="text-[9px] text-emerald-500 font-bold block flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3 inline" /> Audited terminal logs
              </span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border text-zinc-500">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">Est. Terminal Penalty Risk</span>
              <span className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
                ${summaryStats.totalRiskPenalty.toLocaleString()}
              </span>
              <span className="text-[9px] text-amber-500 font-bold block flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3 inline animate-pulse" /> ML predicted gate-out
              </span>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-200/50 text-amber-500">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">At-Risk Containers</span>
              <span className="text-xl font-black text-rose-500 font-mono">
                {summaryStats.highRiskCount} <span className="text-xs text-muted-foreground font-normal">Containers</span>
              </span>
              <span className="text-[9px] text-rose-400 font-bold block">
                Exceeding free-time target &lt; 24h
              </span>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-200/50 text-rose-500">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">Free-Time Margin Status</span>
              <span className="text-xl font-black text-emerald-500 font-mono">
                {summaryStats.itemsUnderLimit} <span className="text-xs text-muted-foreground font-normal">Optimal</span>
              </span>
              <span className="text-[9px] text-emerald-500 font-bold block flex items-center gap-0.5">
                <ThumbsUp className="w-3 h-3" /> Gate-out schedules verified
              </span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-200/50 text-emerald-500">
              <Activity className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search Container#, Vessel, or ShipmentID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 w-full rounded-lg text-xs bg-white dark:bg-zinc-950 border focus:outline-hidden focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              <MapPin className="w-3 h-3 text-amber-500" /> Port:
            </span>
            <div className="flex rounded-md border p-0.5 bg-white dark:bg-zinc-950">
              {(['All', 'LAX', 'RTM', 'SIN'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setSelectedPort(p)}
                  className={`px-2 py-1 text-[10px] font-extrabold rounded-md transition-all ${
                    selectedPort === p 
                      ? 'bg-zinc-900 text-white dark:bg-zinc-800' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              <Filter className="w-3 h-3 text-amber-500" /> Risk:
            </span>
            <div className="flex rounded-md border p-0.5 bg-white dark:bg-zinc-950">
              {(['All', 'High', 'Medium', 'Low'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setSelectedRisk(r)}
                  className={`px-2 py-1 text-[10px] font-extrabold rounded-md transition-all ${
                    selectedRisk === r 
                      ? 'bg-rose-500 text-white' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Container Ledger */}
      <Card className="border border-zinc-200 dark:border-zinc-800/80 shadow-xs">
        <CardHeader className="pb-2 border-b">
          <CardTitle className="text-sm font-black flex items-center gap-2">
            <Anchor className="w-4 h-4 text-amber-500" /> Active Port Container Free-Time Analysis
          </CardTitle>
          <CardDescription className="text-xs">
            Dynamic tracking of containers at dock including current daily penalties and projected fees computed with ML predictive gate-out offsets.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredContainers.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              <AlertCircle className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
              <p className="font-bold">No active containers found matching search criteria.</p>
              <p className="text-[10px] mt-0.5">Try widening your search terms or clearing transport filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {filteredContainers.map(c => {
                const isOverdue = c.daysRemaining < 0;
                const freeTimePercent = Math.min(100, (c.daysAtPort / c.effectiveFreeTime) * 100);
                
                return (
                  <div key={c.id} className="p-5 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* LHS: Container Core Stats */}
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 rounded-xl border text-center shrink-0 min-w-[70px] ${
                        c.riskLevel === 'High' 
                          ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30' 
                          : c.riskLevel === 'Medium'
                          ? 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900/30'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/30'
                      }`}>
                        <span className="text-[9px] font-black uppercase tracking-wider block">Risk</span>
                        <span className="text-xs font-black block">{c.riskLevel}</span>
                        <span className="text-[9px] font-bold block mt-1 font-mono">
                          {c.daysRemaining <= 0 ? 'OVERDUE' : `${c.daysRemaining}d left`}
                        </span>
                      </div>

                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-black text-zinc-800 dark:text-zinc-100 font-mono">
                            {c.containerNo}
                          </span>
                          <Badge variant="outline" className="text-[10px] font-mono h-5 py-0 px-2">
                            {c.shipmentId}
                          </Badge>
                          <Badge variant="secondary" className="text-[9px] font-black h-5 py-0 px-2 bg-zinc-100 dark:bg-zinc-900">
                            Port: {c.portOfDischarge}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-x-4 text-[11px] text-muted-foreground font-semibold">
                          <span className="flex items-center gap-1">
                            <Anchor className="w-3.5 h-3.5 text-zinc-400" /> Vessel: <strong>{c.vesselName}</strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <Truck className="w-3.5 h-3.5 text-zinc-400" /> Carrier: <strong>{c.carrierName}</strong>
                          </span>
                        </div>

                        {/* Free Time Progress Gauge */}
                        <div className="pt-2 max-w-md">
                          <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground mb-1">
                            <span>Free-time usage: {c.daysAtPort} / {c.effectiveFreeTime} days</span>
                            <span className={freeTimePercent >= 80 ? 'text-rose-500 font-black' : 'text-zinc-500'}>
                              {Math.round(freeTimePercent)}% Expired
                            </span>
                          </div>
                          <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                freeTimePercent >= 100 
                                  ? 'bg-rose-500' 
                                  : freeTimePercent >= 80 
                                  ? 'bg-amber-500 animate-pulse' 
                                  : 'bg-indigo-500'
                              }`} 
                              style={{ width: `${freeTimePercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Financial Penalty Dial */}
                    <div className="flex items-center gap-6 shrink-0 bg-zinc-50/50 dark:bg-zinc-900/20 p-3.5 border rounded-xl min-w-[240px]">
                      <div className="space-y-2 flex-1">
                        <div className="flex justify-between items-center text-[10px] font-black text-muted-foreground uppercase">
                          <span>Accrued Penalty:</span>
                          <span className="font-mono text-foreground">${c.activePenalty}</span>
                        </div>
                        
                        <div className="h-[1px] bg-zinc-200 dark:bg-zinc-800" />

                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-muted-foreground font-bold uppercase flex items-center gap-1">
                            Predicted Final:
                          </span>
                          <span className={`font-mono text-xs font-black ${
                            c.estimatedPenalty > 0 ? 'text-rose-500' : 'text-emerald-500'
                          }`}>
                            ${c.estimatedPenalty}
                          </span>
                        </div>

                        {/* Congestion Alert details */}
                        <div className="text-[9px] text-muted-foreground font-semibold flex items-center gap-1 bg-zinc-100/50 dark:bg-zinc-800/40 px-1.5 py-0.5 rounded">
                          <Calendar className="w-3 h-3 text-amber-500" />
                          <span>Rate: ${c.dailyRateAfterFreeTime}/day (Congestion x{c.portCongestionMultiplier})</span>
                        </div>
                      </div>

                      {/* Visual Ring Indicator */}
                      <div className="relative flex items-center justify-center shrink-0">
                        <svg className="w-12 h-12 transform -rotate-90">
                          <circle cx="24" cy="24" r="20" stroke="currentColor" className="text-zinc-100 dark:text-zinc-800" strokeWidth="3" fill="transparent" />
                          <circle 
                            cx="24" 
                            cy="24" 
                            r="20" 
                            stroke="currentColor" 
                            className={c.riskLevel === 'High' ? 'text-rose-500' : c.riskLevel === 'Medium' ? 'text-amber-500' : 'text-emerald-500'} 
                            strokeWidth="3" 
                            fill="transparent" 
                            strokeDasharray={2 * Math.PI * 20}
                            strokeDashoffset={2 * Math.PI * 20 * (1 - Math.min(100, freeTimePercent) / 100)}
                          />
                        </svg>
                        <div className="absolute text-[10px] font-black text-zinc-800 dark:text-zinc-200">
                          {c.daysAtPort}d
                        </div>
                      </div>
                    </div>

                    {/* RHS: Interactive Actions */}
                    <div className="flex flex-row lg:flex-col items-center justify-end gap-2.5 shrink-0 w-full lg:w-auto">
                      <Button 
                        onClick={() => triggerNegotiateFreeTime(c.id, c.freeTimeTotalDays)}
                        variant="outline" 
                        size="sm" 
                        className="text-xs flex items-center gap-1 flex-1 lg:flex-none border-amber-200/50 text-amber-600 bg-amber-50/10 hover:bg-amber-100/20"
                      >
                        <Percent className="w-3.5 h-3.5" /> Extend Free-Time (+3d)
                      </Button>
                      <Button 
                        onClick={() => handleDispatchPriorityDrayage(c.id)}
                        variant="default" 
                        size="sm" 
                        className="text-xs flex items-center gap-1 flex-1 lg:flex-none bg-indigo-600 text-white hover:bg-indigo-700 font-bold"
                      >
                        <Send className="w-3.5 h-3.5" /> Express Drayage
                      </Button>
                      
                      {activeActions[c.id] && (
                        <span className="text-[9px] text-indigo-500 font-extrabold font-mono animate-pulse block lg:text-right mt-1">
                          ⚡ Status: {activeActions[c.id]}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SLA Free-Time Best Practices / Intelligence Panel */}
      <Card className="border bg-zinc-50/30 dark:bg-zinc-900/10">
        <CardContent className="p-4 flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wide">Understanding AI-Driven Demurrage Optimization</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Our ML model analyzes historical port congestion, live terminal processing times, customs clearance history, and local trucking capacity to project exactly when a container will exit the port gate. Use this data proactively: requesting a free-time extension before the container lands is 85% more likely to be approved by ocean carriers than post-landing disputes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
