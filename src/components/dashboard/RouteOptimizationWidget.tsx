import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/data-display/card';
import { Badge } from '@/components/ui/data-display/badge';
import { Button } from '@/components/ui/forms/button';
import { 
  Map, 
  Wind, 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle2, 
  Sliders, 
  DollarSign, 
  Clock, 
  ShieldCheck, 
  Train, 
  Plane, 
  Anchor, 
  TrendingUp, 
  AlertCircle,
  HelpCircle,
  Compass
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Skeleton } from '@/components/ui/feedback/skeleton';

// Simulated external data
const SIMULATED_CONGESTION = {
  'Shanghai': { level: 'High', delayHours: 48 },
  'Los Angeles': { level: 'High', delayHours: 72 },
  'Rotterdam': { level: 'Medium', delayHours: 24 },
  'Singapore': { level: 'Low', delayHours: 6 },
};

const SIMULATED_WEATHER = {
  'Pacific Ocean': { condition: 'Typhoon Warning', severity: 'Severe' },
  'North Atlantic': { condition: 'Heavy Storms', severity: 'High' },
  'Suez Canal': { condition: 'Clear', severity: 'Low' },
};

interface RouteOption {
  id: string;
  name: string;
  mode: 'Ocean' | 'Ocean-Rail' | 'Ocean-Air';
  icon: any;
  transitDays: number;
  cost: number;
  riskScore: number;
  description: string;
  pathway: string;
}

