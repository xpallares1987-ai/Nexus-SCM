import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { ComposableMap, Geographies, Geography, Marker, Line } from 'react-simple-maps';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/forms/select';
import { Badge } from '@/components/ui/data-display/badge';
import { Map, AlertTriangle, ShieldAlert, TrendingUp, Info, DollarSign, Clock, Weight, Route } from 'lucide-react';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Port and City Name Coordinate Resolution
const PORT_COORDINATES: Record<string, [number, number]> = {
  'CNSHA': [121.4737, 31.2304],
  'SHANGHAI': [121.4737, 31.2304],
  'ESBCN': [2.1734, 41.3851],
  'BARCELONA': [2.1734, 41.3851],
  'USLAX': [-118.2437, 34.0522],
  'LOS ANGELES': [-118.2437, 34.0522],
  'NLRTM': [4.4792, 51.9225],
  'ROTTERDAM': [4.4792, 51.9225],
  'JPTYO': [139.6917, 35.6895],
  'TOKYO': [139.6917, 35.6895],
  'SGSIN': [103.8198, 1.3521],
  'SINGAPORE': [103.8198, 1.3521],
  'GBFEL': [1.3503, 51.9612],
  'FELIXSTOWE': [1.3503, 51.9612],
  'DEHAM': [9.9937, 53.5511],
  'HAMBURG': [9.9937, 53.5511],
  'INBOM': [72.8777, 19.0760],
  'BOMBAY': [72.8777, 19.0760],
  'MUMBAI': [72.8777, 19.0760],
  'ZADUR': [31.0218, -29.8587],
  'DURBAN': [31.0218, -29.8587],
  'BRSSZ': [-46.3312, -23.9608],
  'SANTOS': [-46.3312, -23.9608],
  'AUMEL': [144.9631, -37.8136],
  'MELBOURNE': [144.9631, -37.8136],
  'USNYC': [-74.0060, 40.7128],
  'NEW YORK': [-74.0060, 40.7128],
  'AEDXB': [55.2708, 25.2048],
  'DUBAI': [55.2708, 25.2048],
  'ANR': [4.4025, 51.2194],
  'ANTWERP': [4.4025, 51.2194],
  'HKG': [114.1694, 22.3193],
  'HONG KONG': [114.1694, 22.3193],
};

function getPortCoords(port: string): [number, number] | null {
  if (!port) return null;
  const clean = port.toUpperCase().trim();
  if (PORT_COORDINATES[clean]) return PORT_COORDINATES[clean];
  
  // Try matching substring
  for (const [key, coords] of Object.entries(PORT_COORDINATES)) {
    if (clean.includes(key) || key.includes(clean)) {
      return coords;
    }
  }
  return null;
}

interface RouteCostMapProps {
  shipments: any[];
}

