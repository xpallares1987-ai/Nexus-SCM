import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/data-display/card';
import { Badge } from '@/components/ui/data-display/badge';
import { Button } from '@/components/ui/forms/button';
import { Input } from '@/components/ui/forms/input';
import { 
  Leaf, 
  TrendingDown, 
  Coins, 
  Award, 
  Ship, 
  Check, 
  Zap, 
  Heart, 
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Trees
} from 'lucide-react';
import { toast } from 'sonner';

interface OffsetProject {
  id: string;
  name: string;
  location: string;
  costPerTon: number;
  availableTons: number;
  type: string;
  image: string;
}

interface LedgerTransaction {
  id: string;
  date: string;
  shipmentRef: string;
  tons: number;
  project: string;
  amount: number;
  status: string;
}

const INITIAL_PROJECTS: OffsetProject[] = [
  {
    id: "PROJ-REFOREST",
    name: "Amazon Basin Reforestation Initiative",
    location: "Brazil (Pará Province)",
    costPerTon: 15.00,
    availableTons: 12400,
    type: "Forestry & Biodiversity",
    image: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=400&q=80"
  },
  {
    id: "PROJ-WIND",
    name: "Patagonia Wind Corridor Expansion",
    location: "Argentina (Chubut)",
    costPerTon: 12.50,
    availableTons: 35000,
    type: "Renewable Energy",
    image: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=400&q=80"
  },
  {
    id: "PROJ-BLUE",
    name: "Mangrove Estuary Protection & Restoration",
    location: "Indonesia (East Kalimantan)",
    costPerTon: 18.00,
    availableTons: 8500,
    type: "Blue Carbon Ecosystems",
    image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=400&q=80"
  }
];

const INITIAL_TRANSACTIONS: LedgerTransaction[] = [
  {
    id: "TXN-CO2-001",
    date: "2026-07-15",
    shipmentRef: "SHP-2026-881",
    tons: 4.8,
    project: "Amazon Basin Reforestation",
    amount: 72.00,
    status: "Completed"
  },
  {
    id: "TXN-CO2-002",
    date: "2026-07-18",
    shipmentRef: "SHP-2026-904",
    tons: 12.5,
    project: "Patagonia Wind Corridor",
    amount: 156.25,
    status: "Completed"
  }
];

