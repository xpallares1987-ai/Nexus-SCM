import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/data-display/card';
import { Badge } from '@/components/ui/data-display/badge';
import { Button } from '@/components/ui/forms/button';
import { Anchor, AlertTriangle, RefreshCw, Ship, Navigation, Check, ChevronRight, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { fetchApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

// Key ports with simulated wait times and alternatives
const PORT_INDEX_DATA = [
  {
    name: "Shanghai (CNSHA)",
    waitDays: 4.8,
    status: "Critical",
    color: "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900/40",
    fillColor: "bg-red-500",
    alternatives: ["Ningbo (CNNGB)", "Shenzhen (CNSZX)"],
    dwellHours: 64,
    carrierWaitHours: 42,
    hasStrike: false,
    strikeInfo: ""
  },
  {
    name: "Rotterdam (NLRTM)",
    waitDays: 3.2,
    status: "Moderate",
    color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/40",
    fillColor: "bg-amber-500",
    alternatives: ["Zeebrugge (BEZEE)", "Wilhelmshaven (DEWVN)"],
    dwellHours: 48,
    carrierWaitHours: 28,
    hasStrike: true,
    strikeInfo: "Port worker strikes: 24h work stoppage scheduled"
  },
  {
    name: "Los Angeles (USLAX)",
    waitDays: 5.1,
    status: "Critical",
    color: "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900/40",
    fillColor: "bg-red-500",
    alternatives: ["Long Beach (USLGB)", "Oakland (USOAK)"],
    dwellHours: 76,
    carrierWaitHours: 58,
    hasStrike: true,
    strikeInfo: "Union walkout: Warehouse local union pickets active"
  },
  {
    name: "Miami (USMIA)",
    waitDays: 2.1,
    status: "Optimal",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/40",
    fillColor: "bg-emerald-500",
    alternatives: ["Everglades (USPEF)", "Jacksonville (USJAX)"],
    dwellHours: 24,
    carrierWaitHours: 12,
    hasStrike: false,
    strikeInfo: ""
  },
  {
    name: "Singapore (SGSIN)",
    waitDays: 1.4,
    status: "Optimal",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/40",
    fillColor: "bg-emerald-500",
    alternatives: ["Tanjung Pelepas (MYTPP)", "Port Klang (MYPKG)"],
    dwellHours: 18,
    carrierWaitHours: 8,
    hasStrike: false,
    strikeInfo: ""
  },
  {
    name: "Barcelona (ESBCN)",
    waitDays: 1.1,
    status: "Optimal",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/40",
    fillColor: "bg-emerald-500",
    alternatives: ["Valencia (ESVLC)", "Tarragona (ESTST)"],
    dwellHours: 20,
    carrierWaitHours: 10,
    hasStrike: false,
    strikeInfo: ""
  }
];

export function PortCongestionWidget({ shipments, onRerouteComplete }: { shipments: any[], onRerouteComplete: () => void }) {
  const { token } = useAuth();
  const [isRerouting, setIsRerouting] = useState<string | null>(null);
  const [selectedAlternative, setSelectedAlternative] = useState<Record<string, string>>({});

  // Filters active sea shipments
  const seaShipments = shipments.filter(s => 
    (s.type && s.type.toLowerCase().startsWith('sea')) && 
    ['InTransit', 'In Transit', 'Delayed', 'Booked'].includes(s.status)
  );

  // Map active shipments to ETA risk based on destination port congestion
  const riskShipments = seaShipments.map(shipment => {
    const destPortUpper = (shipment.destinationPort || '').toUpperCase();
    
    // Check if the destination contains any of our port keywords
    const matchedPort = PORT_INDEX_DATA.find(p => 
      destPortUpper.includes(p.name.split(' ')[0].toUpperCase())
    );

    return {
      shipment,
      matchedPort,
      riskLevel: matchedPort ? (matchedPort.waitDays > 3.5 ? 'High' : matchedPort.waitDays > 2.0 ? 'Medium' : 'Low') : 'Low'
    };
  }).filter(item => item.matchedPort !== undefined);

  const handleReroute = async (shipmentId: string, currentPort: string, alternativePort: string) => {
    if (!token) return;
    setIsRerouting(shipmentId);
    
    try {
      const response = await fetchApi(`/shipments/${shipmentId}`, token, {
        method: 'PUT',
        body: JSON.stringify({
          destinationPort: alternativePort,
          forceLocalOverride: true
        })
      });

      if (response) {
        toast.success(`Successfully Rerouted Shipment! Destination updated to ${alternativePort}.`);
        onRerouteComplete();
      } else {
        throw new Error("Failed to reroute shipment");
      }
    } catch (err: any) {
      console.error("Rerouting error:", err);
      toast.error(err.message || "Failed to submit reroute request");
    } finally {
      setIsRerouting(null);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Anchor className="w-5 h-5 text-blue-500" />
              Predictive Port Congestion Intelligence
            </CardTitle>
            <CardDescription>
              Live simulated berthing wait-times with real-time ETA risk forecasts and direct alternative port rerouting.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="overflow-y-auto flex-1 space-y-6">
        {/* Global Port Index Ledger */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1">
            <Ship className="w-3.5 h-3.5 text-indigo-500" />
            Global Port Berthing Index
          </h4>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {PORT_INDEX_DATA.map((port, idx) => {
              const pct = Math.min(100, Math.round((port.waitDays / 6) * 100));
              return (
                <div key={idx} className="p-3.5 border rounded-xl bg-gradient-to-b from-card to-zinc-50/30 dark:to-zinc-950/10 flex flex-col justify-between space-y-3 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-foreground">{port.name}</span>
                    <Badge variant="outline" className={`text-[9px] uppercase font-bold ${port.color}`}>
                      {port.status}
                    </Badge>
                  </div>
                  
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-foreground font-mono">{port.waitDays}</span>
                      <span className="text-xs text-muted-foreground">days wait</span>
                    </div>
                    {/* Status progress bar */}
                    <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full mt-1 overflow-hidden">
                      <div className={`h-full rounded-full ${port.fillColor}`} style={{ width: `${pct}%` }}></div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 mt-2.5 pt-2 border-t text-[10px] text-muted-foreground font-mono">
                      <div>
                        Dwell: <strong className="text-foreground">{port.dwellHours}h</strong>
                      </div>
                      <div>
                        Carrier: <strong className="text-foreground">{port.carrierWaitHours}h</strong>
                      </div>
                    </div>

                    {port.hasStrike && (
                      <div className="mt-2 p-1.5 rounded bg-red-50 dark:bg-red-950/20 text-[9.5px] text-red-600 dark:text-red-400 font-bold flex items-center gap-1 border border-red-200/50 dark:border-red-900/20">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        {port.strikeInfo}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ETA Risk Forecast & Actionable Prompts */}
        <div className="border-t pt-5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Congestion-Induced ETA Risks & Reroute Prompts
          </h4>
          
          {riskShipments.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground border rounded-xl border-dashed">
              No active ocean shipments arriving at highly congested ports.
            </div>
          ) : (
            <div className="space-y-3">
              {riskShipments.map(({ shipment, matchedPort, riskLevel }, idx) => {
                const currentDest = shipment.destinationPort || 'Unknown Port';
                const alternatives = matchedPort ? matchedPort.alternatives : [];
                const selectedAlt = selectedAlternative[shipment.id] || (alternatives[0] || '');

                return (
                  <div key={idx} className={`p-4 rounded-xl border transition-all ${
                    riskLevel === 'High' 
                      ? 'border-red-100 bg-red-50/20 dark:border-red-950/40 dark:bg-red-950/10' 
                      : 'border-amber-100 bg-amber-50/20 dark:border-amber-950/40 dark:bg-amber-950/10'
                  }`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground font-mono">{shipment.referenceNumber}</span>
                          <Badge variant="outline" className="text-[9.5px] uppercase font-mono">
                            {shipment.type}
                          </Badge>
                          <Badge variant={riskLevel === 'High' ? 'destructive' : 'secondary'} className="text-[9.5px] font-bold">
                            {riskLevel} ETA Risk
                          </Badge>
                        </div>
                        
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Currently bound for <strong className="text-foreground">{currentDest}</strong> which reports a berthing delay of <strong className="font-mono text-red-500">{matchedPort?.waitDays} days</strong>. Projected ETA threshold breached by {matchedPort ? Math.round(matchedPort.waitDays * 0.8) : 0} days.
                        </p>
                      </div>

                      {/* Actionable Rerouting Select & Action */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground font-semibold mb-1">Select Eco-Alternative Port:</span>
                          <select 
                            className="text-xs border rounded-lg p-1.5 bg-background text-foreground border-zinc-200 dark:border-zinc-800 min-w-[150px] outline-none font-medium focus:border-indigo-400"
                            value={selectedAlt}
                            onChange={(e) => setSelectedAlternative(prev => ({ ...prev, [shipment.id]: e.target.value }))}
                          >
                            {alternatives.map((alt, aIdx) => (
                              <option key={aIdx} value={alt}>{alt}</option>
                            ))}
                          </select>
                        </div>

                        <Button
                          size="sm"
                          className="h-9 mt-4"
                          disabled={isRerouting !== null || !selectedAlt}
                          onClick={() => handleReroute(shipment.id, currentDest, selectedAlt)}
                        >
                          {isRerouting === shipment.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                          ) : (
                            <Navigation className="w-3.5 h-3.5 mr-1" />
                          )}
                          Reroute
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Predictive Demurrage & Detention Alarm Engine */}
        <div className="border-t pt-5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
            Predictive Demurrage & Port Detention Alarms
          </h4>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Imminent Demurrage Alarms Ledger */}
            <div className="md:col-span-2 space-y-3">
              {[
                {
                  id: "MSKU-8821034",
                  carrier: "Maersk",
                  port: "Los Angeles (USLAX)",
                  daysAtPort: 6,
                  freeDays: 5,
                  ratePerDay: 150,
                  status: "Breached",
                  statusClass: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200"
                },
                {
                  id: "OOLU-7112039",
                  carrier: "OOCL",
                  port: "Shanghai (CNSHA)",
                  daysAtPort: 4,
                  freeDays: 5,
                  ratePerDay: 120,
                  status: "Imminent (24h)",
                  statusClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200"
                },
                {
                  id: "COSU-9912048",
                  carrier: "COSCO",
                  port: "Rotterdam (NLRTM)",
                  daysAtPort: 2,
                  freeDays: 7,
                  ratePerDay: 180,
                  status: "Nominal",
                  statusClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200"
                }
              ].map((container, cIdx) => {
                const daysRemaining = container.freeDays - container.daysAtPort;
                const progressPct = Math.min(100, (container.daysAtPort / container.freeDays) * 100);
                const fine = container.daysAtPort > container.freeDays ? (container.daysAtPort - container.freeDays) * container.ratePerDay : 0;

                return (
                  <div key={cIdx} className="p-3.5 border rounded-xl bg-card space-y-3 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-foreground">{container.id}</span>
                        <Badge variant="outline" className="text-[9px] uppercase font-semibold">{container.carrier}</Badge>
                      </div>
                      <Badge variant="outline" className={`text-[9px] uppercase font-bold ${container.statusClass}`}>
                        {container.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground border-y py-2">
                      <div>
                        <span>Arrival Port:</span>
                        <strong className="block text-foreground text-xs mt-0.5">{container.port}</strong>
                      </div>
                      <div>
                        <span>Days at Port:</span>
                        <strong className="block text-foreground text-xs mt-0.5">{container.daysAtPort} of {container.freeDays} days</strong>
                      </div>
                      <div>
                        <span>Status / Fine:</span>
                        {fine > 0 ? (
                          <strong className="block text-rose-600 dark:text-rose-400 text-xs mt-0.5 font-mono font-extrabold animate-pulse">
                            -${fine} fine
                          </strong>
                        ) : (
                          <strong className="block text-emerald-600 dark:text-emerald-400 text-xs mt-0.5">
                            {daysRemaining} days left
                          </strong>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                        <span>Free-Time Allowance Usage</span>
                        <span>{Math.round(progressPct)}%</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            progressPct >= 100 
                              ? 'bg-rose-500' 
                              : progressPct >= 80 
                              ? 'bg-amber-500' 
                              : 'bg-emerald-500'
                          }`} 
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        size="sm"
                        className="text-[10px] h-7 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/40 border border-indigo-200"
                        variant="outline"
                        onClick={() => {
                          toast.success(`Expedite retrieval instruction dispatched to trucking fleet for container ${container.id}!`);
                        }}
                      >
                        Expedite Dispatch & Retrieval
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Carrier Historic Retrieval Efficiency Leaderboard */}
            <div className="space-y-4">
              <div className="p-4 border rounded-xl bg-gradient-to-br from-indigo-50/20 to-white dark:from-indigo-950/10 dark:to-zinc-900 space-y-3">
                <span className="text-xs font-bold text-foreground block uppercase tracking-wider">Carrier Retrieval Efficiency</span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Historic ranking of ocean carriers based on average days from container vessel offload to terminal gate-out retrieval.
                </p>

                <div className="space-y-2.5 pt-1">
                  {[
                    { rank: 1, name: "Maersk Line", avgDays: "2.1 days", rating: "Excellent", ratingColor: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20 border-emerald-100" },
                    { rank: 2, name: "OOCL Ocean", avgDays: "2.8 days", rating: "Good", ratingColor: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/20 border-blue-100" },
                    { rank: 3, name: "COSCO Shipping", avgDays: "3.4 days", rating: "Fair", ratingColor: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20 border-amber-100" },
                    { rank: 4, name: "MSC S.A.", avgDays: "4.8 days", rating: "Delinquent", ratingColor: "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/20 border-rose-100" }
                  ].map((carrier, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 border rounded-lg bg-background text-xs">
                      <div className="flex items-center gap-2">
                        <strong className="text-muted-foreground font-mono">#{carrier.rank}</strong>
                        <span className="font-semibold text-foreground">{carrier.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-muted-foreground font-semibold">{carrier.avgDays}</span>
                        <Badge variant="outline" className={`text-[8.5px] uppercase font-bold ${carrier.ratingColor}`}>
                          {carrier.rating}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