export function RouteCostMap({ shipments }: RouteCostMapProps) {
  const [metric, setMetric] = useState<'total' | 'costPerKg' | 'delays'>('total');
  const [transportMode, setTransportMode] = useState<string>('all');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [hoveredRoute, setHoveredRoute] = useState<any | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Group & analyze shipments by route
  const routesData = useMemo(() => {
    const map: Record<string, any> = {};

    shipments.forEach((s) => {
      const origin = s.originPort || 'Unknown';
      const dest = s.destinationPort || 'Unknown';
      
      // Standardize route key
      const key = `${origin.toUpperCase().trim()} -> ${dest.toUpperCase().trim()}`;
      
      const freight = parseFloat(s.freightCost) || 0;
      const customs = parseFloat(s.customsCost) || 0;
      const insurance = parseFloat(s.insuranceCost) || 0;
      const totalCost = freight + customs + insurance;
      const weight = parseFloat(s.weight) || 0;
      
      const isDelayed = s.status === 'Delayed';
      const mode = s.type || 'Ocean';

      if (!map[key]) {
        map[key] = {
          id: key,
          origin,
          dest,
          totalSpend: 0,
          totalFreight: 0,
          totalCustoms: 0,
          totalInsurance: 0,
          totalWeight: 0,
          shipmentCount: 0,
          delayedCount: 0,
          modes: new Set<string>(),
          shipments: [],
        };
      }

      map[key].totalSpend += totalCost;
      map[key].totalFreight += freight;
      map[key].totalCustoms += customs;
      map[key].totalInsurance += insurance;
      map[key].totalWeight += weight;
      map[key].shipmentCount += 1;
      if (isDelayed) map[key].delayedCount += 1;
      map[key].modes.add(mode);
      map[key].shipments.push({
        id: s.id,
        referenceNumber: s.referenceNumber || s.id,
        cost: totalCost,
        status: s.status,
        weight,
        carrierId: s.carrierId
      });
    });

    // Format and add geographic coordinates + analytical ratings
    return Object.values(map)
      .map((r: any) => {
        const originCoords = getPortCoords(r.origin);
        const destCoords = getPortCoords(r.dest);
        const costPerKg = r.totalWeight > 0 ? r.totalSpend / r.totalWeight : 0;
        const delayRate = (r.delayedCount / r.shipmentCount) * 100;
        
        // Benchmarks of Inefficiency:
        // 1. High Spend: Top raw cost
        // 2. Cost Per KG: Highly expensive transportation rate (> $3.5/kg)
        // 3. High Delays: More than 15% delayed
        let inefficiencyReasons: string[] = [];
        if (costPerKg > 3.0) inefficiencyReasons.push(`High unit transportation cost ($${costPerKg.toFixed(2)}/kg)`);
        if (delayRate > 15) inefficiencyReasons.push(`High volatility with ${delayRate.toFixed(0)}% delay rate`);
        if (r.totalSpend > 25000) inefficiencyReasons.push(`Heavy capital concentration ($${r.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })})`);

        const isInefficient = inefficiencyReasons.length > 0;
        const severity = inefficiencyReasons.length >= 2 ? 'High' : inefficiencyReasons.length === 1 ? 'Medium' : 'Low';

        return {
          ...r,
          originCoords,
          destCoords,
          costPerKg,
          delayRate,
          isInefficient,
          inefficiencyReasons,
          severity,
          modesList: Array.from(r.modes) as string[],
        };
      })
      .filter((r) => r.originCoords && r.destCoords) // Only show on map if coords resolved
      .filter((r) => {
        if (transportMode === 'all') return true;
        return r.modesList.some((m) => m.toLowerCase().includes(transportMode.toLowerCase()));
      });
  }, [shipments, transportMode]);

  // Find max values to normalize visual scale
  const maxValues = useMemo(() => {
    let maxSpend = 1;
    let maxCostPerKg = 1;
    let maxDelayRate = 1;

    routesData.forEach((r) => {
      if (r.totalSpend > maxSpend) maxSpend = r.totalSpend;
      if (r.costPerKg > maxCostPerKg) maxCostPerKg = r.costPerKg;
      if (r.delayRate > maxDelayRate) maxDelayRate = r.delayRate;
    });

    return { maxSpend, maxCostPerKg, maxDelayRate };
  }, [routesData]);

  const selectedRoute = useMemo(() => {
    return routesData.find((r) => r.id === selectedRouteId) || null;
  }, [routesData, selectedRouteId]);

  // Helper to determine route color/glow by current metric
  const getRouteVisuals = (route: any) => {
    let ratio = 0;
    if (metric === 'total') {
      ratio = route.totalSpend / maxValues.maxSpend;
    } else if (metric === 'costPerKg') {
      ratio = maxValues.maxCostPerKg > 0 ? route.costPerKg / maxValues.maxCostPerKg : 0;
    } else {
      ratio = maxValues.maxDelayRate > 0 ? route.delayRate / maxValues.maxDelayRate : 0;
    }

    const isSelected = route.id === selectedRouteId;
    const isHighInefficient = route.severity === 'High';

    let strokeColor = '#6366f1'; // Default Indigo
    let strokeWidth = isSelected ? 4 : 2;

    if (route.severity === 'High') {
      strokeColor = '#ef4444'; // Red
      strokeWidth = isSelected ? 4.5 : 2.5;
    } else if (route.severity === 'Medium') {
      strokeColor = '#f97316'; // Orange
      strokeWidth = isSelected ? 4 : 2.2;
    } else if (ratio > 0.4) {
      strokeColor = '#eab308'; // Yellow
    } else {
      strokeColor = '#10b981'; // Emerald (Efficient)
    }

    return {
      strokeColor,
      strokeWidth,
      opacity: isSelected ? 1 : 0.75,
      dashArray: isHighInefficient ? "4 2" : undefined,
    };
  };

  return (
    <Card className="col-span-full grid grid-cols-1 xl:grid-cols-3 gap-6 overflow-hidden border-border shadow-md">
      {/* Map & Filters Section */}
      <div className="xl:col-span-2 p-6 flex flex-col justify-between space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Map className="w-5 h-5 text-indigo-500" /> Geolocation Route Cost Heat-map
            </CardTitle>
            <CardDescription>
              Geospatial assessment highlighting logistics inefficiencies and regional spend anomalies
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Analysis Metric</span>
              <Select value={metric} onValueChange={(val: any) => setMetric(val)}>
                <SelectTrigger className="w-[150px] h-9 text-xs">
                  <SelectValue placeholder="Metric" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">Total Route Spend</SelectItem>
                  <SelectItem value="costPerKg">Cost Per Weight (KG)</SelectItem>
                  <SelectItem value="delays">Transit Delay Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Transport Mode</span>
              <Select value={transportMode} onValueChange={setTransportMode}>
                <SelectTrigger className="w-[130px] h-9 text-xs">
                  <SelectValue placeholder="All Modes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  <SelectItem value="ocean">Ocean Freight</SelectItem>
                  <SelectItem value="air">Air Cargo</SelectItem>
                  <SelectItem value="land">Ground Transport</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 py-1.5 px-3 bg-muted/30 border rounded-lg text-xs font-mono">
          <span className="text-muted-foreground font-sans">Inefficiency Scale:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded bg-emerald-500" />
            <span>Efficient</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded bg-yellow-500" />
            <span>Moderate Cost</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded bg-orange-500" />
            <span>High Risk / Cost</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded bg-red-500" />
            <span>Severe Inefficiency</span>
          </div>
        </div>

        {/* Map Container */}
        <div className="border rounded-xl bg-slate-50 dark:bg-slate-950/40 p-1 flex items-center justify-center relative overflow-hidden h-[380px]">
          <div className="w-full h-full">
            <ComposableMap projection="geoMercator" projectionConfig={{ scale: 110 }} height={360}>
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="currentColor"
                      stroke="currentColor"
                      strokeWidth={0.3}
                      className="text-slate-200 dark:text-slate-900 fill-current"
                      style={{
                        default: { outline: "none" },
                        hover: { outline: "none", fill: "hsl(var(--muted))" },
                        pressed: { outline: "none" },
                      }}
                    />
                  ))
                }
              </Geographies>

              {/* Draw Route Lines */}
              <AnimatePresence>
                {routesData.map((route) => {
                  const visuals = getRouteVisuals(route);
                  return (
                    <motion.g
                      key={`${route.id}-${transportMode}`} // Re-animate if mode changes
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                    >
                      <Line
                        from={route.originCoords}
                        to={route.destCoords}
                        stroke={visuals.strokeColor}
                        strokeWidth={visuals.strokeWidth}
                        strokeLinecap="round"
                        style={{
                          strokeDasharray: visuals.dashArray,
                          cursor: 'pointer',
                          transition: 'stroke-width 0.4s ease-in-out, stroke 0.4s ease-in-out',
                        }}
                        onClick={() => setSelectedRouteId(route.id)}
                        onMouseEnter={() => setHoveredRoute(route)}
                        onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                        onMouseLeave={() => setHoveredRoute(null)}
                        className="hover:opacity-100 transition-opacity duration-200"
                      >
                        <title>{route.id}</title>
                      </Line>
                    </motion.g>
                  );
                })}
              </AnimatePresence>

              {/* Draw Markers for endpoints */}
              {routesData.map((route) => {
                const isSelected = route.id === selectedRouteId;
                return (
                  <React.Fragment key={`markers-${route.id}`}>
                    <Marker coordinates={route.originCoords}>
                      <g 
                        className="cursor-pointer"
                        onClick={() => setSelectedRouteId(route.id)}
                      >
                        <circle 
                          r={isSelected ? 5.5 : 4} 
                          fill={isSelected ? "#4f46e5" : "#64748b"} 
                          className="transition-all"
                        />
                        <text
                          y={-8}
                          fontSize={9}
                          textAnchor="middle"
                          className="fill-slate-600 dark:fill-slate-400 font-mono font-semibold select-none pointer-events-none"
                        >
                          {route.origin}
                        </text>
                      </g>
                    </Marker>
                    <Marker coordinates={route.destCoords}>
                      <g 
                        className="cursor-pointer"
                        onClick={() => setSelectedRouteId(route.id)}
                      >
                        <circle 
                          r={isSelected ? 5.5 : 4} 
                          fill={isSelected ? "#4f46e5" : "#475569"} 
                          className="transition-all"
                        />
                        <text
                          y={-8}
                          fontSize={9}
                          textAnchor="middle"
                          className="fill-slate-600 dark:fill-slate-400 font-mono font-semibold select-none pointer-events-none"
                        >
                          {route.dest}
                        </text>
                      </g>
                    </Marker>
                  </React.Fragment>
                );
              })}
            </ComposableMap>
          </div>
          {routesData.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <span className="text-sm text-muted-foreground font-medium">No matching routes for selected filters</span>
            </div>
          )}
        </div>
      </div>

      {/* Diagnostics / Inefficiency Inspection Sidebar */}
      <div className="xl:col-span-1 border-t xl:border-t-0 xl:border-l border-border bg-muted/10 flex flex-col h-full overflow-hidden">
        <div className="p-5 border-b border-border shrink-0">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-orange-500" /> Logistics Diagnostics
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Click on a route line to view diagnostic insights and cost efficiencies
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {selectedRoute ? (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-base flex items-center gap-1.5">
                    <Route className="w-4 h-4 text-indigo-500" /> {selectedRoute.origin} → {selectedRoute.dest}
                  </h4>
                  <p className="text-[11px] text-muted-foreground font-mono uppercase mt-0.5">
                    Modes: {selectedRoute.modesList.join(', ')}
                  </p>
                </div>
                {selectedRoute.severity !== 'Low' && (
                  <Badge variant={selectedRoute.severity === 'High' ? 'destructive' : 'default'} className="uppercase text-[10px]">
                    {selectedRoute.severity} Inefficiency
                  </Badge>
                )}
              </div>

              {/* Analytical Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background border rounded-lg p-3 space-y-1">
                  <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-emerald-500" /> Total Spend
                  </span>
                  <div className="text-base font-bold font-mono">
                    ${selectedRoute.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>

                <div className="bg-background border rounded-lg p-3 space-y-1">
                  <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                    <Weight className="w-3 h-3 text-blue-500" /> Cost / KG
                  </span>
                  <div className="text-base font-bold font-mono">
                    ${selectedRoute.costPerKg.toFixed(2)}
                  </div>
                </div>

                <div className="bg-background border rounded-lg p-3 space-y-1">
                  <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3 text-orange-500" /> Delay Rate
                  </span>
                  <div className="text-base font-bold font-mono">
                    {selectedRoute.delayRate.toFixed(0)}%
                  </div>
                </div>

                <div className="bg-background border rounded-lg p-3 space-y-1">
                  <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                    <Info className="w-3 h-3 text-indigo-500" /> Shipments
                  </span>
                  <div className="text-base font-bold font-mono">
                    {selectedRoute.shipmentCount} total
                  </div>
                </div>
              </div>

              {/* Diagnostic Alerts */}
              {selectedRoute.isInefficient ? (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-lg p-4 space-y-2">
                  <span className="text-xs font-bold text-red-800 dark:text-red-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Detected Inefficiencies
                  </span>
                  <ul className="text-xs text-red-700 dark:text-red-300 list-disc list-inside space-y-1">
                    {selectedRoute.inefficiencyReasons.map((reason: string, idx: number) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                  <div className="text-[11px] text-red-600 dark:text-red-400 mt-2 italic leading-normal">
                    💡 <span className="font-semibold">Remediation:</span> Consolidate routes, transition premium shipments to alternative local ports, or renegotiate contracts with carrier providers for more predictable lead times.
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-lg p-4">
                  <p className="text-xs text-emerald-800 dark:text-emerald-400 font-medium">
                    ✓ Route is performing with optimal cost and delay profiles within the set SLA thresholds.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 space-y-3">
              <Route className="w-10 h-10 text-muted-foreground/30" />
              <div>
                <p className="text-sm font-semibold text-muted-foreground">No Route Selected</p>
                <p className="text-xs text-muted-foreground max-w-[200px] mt-1">
                  Please click on any route line on the map to inspect its diagnostics.
                </p>
              </div>
            </div>
          )}

          {/* List of most inefficient routes */}
          <div className="pt-2 border-t">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
              Highest Inefficiency Alert Feed
            </h4>
            <div className="space-y-2.5">
              {routesData
                .filter((r) => r.isInefficient)
                .sort((a, b) => b.inefficiencyReasons.length - a.inefficiencyReasons.length)
                .slice(0, 3)
                .map((r) => (
                  <div 
                    key={r.id} 
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedRouteId === r.id 
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/25 border-indigo-500' 
                        : 'bg-background hover:bg-muted/30'
                    }`}
                    onClick={() => setSelectedRouteId(r.id)}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold">{r.origin} → {r.dest}</span>
                      <Badge variant="destructive" className="h-4 px-1 text-[9px] uppercase">
                        {r.severity}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                      <span>Spend: <strong className="text-foreground">${r.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong></span>
                      <span>•</span>
                      <span>Delays: <strong className="text-foreground">{r.delayRate.toFixed(0)}%</strong></span>
                    </div>
                  </div>
                ))}
              {routesData.filter(r => r.isInefficient).length === 0 && (
                <p className="text-xs text-muted-foreground italic">All active routes are currently efficient.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Interactive Route Tooltip */}
      {hoveredRoute && (
        <div 
          className="fixed z-[9999] pointer-events-none bg-background/95 dark:bg-slate-900/95 backdrop-blur-md border border-border shadow-2xl rounded-xl p-4 w-64 text-xs flex flex-col space-y-3 transition-opacity duration-150"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y - 12}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="flex items-center justify-between border-b pb-1.5 border-border/60">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <Route className="w-3.5 h-3.5 text-indigo-500" />
              <span>{hoveredRoute.origin} → {hoveredRoute.dest}</span>
            </div>
            <Badge variant="outline" className="text-[9px] font-mono font-semibold h-4 px-1 border-indigo-500/20 text-indigo-500 bg-indigo-500/5">
              {hoveredRoute.modesList.join(', ')}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-muted-foreground">Total Spend:</span>
              <span className="font-bold font-mono text-foreground">${hoveredRoute.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>

            {/* Cost Breakdown Details */}
            <div className="space-y-1.5 pt-1 border-t border-border/40">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Cost Breakdown</div>
              
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between text-muted-foreground">
                  <span>Freight Cost</span>
                  <span className="font-semibold text-foreground font-mono">
                    ${hoveredRoute.totalFreight.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full rounded-full" 
                    style={{ width: `${(hoveredRoute.totalFreight / Math.max(1, hoveredRoute.totalSpend)) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between text-muted-foreground">
                  <span>Customs & Duties</span>
                  <span className="font-semibold text-foreground font-mono">
                    ${hoveredRoute.totalCustoms.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                  <div 
                    className="bg-purple-500 h-full rounded-full" 
                    style={{ width: `${(hoveredRoute.totalCustoms / Math.max(1, hoveredRoute.totalSpend)) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between text-muted-foreground">
                  <span>Insurance Fees</span>
                  <span className="font-semibold text-foreground font-mono">
                    ${hoveredRoute.totalInsurance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                  <div 
                    className="bg-cyan-500 h-full rounded-full" 
                    style={{ width: `${(hoveredRoute.totalInsurance / Math.max(1, hoveredRoute.totalSpend)) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40 text-[10px]">
              <div className="bg-muted/40 p-1.5 rounded flex flex-col">
                <span className="text-muted-foreground">Cost / KG</span>
                <span className="font-bold font-mono text-foreground">${hoveredRoute.costPerKg.toFixed(2)}</span>
              </div>
              <div className="bg-muted/40 p-1.5 rounded flex flex-col">
                <span className="text-muted-foreground">Delay Rate</span>
                <span className={`font-bold font-mono ${hoveredRoute.delayRate > 15 ? 'text-red-500' : 'text-foreground'}`}>
                  {hoveredRoute.delayRate.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
