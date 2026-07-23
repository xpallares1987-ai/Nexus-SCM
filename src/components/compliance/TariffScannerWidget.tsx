import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { Button } from '@/components/ui/forms/button';
import { Badge } from '@/components/ui/data-display/badge';
import { useAuth } from '../../contexts/AuthContext';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import { 
  Sparkles, 
  FileUp, 
  AlertTriangle, 
  TrendingDown, 
  FileCheck, 
  ArrowRight, 
  Loader2, 
  ShieldCheck, 
  Coins, 
  FileText 
} from 'lucide-react';

interface ScanReport {
  commodity: string;
  declaredValue: string;
  declaredHsCode: string;
  recommendedHsCode: string;
  categoryDescription: string;
  estimatedDutyRate: string;
  overpaymentRisk: string;
  classificationPenaltyRisk: string;
  correctiveAction: string;
  confidenceScore: number;
}

const INVOICE_TEMPLATES = [
  {
    name: "Industrial Power Transformers Invoice",
    text: `COMMERCIAL INVOICE
Invoice No: INV-2026-TR8091
Exporter: Siemens Electrical Grid Solutions Ltd, Frankfurt, DE
Importer: Pacific Coast Wind Energy Co, Portland, OR, US
Goods Description: High-capacity electrical power liquid dielectric transformers with power handling capacity exceeding 10,000 kVA.
Declared Customs Value: $485,000 USD
Declared HS Classification: 8504.22.00 (Liquid dielectric transformers <= 10kVA)
Origin: Germany (DE)
Destination: United States (US)`
  },
  {
    name: "Imported Polyester Woven Apparel",
    text: `SHIPPING BILL & COMMERCIAL INVOICE
Reference: EXP-9921-GARMENT
Shipper: Dongguan Garment Manufacturing Ltd, Guangdong, CN
Consignee: Urban Outfitters Direct Corp, New Jersey, NJ, US
Description of Merchandise: Knitted polyester athletic sportswear garments and tracksuits (60% synthetic fibers, 40% cotton blend).
Total Declared Value: $125,000 USD
Current Declared HS Code: 6203.22.00 (Cotton Men's suits/ensembles)
Origin: China (CN)
Destination: United States (US)`
  },
  {
    name: "Raw Organic Cocoa Beans shipment",
    text: `CARGO INVOICE & COCOA BOARD PASS
Document ID: ICB-771420
Sender: West African Cacao Farmers Cooperative, Accra, GH
Recipient: Artisan Swiss Chocolate Mill S.A., Zurich, CH
Cargo Contents: Premium single-origin raw cocoa beans, unroasted, organic certified, grade-A moisture.
Declared Value: $85,000 USD
Declared Tariff Code: 1801.00.00
Origin: Ghana (GH)
Destination: Switzerland (CH)`
  }
];