export function RouteOptimizationWidget({ shipments, onUpdateRoute }: { shipments: any[], onUpdateRoute?: () => void }) {
  const { token } = useAuth();
  
  // Controls & Sliders
  const [timePriority, setTimePriority] = useState<number>(50); // 1-100 (Higher = speed priority)
  const [costSensitivity, setCostSensitivity] = useState<number>(50); // 1-100 (Higher = cheaper)
  const [riskAversion, setRiskAversion] = useState<number>(60); // 1-100 (Higher = safer)

  // Port Disruption Toggles
  const [uslaxStrike, setUslaxStrike] = useState<boolean>(true);
  const [rotterdamCustomsQueue, setRotterdamCustomsQueue] = useState<boolean>(false);
  const [redSeaThreat, setRedSeaThreat] = useState<boolean>(true);

  // Active Selected Shipment to simulate
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>('');
  
  // AI/Legacy Optimizations
  const [optimizations, setOptimizations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const activeShipments = shipments.filter(s => 
    s.status === 'InTransit' || s.status === 'In Transit' || s.status === 'Delayed' || s.status === 'Active'
  );

  // Initialize selected shipment
  useEffect(() => {
    if (activeShipments.length > 0 && !selectedShipmentId) {
      setSelectedShipmentId(activeShipments[0].id || activeShipments[0].referenceNumber);
    }
  }, [shipments, selectedShipmentId]);

  const runOptimization = async () => {
    if (!token || activeShipments.length === 0) return;
    setIsLoading(true);
    try {
      const data = await fetchApi('/gemini/optimize-routes', token, {
        method: 'POST',
        body: JSON.stringify({
          activeShipments: activeShipments.slice(0, 10),
          congestionData: SIMULATED_CONGESTION,
          weatherData: SIMULATED_WEATHER
        })
      });
      if (Array.isArray(data)) {
        setOptimizations(data);
      }
    } catch (err) {
      console.error("Failed to fetch route optimizations:", err);
      // Fallback local mock
      setOptimizations([
        {
          referenceNumber: 'SHP-9921',
          riskFactor: 'High',
          currentRoute: 'Shanghai (CNSHA) ──(Ocean)──> Los Angeles (USLAX)',
          suggestedAlternative: 'Shanghai (CNSHA) ──(Ocean)──> Seattle (USSEA) ──(Rail)──> Chicago Hub',
          reasoning: 'Heavy yard gridlock at Los Angeles and crane strikes resolved via Seattle intermodal rail bridge.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (shipments.length > 0 && optimizations.length === 0 && !isLoading) {
      runOptimization();
    }
  }, [shipments.length]);

  const currentShipmentObj = activeShipments.find(s => s.id === selectedShipmentId || s.referenceNumber === selectedShipmentId) || activeShipments[0];

  // Algorithmic Route Generator based on sliders and disruptions
  const generateMultimodalAlternatives = (): RouteOption[] => {
    if (!currentShipmentObj) return [];

    const isHighPriority = (currentShipmentObj.priority || '').toLowerCase() === 'high';
    const destination = (currentShipmentObj.destinationPort || currentShipmentObj.destination || '').toUpperCase();
    const isUSBound = destination.includes('LAX') || destination.includes('NYC') || destination.includes('LOS ANGELES');

    // Base rates
    let oceanDays = 22;
    let oceanCost = 4200;
    let oceanRisk = 15;

    let railDays = 14;
    let railCost = 6800;
    let railRisk = 10;

    let airDays = 5;
    let airCost = 14500;
    let airRisk = 5;

    // Disruption overlays
    if (uslaxStrike && isUSBound) {
      oceanRisk += 70;
      oceanDays += 10; // Major strike queue delay
    }
    if (redSeaThreat && !isUSBound) {
      oceanRisk += 45;
      oceanDays += 12; // detour around Cape
      oceanCost += 2100; // bunker adjustment fee
    }
    if (rotterdamCustomsQueue && (destination.includes('RTM') || destination.includes('ROTTERDAM'))) {
      oceanRisk += 30;
      oceanDays += 5;
    }

    // High priority adjustments
    if (isHighPriority) {
      oceanRisk += 5; // priority cargo has high exposure
    }

    return [
      {
        id: 'standard-ocean',
        name: 'Standard Direct Ocean',
        mode: 'Ocean',
        icon: Anchor,
        transitDays: oceanDays,
        cost: oceanCost,
        riskScore: Math.min(99, oceanRisk),
        description: uslaxStrike ? 'Exposed to major West Coast port disputes and vessel bunching.' : 'Standard shipping lanes. Low cost but highest transit duration.',
        pathway: `${currentShipmentObj.originPort || 'CNSHA'} ──[Ocean Vessel]──> ${currentShipmentObj.destinationPort || 'USLAX'}`
      },
      {
        id: 'intermodal-rail',
        name: 'Intermodal Landbridge (Ocean-Rail)',
        mode: 'Ocean-Rail',
        icon: Train,
        transitDays: railDays + (uslaxStrike ? 1 : 0),
        cost: railCost,
        riskScore: Math.min(99, Math.round(railRisk + (uslaxStrike ? 5 : 0))),
        description: 'Bypasses coastal crane gridlocks. Discharged at Seattle (USSEA) & double-stacked via Class-I Freight Rail.',
        pathway: `${currentShipmentObj.originPort || 'CNSHA'} ──[Ocean]──> Seattle (USSEA) ──[Double-Stack Rail]──> Chicago Hub`
      },
      {
        id: 'intermodal-air',
        name: 'Fly-Sea Express (Ocean-Air)',
        mode: 'Ocean-Air',
        icon: Plane,
        transitDays: airDays,
        cost: airCost,
        riskScore: airRisk,
        description: 'Maximum velocity. Discharged at Honolulu or Anchorage, then airlifted directly to final terminal hub.',
        pathway: `${currentShipmentObj.originPort || 'CNSHA'} ──[Ocean]──> Anchorage (ANC) ──[Air Cargo]──> East-Coast Gateway`
      }
    ];
  };

  const routeOptions = generateMultimodalAlternatives();

  // Score each option based on sliders:
  // Speed Utility: SpeedWeight * (100 - transitDaysNormalized)
  // Cost Utility: CostWeight * (100 - costNormalized)
  // Safety Utility: SafetyWeight * (100 - riskScore)
  const scoredRoutes = routeOptions.map(opt => {
    // Normalize values
    const speedNormalized = Math.max(0, 100 - (opt.transitDays * 3)); // 5 days is ~85, 32 days is ~4
    const costNormalized = Math.max(0, 100 - (opt.cost / 180)); // $4000 is ~77, $15000 is ~16
    const safetyNormalized = 100 - opt.riskScore;

    // Compute weights normalized to sum up nicely
    const totalSliders = timePriority + costSensitivity + riskAversion || 1;
    const wTime = timePriority / totalSliders;
    const wCost = costSensitivity / totalSliders;
    const wRisk = riskAversion / totalSliders;

    const utilityScore = Math.round(
      (speedNormalized * wTime * 100) + 
      (costNormalized * wCost * 100) + 
      (safetyNormalized * wRisk * 100)
    );

    return {
      ...opt,
      utilityScore
    };
  });

  // Find the route with highest utility score
  const optimalRoute = scoredRoutes.reduce((prev, current) => 
    (prev.utilityScore > current.utilityScore) ? prev : current
  , scoredRoutes[0]);

  const handleApplyBypass = (route: any) => {
    toast.success(`Routing updated for ${currentShipmentObj.referenceNumber || 'this shipment'}! Mode set to ${route.mode} via ${route.name}. ETA adjusted to -${currentShipmentObj.predictedDelayDays || 3} days.`);
    if (onUpdateRoute) onUpdateRoute();
  };

  return (
    <Card className="h-full flex flex-col border-indigo-100 dark:border-indigo-900/50 shadow-sm">
      <CardHeader className="pb-3 shrink-0 bg-indigo-50/40 dark:bg-indigo-950/25 border-b border-indigo-500/10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-indigo-950 dark:text-indigo-200">
              <Compass className="w-5 h-5 text-indigo-500 animate-spin-slow" /> 
              Multi-Modal Smart-Sourcing Router
            </CardTitle>
            <CardDescription className="text-indigo-700/80 dark:text-indigo-400/80 font-medium">
              Dynamic Sourcing, Landbridge Routing, and Disruption Bypass Controls
            </CardDescription>
          </div>
          <Badge className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200/50 uppercase text-[10px] font-bold">
            Algorithmic Engine V3
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="overflow-y-auto flex-1 pb-4 pt-5 space-y-6">
        {/* Disruption Overlay Control Hub */}
        <div className="bg-slate-50 dark:bg-zinc-900/60 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-1.5 mb-3">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-foreground">Active Threat & Port Disruption Overlays</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex items-center justify-between p-2.5 rounded-lg border bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer transition-colors">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground block">USLAX Crane Strike</span>
                <span className="text-[10px] text-muted-foreground block">West Coast labor dispute</span>
              </div>
              <input 
                type="checkbox" 
                checked={uslaxStrike} 
                onChange={(e) => setUslaxStrike(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
            </label>
            <label className="flex items-center justify-between p-2.5 rounded-lg border bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer transition-colors">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground block">Rotterdam Customs Queue</span>
                <span className="text-[10px] text-muted-foreground block">Phytosanitary bottleneck</span>
              </div>
              <input 
                type="checkbox" 
                checked={rotterdamCustomsQueue} 
                onChange={(e) => setRotterdamCustomsQueue(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
            </label>
            <label className="flex items-center justify-between p-2.5 rounded-lg border bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer transition-colors">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground block">Red Sea Red Corridor</span>
                <span className="text-[10px] text-muted-foreground block">Suez military threat detour</span>
              </div>
              <input 
                type="checkbox" 
                checked={redSeaThreat} 
                onChange={(e) => setRedSeaThreat(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
            </label>
          </div>
        </div>

        {/* Dynamic Sourcing Controls & Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Sourcing Priority Sliders */}
          <div className="md:col-span-4 bg-indigo-50/20 dark:bg-indigo-950/10 p-4 rounded-xl border border-indigo-500/10 space-y-4">
            <div className="flex items-center gap-1.5 border-b border-indigo-500/10 pb-2">
              <Sliders className="w-4 h-4 text-indigo-500" />
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-indigo-950 dark:text-indigo-200">Sourcing Priorities</h3>
            </div>
            
            {/* Speed Priority Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-foreground">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-blue-500" /> Speed (Time)</span>
                <span className="text-blue-500 font-mono">{timePriority}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={timePriority}
                onChange={(e) => setTimePriority(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[9px] text-muted-foreground">
                <span>Flexible Days</span>
                <span>Fast Transit</span>
              </div>
            </div>

            {/* Cost Sensitivity Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-foreground">
                <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Cost Savings</span>
                <span className="text-emerald-500 font-mono">{costSensitivity}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={costSensitivity}
                onChange={(e) => setCostSensitivity(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[9px] text-muted-foreground">
                <span>Budget Flexible</span>
                <span>Lowest Cost</span>
              </div>
            </div>

            {/* Risk Aversion Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-foreground">
                <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-rose-500" /> Risk Aversion</span>
                <span className="text-rose-500 font-mono">{riskAversion}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={riskAversion}
                onChange={(e) => setRiskAversion(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
              <div className="flex justify-between text-[9px] text-muted-foreground">
                <span>Risk Tolerant</span>
                <span>High Security</span>
              </div>
            </div>
          </div>

          {/* Sourcing Alternatives Map & Compare Screen */}
          <div className="md:col-span-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-foreground">Scenario Comparison Matrix</h3>
                <p className="text-xs text-muted-foreground">Evaluating optimal pathways matching priority thresholds</p>
              </div>

              {/* Consignment Selection */}
              {activeShipments.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Cargo:</span>
                  <select 
                    value={selectedShipmentId} 
                    onChange={(e) => setSelectedShipmentId(e.target.value)}
                    className="text-xs font-bold bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-foreground"
                  >
                    {activeShipments.map(s => (
                      <option key={s.id} value={s.id || s.referenceNumber}>
                        {s.referenceNumber || `SHP-${s.id.substring(0,5).toUpperCase()}`} ({s.originPort || 'CNSHA'} ──&gt; {s.destinationPort || 'USLAX'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Generated Option Cards */}
            <div className="grid grid-cols-1 gap-3">
              {scoredRoutes.map((route) => {
                const isOptimal = route.id === optimalRoute.id;
                const ModeIcon = route.icon;
                
                return (
                  <div 
                    key={route.id} 
                    className={`relative p-4 rounded-xl border transition-all ${
                      isOptimal 
                        ? 'border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/15 shadow-md ring-1 ring-indigo-400' 
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    {isOptimal && (
                      <Badge className="absolute -top-2.5 right-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold uppercase text-[9px] tracking-wider py-0.5 px-2.5">
                        Optimal Choice
                      </Badge>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-lg shrink-0 mt-0.5 ${
                          route.mode === 'Ocean-Air' ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400' :
                          route.mode === 'Ocean-Rail' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                          'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        }`}>
                          <ModeIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-extrabold text-foreground">{route.name}</h4>
                            <Badge className="text-[10px] uppercase font-bold tracking-wider py-0 px-1.5" variant="outline">
                              {route.mode}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 font-mono leading-normal">{route.pathway}</p>
                          <p className="text-xs text-foreground/80 mt-1.5 max-w-lg">{route.description}</p>
                        </div>
                      </div>

                      {/* Score Metrics */}
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-150 dark:border-zinc-800">
                        <div className="flex items-center gap-4 sm:gap-6 text-center sm:text-right">
                          <div>
                            <span className="text-[10px] uppercase font-extrabold text-muted-foreground tracking-wider block">ETA</span>
                            <span className="text-sm font-extrabold text-foreground">{route.transitDays} Days</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-extrabold text-muted-foreground tracking-wider block">Estimated Cost</span>
                            <span className="text-sm font-extrabold text-foreground">${route.cost.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-extrabold text-muted-foreground tracking-wider block">Risk</span>
                            <span className={`text-sm font-extrabold block ${
                              route.riskScore >= 75 ? 'text-red-500' :
                              route.riskScore >= 45 ? 'text-amber-500' :
                              'text-emerald-500'
                            }`}>{route.riskScore} / 100</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className="text-[9px] uppercase font-extrabold text-muted-foreground tracking-widest block">Utility Index</span>
                            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-mono">{route.utilityScore}% Match</span>
                          </div>
                          <Button 
                            size="sm" 
                            variant={isOptimal ? 'default' : 'outline'}
                            onClick={() => handleApplyBypass(route)}
                            className={`h-8 font-bold text-xs ${
                              isOptimal 
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                                : 'border-zinc-200 dark:border-zinc-800 text-foreground'
                            }`}
                          >
                            Apply Sourcing
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Global Weather Warning & Port Delay Tracker */}
        <div className="space-y-3">
          <span className="text-xs font-black uppercase tracking-widest text-muted-foreground block">Global Weather Warning & Port Backlogs</span>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
            {Object.entries(SIMULATED_WEATHER).map(([region, data]) => (
              <div key={region} className="min-w-[210px] flex-shrink-0 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/40 rounded-xl p-3.5 flex items-start gap-3">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                  <Wind className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-blue-900 dark:text-blue-300">{region}</h4>
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mt-0.5">{data.condition}</p>
                  <span className="text-[10px] text-muted-foreground block mt-1">Severity: {data.severity}</span>
                </div>
              </div>
            ))}
            {Object.entries(SIMULATED_CONGESTION).map(([port, data]) => (
              <div key={port} className="min-w-[210px] flex-shrink-0 bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/40 rounded-xl p-3.5 flex items-start gap-3">
                <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg text-orange-600 dark:text-orange-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-orange-900 dark:text-orange-300">{port} Terminal</h4>
                  <p className="text-xs font-bold text-orange-700 dark:text-orange-400 mt-0.5">{data.delayHours}h Berth Delay</p>
                  <span className="text-[10px] text-muted-foreground block mt-1">Capacity: {data.level} Congestion</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