export function CarbonLedgerWidget() {
  const [transactions, setTransactions] = useState<LedgerTransaction[]>(INITIAL_TRANSACTIONS);
  const [greenLaneOptIn, setGreenLaneOptIn] = useState<Record<string, boolean>>({
    "SHP-2026-992": false,
    "SHP-2026-994": true,
    "SHP-2026-995": false
  });
  const [selectedProject, setSelectedProject] = useState<string>("PROJ-REFOREST");
  const [offsetShipmentRef, setOffsetShipmentRef] = useState<string>("SHP-2026-992");
  const [offsetTons, setOffsetTons] = useState<string>("5.4");
  const [isProcessing, setIsProcessing] = useState(false);

  // Carbon metrics
  const totalKmEmitted = 42500; // Total carbon emitted in KG
  const offsetTonsCount = transactions.reduce((acc, t) => acc + t.tons, 0);
  const offsetKg = offsetTonsCount * 1000;
  const netEmissionsKg = Math.max(0, totalKmEmitted - offsetKg);
  const neutralPercentage = Math.min(100, Math.round((offsetKg / totalKmEmitted) * 100));

  const activeProject = INITIAL_PROJECTS.find(p => p.id === selectedProject) || INITIAL_PROJECTS[0];
  const offsetCost = parseFloat(offsetTons || "0") * activeProject.costPerTon;

  const handlePurchaseOffset = (e: React.FormEvent) => {
    e.preventDefault();
    const tons = parseFloat(offsetTons);
    if (isNaN(tons) || tons <= 0) {
      toast.error("Please enter a valid tonnage to offset.");
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      const newTxn: LedgerTransaction = {
        id: `TXN-CO2-00${transactions.length + 1}`,
        date: new Date().toISOString().split('T')[0],
        shipmentRef: offsetShipmentRef || "General SCM Offset",
        tons: tons,
        project: activeProject.name.split(' ')[0] + " " + activeProject.name.split(' ')[1],
        amount: tons * activeProject.costPerTon,
        status: "Completed"
      };

      setTransactions([newTxn, ...transactions]);
      setIsProcessing(false);
      toast.success(`Successfully offset ${tons} metric tons of CO₂ via the ${activeProject.name}! Certificate generated.`);
    }, 1200);
  };

  const toggleGreenLane = (ref: string) => {
    const isCurrentlyOptedIn = greenLaneOptIn[ref];
    setGreenLaneOptIn(prev => ({ ...prev, [ref]: !isCurrentlyOptedIn }));
    if (!isCurrentlyOptedIn) {
      toast.success(`Green Lane logistics opted for ${ref}! Emissions reduced by ~35% using low-carbon biofuel ocean freight.`);
    } else {
      toast.info(`Switched ${ref} back to standard transit lanes.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Carbon KPI Banner */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-emerald-100 bg-gradient-to-b from-emerald-50/10 to-card dark:border-emerald-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-mono font-bold tracking-wider">Gross Fleet CO₂</span>
              <strong className="block text-2xl font-bold font-mono text-foreground">{(totalKmEmitted / 1000).toFixed(1)} T</strong>
              <p className="text-[10px] text-muted-foreground">Emissions at 0.12 kg/container-mile</p>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-500">
              <Ship className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-emerald-100 bg-gradient-to-b from-emerald-50/10 to-card dark:border-emerald-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-mono font-bold tracking-wider">Verified Offsets Purchased</span>
              <strong className="block text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{offsetTonsCount.toFixed(1)} T</strong>
              <p className="text-[10px] text-muted-foreground">Gold Standard / VCS Certified</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
              <Trees className="w-5 h-5 animate-pulse" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-emerald-100 bg-gradient-to-b from-emerald-50/10 to-card dark:border-emerald-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-mono font-bold tracking-wider">Net Carbon Balance</span>
              <strong className="block text-2xl font-bold font-mono text-zinc-800 dark:text-zinc-200">{(netEmissionsKg / 1000).toFixed(1)} T</strong>
              <p className="text-[10px] text-muted-foreground">Residual carbon exposure</p>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500">
              <TrendingDown className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-emerald-100 bg-gradient-to-b from-emerald-50/10 to-card dark:border-emerald-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-mono font-bold tracking-wider">Neutrality Level</span>
              <strong className="block text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{neutralPercentage}%</strong>
              <p className="text-[10px] text-muted-foreground">Target: 100% Net Zero</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
              <Award className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-5">
        {/* Left Column - Offsetting Gateway */}
        <div className="md:col-span-3 space-y-6">
          <Card className="border border-emerald-100 dark:border-emerald-950/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Leaf className="w-5 h-5 text-emerald-500 animate-pulse" />
                Verified Carbon Offset Checkout Gateway
              </CardTitle>
              <CardDescription>
                Purchase accredited carbon offsets directly linked to your container routes and print official VCS-certified neutrality declarations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePurchaseOffset} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  {INITIAL_PROJECTS.map((proj) => (
                    <div 
                      key={proj.id} 
                      onClick={() => setSelectedProject(proj.id)}
                      className={`cursor-pointer group relative border-2 rounded-xl overflow-hidden transition-all flex flex-col justify-between ${
                        selectedProject === proj.id 
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/5' 
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-emerald-400 bg-card'
                      }`}
                    >
                      <div className="h-24 w-full overflow-hidden relative">
                        <img src={proj.image} alt={proj.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-emerald-600 text-white font-bold text-[9px] uppercase">
                            {proj.costPerTon.toFixed(2)}/T
                          </Badge>
                        </div>
                      </div>
                      <div className="p-3 space-y-1.5 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-muted-foreground block">{proj.type}</span>
                          <h4 className="font-bold text-xs text-foreground leading-tight mt-0.5 line-clamp-1">{proj.name}</h4>
                          <p className="text-[10px] text-muted-foreground">{proj.location}</p>
                        </div>
                        <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 pt-1.5 border-t border-zinc-100 dark:border-zinc-800">
                          Available: {proj.availableTons.toLocaleString()} T
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-3 border-t pt-4">
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-muted-foreground block">Select Active Shipment:</span>
                    <select 
                      value={offsetShipmentRef}
                      onChange={(e) => setOffsetShipmentRef(e.target.value)}
                      className="w-full border rounded-xl p-2 bg-background text-foreground border-zinc-200 dark:border-zinc-800 text-xs outline-none focus:border-emerald-500"
                    >
                      <option value="SHP-2026-992">SHP-2026-992 (Shanghai - Rotterdam)</option>
                      <option value="SHP-2026-994">SHP-2026-994 (Los Angeles - Miami)</option>
                      <option value="SHP-2026-995">SHP-2026-995 (Singapore - Hamburg)</option>
                      <option value="General SCM Offset">General Fleet Offset</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-muted-foreground block">Tons to Offset (MT):</span>
                    <Input 
                      type="number" 
                      step="0.1" 
                      value={offsetTons} 
                      onChange={e => setOffsetTons(e.target.value)}
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5 flex flex-col justify-end">
                    <div className="p-2 border rounded-xl bg-zinc-50 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 text-right h-9 flex items-center justify-between px-3">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase">Total Cost:</span>
                      <strong className="text-sm font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">${offsetCost.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isProcessing}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-2 h-10"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Securing Carbon Offset Trust Funds...
                    </>
                  ) : (
                    <>
                      <Coins className="w-4 h-4" />
                      Acquire Verified Offsets & Issue Certificate (${offsetCost.toFixed(2)})
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Ledger Transactions */}
          <Card className="border border-emerald-100 dark:border-emerald-950/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-foreground">Green Offset Ledger & VCS Registries</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-900 border-b">
                    <tr>
                      <th className="p-3 text-left font-semibold text-muted-foreground">Ledger ID</th>
                      <th className="p-3 text-left font-semibold text-muted-foreground">Date</th>
                      <th className="p-3 text-left font-semibold text-muted-foreground">Shipment</th>
                      <th className="p-3 text-left font-semibold text-muted-foreground">CO₂ Extinguished</th>
                      <th className="p-3 text-left font-semibold text-muted-foreground">Offset Project</th>
                      <th className="p-3 text-right font-semibold text-muted-foreground">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/50">
                        <td className="p-3 font-mono font-bold text-foreground">{t.id}</td>
                        <td className="p-3 text-muted-foreground">{t.date}</td>
                        <td className="p-3 font-mono font-semibold">{t.shipmentRef}</td>
                        <td className="p-3 text-emerald-600 dark:text-emerald-400 font-bold font-mono">-{t.tons} MT</td>
                        <td className="p-3 text-foreground font-medium">{t.project}</td>
                        <td className="p-3 text-right font-mono font-bold text-foreground">${t.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Green Lanes */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border border-emerald-100 dark:border-emerald-950/30">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-1.5">
                <Zap className="w-5 h-5 text-amber-500 animate-pulse" />
                Sustainability Green Lanes Opt-In
              </CardTitle>
              <CardDescription>
                Convert active freight routes to "Green Lanes" utilizing hybrid vessel lines, LNG tankers, and electric drayage dockets.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  ref: "SHP-2026-992",
                  origin: "Shanghai (CNSHA)",
                  destination: "Rotterdam (NLRTM)",
                  carrier: "Maersk Eco-Line (Biofuel)",
                  efficiency: "38% CO2 Reduction",
                  premium: "+$120.00"
                },
                {
                  ref: "SHP-2026-994",
                  origin: "Los Angeles (USLAX)",
                  destination: "Miami (USMIA)",
                  carrier: "DHL Green Corridor (LNG Rail)",
                  efficiency: "45% CO2 Reduction",
                  premium: "+$85.00"
                },
                {
                  ref: "SHP-2026-995",
                  origin: "Singapore (SGSIN)",
                  destination: "Hamburg (NLRTM)",
                  carrier: "MSC CleanOcean Line (Hybrid)",
                  efficiency: "25% CO2 Reduction",
                  premium: "+$110.00"
                }
              ].map((lane) => {
                const optIn = greenLaneOptIn[lane.ref];
                return (
                  <div key={lane.ref} className={`p-4 border rounded-2xl transition-all ${
                    optIn 
                      ? 'border-emerald-200 bg-emerald-500/5 dark:border-emerald-900/30' 
                      : 'border-zinc-200 dark:border-zinc-800 bg-card hover:border-emerald-300'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-xs font-mono text-foreground font-bold">{lane.ref}</strong>
                          <Badge variant="outline" className="text-[8.5px] uppercase font-mono font-bold">
                            {lane.carrier.split(' ')[0]}
                          </Badge>
                          {optIn && (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[8.5px] flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5" />
                              Active Green Lane
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground font-medium pt-1">
                          {lane.origin} <ArrowRight className="inline-block w-3 h-3 text-zinc-400" /> {lane.destination}
                        </p>
                        <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold pt-1.5 flex items-center gap-1">
                          <Leaf className="w-3.5 h-3.5" />
                          {lane.efficiency} (Saves {optIn ? '1.8T' : '0.0T'} carbon)
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-[10px] text-muted-foreground font-mono font-bold">{lane.premium}</span>
                        <Button
                          size="sm"
                          variant={optIn ? "default" : "outline"}
                          className={`text-[10px] h-7 px-3.5 font-bold ${
                            optIn 
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                              : 'hover:border-emerald-400'
                          }`}
                          onClick={() => toggleGreenLane(lane.ref)}
                        >
                          {optIn ? "Opted In" : "Activate"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Eco-Certification Badges */}
          <Card className="border border-emerald-100 dark:border-emerald-950/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
            <CardContent className="p-4 space-y-3.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <strong className="text-xs font-bold text-foreground block">Verified Carbon Neutrality Seal</strong>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Your enterprise offsets meet the global **VCS (Verified Carbon Standard)** and **Gold Standard** compliance criteria. Display this badge on commercial bills of lading to prove eco-transparency.
              </p>
              <div className="p-3.5 border rounded-xl bg-background flex items-center gap-3 justify-between">
                <div>
                  <h6 className="font-bold text-xs text-foreground">Gold Standard Compliance Certificate</h6>
                  <span className="text-[9.5px] text-muted-foreground font-mono">ID: GS-CO2-998240-2026</span>
                </div>
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[9px] font-bold uppercase shrink-0">
                  VCS Approved
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
