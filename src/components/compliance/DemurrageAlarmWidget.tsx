import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/data-display/table';
import { Button } from '@/components/ui/forms/button';
import { Badge } from '@/components/ui/data-display/badge';
import { Input } from '@/components/ui/forms/input';
import { useAuth } from '../../contexts/AuthContext';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import { 
  BellRing, 
  Clock, 
  ShieldAlert, 
  ShieldCheck,
  Smartphone, 
  TrendingDown, 
  Users, 
  Loader2, 
  Fingerprint, 
  X, 
  MessageSquare,
  Award,
  DollarSign,
  AlertTriangle,
  Flame,
  Calendar,
  Truck,
  FileCheck,
  Zap,
  Activity
} from 'lucide-react';

interface ContainerTracker {
  containerId: string;
  port: string;
  carrier: string;
  vessel: string;
  arrivalDate: string;
  dwellHours: number;
  freeTimeHours: number;
  ratePerHour: number;
  status: string;
  risk: 'CRITICAL' | 'HIGH' | 'LOW';
  historicCarrierEfficiency: string;
}

export function DemurrageAlarmWidget() {
  const { token } = useAuth();
  const [containers, setContainers] = useState<ContainerTracker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContainer, setSelectedContainer] = useState<ContainerTracker | null>(null);
  
  // Alert dispatch states
  const [sendingAlert, setSendingAlert] = useState(false);
  const [notifiedRef, setNotifiedRef] = useState<string | null>(null);
  const [customPhone, setCustomPhone] = useState('+1 (555) 808-2026');

  // Predictive Alert Engine States
  const [customsDelayDays, setCustomsDelayDays] = useState<number>(1);
  const [missedGateOutAppointments, setMissedGateOutAppointments] = useState<number>(0);
  const [detentionChassisRentRate, setDetentionChassisRentRate] = useState<number>(45); // $ per day for chassis
  const [demurrageDailyRate, setDemurrageDailyRate] = useState<number>(150); // $ per day for demurrage
  const [activeSimulationContainer, setActiveSimulationContainer] = useState<ContainerTracker | null>(null);

  const loadDemurrageData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchApi('/compliance/demurrage', token);
      if (data && Array.isArray(data)) {
        setContainers(data);
        if (data.length > 0) {
          setActiveSimulationContainer(data[0]);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load live demurrage tracker data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDemurrageData();
  }, []);

  const triggerDemurrageAlert = async (container: ContainerTracker) => {
    setSendingAlert(true);
    try {
      const response = await fetchApi('/compliance/demurrage/alert', token, {
        method: 'POST',
        body: JSON.stringify({
          containerId: container.containerId,
          carrier: container.carrier,
          phone: customPhone
        })
      });

      if (response && response.success) {
        setNotifiedRef(response.refCode);
        toast.success(`High-Priority SMS & Biometric dispatch sent to ${container.carrier}! Reference: ${response.refCode}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to dispatch SMS notification alert.");
    } finally {
      setSendingAlert(false);
    }
  };

  // Predictive math calculation
  const getPrediction = (c: ContainerTracker) => {
    const totalAddedDwellHours = (customsDelayDays * 24) + (missedGateOutAppointments * 18);
    const predictedDwellHours = c.dwellHours + totalAddedDwellHours;
    const isOverSla = predictedDwellHours > c.freeTimeHours;
    const hoursPastSla = Math.max(0, predictedDwellHours - c.freeTimeHours);
    
    // Demurrage (port storage) charge
    const accruedDemurrage = isOverSla ? Math.round((hoursPastSla / 24) * demurrageDailyRate) : 0;
    
    // Detention (chassis/carrier rent) charge starting when free time ends or gate-out is missed
    const accruedDetention = isOverSla ? Math.round((hoursPastSla / 24) * detentionChassisRentRate) : 0;
    
    // Days until limit
    const hoursLeft = c.freeTimeHours - c.dwellHours;
    const hoursLeftPredicted = c.freeTimeHours - predictedDwellHours;
    const daysUntilAccrual = (hoursLeftPredicted / 24).toFixed(1);

    let alarmSeverity: 'CRITICAL' | 'WARNING' | 'SECURE' = 'SECURE';
    if (predictedDwellHours >= c.freeTimeHours) {
      alarmSeverity = 'CRITICAL';
    } else if (c.freeTimeHours - predictedDwellHours < 12) {
      alarmSeverity = 'WARNING';
    }

    return {
      predictedDwellHours,
      isOverSla,
      accruedDemurrage,
      accruedDetention,
      totalAccrued: accruedDemurrage + accruedDetention,
      daysUntilAccrual,
      alarmSeverity
    };
  };

  return (
    <div id="demurrage-alert-widget-root" className="space-y-6">
      
      {/* Overview stats header */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Containers Monitored</span>
            <strong className="text-3xl font-bold font-mono block mt-1.5">{loading ? '...' : containers.length}</strong>
            <span className="text-xs text-muted-foreground">Active port arrivals</span>
          </CardContent>
        </Card>

        <Card className="border-red-100 dark:border-red-950/40 bg-red-500/5">
          <CardContent className="p-5">
            <span className="text-[10px] uppercase tracking-wider text-red-600 dark:text-red-400 font-bold">Demurrage Imminent</span>
            <strong className="text-3xl font-bold font-mono text-red-600 dark:text-red-400 block mt-1.5">
              {loading ? '...' : containers.filter(c => c.dwellHours >= c.freeTimeHours).length}
            </strong>
            <span className="text-xs text-red-600/80">Exceeding standard free-time</span>
          </CardContent>
        </Card>

        <Card className="border-amber-100 dark:border-amber-950/40 bg-amber-500/5">
          <CardContent className="p-5">
            <span className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold">Current Demurrage Accrued</span>
            <strong className="text-3xl font-bold font-mono text-amber-600 dark:text-amber-400 block mt-1.5">
              ${loading ? '...' : containers.reduce((acc, c) => {
                if (c.dwellHours > c.freeTimeHours) {
                  return acc + ((c.dwellHours - c.freeTimeHours) * c.ratePerHour);
                }
                return acc;
              }, 0).toLocaleString()}
            </strong>
            <span className="text-xs text-amber-600/80">Calculated dynamic fees</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Average Port Free-Time</span>
            <strong className="text-3xl font-bold font-mono block mt-1.5">78 Hrs</strong>
            <span className="text-xs text-muted-foreground">Global port standards</span>
          </CardContent>
        </Card>
      </div>

      {/* D&D PREDICTIVE SIMULATION PANEL */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* PREDICTIVE INPUT CONTROLS */}
        <Card className="xl:col-span-1 border-border shadow-sm">
          <CardHeader className="pb-3 border-b bg-indigo-50/10 dark:bg-indigo-950/5">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-indigo-500" />
              Predictive Alert Simulator
            </CardTitle>
            <CardDescription className="text-xs">
              Inject hypothetical delays to predict when daily terminal demurrage and carrier detention fees start accruing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Select Container for Risk Simulation</label>
              <select
                value={activeSimulationContainer?.containerId || ''}
                onChange={(e) => {
                  const found = containers.find(c => c.containerId === e.target.value);
                  if (found) setActiveSimulationContainer(found);
                }}
                className="w-full h-8.5 border border-input rounded-lg text-xs px-2.5 bg-background font-mono font-bold"
              >
                {containers.map(c => (
                  <option key={c.containerId} value={c.containerId}>{c.containerId} ({c.port})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t pt-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Customs Clearance Delay</label>
                <div className="flex items-center gap-1.5">
                  <Input 
                    type="number" 
                    value={customsDelayDays} 
                    onChange={(e) => setCustomsDelayDays(Number(e.target.value))}
                    className="h-8.5 text-xs font-mono"
                    min="0"
                    max="10"
                  />
                  <span className="text-[11px] text-muted-foreground shrink-0">Days</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Missed Gate Appointments</label>
                <div className="flex items-center gap-1.5">
                  <Input 
                    type="number" 
                    value={missedGateOutAppointments} 
                    onChange={(e) => setMissedGateOutAppointments(Number(e.target.value))}
                    className="h-8.5 text-xs font-mono"
                    min="0"
                    max="5"
                  />
                  <span className="text-[11px] text-muted-foreground shrink-0">Slots</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t pt-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Daily Demurrage Rate</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">$</span>
                  <Input 
                    type="number" 
                    value={demurrageDailyRate} 
                    onChange={(e) => setDemurrageDailyRate(Number(e.target.value))}
                    className="h-8.5 pl-6 text-xs font-mono font-bold"
                    min="0"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Daily Chassis Rent (Detention)</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">$</span>
                  <Input 
                    type="number" 
                    value={detentionChassisRentRate} 
                    onChange={(e) => setDetentionChassisRentRate(Number(e.target.value))}
                    className="h-8.5 pl-6 text-xs font-mono font-bold"
                    min="0"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-3 bg-zinc-50 dark:bg-zinc-900/30 p-3 rounded-lg flex items-start gap-2.5 text-[11px] text-muted-foreground leading-normal">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                Standard carrier free-time is strictly bound at port gate. Delay in customs clearance or missing scheduled gate appointments triggers immediate penalty fees from terminal operators.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* PREDICTIVE AUDIT TIMELINE OUTPUT */}
        <Card className="xl:col-span-2 border-border shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3 border-b">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-sm font-bold text-foreground">Predictive Risk Assessment Timeline</CardTitle>
                <CardDescription className="text-xs">
                  Projected Dwell & Charge Escalation path based on simulated delay events.
                </CardDescription>
              </div>
              {activeSimulationContainer && (
                <Badge variant="outline" className="font-mono text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-500/5">
                  {activeSimulationContainer.containerId}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4 flex-1 flex flex-col justify-between">
            {activeSimulationContainer ? (
              (() => {
                const pred = getPrediction(activeSimulationContainer);
                return (
                  <div className="space-y-6">
                    {/* Gauge/Alert Banner */}
                    <div className={`p-4.5 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
                      pred.alarmSeverity === 'CRITICAL' 
                        ? 'bg-red-500/5 border-red-200 dark:border-red-950 text-red-900 dark:text-red-400' 
                        : pred.alarmSeverity === 'WARNING'
                        ? 'bg-amber-500/5 border-amber-200 dark:border-amber-950 text-amber-900 dark:text-amber-400'
                        : 'bg-emerald-500/5 border-emerald-200 dark:border-emerald-950 text-emerald-900 dark:text-emerald-400'
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full shrink-0 ${
                          pred.alarmSeverity === 'CRITICAL' 
                            ? 'bg-red-500/10' 
                            : pred.alarmSeverity === 'WARNING'
                            ? 'bg-amber-500/10'
                            : 'bg-emerald-500/10'
                        }`}>
                          {pred.alarmSeverity === 'CRITICAL' ? (
                            <Flame className="w-6 h-6 text-red-600 animate-pulse" />
                          ) : pred.alarmSeverity === 'WARNING' ? (
                            <AlertTriangle className="w-6 h-6 text-amber-600" />
                          ) : (
                            <ShieldCheck className="w-6 h-6 text-emerald-600" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="font-extrabold text-sm uppercase tracking-wider">
                            {pred.alarmSeverity === 'CRITICAL' ? 'ALARM ACTIVE: ACCRUAL IN PROGRESS' : pred.alarmSeverity === 'WARNING' ? 'WARNING: ESCALATION IMMINENT' : 'STATUS SECURE'}
                          </p>
                          <p className="text-xs text-muted-foreground leading-normal">
                            {pred.isOverSla 
                              ? `Simulated delay events push actual dwell to ${pred.predictedDwellHours} hours, surpassing terminal allowance by ${pred.predictedDwellHours - activeSimulationContainer.freeTimeHours} hours.` 
                              : `Safe window remaining: ${pred.daysUntilAccrual} days before demurrage charges commence.`
                            }
                          </p>
                        </div>
                      </div>

                      {pred.isOverSla && (
                        <div className="text-center shrink-0">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Predicted Daily Leakage</span>
                          <strong className="text-2xl font-mono font-extrabold text-red-600">${pred.totalAccrued}</strong>
                        </div>
                      )}
                    </div>

                    {/* Timeline visualization */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Custody & Free-Time Timeline Projections</h4>
                      <div className="relative border-t pt-6 grid grid-cols-3 gap-4">
                        
                        {/* Milestone 1 */}
                        <div className="space-y-1 text-xs">
                          <span className="absolute -top-1.5 left-0 w-3.5 h-3.5 bg-indigo-600 rounded-full border-2 border-white dark:border-zinc-950" />
                          <p className="font-extrabold text-foreground">1. Port Landing</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{activeSimulationContainer.arrivalDate}</p>
                          <span className="text-[10px] text-muted-foreground block">Dwell starts at 0 hrs</span>
                        </div>

                        {/* Milestone 2 */}
                        <div className="space-y-1 text-xs text-center">
                          <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-zinc-400 rounded-full border-2 border-white dark:border-zinc-950" />
                          <p className="font-extrabold text-foreground">2. Allowed Free-Time</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{activeSimulationContainer.freeTimeHours} Hrs limit</p>
                          <span className="text-[10px] text-muted-foreground block">Standard allowance window</span>
                        </div>

                        {/* Milestone 3 */}
                        <div className="space-y-1 text-xs text-right">
                          <span className={`absolute -top-1.5 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-zinc-950 ${
                            pred.isOverSla ? 'bg-red-600' : 'bg-emerald-600'
                          }`} />
                          <p className="font-extrabold text-foreground">3. Simulated Out-Gate</p>
                          <p className="text-[11px] text-muted-foreground font-mono font-bold">{pred.predictedDwellHours} Hrs Projected</p>
                          <span className={`text-[10px] font-bold block ${pred.isOverSla ? 'text-red-500' : 'text-emerald-500'}`}>
                            {pred.isOverSla ? 'Demurrage/Detention Active' : 'Compliant Extraction'}
                          </span>
                        </div>

                      </div>
                    </div>

                    {/* Breakdown details list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
                      <div className="p-3 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-indigo-500" />
                            Predicted Demurrage Charge:
                          </span>
                          <strong className="font-mono text-sm text-foreground">${pred.accruedDemurrage}</strong>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Accrued daily warehouse/yard storage rate payable to terminal operators.</p>
                      </div>

                      <div className="p-3 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-indigo-500" />
                            Predicted Chassis Detention:
                          </span>
                          <strong className="font-mono text-sm text-foreground">${pred.accruedDetention}</strong>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Accrued chassis rent and container usage penalties due to carrier logistics.</p>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground">No active simulation container selected</div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* CORE ALARM LIST */}
      <Card className="border border-indigo-100 dark:border-indigo-950/40">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-500 animate-pulse" />
              <CardTitle>Port Dwell-Time Detention & Demurrage Alarm Engine</CardTitle>
            </div>
            <CardDescription>
              Predictively monitor actual terminal dwell times against carrier free-time allowances to trigger emergency dispatch alerts.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadDemurrageData()} className="text-xs">
            Refresh Feeds
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-xs text-muted-foreground">Loading container trackings...</span>
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader className="bg-zinc-50 dark:bg-zinc-900/40">
                  <TableRow>
                    <TableHead>Container ID</TableHead>
                    <TableHead>Terminal Port</TableHead>
                    <TableHead>Carrier Operator</TableHead>
                    <TableHead>Historic Efficiency</TableHead>
                    <TableHead>Live Port Dwell</TableHead>
                    <TableHead>Free-Time Allowance</TableHead>
                    <TableHead>Status / Risk</TableHead>
                    <TableHead className="text-right">Demurrage Accrued</TableHead>
                    <TableHead className="text-center">Emergency Alarm</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {containers.map((c) => {
                    const isOver = c.dwellHours > c.freeTimeHours;
                    const accrued = isOver ? (c.dwellHours - c.freeTimeHours) * c.ratePerHour : 0;
                    return (
                      <TableRow key={c.containerId} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10">
                        <TableCell className="font-mono font-bold text-xs">{c.containerId}</TableCell>
                        <TableCell className="text-xs font-semibold">{c.port}</TableCell>
                        <TableCell className="text-xs">{c.carrier}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="text-xs font-bold font-mono">{c.historicCarrierEfficiency}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs font-mono font-bold ${isOver ? 'text-red-600' : 'text-slate-600'}`}>
                            {c.dwellHours} hrs
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{c.freeTimeHours} hrs</TableCell>
                        <TableCell>
                          <Badge 
                            variant={isOver ? 'destructive' : 'outline'}
                            className={`text-[9px] font-black uppercase tracking-wider ${
                              c.risk === 'CRITICAL' ? 'bg-red-600 text-white' : c.risk === 'HIGH' ? 'bg-amber-600 text-white' : ''
                            }`}
                          >
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-xs text-red-600">
                          {accrued > 0 ? `$${accrued}` : '$0.00'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button 
                            size="sm"
                            onClick={() => {
                              setSelectedContainer(c);
                              setNotifiedRef(null);
                            }}
                            className="h-7 text-[10px] px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1"
                          >
                            <BellRing className="w-3.5 h-3.5" />
                            Dispatch SMS
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SMS Alert & Biometric Override Modal */}
      {selectedContainer && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl max-w-md w-full shadow-2xl overflow-hidden relative animate-in fade-in zoom-in duration-150">
            
            <div className="bg-indigo-950/20 p-5 border-b flex justify-between items-center">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
                <span className="font-bold text-sm">Emergency Dispatch SMS & MFA Gate</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-1 h-7 w-7 rounded-full" 
                onClick={() => setSelectedContainer(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-6 space-y-5">
              
              <div className="bg-zinc-50 dark:bg-zinc-900/30 p-4 rounded-xl border space-y-1">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">TARGET DEMURRAGE THREAT</span>
                <div className="flex items-center justify-between">
                  <strong className="text-sm font-mono text-foreground">{selectedContainer.containerId}</strong>
                  <Badge variant="destructive" className="font-semibold font-mono text-[9px] leading-none px-1.5 h-4.5 bg-red-600">
                    {selectedContainer.risk} RISK
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                  Arrived at {selectedContainer.port} via {selectedContainer.carrier} ({selectedContainer.vessel}). Dwell hours at {selectedContainer.dwellHours} hrs vs {selectedContainer.freeTimeHours} hrs limit.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground block">Dispatch Alert Phone Number:</label>
                <input
                  type="text"
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  className="w-full text-xs font-mono font-semibold border rounded-lg p-2.5 bg-background border-zinc-200 dark:border-zinc-800 outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-muted-foreground leading-snug">
                  This sends a priority carrier dispatch message bypassing local queues to accelerate container extraction.
                </p>
              </div>

              {notifiedRef ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 space-y-2 text-center animate-in fade-in duration-200">
                  <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>ALARM DISPATCH SUCCESSFUL</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    A critical detention warning SMS was successfully pushed to {selectedContainer.carrier} dispatcher terminal at <strong>{customPhone}</strong>.
                  </p>
                  <span className="text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 p-1 rounded font-bold">Reference ID: {notifiedRef}</span>
                </div>
              ) : (
                <Button
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5"
                  onClick={() => triggerDemurrageAlert(selectedContainer)}
                  disabled={sendingAlert}
                >
                  {sendingAlert ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting to Banking Gateway & SMS Dispatcher...
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4" />
                      Authenticate & Dispatch Priority Warning SMS
                    </>
                  )}
                </Button>
              )}

              <div className="border-t pt-4 flex gap-3">
                <Button 
                  variant="outline" 
                  className="w-full text-xs"
                  onClick={() => setSelectedContainer(null)}
                >
                  Close Gate
                </Button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
