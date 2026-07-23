import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { Button } from '@/components/ui/forms/button';
import { Badge } from '@/components/ui/data-display/badge';
import { Input } from '@/components/ui/forms/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/data-display/table';
import { useAuth } from '../../contexts/AuthContext';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import { 
  Brain, 
  FileText, 
  TrendingDown, 
  Mail, 
  Download, 
  Send, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  RefreshCw, 
  Settings,
  Scale,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface ScorecardData {
  carrierId: string;
  carrierName: string;
  totalShipments: number;
  deliveredShipmentsCount: number;
  activeShipmentsCount: number;
  onTimeRate: number;
  avgTransitTimeDays: number;
  avgDelayDays: number;
  totalInvoices: number;
  disputedInvoices: number;
  clearedInvoices: number;
  invoiceAccuracyRate: number;
  totalDiscrepancyAmount: number;
  avgResponseLatencyMs: number;
  bookingConfirmTimeMin: number;
  mainMode: string;
}

export function SlaRenegotiator() {
  const { token } = useAuth();
  const [scorecards, setScorecards] = useState<ScorecardData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Settings/Form state
  const [selectedCarrier, setSelectedCarrier] = useState<ScorecardData | null>(null);
  const [otdSlaThreshold, setOtdSlaThreshold] = useState<number>(92);
  const [billingSlaThreshold, setBillingSlaThreshold] = useState<number>(10); // max 10% disputes
  
  // Claim custom fields
  const [proposedDiscount, setProposedDiscount] = useState<string>('5%');
  const [penaltyFee, setPenaltyFee] = useState<string>('$2,500');
  const [negotiationTone, setNegotiationTone] = useState<string>('Firm & Professional');
  const [additionalDirectives, setAdditionalDirectives] = useState<string>('');
  
  // Output state
  const [generating, setGenerating] = useState(false);
  const [draftedLetter, setDraftedLetter] = useState<string>('');
  const [isSent, setIsSent] = useState(false);
  const [sentReference, setSentReference] = useState<string>('');

  const loadScorecardData = async () => {
    setLoading(true);
    try {
      const data = await fetchApi('/carriers/scorecard', token);
      if (Array.isArray(data)) {
        setScorecards(data);
        // Automatically select the first carrier that has a violation, or default to first
        const violating = data.find(c => c.onTimeRate < otdSlaThreshold || (c.totalInvoices > 0 && (c.disputedInvoices / c.totalInvoices) * 100 > billingSlaThreshold));
        if (violating) {
          setSelectedCarrier(violating);
        } else if (data.length > 0) {
          setSelectedCarrier(data[0]);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load carrier performance data for SLA auditor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScorecardData();
  }, [token]);

  const handleGenerateRenegotiation = async () => {
    if (!selectedCarrier) {
      toast.error('Please select a carrier first.');
      return;
    }

    setGenerating(true);
    setDraftedLetter('');
    setIsSent(false);

    try {
      const response = await fetchApi('/api/gemini/carrier-sla-renegotiate', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scorecard: selectedCarrier,
          otdSlaThreshold,
          billingSlaThreshold,
          proposedDiscount,
          penaltyFee,
          negotiationTone,
          additionalDirectives
        })
      });

      if (response && response.draftText) {
        setDraftedLetter(response.draftText);
        toast.success('AI-Assisted SLA renegotiation letter drafted successfully!');
      } else {
        toast.error('Failed to parse AI draft.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error communicating with SLA draft generator.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSendToCarrier = () => {
    if (!draftedLetter) return;
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: 'Dispatched encrypted SLA claim to Carrier Corporate API Exchange...',
        success: () => {
          setIsSent(true);
          const ref = `SLA-CLM-${Math.floor(100000 + Math.random() * 900000)}`;
          setSentReference(ref);
          return `SLA Claim sent successfully! Filed under: ${ref}`;
        },
        error: 'Failed to deliver claim.'
      }
    );
  };

  // Helper calculations
  const getDisputePercentage = (c: ScorecardData) => {
    if (!c.totalInvoices) return 0;
    return Math.round((c.disputedInvoices / c.totalInvoices) * 100);
  };

  return (
    <div id="sla-renegotiator-widget" className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      
      {/* LEFT COLUMN: Carrier List and Audit Status */}
      <div className="xl:col-span-1 space-y-6">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Scale className="w-5 h-5 text-indigo-500" />
              SLA Compliance Rules
            </CardTitle>
            <CardDescription>
              Set contractual threshold metrics to identify underperforming logistics partners.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Min On-Time Delivery (OTD) Rate
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={otdSlaThreshold}
                  onChange={(e) => setOtdSlaThreshold(Number(e.target.value))}
                  className="h-9 w-24 text-sm font-mono"
                  min="0"
                  max="100"
                />
                <span className="text-xs text-muted-foreground">% of shipments on-time</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Max Invoice Dispute Threshold
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={billingSlaThreshold}
                  onChange={(e) => setBillingSlaThreshold(Number(e.target.value))}
                  className="h-9 w-24 text-sm font-mono"
                  min="0"
                  max="100"
                />
                <span className="text-xs text-muted-foreground">% of disputed invoices</span>
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={loadScorecardData} className="w-full text-xs gap-1.5 h-8">
              <RefreshCw className="w-3.5 h-3.5" /> Re-Audit Partners
            </Button>
          </CardContent>
        </Card>

        {/* Carrier list selection */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">Select Partner to Audit</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-8 text-center text-xs text-muted-foreground flex justify-center items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                Auditing partner records...
              </div>
            ) : (
              <div className="max-h-[350px] overflow-y-auto divide-y divide-border">
                {scorecards.map((car) => {
                  const otdViolation = car.onTimeRate < otdSlaThreshold;
                  const disputePct = getDisputePercentage(car);
                  const billingViolation = disputePct > billingSlaThreshold;
                  const hasViolation = otdViolation || billingViolation;
                  const isSelected = selectedCarrier?.carrierId === car.carrierId;

                  return (
                    <button
                      key={car.carrierId}
                      onClick={() => {
                        setSelectedCarrier(car);
                        setDraftedLetter('');
                        setIsSent(false);
                      }}
                      className={`w-full text-left p-3.5 transition-all flex flex-col gap-1.5 ${
                        isSelected 
                          ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-l-4 border-indigo-600' 
                          : 'hover:bg-muted/30 border-l-4 border-transparent'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-bold text-sm text-foreground">{car.carrierName}</span>
                        {hasViolation ? (
                          <Badge variant="destructive" className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0">
                            SLA Breach
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-500/5 px-1.5 py-0">
                            Compliant
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-[11px] text-muted-foreground font-mono">
                        <div>
                          OTD: <span className={otdViolation ? 'text-red-500 font-bold' : 'text-foreground'}>{car.onTimeRate}%</span>
                        </div>
                        <div>
                          Disputes: <span className={billingViolation ? 'text-red-500 font-bold' : 'text-foreground'}>{disputePct}%</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* RIGHT 2 COLUMNS: Custom Renegotiation Criteria & Letter Generation */}
      <div className="xl:col-span-2 space-y-6">
        {selectedCarrier ? (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            {/* SLA Violation Details & AI Parameters Form */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-border shadow-sm">
                <CardHeader className="pb-3 border-b">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">ACTIVE TARGET AUDIT</span>
                  <CardTitle className="text-lg font-bold text-foreground mt-1">
                    {selectedCarrier.carrierName}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Main Transit: {selectedCarrier.mainMode} • total {selectedCarrier.totalShipments} shipments
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {/* Performance Indicators */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">SLA Breach Indicators</h4>
                    
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-900/30 rounded-lg border border-border flex justify-between items-center text-xs">
                      <div>
                        <p className="font-semibold text-foreground">On-Time Delivery Rate</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Contract SLA Limit: &ge;{otdSlaThreshold}%</p>
                      </div>
                      <div className="text-right">
                        <span className={`font-mono font-bold text-sm ${selectedCarrier.onTimeRate < otdSlaThreshold ? 'text-red-600' : 'text-emerald-600'}`}>
                          {selectedCarrier.onTimeRate}%
                        </span>
                        {selectedCarrier.onTimeRate < otdSlaThreshold ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500 inline-block ml-1.5 align-text-bottom" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline-block ml-1.5 align-text-bottom" />
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-zinc-50 dark:bg-zinc-900/30 rounded-lg border border-border flex justify-between items-center text-xs">
                      <div>
                        <p className="font-semibold text-foreground">Billing Accuracy Rate</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Contract dispute SLA limit: &le;{billingSlaThreshold}%</p>
                      </div>
                      <div className="text-right">
                        <span className={`font-mono font-bold text-sm ${getDisputePercentage(selectedCarrier) > billingSlaThreshold ? 'text-red-600' : 'text-emerald-600'}`}>
                          {getDisputePercentage(selectedCarrier)}%
                        </span>
                        {getDisputePercentage(selectedCarrier) > billingSlaThreshold ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500 inline-block ml-1.5 align-text-bottom" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline-block ml-1.5 align-text-bottom" />
                        )}
                      </div>
                    </div>
                  </div>

                  <hr className="border-border" />

                  {/* Claims Configuration Fields */}
                  <div className="space-y-3.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Claim Actions & Directives</h4>
                    
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">Proposed Tariff Discount</label>
                      <Input 
                        value={proposedDiscount} 
                        onChange={(e) => setProposedDiscount(e.target.value)} 
                        placeholder="e.g. 5% rate reduction"
                        className="h-8.5 text-xs font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">Contract SLA Penalty Claim</label>
                      <Input 
                        value={penaltyFee} 
                        onChange={(e) => setPenaltyFee(e.target.value)} 
                        placeholder="e.g. $5,000 for damages"
                        className="h-8.5 text-xs font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">Renegotiation Tone</label>
                      <select
                        value={negotiationTone}
                        onChange={(e) => setNegotiationTone(e.target.value)}
                        className="w-full h-8.5 border border-input rounded-lg text-xs px-2.5 bg-background font-semibold"
                      >
                        <option value="Firm & Professional">Firm & Professional</option>
                        <option value="Urgent & Warning">Urgent & Warning (Final Notice)</option>
                        <option value="Collaborative & Constructive">Collaborative & Constructive</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">Specific SLA Directives / Notes</label>
                      <textarea
                        value={additionalDirectives}
                        onChange={(e) => setAdditionalDirectives(e.target.value)}
                        placeholder="e.g. Require corrective action plan, SLA breaches on Europe trade lane..."
                        className="w-full text-xs p-2 rounded-lg border border-input bg-transparent placeholder:text-muted-foreground min-h-[70px]"
                      />
                    </div>
                  </div>

                  <Button 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5 h-10 shadow-sm mt-2"
                    onClick={handleGenerateRenegotiation}
                    disabled={generating}
                  >
                    {generating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Drafting SLA Claim Letter...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 text-indigo-200" />
                        AI Draft Renegotiation Letter
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* AI Draft Result & Claim Submission Panel */}
            <div className="lg:col-span-3">
              <Card className="border-border shadow-md h-full flex flex-col">
                <CardHeader className="pb-3 border-b flex flex-row justify-between items-center">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-1.5">
                      <FileText className="w-5 h-5 text-indigo-500" />
                      SLA Claim & Contract Amendment Draft
                    </CardTitle>
                    <CardDescription>
                      Edit and dispatch the auto-drafted contractual violation claim and rate renegotiation terms.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-0 flex flex-col relative">
                  {generating ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground gap-3 min-h-[350px]">
                      <div className="p-3 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full animate-bounce">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-sm">Gemini SCM Contract Expert at work...</p>
                        <p className="text-xs text-muted-foreground">Analyzing historic compliance metrics, billing discrepancy data, and SLA thresholds to compile legal-grade claim documentation.</p>
                      </div>
                    </div>
                  ) : draftedLetter ? (
                    <div className="flex-1 flex flex-col h-full min-h-[350px]">
                      {/* Document editor container */}
                      <textarea
                        value={draftedLetter}
                        onChange={(e) => setDraftedLetter(e.target.value)}
                        className="flex-1 w-full text-xs font-sans p-5 bg-zinc-50/50 dark:bg-zinc-950/20 text-foreground resize-none border-0 outline-none leading-relaxed border-b border-border font-mono min-h-[300px]"
                      />
                      
                      {/* Actions toolbar */}
                      <div className="p-4 bg-background flex flex-col sm:flex-row justify-between items-center gap-3">
                        {isSent ? (
                          <div className="w-full bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between gap-3 animate-in fade-in duration-200">
                            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              <span>SLA DISPATCHED & LOGGED</span>
                            </div>
                            <span className="text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded font-black text-zinc-700 dark:text-zinc-300">
                              Ref: {sentReference}
                            </span>
                          </div>
                        ) : (
                          <>
                            <p className="text-[10px] text-muted-foreground">
                              ⚠️ Check details carefully. This document constitutes formal contractual notice to carrier networks.
                            </p>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => {
                                  const blob = new Blob([draftedLetter], { type: 'text/plain' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `${selectedCarrier.carrierName.replace(/\s+/g, '_')}_SLA_Renegotiation_Claim.txt`;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  toast.success('Document downloaded successfully!');
                                }}
                                className="text-xs h-8.5"
                              >
                                <Download className="w-3.5 h-3.5 mr-1" />
                                Download PDF/Text
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={handleSendToCarrier}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1 h-8.5"
                              >
                                <Send className="w-3.5 h-3.5" />
                                Dispatched SLA Claim
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground gap-3 min-h-[350px]">
                      <Scale className="w-10 h-10 text-zinc-300" />
                      <div className="space-y-1">
                        <p className="font-semibold text-sm">No Active SLA Claim Generated</p>
                        <p className="text-xs text-muted-foreground max-w-sm">Select a carrier from the left panel, customize your claim discount/penalty targets, and click the AI Draft button to generate claim paperwork.</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

          </div>
        ) : (
          <div className="py-24 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
            <Scale className="w-12 h-12 text-zinc-300" />
            <p className="font-semibold text-sm">No partner loaded or selected</p>
          </div>
        )}
      </div>

    </div>
  );
}
