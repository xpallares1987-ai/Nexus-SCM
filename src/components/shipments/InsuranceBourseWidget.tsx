import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { Button } from '@/components/ui/forms/button';
import { Badge } from '@/components/ui/data-display/badge';
import { Input } from '@/components/ui/forms/input';
import { useAuth } from '../../contexts/AuthContext';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import { 
  ShieldCheck, 
  DollarSign, 
  Globe, 
  Cpu, 
  Clock, 
  Download, 
  Layers, 
  HelpCircle, 
  FileCheck, 
  ExternalLink,
  ShieldAlert,
  Loader2,
  Lock,
  Stamp,
  Award,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface UnderwriterQuote {
  quoteId: string;
  underwriter: 'Lloyds of London' | 'Munich Re' | 'Chubb Marine' | 'Allianz Cargo';
  premium: number;
  deductible: number;
  rating: string;
  coverageType: string;
  terms: string;
  isRecommended?: boolean;
}

export function InsuranceBourseWidget() {
  const { token, user } = useAuth();
  
  // Inputs
  const [cargoValue, setCargoValue] = useState<string>('150000');
  const [cargoType, setCargoType] = useState<string>('Electronics / Semiconductors');
  const [originPort, setOriginPort] = useState<string>('Shanghai (CNSHA)');
  const [destinationPort, setDestinationPort] = useState<string>('Rotterdam (NLRTM)');
  const [transitMode, setTransitMode] = useState<string>('Ocean FCL');
  
  // State
  const [loading, setLoading] = useState(false);
  const [quotes, setQuotes] = useState<UnderwriterQuote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<UnderwriterQuote | null>(null);
  
  // Bind state
  const [binding, setBinding] = useState(false);
  const [boundPolicy, setBoundPolicy] = useState<{
    policyNumber: string;
    underwriter: string;
    premium: number;
    cargoValue: number;
    coverageType: string;
    cryptographicHash: string;
    issueDate: string;
    expiryDate: string;
    certificateBase64?: string;
  } | null>(null);

  const fetchInsuranceQuotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cargoValue || Number(cargoValue) <= 0) {
      toast.error('Please enter a valid Cargo Value');
      return;
    }

    setLoading(true);
    setQuotes([]);
    setSelectedQuote(null);
    setBoundPolicy(null);

    try {
      const response = await fetchApi('/api/insurance/quote', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cargoValue: Number(cargoValue),
          cargoType,
          origin: originPort,
          destination: destinationPort,
          transitMode
        })
      });

      if (response && Array.isArray(response.quotes)) {
        setQuotes(response.quotes);
        toast.success(`Underwriter rating engines completed. Found ${response.quotes.length} competitive spot quotes!`);
      } else {
        toast.error('Failed to parse underwriter quotes.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error pulling live cargo insurance quotes.');
    } finally {
      setLoading(false);
    }
  };

  const bindPolicy = async (quote: UnderwriterQuote) => {
    setSelectedQuote(quote);
    setBinding(true);

    try {
      const response = await fetchApi('/api/insurance/bind', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: quote.quoteId,
          cargoValue: Number(cargoValue),
          cargoType,
          origin: originPort,
          destination: destinationPort,
          underwriter: quote.underwriter,
          premium: quote.premium,
          coverageType: quote.coverageType
        })
      });

      if (response && response.success && response.policy) {
        setBoundPolicy(response.policy);
        toast.success(`Spot Cargo Insurance policy bound! Certificate generated: ${response.policy.policyNumber}`);
      } else {
        toast.error('Binding failed.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to bind insurance.');
    } finally {
      setBinding(false);
    }
  };

  return (
    <div id="insurance-bourse-root" className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-500" />
            Spot Cargo Insurance Bourse
          </h3>
          <p className="text-muted-foreground text-xs">
            Dynamic cargo risk analysis, instant premium generation from tier-1 marine underwriters, and immediate binding of transportation policy certificates.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* INPUT FORM PANEL */}
        <Card className="lg:col-span-1 border-border shadow-sm h-fit">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-semibold text-foreground">Risk Profiling & Transit Parameters</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={fetchInsuranceQuotes} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Declared Cargo Valuation ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">$</span>
                  <Input 
                    type="number"
                    value={cargoValue}
                    onChange={(e) => setCargoValue(e.target.value)}
                    className="pl-7 h-9 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Commodity Classification</label>
                <select
                  value={cargoType}
                  onChange={(e) => setCargoType(e.target.value)}
                  className="w-full h-9 border border-input rounded-lg text-xs px-2.5 bg-background font-semibold"
                >
                  <option value="Electronics / Semiconductors">Electronics & Semiconductors (High Theft Risk)</option>
                  <option value="Apparel & High-End Designer Textiles">Apparel & Textiles</option>
                  <option value="General Industrial Machinery">General Machinery</option>
                  <option value="Perishable Organic Produce">Perishables / Cold Chain</option>
                  <option value="Hazardous Chemicals / Class 9 Goods">Dangerous/Hazardous Goods</option>
                  <option value="General Commodities & Household">General Commodities</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Origin Port</label>
                  <Input 
                    value={originPort}
                    onChange={(e) => setOriginPort(e.target.value)}
                    className="h-9 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Destination Port</label>
                  <Input 
                    value={destinationPort}
                    onChange={(e) => setDestinationPort(e.target.value)}
                    className="h-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Transit Mode</label>
                <select
                  value={transitMode}
                  onChange={(e) => setTransitMode(e.target.value)}
                  className="w-full h-9 border border-input rounded-lg text-xs px-2.5 bg-background font-semibold"
                >
                  <option value="Ocean FCL">Ocean FCL Container</option>
                  <option value="Ocean LCL">Ocean LCL Consolidation</option>
                  <option value="Expedited Airway">Air Cargo Freight</option>
                  <option value="Intermodal Road/Rail">Intermodal Road/Rail</option>
                </select>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-9 shadow-sm"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting Underwriter Rating Engines...
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4 mr-2" />
                    Query Live Underwriter Rates
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* SPOT QUOTES RESULT PANEL */}
        <div className="lg:col-span-2 space-y-6">
          {boundPolicy ? (
            /* ACTIVE BOUND POLICY CERTIFICATE */
            <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-500/5 shadow-lg overflow-hidden animate-in zoom-in duration-200">
              <div className="p-5 bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/40 flex justify-between items-center">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="w-6 h-6 animate-pulse" />
                  <span className="font-extrabold text-sm tracking-wider uppercase">POLICIES BOUND & COMPLIANT</span>
                </div>
                <Badge className="bg-emerald-600 text-white font-mono text-[10px] uppercase font-black">
                  ACTIVE
                </Badge>
              </div>

              <CardContent className="p-6 space-y-6">
                
                {/* Certificate layout */}
                <div className="border border-emerald-200 dark:border-emerald-800/40 bg-card p-6 rounded-xl space-y-5 shadow-sm relative overflow-hidden">
                  
                  {/* Watermark/Stamp */}
                  <div className="absolute right-6 top-6 opacity-10 dark:opacity-20 text-emerald-600">
                    <Stamp className="w-24 h-24 rotate-12" />
                  </div>

                  <div className="flex justify-between items-start border-b pb-4">
                    <div>
                      <h4 className="font-extrabold text-indigo-900 dark:text-indigo-400 uppercase text-xs tracking-wider">Spot Marine Cargo Insurance</h4>
                      <h5 className="font-black text-xl text-foreground mt-1">{boundPolicy.underwriter}</h5>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Global Marine underwriters Syndicate</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase block">Policy Certificate No.</span>
                      <strong className="text-sm font-mono font-black text-foreground">{boundPolicy.policyNumber}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase font-bold">Cargo valuation</span>
                      <strong className="text-foreground text-sm font-bold">${boundPolicy.cargoValue.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase font-bold">Premium bound</span>
                      <strong className="text-emerald-600 text-sm font-extrabold">${boundPolicy.premium.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase font-bold">Coverage type</span>
                      <strong className="text-foreground text-sm font-bold">{boundPolicy.coverageType}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase font-bold">Deductible</span>
                      <strong className="text-foreground text-sm font-bold">$500 (Flat)</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-900/30 rounded-lg border">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Insured Voyage</span>
                      <div className="font-medium mt-1 flex items-center gap-1.5 text-xs">
                        <span>{originPort}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{destinationPort}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">Transit Class: {transitMode} ({cargoType})</p>
                    </div>
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-900/30 rounded-lg border">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Policy Dates</span>
                      <p className="font-semibold mt-1">Bound: {boundPolicy.issueDate}</p>
                      <p className="text-[10px] text-muted-foreground">Expires: {boundPolicy.expiryDate} (or arrival at warehouse)</p>
                    </div>
                  </div>

                  <div className="bg-zinc-100 dark:bg-zinc-900/60 p-3 rounded-lg flex items-center justify-between gap-4 border">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Underwriter Cryptographic Signature</span>
                        <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 block break-all max-w-[280px] sm:max-w-md lg:max-w-lg truncate" title={boundPolicy.cryptographicHash}>
                          {boundPolicy.cryptographicHash}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="font-mono text-[9px] font-black border-emerald-200 text-emerald-600 shrink-0 bg-emerald-500/5">
                      SEALED
                    </Badge>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(boundPolicy, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `Marine_Insurance_Certificate_${boundPolicy.policyNumber}.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      toast.success('Insurance certificate descriptor downloaded!');
                    }}
                    className="text-xs h-8.5"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> Download Certificate
                  </Button>
                  <Button 
                    onClick={() => setBoundPolicy(null)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-8.5"
                  >
                    Quote Another Shipment
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : quotes.length > 0 ? (
            /* LIST OF QUOTES FOUND */
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-foreground">Competitive Underwriter Spot Bids</h4>
                <span className="text-xs font-mono text-muted-foreground">Rating Engine complete</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quotes.map((q) => (
                  <Card key={q.quoteId} className={`border-border shadow-sm relative overflow-hidden flex flex-col justify-between ${
                    q.isRecommended ? 'ring-2 ring-indigo-500 bg-indigo-50/5 dark:bg-indigo-950/5' : ''
                  }`}>
                    {q.isRecommended && (
                      <div className="absolute top-0 right-0 bg-indigo-600 text-white font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-bl-lg tracking-wider flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> Best Value
                      </div>
                    )}

                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base font-bold text-foreground">{q.underwriter}</CardTitle>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase font-mono tracking-wider block mt-0.5">Rating: {q.rating}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-muted-foreground uppercase font-black block">Premium Cost</span>
                          <strong className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400">${q.premium}</strong>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-2 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Coverage Scope:</span>
                          <span className="font-semibold text-foreground">{q.coverageType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Deductible Limit:</span>
                          <span className="font-semibold text-foreground font-mono">${q.deductible}</span>
                        </div>
                        <div className="border-t pt-2 mt-2">
                          <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                            "{q.terms}"
                          </p>
                        </div>
                      </div>

                      <div className="border-t pt-3 mt-4">
                        <Button 
                          className="w-full bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-background dark:text-foreground text-xs font-bold h-8.5 gap-1.5"
                          onClick={() => bindPolicy(q)}
                          disabled={binding}
                        >
                          {binding && selectedQuote?.quoteId === q.quoteId ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Binding Policy...
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              Bind Instant Policy
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            /* INITIAL BLANK / EMPTY BOARD */
            <div className="py-20 border-2 border-dashed border-border rounded-xl text-center text-muted-foreground flex flex-col items-center justify-center p-6 gap-3 min-h-[350px]">
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 text-indigo-500 rounded-full">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-foreground text-sm">Underwriter Bourse Offline</h4>
                <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                  Provide your declared cargo valuation, transit route (origin and destination ports), and commodities class, then run the underwriter rating engines.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