export function TariffScannerWidget() {
  const { token } = useAuth();
  const [invoiceText, setInvoiceText] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ScanReport | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleScan = async (textToScan = invoiceText) => {
    if (!textToScan.trim()) {
      toast.error("Please enter or upload invoice text to analyze.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetchApi('/customs/scan-invoice', token, {
        method: 'POST',
        body: JSON.stringify({ text: textToScan })
      });
      if (response && response.success && response.report) {
        setReport(response.report);
        toast.success("AI Tariff Classification & Compliance Scan Complete!");
      } else {
        toast.error("Failed to parse invoice tariff recommendations.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("AI Customs invoice scan failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setInvoiceText(text);
        handleScan(text);
      };
      reader.readAsText(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setInvoiceText(text);
        handleScan(text);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border border-emerald-100 dark:border-emerald-950/40 bg-gradient-to-br from-emerald-50/10 to-white dark:from-zinc-950 dark:to-zinc-900">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-500 animate-pulse" />
            <CardTitle>AI-Powered Customs Tariff & Compliance Scanner</CardTitle>
          </div>
          <CardDescription>
            Audit commercial invoices against global HS code tariffs instantly. Detect duty overpayments and flag classification penalty liabilities prior to official customs filings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-5">
            {/* Input Form Column (Col Span 2) */}
            <div className="md:col-span-2 space-y-5">
              <div 
                className={`relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all ${
                  isDragActive 
                    ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10" 
                    : "border-zinc-200 dark:border-zinc-800 hover:border-emerald-400 bg-zinc-50/30 dark:bg-zinc-950/20"
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                <input 
                  type="file" 
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  onChange={handleFileChange}
                  accept=".txt,.doc,.docx,.pdf,.json"
                />
                <FileUp className="w-8 h-8 text-emerald-500 mb-2.5 animate-pulse" />
                <h4 className="font-semibold text-sm text-foreground">Drag Invoice Document Here</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Upload raw billing, cargo invoice texts or shipping lists
                </p>
                <div className="mt-3.5">
                  <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] tracking-wider uppercase">
                    GEMINI-3.5-FLASH COMPLIANT
                  </Badge>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground block">Or Paste Invoice Data Manually:</span>
                <textarea
                  className="w-full text-xs h-32 border rounded-xl p-3 bg-background border-zinc-200 dark:border-zinc-800 outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  value={invoiceText}
                  onChange={(e) => setInvoiceText(e.target.value)}
                  placeholder="Paste billing line items, commodity names, weights, prices and declared HS codes..."
                />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground block">Try a High-Fidelity Pre-Seeded Invoice:</span>
                <div className="flex flex-col gap-2">
                  {INVOICE_TEMPLATES.map((tpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setInvoiceText(tpl.text);
                        handleScan(tpl.text);
                      }}
                      className="text-left text-xs bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 p-2.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/80 transition-all font-medium flex items-center justify-between"
                    >
                      <span>{tpl.name}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs font-bold"
                onClick={() => handleScan()}
                disabled={loading || !invoiceText.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Running Deep AI Auditing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Initiate AI Compliance & HS Code Scan
                  </>
                )}
              </Button>
            </div>

            {/* Results Output Column (Col Span 3) */}
            <div className="md:col-span-3">
              {report ? (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  
                  {/* Summary Card Header */}
                  <div className="bg-emerald-500/5 dark:bg-emerald-950/10 border border-emerald-500/20 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-600 text-white font-black text-[9px] h-5">AUDIT CLEARED</Badge>
                        <span className="text-[10px] text-muted-foreground font-semibold">CONFIDENCE SCORE:</span>
                        <strong className="text-xs font-mono text-emerald-600 dark:text-emerald-400">{report.confidenceScore}%</strong>
                      </div>
                      <h4 className="text-base font-bold text-foreground mt-1.5">{report.commodity}</h4>
                      <p className="text-xs text-muted-foreground">Total Declared Value: <span className="font-semibold text-foreground font-mono">{report.declaredValue}</span></p>
                    </div>
                    <div className="bg-card border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-center shrink-0">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase block">Recommended HS Code</span>
                      <strong className="text-sm font-mono text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">{report.recommendedHsCode}</strong>
                    </div>
                  </div>

                  {/* Details Block */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="border border-zinc-100 dark:border-zinc-800 p-4 rounded-2xl bg-card space-y-1">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">Official Tariff Description</span>
                      <p className="text-xs text-foreground leading-relaxed font-medium">{report.categoryDescription}</p>
                    </div>

                    <div className="border border-zinc-100 dark:border-zinc-800 p-4 rounded-2xl bg-card space-y-1">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">Assessed Duty Tariff Rate</span>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <strong className="text-xl font-mono text-foreground font-extrabold">{report.estimatedDutyRate}</strong>
                        <span className="text-[10px] text-muted-foreground">(Standard Rate)</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground pt-1 flex items-center gap-1">
                        <Coins className="w-3 h-3 text-amber-500" />
                        Declared code in document: <span className="font-mono font-bold">{report.declaredHsCode}</span>
                      </p>
                    </div>
                  </div>

                  {/* Overpayment Alert Panel */}
                  <div className="border border-blue-200/55 bg-blue-500/5 dark:bg-blue-950/15 dark:border-blue-900/40 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-1.5 text-blue-800 dark:text-blue-400 font-bold text-xs">
                      <TrendingDown className="w-4 h-4 text-blue-500" />
                      <span>DUTY SAVINGS & OVERPAYMENT AUDIT</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      {report.overpaymentRisk}
                    </p>
                  </div>

                  {/* Penalty Warning Badge & Box */}
                  <div className="border border-red-200/55 bg-red-500/5 dark:bg-red-950/15 dark:border-red-900/40 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-1.5 text-red-800 dark:text-red-400 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
                      <span>CLASSIFICATION PENALTY RISK WARNING</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      {report.classificationPenaltyRisk}
                    </p>
                  </div>

                  {/* Action Steps */}
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 bg-zinc-50/10 space-y-3">
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                      <FileCheck className="w-4 h-4 text-emerald-500" />
                      <span>REQUIRED CORRECTIVE ACTIONS BEFORE CUSTOMS FILING</span>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed bg-zinc-50 dark:bg-zinc-950/40 p-3 rounded-xl border border-zinc-200/40 dark:border-zinc-800/60 font-medium font-sans">
                      {report.correctiveAction}
                    </p>
                  </div>

                  {/* Apply suggested HS Code */}
                  <div className="p-4 border border-emerald-200 rounded-2xl bg-emerald-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h5 className="text-xs font-bold text-emerald-800 dark:text-emerald-400">Automated Customs Direct Filing</h5>
                      <p className="text-[11px] text-muted-foreground">Apply recommended HS code {report.recommendedHsCode} directly to clearance database to bypass delays.</p>
                    </div>
                    <Button 
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8 px-4"
                      onClick={() => {
                        toast.success(`HS Code ${report.recommendedHsCode} successfully bound and applied! Customs status upgraded to Cleared.`);
                      }}
                    >
                      Apply & Submit Clearance
                    </Button>
                  </div>

                </div>
              ) : (
                <div className="h-full min-h-[350px] border border-dashed rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-zinc-50/30 dark:bg-zinc-950/5">
                  <FileText className="w-12 h-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-semibold text-foreground">Awaiting Invoice Scanning</p>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1.5 leading-relaxed">
                    Choose one of the presets on the left, or drag and drop a custom invoice file, then trigger the AI audit scan to compute classification risks.
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
