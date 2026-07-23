import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/data-display/card';
import { Badge } from '@/components/ui/data-display/badge';
import { Button } from '@/components/ui/forms/button';
import { 
  Compass, 
  Activity, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  RefreshCw, 
  Ship, 
  Navigation,
  MapPin,
  Bell,
  Mail
} from 'lucide-react';
import { toast } from 'sonner';

interface VesselTelemetry {
  vesselName: string;
  shipmentRef: string;
  carrierEta: string;
  aisEta: string;
  driftHours: number;
  speedKnots: number;
  normalSpeedKnots: number;
  courseDeviation: number;
  latitude: number;
  longitude: number;
  status: 'Normal' | 'Minor Drift' | 'Critical Drift';
  anomalies: string[];
}

const INITIAL_VESSELS: VesselTelemetry[] = [
  {
    vesselName: "MAERSK MC-KINNEY MOLLER",
    shipmentRef: "SHP-2026-992",
    carrierEta: "2026-07-28",
    aisEta: "2026-07-30",
    driftHours: 48,
    speedKnots: 11.2,
    normalSpeedKnots: 18.5,
    courseDeviation: 12.4,
    latitude: 34.5621,
    longitude: -14.8912,
    status: 'Critical Drift',
    anomalies: [
      "Vessel speed drop: -39.4% due to North Atlantic heavy swell",
      "Draft adjustments triggered to avoid shoals near Gibraltar"
    ]
  },
  {
    vesselName: "MSC OSCAR",
    shipmentRef: "SHP-2026-995",
    carrierEta: "2026-08-04",
    aisEta: "2026-08-05",
    driftHours: 18,
    speedKnots: 15.8,
    normalSpeedKnots: 17.5,
    courseDeviation: 2.1,
    latitude: 12.3512,
    longitude: 104.5612,
    status: 'Minor Drift',
    anomalies: [
      "Minor harbor congestion delay at transshipment hub"
    ]
  },
  {
    vesselName: "ONE APUS",
    shipmentRef: "SHP-2026-994",
    carrierEta: "2026-07-22",
    aisEta: "2026-07-22",
    driftHours: 0,
    speedKnots: 19.1,
    normalSpeedKnots: 19.0,
    courseDeviation: 0.2,
    latitude: 25.1021,
    longitude: -78.1251,
    status: 'Normal',
    anomalies: []
  }
];

