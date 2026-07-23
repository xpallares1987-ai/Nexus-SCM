import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/data-display/card';
import { Button } from '@/components/ui/forms/button';
import { Input } from '@/components/ui/forms/input';
import { Label } from '@/components/ui/forms/label';
import { Badge } from '@/components/ui/data-display/badge';
import { 
  Users, 
  Scale, 
  DollarSign, 
  Percent, 
  FileCheck, 
  Plus, 
  Trash2, 
  ArrowRight,
  CheckCircle,
  TrendingUp,
  Coins,
  ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';

interface SplitParty {
  role: 'Consignor' | 'Consignee' | 'Broker' | '3PL Partner';
  name: string;
  share: number; // percentage (0-100)
}

interface SplitLineItem {
  name: string;
  cost: number;
  allocations: Record<string, number>; // partyIndex: percentage
}

interface SplitBillingPool {
  id: string;
  shipmentRef: string;
  totalCost: number;
  parties: SplitParty[];
  items: { name: string; cost: number }[];
  status: 'Pending Approval' | 'Fully Bonded' | 'Partially Paid';
}

const INITIAL_POOLS: SplitBillingPool[] = [
  {
    id: "POOL-SPLIT-001",
    shipmentRef: "SHP-2026-992",
    totalCost: 4500.00,
    parties: [
      { role: 'Consignor', name: 'Global Tech Corp (Shipper)', share: 60 },
      { role: 'Consignee', name: 'Pacific Retailers Ltd (Receiver)', share: 40 }
    ],
    items: [
      { name: "Ocean Freight", cost: 3200.00 },
      { name: "Local Drayage", cost: 800.00 },
      { name: "Spot Insurance", cost: 500.00 }
    ],
    status: 'Partially Paid'
  },
  {
    id: "POOL-SPLIT-002",
    shipmentRef: "SHP-2026-995",
    totalCost: 7200.00,
    parties: [
      { role: 'Consignor', name: 'EuroParts GmbH', share: 50 },
      { role: 'Consignee', name: 'Americas Assembly LLC', share: 50 }
    ],
    items: [
      { name: "Ocean Freight", cost: 5500.00 },
      { name: "Customs Duty", cost: 1200.00 },
      { name: "Local Drayage", cost: 500.00 }
    ],
    status: 'Pending Approval'
  }
];

export function SplitPaymentWidget() {
  const [pools, setPools] = useState<SplitBillingPool[]>(INITIAL_POOLS);
  const [shipmentRef, setShipmentRef] = useState("SHP-2026-994");
  
  // Dynamic line items cost
  const [oceanFreight, setOceanFreight] = useState(3500);
  const [localDrayage, setLocalDrayage] = useState(850);
  const [spotInsurance, setSpotInsurance] = useState(450);
  const [customsDuty, setCustomsDuty] = useState(600);

  // Split Parties State
  const [parties, setParties] = useState<SplitParty[]>([
    { role: 'Consignor', name: 'Apex Shipping Inc', share: 50 },
    { role: 'Consignee', name: 'Intercon Logistical', share: 50 }
  ]);

  const totalCost = oceanFreight + localDrayage + spotInsurance + customsDuty;
  const totalShares = parties.reduce((acc, p) => acc + p.share, 0);

  const handleUpdateShare = (index: number, val: number) => {
    const updated = [...parties];
    updated[index].share = Math.max(0, Math.min(100, val));
    setParties(updated);
  };

  const handleUpdatePartyName = (index: number, name: string) => {
    const updated = [...parties];
    updated[index].name = name;
    setParties(updated);
  };

  const handleUpdatePartyRole = (index: number, role: SplitParty['role']) => {
    const updated = [...parties];
    updated[index].role = role;
    setParties(updated);
  };

  const handleAddParty = () => {
    if (parties.length >= 4) {
      toast.error("Maximum 4 split parties allowed.");
      return;
    }
    const unusedShare = Math.max(0, 100 - totalShares);
    setParties([...parties, { role: 'Broker', name: 'New Split Partner', share: unusedShare }]);
  };

  const handleRemoveParty = (index: number) => {
    if (parties.length <= 2) {
      toast.error("Minimum 2 split parties required for cost-sharing.");
      return;
    }
    setParties(parties.filter((_, idx) => idx !== index));
  };

  const handleDistributeEvenly = () => {
    const share = Math.floor(100 / parties.length);
    const updated = parties.map((p, idx) => ({
      ...p,
      share: idx === parties.length - 1 ? 100 - (share * (parties.length - 1)) : share
    }));
    setParties(updated);
    toast.success("Distributed shares evenly across all split entities!");
  };

  const handleCreateSplitGateway = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalShares !== 100) {
      toast.error(`Total split allocation must equal exactly 100%. Currently it is ${totalShares}%.`);
      return;
    }

    const newPool: SplitBillingPool = {
      id: `POOL-SPLIT-00${pools.length + 1}`,
      shipmentRef: shipmentRef || "General Cargo",
      totalCost: totalCost,
      parties: [...parties],
      items: [
        { name: "Ocean Freight", cost: oceanFreight },
        { name: "Local Drayage", cost: localDrayage },
        { name: "Spot Insurance", cost: spotInsurance },
        { name: "Customs Duty", cost: customsDuty }
      ],
      status: 'Pending Approval'
    };

    setPools([newPool, ...pools]);
    toast.success(`Dynamic Split Invoices successfully generated for ${shipmentRef}!`);
    // Simulated print of billing splits
    console.log("Invoices generated:", parties.map(p => ({
      invoiceNumber: `INV-${shipmentRef}-${p.role.substring(0,3).toUpperCase()}`,
      party: p.name,
      amount: (totalCost * (p.share / 100)).toFixed(2)
    })));
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-5">
        {/* Cost Configuration & Split Editor */}
        <div className="md:col-span-3 space-y-6">
          <Card className="border border-zinc-200 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Scale className="w-5 h-5 text-indigo-500" />
                Configure Cost-Share split-Invoices
              </CardTitle>
              <CardDescription>
                Allocate ocean transport, local drayage, and custom tariffs directly between the sender, receiver, and customs brokers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateSplitGateway} className="space-y-6">
                
                {/* Cost Breakdown Inputs */}
                <div className="bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/60 space-y-3">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Cargo Cost & Tariff Breakdown</span>
                  
                  <div className="grid gap-4 sm:grid-cols-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Ocean Freight ($)</Label>
                      <Input type="number" value={oceanFreight} onChange={e => setOceanFreight(parseInt(e.target.value) || 0)} className="h-9 font-mono" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Local Drayage ($)</Label>
                      <Input type="number" value={localDrayage} onChange={e => setLocalDrayage(parseInt(e.target.value) || 0)} className="h-9 font-mono" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Spot Insurance ($)</Label>
                      <Input type="number" value={spotInsurance} onChange={e => setSpotInsurance(parseInt(e.target.value) || 0)} className="h-9 font-mono" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Customs Duty ($)</Label>
                      <Input type="number" value={customsDuty} onChange={e => setCustomsDuty(parseInt(e.target.value) || 0)} className="h-9 font-mono" />
                    </div>
                  </div>

                  <div className="pt-3 border-t flex justify-between items-center px-1">
                    <span className="text-xs text-muted-foreground">Total Billable Amount:</span>
                    <strong className="text-base font-mono text-indigo-600 dark:text-indigo-400 font-extrabold">${totalCost.toLocaleString()}.00</strong>
                  </div>
                </div>

                {/* Split Parties Configuration */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Split Billing Beneficiaries</span>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={handleDistributeEvenly} className="text-[10.5px] h-7 px-2.5">
                        <Users className="w-3.5 h-3.5 mr-1" /> Even Split
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={handleAddParty} className="text-[10.5px] h-7 px-2.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/20">
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Party
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {parties.map((party, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row items-center gap-3 p-3.5 border rounded-xl bg-card hover:shadow-sm transition-all">
                        <div className="w-full sm:w-1/4">
                          <Label className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Contractor Role</Label>
                          <select 
                            value={party.role}
                            onChange={(e) => handleUpdatePartyRole(idx, e.target.value as SplitParty['role'])}
                            className="w-full border rounded-lg p-1.5 bg-background text-foreground text-xs outline-none focus:border-indigo-500"
                          >
                            <option value="Consignor">Consignor (Shipper)</option>
                            <option value="Consignee">Consignee (Receiver)</option>
                            <option value="Broker">Broker (Clearance)</option>
                            <option value="3PL Partner">3PL Partner</option>
                          </select>
                        </div>

                        <div className="w-full sm:flex-1">
                          <Label className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Legal Entity / Company Name</Label>
                          <Input 
                            value={party.name} 
                            onChange={(e) => handleUpdatePartyName(idx, e.target.value)}
                            className="h-8.5 text-xs font-semibold"
                            placeholder="e.g. Apex Industrial Co."
                          />
                        </div>

                        <div className="w-24 shrink-0">
                          <Label className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Cost Share</Label>
                          <div className="relative">
                            <Input 
                              type="number" 
                              value={party.share} 
                              onChange={(e) => handleUpdateShare(idx, parseInt(e.target.value) || 0)}
                              className="h-8.5 pr-7 font-mono text-xs text-right"
                            />
                            <Percent className="w-3.5 h-3.5 absolute right-2 top-2.5 text-muted-foreground" />
                          </div>
                        </div>

                        <div className="pt-4 shrink-0">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleRemoveParty(idx)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stacked Share visualization */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground">
                    <span>Invoicing Allocation Spectrum</span>
                    <span className={totalShares === 100 ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
                      {totalShares}% / 100% Shared
                    </span>
                  </div>
                  <div className="w-full h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full flex overflow-hidden">
                    {parties.map((p, idx) => {
                      const colors = [
                        'bg-indigo-500',
                        'bg-emerald-500',
                        'bg-amber-500',
                        'bg-blue-500'
                      ];
                      const width = `${p.share}%`;
                      if (p.share <= 0) return null;
                      return (
                        <div 
                          key={idx} 
                          className={`${colors[idx % colors.length]} h-full first:rounded-l-full last:rounded-r-full transition-all`}
                          style={{ width }}
                          title={`${p.role}: ${p.share}%`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-4 pt-1.5">
                    {parties.map((p, idx) => {
                      const dotColors = [
                        'bg-indigo-500',
                        'bg-emerald-500',
                        'bg-amber-500',
                        'bg-blue-500'
                      ];
                      return (
                        <div key={idx} className="flex items-center gap-1.5 text-xs">
                          <span className={`w-2.5 h-2.5 rounded-full ${dotColors[idx % dotColors.length]}`}></span>
                          <span className="text-muted-foreground">{p.role}:</span>
                          <strong className="text-foreground">{p.share}%</strong>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Action */}
                <Button 
                  type="submit" 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                  disabled={totalShares !== 100}
                >
                  Confirm dynamic cost-share & Generate individual invoices
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Live Split Pools */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border border-zinc-200 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-500" />
                Active shared billing contracts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pools.map((pool) => (
                <div key={pool.id} className="p-4 border rounded-2xl bg-card hover:shadow-sm transition-all space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-mono text-foreground font-bold">{pool.id}</strong>
                        <Badge variant="outline" className="text-[9px] uppercase font-bold">
                          {pool.shipmentRef}
                        </Badge>
                      </div>
                      <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-extrabold block">
                        Total Pool: ${pool.totalCost.toFixed(2)}
                      </span>
                    </div>

                    <Badge className={
                      pool.status === 'Fully Bonded' ? 'bg-emerald-100 text-emerald-700 font-bold text-[9px]' :
                      pool.status === 'Partially Paid' ? 'bg-amber-100 text-amber-700 font-bold text-[9px]' :
                      'bg-blue-100 text-blue-700 font-bold text-[9px]'
                    }>
                      {pool.status}
                    </Badge>
                  </div>

                  {/* Splits info */}
                  <div className="pt-2 border-t space-y-2.5">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase block">Allocated splits</span>
                    
                    <div className="space-y-1.5">
                      {pool.parties.map((p, idx) => {
                        const amount = pool.totalCost * (p.share / 100);
                        return (
                          <div key={idx} className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="truncate max-w-[150px]">{p.name} ({p.role})</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-foreground">{p.share}%</span>
                              <ArrowRight className="w-3 h-3 text-zinc-400" />
                              <strong className="font-mono text-foreground font-bold">${amount.toFixed(2)}</strong>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions inside split */}
                  <div className="pt-3 border-t flex justify-end gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-[10px] h-7 px-2.5 hover:border-indigo-400"
                      onClick={() => {
                        toast.success(`Sent formal split billing agreement to other beneficiaries.`);
                      }}
                    >
                      Resend Invites
                    </Button>
                    <Button 
                      size="sm" 
                      className="text-[10px] h-7 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                      onClick={() => {
                        toast.success(`Successfully recorded invoice payments for the split pool ${pool.id}`);
                      }}
                    >
                      Settle Share
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Secure Split Clearing Info */}
          <Card className="border border-indigo-100 dark:border-indigo-950/30 bg-gradient-to-br from-indigo-500/5 to-transparent">
            <CardContent className="p-4 space-y-3 flex flex-col justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-indigo-500 animate-pulse" />
                <strong className="text-xs font-bold text-foreground block">Dynamic multi-party invoice custody</strong>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Cost allocation changes can be performed pre-berthing. Once the Master Bill of Lading is registered, the split shares are locked and automatically posted to both entities' AR/AP ledgers with automatic currency conversions.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
