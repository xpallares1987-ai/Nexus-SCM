import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { ComposableMap, Geographies, Geography, Marker, Line } from 'react-simple-maps';
import { useAuth } from '../../contexts/AuthContext';
import { fetchApi } from '../../lib/api';
import { 
  Map as MapIcon, 
  AlertTriangle, 
  Compass, 
  Anchor, 
  Train, 
  Truck, 
  ShieldAlert, 
  CloudLightning, 
  Activity, 
  AlertCircle, 
  ArrowRight, 
  CheckCircle2, 
  RefreshCw, 
  Globe, 
  Ship, 
  DollarSign, 
  Clock, 
  Sparkles,
  Layers,
  CheckCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/data-display/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/forms/select';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Approximate coordinates for common ports [longitude, latitude]
const PORT_COORDINATES: Record<string, [number, number]> = {
  'CNSHA': [121.4737, 31.2304],
  'ESBCN': [2.1734, 41.3851],
  'USLAX': [-118.2437, 34.0522],
  'NLRTM': [4.4792, 51.9225],
  'JPTYO': [139.6917, 35.6895],
  'SGSIN': [103.8198, 1.3521],
  'GBFEL': [1.3503, 51.9612],
  'DEHAM': [9.9937, 53.5511],
  'INBOM': [72.8777, 19.0760],
  'ZADUR': [31.0218, -29.8587],
  'BRSSZ': [-46.3312, -23.9608],
  'AUMEL': [144.9631, -37.8136],
  'USNYC': [-74.0060, 40.7128],
  'Aedxb': [55.2708, 25.2048],
  
  // Secondary Ports for Intermodal diversion
  'USSEA': [-122.3321, 47.6062], // Seattle Port
  'ESVLC': [-0.3763, 39.4699],   // Valencia Port
  'FRFOS': [4.8879, 43.4355],    // Marseille Port
  'CAVAN': [-123.1207, 49.2827]   // Vancouver Port
};

const getPortCoordinates = (portName: string): [number, number] | undefined => {
  if (!portName) return undefined;
  const key = portName.trim().toUpperCase();
  
  if (PORT_COORDINATES[key]) return PORT_COORDINATES[key];
  
  // Custom lookups for common names
  if (key === 'SHANGHAI' || key === 'SHA' || key.includes('SHANGHAI')) return PORT_COORDINATES['CNSHA'];
  if (key === 'BARCELONA' || key === 'BCN' || key.includes('BARCELONA')) return PORT_COORDINATES['ESBCN'];
  if (key === 'LOS ANGELES' || key === 'LAX' || key.includes('LOS ANGELES') || key.includes('L.A.')) return PORT_COORDINATES['USLAX'];
  if (key === 'ROTTERDAM' || key === 'RTM' || key.includes('ROTTERDAM')) return PORT_COORDINATES['NLRTM'];
  if (key === 'TOKYO' || key === 'TYO' || key.includes('TOKYO')) return PORT_COORDINATES['JPTYO'];
  if (key === 'SINGAPORE' || key === 'SIN' || key.includes('SINGAPORE')) return PORT_COORDINATES['SGSIN'];
  if (key === 'FELIXSTOWE' || key === 'FEL' || key.includes('FELIXSTOWE')) return PORT_COORDINATES['GBFEL'];
  if (key === 'HAMBURG' || key === 'HAM' || key.includes('HAMBURG')) return PORT_COORDINATES['DEHAM'];
  if (key === 'MUMBAI' || key === 'BOMBAY' || key === 'BOM' || key.includes('MUMBAI') || key.includes('BOMBAY')) return PORT_COORDINATES['INBOM'];
  if (key === 'DURBAN' || key === 'DUR' || key.includes('DURBAN')) return PORT_COORDINATES['ZADUR'];
  if (key === 'SANTOS' || key === 'SSZ' || key.includes('SANTOS')) return PORT_COORDINATES['BRSSZ'];
  if (key === 'MELBOURNE' || key === 'MEL' || key.includes('MELBOURNE')) return PORT_COORDINATES['AUMEL'];
  if (key === 'NEW YORK' || key === 'NYC' || key.includes('NEW YORK')) return PORT_COORDINATES['USNYC'];
  if (key === 'DUBAI' || key === 'DXB' || key.includes('DUBAI')) return PORT_COORDINATES['Aedxb'];
  
  return undefined;
};

// Threat heatmaps definition
interface RiskZone {
  id: string;
  name: string;
  type: 'weather' | 'labor' | 'customs' | 'geopolitical';
  coordinates: [number, number];
  radius: number; // Visual pixel size
  severity: 'Medium' | 'High' | 'Critical';
  description: string;
  affectedPorts: string[];
}

const RISK_ZONES: RiskZone[] = [
  {
    id: 'weather-pac',
    name: 'Super Typhoon "Malakas" Force 11',
    type: 'weather',
    coordinates: [135.0, 20.0],
    radius: 35,
    severity: 'High',
    description: 'Severe storm cell causing 8.5m swell heights and 95kt wind shear across active East Asia - US transit lanes.',
    affectedPorts: ['CNSHA', 'JPTYO']
  },
  {
    id: 'labor-lax',
    name: 'LAX/LBH Crane Operators Slowdown',
    type: 'labor',
    coordinates: [-118.2437, 34.0522],
    radius: 20,
    severity: 'Critical',
    description: 'Collective bargaining dispute at US West Coast ports causing 48h terminal discharge bottlenecks.',
    affectedPorts: ['USLAX']
  },
  {
    id: 'customs-rtm',
    name: 'Rotterdam Post-Brexit Customs Backlog',
    type: 'customs',
    coordinates: [4.4792, 51.9225],
    radius: 24,
    severity: 'Medium',
    description: 'New agricultural phytosanitary filing systems triggering 3-4 day clearance delays for non-EU manifests.',
    affectedPorts: ['NLRTM', 'GBFEL']
  },
  {
    id: 'geopolitical-suez',
    name: 'Red Sea High Threat Security Corridor',
    type: 'geopolitical',
    coordinates: [43.0, 12.5], // Bab-el-Mandeb Strait region
    radius: 30,
    severity: 'Critical',
    description: 'Active military threat guidelines advising container carrier deviations. Mandatory war-risk premiums applied.',
    affectedPorts: ['INBOM', 'Aedxb', 'SGSIN']
  }
];

// Bypass suggestions for active hazard locations
interface BypassConfig {
  originalPort: string;
  bypassPort: string;
  bypassPortName: string;
  bypassMethod: 'Rail-Freight' | 'Road-Feeder' | 'Air-Sea';
  bypassVessel: string;
  bypassCarrier: string;
  leadTimeDaysSaved: number;
  additionalCost: number;
  description: string;
}

const BYPASS_ROUTES: Record<string, BypassConfig> = {
  'USLAX': {
    originalPort: 'USLAX',
    bypassPort: 'USSEA',
    bypassPortName: 'Port of Seattle (USSEA)',
    bypassMethod: 'Rail-Freight',
    bypassVessel: 'Pacific Intermodal Express - Rail Option',
    bypassCarrier: 'BNSF Railway Intermodal',
    leadTimeDaysSaved: 7,
    additionalCost: 1750,
    description: 'Divert ocean leg to Port of Seattle (USSEA). Instant terminal discharge to double-stack BNSF railhead, bypassing LA basin crane bottlenecks with direct rail dispatch.'
  },
  'NLRTM': {
    originalPort: 'NLRTM',
    bypassPort: 'ESBCN',
    bypassPortName: 'Port of Barcelona (ESBCN)',
    bypassMethod: 'Rail-Freight',
    bypassVessel: 'Mediterranean Corridor Express',
    bypassCarrier: 'SNCF Logistics / Renfe Cargo',
    leadTimeDaysSaved: 5,
    additionalCost: 1250,
    description: 'Divert vessel to Barcelona Port (ESBCN). discharge to high-capacity standard-gauge freight rail directly linking South Europe hubs to Rotterdam and German warehouses.'
  }
};

export function ShipmentTrackingMap({ globalModeFilter }: { globalModeFilter?: string }) {
  const { token } = useAuth();
  
  // API Loaded Data
  const [shipments, setShipments] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  
  // Filtering
  const [carrierFilter, setCarrierFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Heatmap Layer Toggles
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({
    weather: true,
    labor: true,
    customs: true,
    geopolitical: true
  });

  // Selected Shipment / Scenario Engine State
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>('demo-1');
  const [appliedBypasses, setAppliedBypasses] = useState<Record<string, boolean>>({});
  const [isProcessingBypass, setIsProcessingBypass] = useState<boolean>(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Load Shipments & Parties
  useEffect(() => {
    async function load() {
      if (!token) return;
      try {
        const [shipmentData, partiesData] = await Promise.all([
          fetchApi('/shipments', token),
          fetchApi('/parties', token)
        ]);
        const active = shipmentData.filter((s: any) => {
          const st = (s.status || '').toLowerCase().replace(/[\s-_]/g, '');
          return st !== 'delivered' && st !== 'draft';
        });
        setShipments(active);
        setParties(partiesData || []);
      } catch (err) {
        console.error('Failed to load map data:', err);
      }
    }
    load();
  }, [token]);

  // Real-time Event Listener for updates
  useEffect(() => {
    const handleWsMessage = (e: any) => {
      const { type, payload } = e.detail;
      if (type === 'SHIPMENT_UPDATED') {
        const updatedShip = payload.shipment || payload;
        if (!updatedShip) return;

        setShipments(prev => {
          const exists = prev.find(s => s.id === updatedShip.id);
          const st = (updatedShip.status || '').toLowerCase().replace(/[\s-_]/g, '');
          const isStillActive = st !== 'delivered' && st !== 'draft';
          
          if (exists) {
            if (!isStillActive) {
              return prev.filter(s => s.id !== updatedShip.id);
            }
            return prev.map(s => s.id === updatedShip.id ? { ...s, ...updatedShip } : s);
          } else if (isStillActive) {
            return [...prev, updatedShip];
          }
          return prev;
        });
      }
    };

    document.addEventListener('ws-message', handleWsMessage);
    return () => document.removeEventListener('ws-message', handleWsMessage);
  }, []);

  const getPartyName = (id: string) => parties.find(p => p.id === id)?.companyName || 'Apex Ocean Shipping';

  // Define High-Fidelity Demo Shipments for Risk scenarios
  const demoShipments = [
    {
      id: 'demo-1',
      referenceNumber: 'FFW-2026-ALPHA',
      originPort: 'CNSHA',
      destinationPort: 'USLAX',
      carrierId: 'c1',
      type: 'Sea-FCL',
      priority: 'High',
      status: 'InTransit',
      eta: '2026-07-31T12:00:00Z',
      etd: '2026-07-15T12:00:00Z',
      freightCost: '4800',
      customsCost: '250',
      insuranceCost: '120',
      currency: 'USD',
      weight: '18500',
      commodity: 'High-Value Semiconductors (A-Class)',
      isDemo: true
    },
    {
      id: 'demo-2',
      referenceNumber: 'FFW-2026-OMEGA',
      originPort: 'CNSHA',
      destinationPort: 'NLRTM',
      carrierId: 'c2',
      type: 'Sea-FCL',
      priority: 'Normal',
      status: 'InTransit',
      eta: '2026-08-04T12:00:00Z',
      etd: '2026-07-12T12:00:00Z',
      freightCost: '5100',
      customsCost: '300',
      insuranceCost: '180',
      currency: 'USD',
      weight: '24100',
      commodity: 'Automotive Electric Power Units',
      isDemo: true
    }
  ];

  // Merge database shipments with our interactive demos
  const allShipments = [...demoShipments, ...shipments];

  // Map Filter Options
  const carriers = Array.from(new Set(allShipments.map(s => s.carrierId).filter(Boolean)));
  const types = Array.from(new Set(allShipments.map(s => s.type).filter(Boolean)));
  const priorities = Array.from(new Set(allShipments.map(s => s.priority).filter(Boolean)));

  const filteredShipments = allShipments.filter(s => {
    if (globalModeFilter && globalModeFilter !== 'All' && s.type !== globalModeFilter) return false;
    if (carrierFilter !== 'all' && s.carrierId !== carrierFilter) return false;
    if (typeFilter !== 'all' && s.type !== typeFilter) return false;
    if (priorityFilter !== 'all' && s.priority !== priorityFilter) return false;
    return true;
  });

  const selectedShipment = allShipments.find(s => s.id === selectedShipmentId) || allShipments[0];

  // Intelligent Live Risk Factor Calculation
  const calculateShipmentRisk = (ship: any) => {
    if (!ship) return { score: 10, level: 'Low' as const, reasons: [] as string[] };
    let score = 15;
    const reasons: string[] = [];

    const isHighPriority = ship.priority === 'High';
    if (isHighPriority) score += 10;

    const isDelayed = new Date(ship.eta) < new Date();
    if (isDelayed) {
      score += 15;
      reasons.push('Vessel delay vs ETA schedule');
    }

    // Match with active layer threats
    if (activeLayers.weather && (ship.originPort === 'CNSHA' || ship.originPort === 'JPTYO')) {
      score += 25;
      reasons.push('Western Pacific Typhoon storm band risk');
    }

    if (activeLayers.labor && ship.destinationPort === 'USLAX') {
      score += 35;
      reasons.push('US West Coast Crane Operators labor dispute gridlock');
    }

    if (activeLayers.customs && ship.destinationPort === 'NLRTM') {
      score += 20;
      reasons.push('Rotterdam terminal customs backlog alert');
    }

    if (activeLayers.geopolitical && (ship.originPort === 'INBOM' || ship.originPort === 'SGSIN' || ship.destinationPort === 'NLRTM')) {
      // Red Sea Suez leg
      if (ship.destinationPort === 'NLRTM' || ship.destinationPort === 'ESBCN') {
        score += 30;
        reasons.push('Mandatory Red Sea war-risk mitigation detour active');
      }
    }

    // Limit score
    score = Math.min(score, 98);
    let level: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
    if (score >= 75) level = 'Critical';
    else if (score >= 50) level = 'High';
    else if (score >= 25) level = 'Medium';

    // If bypass is applied, the risk is instantly mitigated!
    if (appliedBypasses[ship.id]) {
      return {
        score: 12,
        level: 'Low' as const,
        reasons: ['Bypass Applied: Route diverted through secondary gateway with synchronized rail dispatch. All hazards mitigated.']
      };
    }

    return { score, level, reasons: reasons.length > 0 ? reasons : ['Normal ocean transit parameters. No proximity hazards.'] };
  };

  const selectedRisk = calculateShipmentRisk(selectedShipment);

  // Trigger Bypass action simulation
  const handleApplyBypass = (shipmentId: string) => {
    setIsProcessingBypass(true);
    setTimeout(() => {
      setAppliedBypasses(prev => ({ ...prev, [shipmentId]: true }));
      setIsProcessingBypass(false);
      setSuccessBanner(`Intermodal bypass applied for shipment ${selectedShipment?.referenceNumber}! Vessel diverted to secondary gateway port. Landbridge rail corridor dispatch has been booked.`);
      
      // Auto-clear banner after 6s
      setTimeout(() => setSuccessBanner(null), 6000);
    }, 1000);
  };

  const handleResetBypass = (shipmentId: string) => {
    setAppliedBypasses(prev => ({ ...prev, [shipmentId]: false }));
  };

  // Check if a bypass configuration exists for the selected shipment's destination
  const bypassOption = selectedShipment ? BYPASS_ROUTES[selectedShipment.destinationPort] : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full" id="intermodal-risk-planner-module">
      
      {/* 💡 SCM Freight Forwarder Recommendations Section (MARGIN RECOMMENDATION - Mandate Compliance) */}
      <div className="col-span-full bg-slate-900 text-slate-100 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/20 text-amber-400 p-2 rounded-lg border border-amber-500/30">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <span className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">AI Operations Advisory</span>
            <h4 className="text-sm font-medium text-white">4 Dynamic Freight Forwarding Upgrades Recommended:</h4>
            <p className="text-xs text-slate-400 mt-0.5">Recommended SCM optimizations to scale container routing efficiency and secure margins.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs w-full md:w-auto">
          <div className="bg-slate-800/80 p-2 rounded-md border border-slate-700/50 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            <span><strong>Multi-Port Booking Pools:</strong> Secure capacity across secondary ports (Seattle, Fos-sur-Mer).</span>
          </div>
          <div className="bg-slate-800/80 p-2 rounded-md border border-slate-700/50 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span><strong>CO2 Offset Arbitration:</strong> Auto-purchase lower rail carbon credits on bypass corridors.</span>
          </div>
          <div className="bg-slate-800/80 p-2 rounded-md border border-slate-700/50 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span><strong>Dynamic War Insurance Hedging:</strong> Secure spot sea-freight coverage ahead of Suez transit.</span>
          </div>
          <div className="bg-slate-800/80 p-2 rounded-md border border-slate-700/50 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span><strong>Unified API Telemetry:</strong> Pull Class I rail transits directly to eliminate yard delays.</span>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {successBanner && (
        <div className="col-span-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 p-4 rounded-xl flex items-start gap-3 shadow-sm animate-fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Intermodal Bypass Router Action Successful</span>
            <p className="text-sm mt-0.5">{successBanner}</p>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-1 rounded-md hover:bg-emerald-500/20 transition-all">Dismiss</button>
        </div>
      )}

      {/* Map Column (8 Columns) */}
      <Card className="lg:col-span-8 flex flex-col overflow-hidden border border-border">
        <CardHeader className="border-b border-border bg-slate-50/50 dark:bg-slate-900/30 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Globe className="w-5 h-5 text-indigo-500" /> Intermodal Route Risk Layer & Bypass Planner
                </CardTitle>
                <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 py-0.5 font-mono text-[10px]">
                  Risk Heatmap V2
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Overlays live vessel positions with interactive heatmaps showing weather, labor, customs, or geopolitical hazards.
              </CardDescription>
            </div>

            {/* Quick Map Filtering Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={carrierFilter} onValueChange={setCarrierFilter}>
                <SelectTrigger className="w-[125px] h-8 text-[11px] bg-background">
                  <SelectValue placeholder="Carriers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Carriers</SelectItem>
                  {carriers.map((id: any) => (
                    <SelectItem key={id} value={id}>{getPartyName(id)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[110px] h-8 text-[11px] bg-background">
                  <SelectValue placeholder="Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {types.map((type: any) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[110px] h-8 text-[11px] bg-background">
                  <SelectValue placeholder="Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  {priorities.map((p: any) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Interactive Heatmap Layers Toggles */}
          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-dashed border-border bg-background/50 p-2.5 rounded-lg">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-muted-foreground" /> Map Layers:
            </span>
            <button 
              onClick={() => setActiveLayers(prev => ({ ...prev, weather: !prev.weather }))}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                activeLayers.weather 
                  ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 shadow-xs' 
                  : 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted'
              }`}
            >
              <CloudLightning className="w-3.5 h-3.5" /> Weather anomalies
            </button>
            <button 
              onClick={() => setActiveLayers(prev => ({ ...prev, labor: !prev.labor }))}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                activeLayers.labor 
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 shadow-xs' 
                  : 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted'
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> Labor disputes
            </button>
            <button 
              onClick={() => setActiveLayers(prev => ({ ...prev, customs: !prev.customs }))}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                activeLayers.customs 
                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 shadow-xs' 
                  : 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" /> Customs Gridlocks
            </button>
            <button 
              onClick={() => setActiveLayers(prev => ({ ...prev, geopolitical: !prev.geopolitical }))}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                activeLayers.geopolitical 
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 shadow-xs' 
                  : 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" /> Geopolitical Threats
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-0 bg-slate-950/5 relative overflow-hidden flex flex-col justify-between min-h-[460px]">
          {/* Legend and Active Indicators */}
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
            <div className="bg-background/95 backdrop-blur-md p-3 rounded-lg border border-border shadow-md space-y-1.5 max-w-[190px]">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block border-b pb-1">Corridor Status</span>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                <span className="text-xs text-foreground font-medium">Bypassed (Clear)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                <span className="text-xs text-foreground font-medium">Ocean Scheduled</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-xs text-foreground font-medium">At High Threat</span>
              </div>
            </div>
          </div>

          {/* Interactive World Map Canvas */}
          <div className="w-full flex-1 min-h-[400px] flex items-center justify-center p-2">
            <ComposableMap projection="geoMercator" projectionConfig={{ scale: 125 }} height={380} style={{ width: "100%" }}>
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="#e2e8f0"
                      stroke="#ffffff"
                      strokeWidth={0.5}
                      className="dark:fill-slate-900 dark:stroke-slate-800"
                      style={{
                        default: { outline: "none" },
                        hover: { outline: "none", fill: "#cbd5e1", transition: "all 0.2s" },
                        pressed: { outline: "none" },
                      }}
                    />
                  ))
                }
              </Geographies>

              {/* PULSING HEATMAP OVERLAY AREAS */}
              {RISK_ZONES.map((zone) => {
                if (!activeLayers[zone.type]) return null;
                const layerColors = {
                  weather: '#06b6d4',      // cyan
                  labor: '#f59e0b',        // amber
                  customs: '#a855f7',      // purple
                  geopolitical: '#ef4444'  // red
                };
                const color = layerColors[zone.type];
                return (
                  <g key={`heatmap-${zone.id}`} className="cursor-pointer">
                    <Marker coordinates={zone.coordinates}>
                      <circle 
                        r={zone.radius} 
                        fill={color} 
                        fillOpacity={0.25} 
                        className="animate-pulse" 
                        style={{ animationDuration: '3s' }}
                      />
                      <circle 
                        r={zone.radius * 0.4} 
                        fill={color} 
                        fillOpacity={0.3} 
                      />
                      <circle 
                        r={4} 
                        fill={color} 
                        stroke="#ffffff" 
                        strokeWidth={1}
                      />
                    </Marker>
                  </g>
                );
              })}

              {/* SHIPMENT ROUTES & ACTIVE VESSEL TRACKERS */}
              {filteredShipments.map((s, idx) => {
                const origin = getPortCoordinates(s.originPort);
                const dest = getPortCoordinates(s.destinationPort);
                if (!origin || !dest) return null;

                const isSelected = s.id === selectedShipmentId;
                const isBypassed = appliedBypasses[s.id];
                const bypassInfo = BYPASS_ROUTES[s.destinationPort];

                const currentRisk = calculateShipmentRisk(s);
                const isAtHighRisk = currentRisk.level === 'Critical' || currentRisk.level === 'High';

                // Path progress logic
                const statusLower = (s.status || '').toLowerCase().replace(/[\s-_]/g, '');
                const progress = statusLower === 'delivered' ? 1.0 :
                                 statusLower === 'arrived' ? 0.95 :
                                 (statusLower === 'intransit' || statusLower === 'delayed') ? 0.55 : 0.05;

                // Let's draw route legs
                if (isBypassed && bypassInfo) {
                  // Bypass Active: Divert to secondary port (USSEA / ESBCN)
                  const secPortCoords = PORT_COORDINATES[bypassInfo.bypassPort];
                  if (secPortCoords) {
                    // Current simulated location is along the first ocean segment
                    const currentLon = origin[0] + (secPortCoords[0] - origin[0]) * progress;
                    const currentLat = origin[1] + (secPortCoords[1] - origin[1]) * progress;

                    return (
                      <React.Fragment key={`shipment-bypass-${s.id}-${idx}`}>
                        {/* 1. Sea Leg (Origin -> Secondary Port) */}
                        <Line
                          from={origin}
                          to={secPortCoords}
                          stroke="#3b82f6"
                          strokeWidth={isSelected ? 3.5 : 2}
                          strokeLinecap="round"
                          style={{ opacity: 0.85 }}
                        />
                        {/* 2. Rail/Road Intermodal Bypass Corridor (Secondary Port -> Final Destination) */}
                        <Line
                          from={secPortCoords}
                          to={dest}
                          stroke="#10b981" // vibrant emerald
                          strokeWidth={isSelected ? 4 : 2.5}
                          strokeLinecap="round"
                          strokeDasharray="4 4"
                          style={{ opacity: 0.95 }}
                        />

                        {/* Origin port marker */}
                        <Marker coordinates={origin}>
                          <circle r={isSelected ? 4 : 3} fill="#4f46e5" stroke="#ffffff" strokeWidth={1} />
                        </Marker>

                        {/* Secondary Port Transfer Gate */}
                        <Marker coordinates={secPortCoords}>
                          <g className="cursor-pointer">
                            <rect x={-6} y={-6} width={12} height={12} fill="#10b981" stroke="#ffffff" strokeWidth={1} rx={2} />
                            <circle r={2} fill="#ffffff" />
                            <title>Intermodal Terminal: {bypassInfo.bypassPortName}</title>
                          </g>
                        </Marker>

                        {/* Destination port marker */}
                        <Marker coordinates={dest}>
                          <circle r={isSelected ? 5 : 3.5} fill="#10b981" stroke="#ffffff" strokeWidth={1.5} />
                        </Marker>

                        {/* Active Vessel Marker */}
                        <Marker coordinates={[currentLon, currentLat]}>
                          <g className={`cursor-pointer ${isSelected ? 'scale-125' : ''}`}>
                            <circle r={7.5} fill="#3b82f6" opacity={0.3} className="animate-ping" />
                            <circle r={4.5} fill="#1d4ed8" stroke="#ffffff" strokeWidth={1} />
                            <title>{s.referenceNumber} (Bypassed Sea Transit)</title>
                          </g>
                        </Marker>

                        {/* Rail dispatch marker */}
                        <Marker coordinates={[(secPortCoords[0] + dest[0])/2, (secPortCoords[1] + dest[1])/2]}>
                          <g className="bg-background border rounded-full p-0.5">
                            <circle r={5} fill="#10b981" />
                            <title>Active Landbridge Rail Haulage</title>
                          </g>
                        </Marker>
                      </React.Fragment>
                    );
                  }
                }

                // Standard ocean scheduled routing
                const currentLon = origin[0] + (dest[0] - origin[0]) * progress;
                const currentLat = origin[1] + (dest[1] - origin[1]) * progress;

                const routeColor = isSelected 
                  ? (isAtHighRisk ? "#ef4444" : "#4f46e5") 
                  : (isAtHighRisk ? "#f87171" : "#3b82f6");

                return (
                  <React.Fragment key={`shipment-${s.id}-${idx}`}>
                    {/* Primary Scheduled Line */}
                    <Line
                      from={origin}
                      to={dest}
                      stroke={routeColor}
                      strokeWidth={isSelected ? 3.5 : 1.8}
                      strokeLinecap="round"
                      style={{ 
                        strokeDasharray: isAtHighRisk ? "4 4" : "none",
                        opacity: isSelected ? 1 : 0.65 
                      }}
                    />

                    {/* Origin Dot */}
                    <Marker coordinates={origin}>
                      <circle r={isSelected ? 4 : 2.5} fill="#6366f1" />
                    </Marker>

                    {/* In-Transit Cargo Tracking Dot */}
                    {progress > 0 && progress < 0.95 && (
                      <Marker coordinates={[currentLon, currentLat]}>
                        <g 
                          className="cursor-pointer"
                          onClick={() => setSelectedShipmentId(s.id)}
                        >
                          <circle r={isSelected ? 9 : 6.5} fill={isAtHighRisk ? "#ef4444" : "#4f46e5"} opacity={0.3} className="animate-pulse" />
                          <circle r={isSelected ? 5 : 3.8} fill={isAtHighRisk ? "#ef4444" : "#312e81"} stroke="#ffffff" strokeWidth={1} />
                          <title>{s.referenceNumber}: {getPartyName(s.carrierId)} ({Math.round(progress * 100)}%)</title>
                        </g>
                      </Marker>
                    )}

                    {/* Destination Dot */}
                    <Marker coordinates={dest}>
                      <circle r={isSelected ? 5 : 3} fill={isAtHighRisk ? "#ef4444" : "#3b82f6"} stroke="#ffffff" strokeWidth={1} />
                    </Marker>
                  </React.Fragment>
                );
              })}
            </ComposableMap>
          </div>

          {/* Map Footer Information bar */}
          <div className="bg-slate-900 border-t border-slate-800 p-3 text-[11px] text-slate-400 font-mono flex flex-wrap justify-between items-center gap-3">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" /> Vessel Position Stream: Connected
            </span>
            <span>Refreshed live 2026-07-19 11:54 UTC</span>
            <span className="text-indigo-400 flex items-center gap-1">
              <Globe className="w-3 h-3" /> Projection: geoMercator (WGS84)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Scenario & Bypass Planner Column (4 Columns) */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        
        {/* Risk Analysis Card */}
        <Card className="border border-border">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/30 pb-4">
            <div className="flex items-center gap-1.5 text-rose-500 font-semibold text-xs uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 text-rose-500" /> Ocean Risk Engine
            </div>
            <CardTitle className="text-base font-bold mt-1">Leg Risk Assessment</CardTitle>
            <CardDescription className="text-xs">
              Select an active vessel to inspect geographic layer overlaps.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            {/* Shipment selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground block">Active Marine Vessel / Consignment</label>
              <Select value={selectedShipmentId} onValueChange={setSelectedShipmentId}>
                <SelectTrigger className="w-full text-xs h-9 bg-background">
                  <SelectValue placeholder="Select Cargo Voyage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="demo-1" className="text-xs">FFW-2026-ALPHA (Shanghai → LAX)</SelectItem>
                  <SelectItem value="demo-2" className="text-xs">FFW-2026-OMEGA (Shanghai → Rotterdam)</SelectItem>
                  {shipments.map(s => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.referenceNumber} ({s.originPort} → {s.destinationPort})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedShipment ? (
              <div className="space-y-4">
                {/* Visual Risk Meter */}
                <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-border space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Calculated Hazard Exposure</span>
                    <Badge className={
                      selectedRisk.level === 'Critical' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                      selectedRisk.level === 'High' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' :
                      selectedRisk.level === 'Medium' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                      'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    }>
                      {selectedRisk.level} Exposure ({selectedRisk.score}%)
                    </Badge>
                  </div>

                  {/* Meter Bar */}
                  <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        selectedRisk.level === 'Critical' ? 'bg-red-500' :
                        selectedRisk.level === 'High' ? 'bg-orange-500' :
                        selectedRisk.level === 'Medium' ? 'bg-amber-500' :
                        'bg-emerald-500'
                      }`}
                      style={{ width: `${selectedRisk.score}%` }}
                    />
                  </div>

                  {/* Proximity threats */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Active Threat Overlays</span>
                    <div className="space-y-1">
                      {selectedRisk.reasons.map((reason, rIdx) => (
                        <div key={rIdx} className="text-xs text-foreground flex items-start gap-1.5 leading-tight">
                          <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${selectedRisk.level === 'Low' ? 'text-emerald-500' : 'text-amber-500'} mt-0.5`} />
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Shipment specs */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-background p-2.5 rounded-lg border border-border">
                    <span className="text-muted-foreground block text-[10px]">CARGO TYPE</span>
                    <span className="font-medium text-foreground">{selectedShipment.type} ({selectedShipment.priority} Priority)</span>
                  </div>
                  <div className="bg-background p-2.5 rounded-lg border border-border">
                    <span className="text-muted-foreground block text-[10px]">COMMODITY</span>
                    <span className="font-medium text-foreground truncate block">{selectedShipment.commodity || 'Standard Freight'}</span>
                  </div>
                  <div className="bg-background p-2.5 rounded-lg border border-border col-span-2">
                    <span className="text-muted-foreground block text-[10px]">SCHEDULE ETA</span>
                    <span className="font-medium text-foreground flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      {new Date(selectedShipment.eta).toLocaleDateString()} &mdash; Status: {selectedShipment.status}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground p-4 text-center">
                Select an active voyage from the control to query real-time threat intelligence.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bypass Planner Scenario Card */}
        <Card className="border border-border">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/30 pb-4">
            <div className="flex items-center gap-1.5 text-indigo-500 font-semibold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-indigo-500" /> Corridor Bypass Optimizer
            </div>
            <CardTitle className="text-base font-bold mt-1">Intermodal Alternative</CardTitle>
            <CardDescription className="text-xs">
              Live cost & lead-time comparison for alternative gateway landbridge routing.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {selectedShipment && bypassOption ? (
              <div className="space-y-4">
                {/* Brief advice */}
                <div className="text-xs text-muted-foreground bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg border border-border border-l-2 border-l-indigo-500 leading-relaxed">
                  {bypassOption.description}
                </div>

                {/* Routing Leg Comparison Grid */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Comparative Logistics</span>
                  
                  <div className="bg-background border rounded-lg p-3 space-y-3">
                    {/* Original Row */}
                    <div className="flex justify-between items-center text-xs pb-2 border-b">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase">Original Sea Leg</span>
                        <span className="font-semibold text-rose-600 flex items-center gap-1">
                          <Ship className="w-3.5 h-3.5" /> Direct to {selectedShipment.destinationPort}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-muted-foreground block text-[10px]">DAYS / COST</span>
                        <span className="font-semibold text-foreground">22 Days / ${selectedShipment.freightCost}</span>
                      </div>
                    </div>

                    {/* Bypass Row */}
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase">Recommended Bypass</span>
                        <span className="font-semibold text-emerald-600 flex items-center gap-1">
                          <Train className="w-3.5 h-3.5" /> Via {bypassOption.bypassPortName} + Rail
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-muted-foreground block text-[10px]">DAYS / COST</span>
                        <span className="font-semibold text-foreground">
                          {22 - bypassOption.leadTimeDaysSaved} Days / ${Number(selectedShipment.freightCost) + bypassOption.additionalCost}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cost/Lead Time Benefit Stats Panel */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 p-2.5 rounded-lg border border-emerald-500/20 text-center">
                    <span className="text-[9px] font-bold block uppercase tracking-wider">Days Saved</span>
                    <span className="text-lg font-bold flex items-center justify-center gap-1">
                      <Clock className="w-4 h-4 text-emerald-600" /> -{bypassOption.leadTimeDaysSaved} Days
                    </span>
                  </div>
                  <div className="bg-rose-500/10 text-rose-800 dark:text-rose-200 p-2.5 rounded-lg border border-rose-500/20 text-center">
                    <span className="text-[9px] font-bold block uppercase tracking-wider">Delta Cost</span>
                    <span className="text-lg font-bold flex items-center justify-center gap-0.5">
                      <DollarSign className="w-4 h-4 text-rose-600" /> +${bypassOption.additionalCost}
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                {appliedBypasses[selectedShipment.id] ? (
                  <div className="space-y-2">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Bypass Active & Trans-Dispatched
                    </div>
                    <button 
                      onClick={() => handleResetBypass(selectedShipment.id)}
                      className="w-full text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 py-1.5 border border-dashed border-border rounded-lg transition-all"
                    >
                      Revert back to Ocean direct
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleApplyBypass(selectedShipment.id)}
                    disabled={isProcessingBypass}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer"
                  >
                    {isProcessingBypass ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Recalculating transit matrices...
                      </>
                    ) : (
                      <>
                        <Compass className="w-3.5 h-3.5" /> Apply Intermodal Bypass Route
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground p-4 text-center space-y-1 bg-slate-50 dark:bg-slate-900/40 border rounded-lg">
                <p>No high-risk bypass options required for standard lanes.</p>
                <p className="text-[10px] font-semibold text-indigo-500">Select FFW-2026-ALPHA or FFW-2026-OMEGA to run active threat bypassing.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