export function VesselTelemetryWidget() {
  const [vessels, setVessels] = useState<VesselTelemetry[]>(INITIAL_VESSELS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedVessel, setSelectedVessel] = useState<VesselTelemetry | null>(INITIAL_VESSELS[0]);
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Satellite AIS telemetry streams synchronized successfully!");
    }, 1000);
  };

  const handleAcknowledge = (shipmentRef: string) => {
    setAcknowledged(prev => ({ ...prev, [shipmentRef]: true }));
    toast.success(`Alarms acknowledged for ${shipmentRef}. Customer warning notification dispatched!`);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Compass className="w-5 h-5 text-indigo-500 animate-spin" style={{ animationDuration: '6s' }} />
              AIS Vessel Telemetry & ETA Drift Alarm
            </CardTitle>
            <CardDescription>
              Correlating orbital satellite AIS vessel positions with carriers' reported ETAs to pre-emptively flag scheduling anomalies.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 overflow-y-auto flex-1">
        
        {/* Main telemetry grid split */}
        <div className="grid gap-6 md:grid-cols-5">
          
          {/* Active Vessels List */}
          <div className="md:col-span-2 space-y-3">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Active Ocean Vessels</span>
            
            <div className="space-y-2.5">
              {vessels.map((v) => {
                const isSelected = selectedVessel?.shipmentRef === v.shipmentRef;
                const isAck = acknowledged[v.shipmentRef];
                
                return (
                  <div 
                    key={v.shipmentRef}
                    onClick={() => setSelectedVessel(v)}
                    className={`p-3.5 border rounded-2xl cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-indigo-500 ring-2 ring-indigo-500/10 bg-indigo-500/5' 
                        : 'border-zinc-200 dark:border-zinc-800 bg-card hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h4 className="font-bold text-xs text-foreground truncate max-w-[170px]">{v.vesselName}</h4>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-muted-foreground">{v.shipmentRef}</span>
                          <Badge variant="outline" className="text-[8.5px] uppercase font-mono py-0">
                            {v.speedKnots} kts
                          </Badge>
                        </div>
                      </div>

                      <Badge className={
                        v.status === 'Critical Drift' ? 'bg-red-100 text-red-700 font-bold text-[9px]' :
                        v.status === 'Minor Drift' ? 'bg-amber-100 text-amber-700 font-bold text-[9px]' :
                        'bg-emerald-100 text-emerald-700 font-bold text-[9px]'
                      }>
                        {v.status}
                      </Badge>
                    </div>

                    {v.driftHours > 0 && !isAck && (
                      <div className="mt-2.5 p-1.5 rounded bg-amber-500/5 border border-amber-500/20 text-[9.5px] text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
                        ETA drifted by {v.driftHours}h! Action Required
                      </div>
                    )}

                    {isAck && (
                      <div className="mt-2.5 p-1.5 rounded bg-emerald-500/5 border border-emerald-500/20 text-[9.5px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Alarms Acknowledged
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Telemetry Detail Monitor */}
          <div className="md:col-span-3">
            {selectedVessel ? (
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 bg-zinc-50/20 space-y-5">
                
                {/* Header */}
                <div className="flex justify-between items-center pb-3 border-b">
                  <div>
                    <h3 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                      <Ship className="w-4 h-4 text-indigo-500" />
                      {selectedVessel.vesselName}
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-mono">Satellite telemetry last synchronized 12 mins ago</p>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {selectedVessel.shipmentRef}
                  </Badge>
                </div>

                {/* Satellite Geocoordinates Box */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="p-3 border rounded-xl bg-card">
                    <span className="text-[9px] text-muted-foreground uppercase font-bold block">Current Coordinates</span>
                    <strong className="text-xs font-mono text-foreground font-bold block mt-1">
                      {selectedVessel.latitude.toFixed(4)}° N
                    </strong>
                    <strong className="text-[10px] font-mono text-muted-foreground block">
                      {selectedVessel.longitude.toFixed(4)}° W
                    </strong>
                  </div>

                  <div className="p-3 border rounded-xl bg-card">
                    <span className="text-[9px] text-muted-foreground uppercase font-bold block">AIS speed profile</span>
                    <strong className="text-xs font-mono text-foreground font-bold block mt-1">
                      {selectedVessel.speedKnots} knots
                    </strong>
                    <span className="text-[10px] text-muted-foreground block font-medium">
                      Normal: {selectedVessel.normalSpeedKnots} kts
                    </span>
                  </div>

                  <div className="p-3 border rounded-xl bg-card">
                    <span className="text-[9px] text-muted-foreground uppercase font-bold block">Course Deviation</span>
                    <strong className="text-xs font-mono text-foreground font-bold block mt-1">
                      {selectedVessel.courseDeviation}° Heading
                    </strong>
                    <Badge variant="outline" className={`text-[8.5px] uppercase px-1 py-0 mt-0.5 ${
                      selectedVessel.courseDeviation > 10 ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50'
                    }`}>
                      {selectedVessel.courseDeviation > 10 ? 'Detour detected' : 'On track'}
                    </Badge>
                  </div>
                </div>

                {/* Compare Reported vs AIS derived ETAs */}
                <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-card space-y-3">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Carrier Schedule Integrity</span>
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <span className="text-[9px] text-muted-foreground uppercase block">Carrier Reported ETA</span>
                      <strong className="text-xs text-foreground font-bold font-mono">
                        {new Date(selectedVessel.carrierEta).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </strong>
                    </div>

                    <div className="flex items-center gap-1.5 text-indigo-500 hidden sm:flex">
                      <ChevronRight className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-muted-foreground uppercase block">AIS Derived Predicted ETA</span>
                      <strong className="text-xs text-indigo-600 dark:text-indigo-400 font-bold font-mono">
                        {new Date(selectedVessel.aisEta).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </strong>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-xl px-3 py-1.5 text-right shrink-0">
                      <span className="text-[8px] font-bold text-amber-700 dark:text-amber-400 uppercase block">Calculated Drift</span>
                      <strong className="text-sm font-mono text-amber-600 dark:text-amber-400 font-extrabold block">
                        +{selectedVessel.driftHours} Hours
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Active Anomaly Alerts */}
                {selectedVessel.anomalies.length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">AIS Telemetry Alarm Logs</span>
                    <div className="space-y-1.5">
                      {selectedVessel.anomalies.map((a, idx) => (
                        <div key={idx} className="p-2 border border-red-100 bg-red-500/5 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                          {a}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 border border-dashed rounded-xl flex items-center justify-center gap-2 text-xs text-muted-foreground bg-zinc-50/10">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    No mechanical, meteorological, or navigation anomalies logged.
                  </div>
                )}

                {/* Operations & Customer warning triggers */}
                {selectedVessel.driftHours > 0 && (
                  <div className="pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Customer Pre-emptive Alert Panel</h4>
                      <p className="text-[10.5px] text-muted-foreground">Draft warning to notify receiver about the calculated {selectedVessel.driftHours}-hour cargo drift.</p>
                    </div>

                    <Button 
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 h-8.5 text-xs text-nowrap"
                      disabled={acknowledged[selectedVessel.shipmentRef]}
                      onClick={() => handleAcknowledge(selectedVessel.shipmentRef)}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      {acknowledged[selectedVessel.shipmentRef] ? "Alert Sent" : "Dispatched Notice"}
                    </Button>
                  </div>
                )}

              </div>
            ) : (
              <div className="h-full border border-dashed rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-zinc-50/30 dark:bg-zinc-950/5 min-h-[300px]">
                <Ship className="w-10 h-10 text-muted-foreground/30 mb-2" />
                <p className="text-sm font-semibold text-foreground">Select a vessel from the left to view deep tracking analysis</p>
              </div>
            )}
          </div>

        </div>

      </CardContent>
    </Card>
  );
}
