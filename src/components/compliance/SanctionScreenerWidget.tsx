import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { Button } from '@/components/ui/forms/button';
import { Input } from '@/components/ui/forms/input';
import { Label } from '@/components/ui/forms/label';
import { Badge } from '@/components/ui/data-display/badge';
import { fetchApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Search, 
  User, 
  Globe, 
  Package, 
  MapPin, 
  History, 
  CheckCircle, 
  AlertTriangle,
  FileSpreadsheet,
  Clock,
  ExternalLink
} from 'lucide-react';

interface ScreeningResult {
  isApproved: boolean;
  riskRating: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ofacMatchPercentage: number;
  ofacDetails: string;
  dualUseCheck: string;
  embargoCheck: string;
  mitigationRequired: string;
  confidenceScore: number;
}

interface HistoricalScreening {
  id: string;
  consigneeName: string;
  destinationCountry: string;
  commodity: string;
  timestamp: string;
  result: ScreeningResult;
}

export function SanctionScreenerWidget() {
  const { token } = useAuth();
  
  // Inputs
  const [consigneeName, setConsigneeName] = useState('');
  const [consigneeAddress, setConsigneeAddress] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('China');
  const [commodity, setCommodity] = useState('');
  
  // Loading & State
  const [loading, setLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<ScreeningResult | null>(null);
  const [history, setHistory] = useState<HistoricalScreening[]>([]);

  useEffect(() => {
    // Load screening history from local storage
    const saved = localStorage.getItem('compliance_sanctions_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Error reading compliance history:", e);
      }
    }
  }, []);

  const runScreening = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consigneeName.trim() || !destinationCountry.trim() || !commodity.trim()) {
      toast.error('Please enter consignee name, destination country, and commodity.');
      return;
    }

    setLoading(true);
    setCurrentResult(null);

    try {
      const data = await fetchApi('/compliance/sanction-screening', token, {
        method: 'POST',
        body: JSON.stringify({
          consigneeName,
          consigneeAddress,
          destinationCountry,
          commodity
        })
      });

      if (data && data.success && data.report) {
        const result: ScreeningResult = data.report;
        setCurrentResult(result);
        toast.success(`Screening completed. Risk level: ${result.riskRating}`);

        // Update History
        const newRecord: HistoricalScreening = {
          id: `SCR-${Date.now()}`,
          consigneeName,
          destinationCountry,
          commodity,
          timestamp: new Date().toISOString(),
          result
        };

        const updatedHistory = [newRecord, ...history].slice(0, 50); // Keep last 50
        setHistory(updatedHistory);
        localStorage.setItem('compliance_sanctions_history', JSON.stringify(updatedHistory));
      } else {
        toast.error('Compliance screening failed to parse correctly.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Sanction screening API error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadFromHistory = (item: HistoricalScreening) => {
    setConsigneeName(item.consigneeName);
    setDestinationCountry(item.destinationCountry);
    setCommodity(item.commodity);
    setCurrentResult(item.result);
    toast.info('Loaded compliance report from logs.');
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('compliance_sanctions_history');
    toast.success('Screening history cleared.');
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'CRITICAL':
        return 'bg-red-500 text-white border-red-600';
      case 'HIGH':
        return 'bg-orange-500 text-white border-orange-600';
      case 'MEDIUM':
        return 'bg-yellow-500 text-black border-yellow-600';
      default:
        return 'bg-emerald-500 text-white border-emerald-600';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Input panel */}
      <div className="lg:col-span-5 space-y-6">
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Sanction & SDN Screener
            </CardTitle>
            <CardDescription>
              Auto-cross-reference consignees and commodities against OFAC, Bureau of Industry and Security (BIS), and international sanction lists.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={runScreening} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="consignee" className="text-xs font-semibold">Consignee Name / Entity</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                  <Input
                    id="consignee"
                    placeholder="e.g. Al-Fayeed Industrial Equipment Ltd"
                    value={consigneeName}
                    onChange={(e) => setConsigneeName(e.target.value)}
                    className="pl-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address" className="text-xs font-semibold">Registered Address / Location (Optional)</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                  <Input
                    id="address"
                    placeholder="e.g. Block 4B, Free Zone, Dubai"
                    value={consigneeAddress}
                    onChange={(e) => setConsigneeAddress(e.target.value)}
                    className="pl-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="destination" className="text-xs font-semibold">Destination Country</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                  <Input
                    id="destination"
                    placeholder="e.g. China"
                    value={destinationCountry}
                    onChange={(e) => setDestinationCountry(e.target.value)}
                    className="pl-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="commodity" className="text-xs font-semibold">Dual-Use Commodity Description / Tariff Details</Label>
                <div className="relative">
                  <Package className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                  <Input
                    id="commodity"
                    placeholder="e.g. Carbon-fiber composite tubes (300GPa tensile)"
                    value={commodity}
                    onChange={(e) => setCommodity(e.target.value)}
                    className="pl-9 text-xs"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-2 flex items-center justify-center gap-1.5 text-xs font-bold"
              >
                {loading ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Analyzing SDN & BIS lists...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Run Sanctions & Embargo Audit
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Screening history */}
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="py-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">Audit Logs & History</CardTitle>
            </div>
            {history.length > 0 && (
              <Button variant="ghost" className="text-[10px] text-red-500 h-auto p-0" onClick={clearHistory}>
                Clear
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0 border-t">
            {history.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400">
                No recent screenings run in this session.
              </div>
            ) : (
              <div className="max-h-[220px] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
                {history.map((h) => (
                  <div 
                    key={h.id} 
                    onClick={() => handleLoadFromHistory(h)}
                    className="p-3 text-xs flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer transition-colors"
                  >
                    <div className="space-y-0.5 max-w-[70%]">
                      <p className="font-bold truncate text-zinc-800 dark:text-zinc-200">{h.consigneeName}</p>
                      <p className="text-[10px] text-zinc-400 truncate">{h.commodity} &rarr; {h.destinationCountry}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={`text-[9px] px-1.5 py-0 ${getRiskBadgeColor(h.result.riskRating)}`}>
                        {h.result.riskRating}
                      </Badge>
                      <p className="text-[9px] text-zinc-400 mt-0.5">{new Date(h.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Results screen */}
      <div className="lg:col-span-7 space-y-6">
        {currentResult ? (
          <Card className="border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className={`p-4 border-b flex items-center justify-between ${
              currentResult.isApproved ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200' : 'bg-red-50 dark:bg-red-950/20 border-red-200'
            }`}>
              <div className="flex items-center gap-3">
                {currentResult.isApproved ? (
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    {currentResult.isApproved ? 'COMPLIANCE SCREENING CLEARED' : 'COMPLIANCE SCREENING BLOCKED'}
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Decision logged in automated SCM compliance trail. Confidence: {currentResult.confidenceScore}%
                  </p>
                </div>
              </div>

              <div>
                <Badge className={`text-xs px-2.5 py-1 ${getRiskBadgeColor(currentResult.riskRating)}`}>
                  {currentResult.riskRating} RISK
                </Badge>
              </div>
            </div>

            <CardContent className="p-6 space-y-5">
              {/* OFAC SDN Check */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-indigo-500" />
                    OFAC SDN List Similarity Match
                  </span>
                  <span className={`text-xs font-mono font-bold ${
                    currentResult.ofacMatchPercentage > 50 ? 'text-red-500' : 'text-emerald-500'
                  }`}>
                    {currentResult.ofacMatchPercentage}% Match
                  </span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${currentResult.ofacMatchPercentage > 50 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                    style={{ width: `${currentResult.ofacMatchPercentage}%` }}
                  />
                </div>
                <p className="text-[11px] text-zinc-500 bg-zinc-50 dark:bg-zinc-900 p-2.5 rounded border border-zinc-200 dark:border-zinc-800">
                  {currentResult.ofacDetails}
                </p>
              </div>

              {/* Embargo Checks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-indigo-500" />
                    Embargo & Territory Assessment
                  </span>
                  <div className="text-[11px] text-zinc-500 bg-zinc-50 dark:bg-zinc-900 p-2.5 rounded border border-zinc-200 dark:border-zinc-800 min-h-[70px]">
                    {currentResult.embargoCheck}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-indigo-500" />
                    Dual-Use / BIS Commodity Check
                  </span>
                  <div className="text-[11px] text-zinc-500 bg-zinc-50 dark:bg-zinc-900 p-2.5 rounded border border-zinc-200 dark:border-zinc-800 min-h-[70px]">
                    {currentResult.dualUseCheck}
                  </div>
                </div>
              </div>

              {/* Recommended mitigations */}
              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  Mitigation Requirements & Action Plan
                </span>
                <div className="text-[11px] text-zinc-600 dark:text-zinc-400 bg-amber-50/40 dark:bg-amber-950/10 p-3 rounded border border-amber-200/50 dark:border-amber-900/50 space-y-1">
                  {currentResult.mitigationRequired.split('\n').map((line, idx) => (
                    <p key={idx}>{line}</p>
                  ))}
                </div>
              </div>

              {/* System disclaimer */}
              <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-2 bg-zinc-50 dark:bg-zinc-900 p-2 rounded">
                <FileSpreadsheet className="w-4 h-4 text-zinc-400 shrink-0" />
                <span>
                  This dynamic audit has been checked against OFAC Consolidated Lists, US Entity List, and international export schemas via AI-augmented screening agents. Logs are permanently stored for export compliance audit trails.
                </span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="h-full min-h-[400px] border border-dashed rounded-lg flex flex-col items-center justify-center text-center p-8 bg-zinc-50/50 dark:bg-zinc-900/20">
            <ShieldCheck className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-3" />
            <p className="text-zinc-600 dark:text-zinc-400 font-medium text-sm">Ready for Sanction Audit</p>
            <p className="text-zinc-400 text-xs max-w-sm mt-1">
              Enter the consignee name, destination port country, and commodity parameters to query international embargo records and dual-use classification models.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
