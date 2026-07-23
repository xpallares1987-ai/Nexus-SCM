import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { Button } from '@/components/ui/forms/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/data-display/table';
import { Badge } from '@/components/ui/data-display/badge';
import { FileText, Search, Plus, Filter, ShieldCheck, AlertCircle, ShieldAlert, Loader2, X, FileUp, Sparkles, Database, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/forms/input';
import { useAuth } from '../../contexts/AuthContext';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';

export function CustomsClearance() {
  const { token, profile } = useAuth();
  const [declarations, setDeclarations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // AI OCR States
  const [ocrText, setOcrText] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<any | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  // AI Tariff Recommendation Engine States
  const [cargoDesc, setCargoDesc] = useState('');
  const [tariffLoading, setTariffLoading] = useState(false);
  const [tariffRecommendations, setTariffRecommendations] = useState<any[]>([]);
  const [selectedRec, setSelectedRec] = useState<any | null>(null);

  // AI Customs Duty, VAT, and Delay Estimator States
  const [estHsCode, setEstHsCode] = useState('8542.31.00');
  const [estCargoValue, setEstCargoValue] = useState('148000');
  const [estOriginPort, setEstOriginPort] = useState('CNSHA (Shanghai Port, CN)');
  const [estDestinationPort, setEstDestinationPort] = useState('ESBCN (Barcelona Port, ES)');
  const [estLoading, setEstLoading] = useState(false);
  const [estimationResult, setEstimationResult] = useState<any | null>(null);

  const calculateCustomsEstimation = async () => {
    if (!estHsCode.trim()) {
      toast.error("Please provide an HS Tariff Code first.");
      return;
    }
    setEstLoading(true);
    setEstimationResult(null);
    try {
      const res = await fetchApi('/api/customs/estimate-duties', token, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hsCode: estHsCode,
          cargoValue: parseFloat(estCargoValue) || 10000,
          originPort: estOriginPort,
          destinationPort: estDestinationPort
        })
      });
      if (res && res.success && res.estimation) {
        setEstimationResult(res.estimation);
        toast.success("Bilateral customs duty rates, VAT, and delay estimates computed successfully!");
      } else {
        toast.error("Failed to generate duty and tariff estimations.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to calculate tariff and delay estimations.");
    } finally {
      setEstLoading(false);
    }
  };

  const analyzeTariff = async () => {
    if (!cargoDesc.trim()) return;
    setTariffLoading(true);
    setSelectedRec(null);
    try {
      const res = await fetchApi('/api/customs/recommend-tariff', token, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ description: cargoDesc })
      });
      if (res && res.success && res.recommendations) {
        setTariffRecommendations(res.recommendations);
        setSelectedRec(res.recommendations[0] || null);
        toast.success("Harmonized system codes successfully scanned and matched.");
      } else {
        toast.error("Failed to generate tariff recommendations.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Tariff recommendation lookup failed.");
    } finally {
      setTariffLoading(false);
    }
  };

  // Sample document templates for high-fidelity OCR demo
  const sampleDocuments = [
    {
      title: "Shanghai Electronics (Ocean B/L)",
      text: `BILL OF LADING (OCEAN)
B/L Number: BILL-2026-SHA04
Carrier Reference: COSCO-8821034
Shipper: Shanghai Micro-Electronics Ltd, Pudong Development Zone, Shanghai, CN
Consignee: Global Tech Distributors S.A., Calle Aragon 45, Barcelona, ES
Port of Loading: Shanghai Port (CNSHA)
Port of Discharge: Barcelona Port (ESBCN)
Vessel: Ocean Titan V-102E
Description of Cargo: High-density Microchips, Semiconductor Wafers & Printed Circuit Board Assemblies.
HS Tariff Code: 8542.31.00
Quantity: 14 Pallets / Total Net Weight: 3450 kg
Gross Weight: 3600 kg
Declared Customs Value: $148,000 USD
Estimated Duties: $4,400
Type: Import`
    },
    {
      title: "Miami Auto Parts (Air Waybill)",
      text: `AIR WAYBILL (CONSIGNMENT)
AWB Number: AWB-449-1082-2026
Carrier: Delta Cargo Services
Origin Airport: Miami International Airport (KMIA), FL, US
Destination Airport: Frankfurt Cargo City (EDDF), DE
Shipper: Sunshine Automotive Exports Inc, Miami, FL, US
Consignee: Bavaria Autoworks AG, Industrial Strasse 18, Munich, DE
Description of Goods: Precision Spark Plugs, Fuel Injectors & Electronic Engine Control Units (ECUs)
HS Tariff Code: 8511.10.00
Package Details: 4 Crates
Actual Chargeable Weight: 840 kg
Declared Customs Duty Value: $24,500
Calculated Tariff Duties: $1,220 USD
Type: Import`
    },
    {
      title: "Hamburg Logistics (Road CMR)",
      text: `CMR CONSIGNMENT NOTE (ROAD FREIGHT)
CMR Document Reference: CMR-DE-FR-9014
Carrier: Euro-Trans Overland GmbH, Hamburg, DE
Consignee: Paris Retail Distributing Group, Rue Lafayette, Paris, FR
Sender: North Sea Apparel Mfg, Hamburg, DE
Goods Description: Cotton Knitted Dresses, High-End Woolen Sweaters & Silk Garments.
HS Tariff Classification Code: 6204.42.00
Number of Packages: 12 Cartons (Shrink-wrapped)
Total Weight: 1250 kg
Invoice Value: $52,000 USD
Assessed Duty Rate: 4.2%
Calculated Duties Amount: $2,180
Type: Import`
    }
  ];

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDecId, setNewDecId] = useState('');
  const [newShipmentRef, setNewShipmentRef] = useState('');
  const [newType, setNewType] = useState('Import');
  const [newStatus, setNewStatus] = useState('Pending');
  const [newOrigin, setNewOrigin] = useState('');
  const [newDestination, setNewDestination] = useState('');
  const [newDuties, setNewDuties] = useState('$1,500');

  const loadDeclarations = async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/customs-declarations', token);
      const mapped = data.map((d: any) => ({
        id: d.declarationId,
        dbId: d.id,
        shipmentRef: d.shipmentRef,
        type: d.type,
        status: d.status,
        originCountry: d.originCountry,
        destinationCountry: d.destinationCountry,
        duties: d.duties,
      }));
      setDeclarations(mapped);
    } catch (err: any) {
      console.error("Failed to fetch customs declarations:", err);
      toast.error("Failed to load customs declarations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadDeclarations();
    }
  }, [token]);

  const handleOpenModal = () => {
    const nextNum = declarations.length + 1;
    const formattedNum = String(nextNum).padStart(3, '0');
    setNewDecId(`CUST-2026-${formattedNum}`);
    setNewShipmentRef(`SHP-99${210 + nextNum}`);
    setNewOrigin('US');
    setNewDestination('ES');
    setNewDuties('$2,500');
    setNewType('Import');
    setNewStatus('Pending');
    setIsModalOpen(true);
  };

  const handleCreateDeclaration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profile?.role === 'Ejecutivo') {
      toast.error("Forbidden: Ejecutivo role cannot create declarations");
      return;
    }
    try {
      await fetchApi('/customs-declarations', token, {
        method: 'POST',
        body: JSON.stringify({
          declarationId: newDecId,
          shipmentRef: newShipmentRef,
          type: newType,
          status: newStatus,
          originCountry: newOrigin,
          destinationCountry: newDestination,
          duties: newDuties
        })
      });
      toast.success("Customs declaration created successfully");
      setIsModalOpen(false);
      loadDeclarations();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create declaration");
    }
  };

  // AI OCR Action
  const handleAIClassify = async (textToParse: string) => {
    if (!textToParse.trim()) {
      toast.error("Document text is empty");
      return;
    }
    setOcrLoading(true);
    setExtractedData(null);
    try {
      const response = await fetchApi('/customs/classify', token, {
        method: 'POST',
        body: JSON.stringify({ text: textToParse })
      });
      if (response && response.success) {
        setExtractedData(response.extracted);
        toast.success("AI OCR successfully processed document and synchronized with SCM DB!");
        // Refresh customs list and broadcast changes
        loadDeclarations();
      } else {
        throw new Error(response.error || "Extraction failed");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to parse document with Gemini AI OCR");
    } finally {
      setOcrLoading(false);
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

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setOcrText(text);
        handleAIClassify(text);
      };
      reader.readAsText(file);
    }
  };

  const handleManualUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setOcrText(text);
        handleAIClassify(text);
      };
      reader.readAsText(file);
    }
  };

  const handleStatusChange = async (dbId: string, currentStatus: string) => {
    if (profile?.role === 'Ejecutivo') {
      toast.error("Forbidden: Ejecutivo role cannot update declarations");
      return;
    }
    const nextStatusMap: Record<string, string> = {
      'Pending': 'Under Review',
      'Under Review': 'Cleared',
      'Cleared': 'Action Required',
      'Action Required': 'Pending'
    };
    const nextStatus = nextStatusMap[currentStatus] || 'Pending';
    try {
      await fetchApi(`/customs-declarations/${dbId}/status`, token, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus })
      });
      toast.success(`Status updated to ${nextStatus}`);
      loadDeclarations();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };

  const filteredDeclarations = declarations.filter(dec => 
    dec.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dec.shipmentRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (dec.originCountry && dec.originCountry.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (dec.destinationCountry && dec.destinationCountry.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalDeclarationsCount = declarations.length;
  const pendingApprovalCount = declarations.filter(d => d.status === 'Pending').length;
  const actionRequiredCount = declarations.filter(d => d.status === 'Action Required').length;
  const clearedCount = declarations.filter(d => d.status === 'Cleared').length;
  const complianceRateVal = totalDeclarationsCount > 0 
    ? ((clearedCount / totalDeclarationsCount) * 100).toFixed(1) + '%' 
    : '100%';

  const pendingDocsCount = declarations.filter(d => d.status === 'Pending' || d.status === 'Action Required' || d.status === 'Under Review').length;
  const dynamicRiskScore = totalDeclarationsCount > 0
    ? Math.min(100, Math.round((pendingDocsCount / totalDeclarationsCount) * 100))
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Customs Clearance</h2>
          <p className="text-muted-foreground">Manage import/export declarations, tariffs, and compliance.</p>
        </div>
        <Button onClick={handleOpenModal} disabled={profile?.role === 'Ejecutivo'}>
          <Plus className="w-4 h-4 mr-2" />
          New Declaration
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Declarations</p>
                <p className="text-3xl font-bold mt-2">{loading ? '...' : totalDeclarationsCount}</p>
              </div>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
                <p className="text-3xl font-bold mt-2 text-amber-600">{loading ? '...' : pendingApprovalCount}</p>
              </div>
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Search className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Compliance Rate</p>
                <p className="text-3xl font-bold mt-2 text-emerald-600">{loading ? '...' : complianceRateVal}</p>
              </div>
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Action Required</p>
                <p className="text-3xl font-bold mt-2 text-red-600">{loading ? '...' : actionRequiredCount}</p>
              </div>
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Risk Score</p>
                <div className="flex items-baseline gap-1 mt-2">
                  <p className="text-3xl font-bold text-amber-600">{loading ? '...' : dynamicRiskScore}</p>
                  <span className="text-sm font-medium text-muted-foreground">/100</span>
                </div>
              </div>
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">Pending document completeness</p>
          </CardContent>
        </Card>
      </div>

      {/* Intelligent AI OCR Classifier Panel */}
      <Card className="border border-indigo-100 dark:border-indigo-950/40 bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950">
        <CardHeader className="border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
            <CardTitle>AI OCR Customs Document Classifier</CardTitle>
          </div>
          <CardDescription>
            Seamlessly drag and drop shipping invoices, packing lists, or Bills of Lading (B/L) to automatically parse key consignees, HS tariff codes, and cargo weights directly into the operational database.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Left drop zone and sample selection */}
            <div className="space-y-4">
              <div 
                className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  isDragActive 
                    ? "border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20" 
                    : "border-zinc-300 dark:border-zinc-700 hover:border-indigo-400"
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                <input 
                  type="file" 
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  onChange={handleManualUploadChange}
                  accept=".txt,.doc,.docx,.pdf,.json"
                />
                
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-full mb-3 text-indigo-600 dark:text-indigo-400">
                  <FileUp className="w-6 h-6 animate-bounce" />
                </div>
                <h4 className="font-semibold text-foreground text-sm">Drag and Drop Document Here</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Supports Bill of Lading, Cargo Invoices, Packing List texts (.txt, .pdf, .json)
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 px-2.5 py-1 rounded-md">
                    Powered by Gemini 3.5 Flash
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">No file handy? Try a high-fidelity logistics template:</p>
                <div className="flex flex-wrap gap-2">
                  {sampleDocuments.map((doc, idx) => (
                    <Button 
                      key={idx} 
                      variant="outline" 
                      size="sm" 
                      className="text-xs border-indigo-100 dark:border-indigo-950 bg-background hover:bg-indigo-50/20"
                      onClick={() => {
                        setOcrText(doc.text);
                        handleAIClassify(doc.text);
                      }}
                      disabled={ocrLoading}
                    >
                      {doc.title}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Live OCR Extraction Results */}
            <div className="border rounded-xl bg-card p-5 relative overflow-hidden flex flex-col justify-between">
              {ocrLoading ? (
                <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-3 z-10">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  <p className="text-sm font-medium text-foreground animate-pulse">Gemini AI extracting metadata...</p>
                  <p className="text-xs text-muted-foreground">Parsing consignees, weights, HS codes, and tariff estimations</p>
                </div>
              ) : null}

              {!extractedData && !ocrLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-center h-full">
                  <Database className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <h5 className="font-semibold text-sm">Extract Awaiting Document</h5>
                  <p className="text-xs text-muted-foreground max-w-xs mt-1">
                    Select a sample template or upload a consignment file to run real-time automated OCR classification.
                  </p>
                </div>
              ) : null}

              {extractedData && !ocrLoading ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-sm">
                      <CheckCircle className="w-4 h-4" />
                      <span>Extracted & Synchronized Successfully</span>
                    </div>
                    <Badge variant="secondary" className="uppercase font-mono text-[10px]">
                      {extractedData.type}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-muted-foreground font-medium">Declaration ID:</span>
                      <p className="font-semibold text-foreground font-mono">{extractedData.declarationId}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground font-medium">Shipment Ref:</span>
                      <p className="font-semibold text-foreground font-mono">{extractedData.shipmentRef}</p>
                    </div>
                    <div className="col-span-2 space-y-1 border-t pt-2">
                      <span className="text-muted-foreground font-medium">Consignee Name:</span>
                      <p className="font-semibold text-indigo-600 dark:text-indigo-400">{extractedData.consigneeName}</p>
                    </div>
                    <div className="space-y-1 border-t pt-2">
                      <span className="text-muted-foreground font-medium">HS Code / Tariff:</span>
                      <p className="font-semibold text-amber-600 dark:text-amber-400 font-mono">{extractedData.hsCode}</p>
                    </div>
                    <div className="space-y-1 border-t pt-2">
                      <span className="text-muted-foreground font-medium">Package Weight:</span>
                      <p className="font-semibold text-foreground font-mono">{extractedData.weight}</p>
                    </div>
                    <div className="space-y-1 border-t pt-2">
                      <span className="text-muted-foreground font-medium">Corridor (Origin → Dest):</span>
                      <p className="font-semibold text-foreground">{extractedData.originCountry} → {extractedData.destinationCountry}</p>
                    </div>
                    <div className="space-y-1 border-t pt-2">
                      <span className="text-muted-foreground font-medium">Assessed Tariffs / Duties:</span>
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">{extractedData.duties}</p>
                    </div>
                  </div>

                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-lg p-3 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-2 mt-4">
                    <Database className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">SCM Operational Database Integration:</span>
                      This document was mapped automatically. An active shipment record was verified or registered for <strong className="font-mono">{extractedData.shipmentRef}</strong> with a total weight of <strong>{extractedData.weight}</strong>, and a customs declaration has been published under status <strong className="uppercase">Pending</strong>.
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI-Powered Customs Tariff Recommendation Engine */}
      <Card className="border border-emerald-100 dark:border-emerald-950/40 bg-gradient-to-br from-white to-emerald-50/10 dark:from-zinc-900 dark:to-zinc-950">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-500 animate-pulse" />
              <CardTitle>AI-Powered Customs Tariff Recommendation Engine</CardTitle>
            </div>
            <Badge variant="outline" className="bg-emerald-100 dark:bg-emerald-950/30 border-emerald-200 text-emerald-800 dark:text-emerald-300 text-[10px] uppercase font-bold">
              Gemini AI Active
            </Badge>
          </div>
          <CardDescription>
            Instantly suggest precise HS (Harmonized System) Codes based on raw product descriptions to prevent customs filing errors, avoid tax duty overpayment, and identify regulatory warnings during shipping.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Input Form Column */}
            <div className="md:col-span-1 space-y-4">
              <div>
                <span className="text-xs font-semibold text-muted-foreground block mb-2">Input Raw Cargo / Invoice Description:</span>
                <textarea
                  className="w-full text-xs h-28 border rounded-lg p-2.5 bg-background border-zinc-200 dark:border-zinc-800 outline-none focus:border-emerald-500 font-sans"
                  value={cargoDesc}
                  onChange={(e) => setCargoDesc(e.target.value)}
                  placeholder="e.g. Lithium-Ion Polymer Battery Packs for high performance electric vehicles, UN3480 certified..."
                />
              </div>

              <div>
                <span className="text-xs font-semibold text-muted-foreground block mb-2">Quick Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Surgical stainless steel bone screws",
                    "Polyester woven fabric sportswear",
                    "Frozen whole skipjack tuna",
                    "Organic green tea leaves bagged"
                  ].map((preset, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => setCargoDesc(preset)}
                      className="text-[10px] bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 px-2 py-1 rounded-md text-foreground transition-all"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5"
                onClick={analyzeTariff}
                disabled={tariffLoading || !cargoDesc.trim()}
              >
                {tariffLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Analyzing Tariff Class...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Recommend HS Tariff Codes
                  </>
                )}
              </Button>
            </div>

            {/* Recommendations Output Grid */}
            <div className="md:col-span-2 space-y-4">
              {tariffRecommendations.length > 0 ? (
                <div className="space-y-4">
                  <div className="border rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader className="bg-zinc-50 dark:bg-zinc-900/40">
                        <TableRow>
                          <TableHead className="w-24 text-xs">HS Code</TableHead>
                          <TableHead className="text-xs">Official Category Description</TableHead>
                          <TableHead className="w-24 text-xs text-right">Est. Duty</TableHead>
                          <TableHead className="w-24 text-xs text-right">Confidence</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tariffRecommendations.map((rec, rIdx) => (
                          <TableRow key={rIdx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 cursor-pointer" onClick={() => setSelectedRec(rec)}>
                            <TableCell className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">{rec.hsCode}</TableCell>
                            <TableCell className="text-xs leading-relaxed">{rec.description}</TableCell>
                            <TableCell className="font-semibold text-right text-xs">{rec.dutyRate}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className={`text-[10px] ${rec.confidence >= 85 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20' : 'bg-blue-50 text-blue-700 dark:bg-blue-950/20'}`}>
                                {rec.confidence}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Selected Item Compliance Advisory Detail */}
                  {selectedRec && (
                    <div className="bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl p-4 space-y-2 animate-in fade-in duration-200">
                      <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-400 font-bold text-xs">
                        <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>CUSTOMS COMPLIANCE ADVISORY ({selectedRec.hsCode})</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <span className="font-bold text-foreground">Compliance / Regulatory Notes:</span> {selectedRec.regulatoryNotes}
                      </p>
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          className="text-[10px] h-7 px-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium"
                          onClick={() => {
                            // Pre-fill creation modal or state
                            setExtractedData({
                              declarationId: `DEC-${Math.floor(100000 + Math.random() * 900000)}`,
                              shipmentRef: `FFW-DRAFT-${Math.floor(1000 + Math.random() * 9000)}`,
                              consigneeName: "Draft Consignee",
                              hsCode: selectedRec.hsCode,
                              weight: "Pending Verification",
                              originCountry: "TBD",
                              destinationCountry: "TBD",
                              duties: `${selectedRec.dutyRate} (Est)`
                            });
                            toast.success(`HS Code ${selectedRec.hsCode} applied to current declaration draft!`);
                          }}
                        >
                          Apply to Declaration Draft
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full min-h-[180px] border border-dashed rounded-xl flex flex-col items-center justify-center text-center p-6 bg-zinc-50/30 dark:bg-zinc-950/10">
                  <FileText className="w-8 h-8 text-muted-foreground/50 mb-2" />
                  <p className="text-xs font-semibold text-foreground">No recommendations loaded</p>
                  <p className="text-[10px] text-muted-foreground max-w-sm mt-1">
                    Provide a commodity description on the left and click "Recommend HS Tariff Codes" to scan global customs rates via Gemini.
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Automated Customs Duty, VAT & Clearance Delay Estimator */}
      <Card className="border border-blue-100 dark:border-blue-950/40 bg-gradient-to-br from-white to-blue-50/5 dark:from-zinc-900 dark:to-zinc-950 shadow-sm">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500 animate-pulse" />
              <CardTitle>Automated Customs Duty, VAT & Clearance Delay Estimator</CardTitle>
            </div>
            <Badge variant="outline" className="bg-blue-100 dark:bg-blue-950/30 border-blue-200 text-blue-800 dark:text-blue-300 text-[10px] uppercase font-bold">
              AI Trade Economist Active
            </Badge>
          </div>
          <CardDescription>
            Estimate customs import duty surcharges, VAT, bilateral trade agreement exemptions, and anticipated clearance delay probabilities based on HS code, origin, and destination port.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-12">
            
            {/* Input fields panel */}
            <div className="md:col-span-4 space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">HS Tariff Code</span>
                <div className="flex gap-1.5">
                  <Input 
                    placeholder="e.g., 8542.31.00" 
                    value={estHsCode} 
                    onChange={(e) => setEstHsCode(e.target.value)} 
                    className="h-9 text-xs font-mono font-bold"
                  />
                  {selectedRec && (
                    <Button 
                      type="button" 
                      onClick={() => setEstHsCode(selectedRec.hsCode)}
                      size="sm"
                      variant="outline"
                      className="text-[10px] h-9 px-2 font-semibold border-emerald-200 hover:bg-emerald-50 shrink-0"
                      title="Apply chosen HS code from recommendation deck"
                    >
                      Use Recommended
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Declared Cargo Value (USD)</span>
                <Input 
                  type="number" 
                  placeholder="e.g., 148000" 
                  value={estCargoValue} 
                  onChange={(e) => setEstCargoValue(e.target.value)} 
                  className="h-9 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Origin Port / Country</span>
                <Input 
                  placeholder="e.g., CNSHA (Shanghai Port, CN)" 
                  value={estOriginPort} 
                  onChange={(e) => setEstOriginPort(e.target.value)} 
                  className="h-9 text-xs font-medium"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Destination Port / Country</span>
                <Input 
                  placeholder="e.g., ESBCN (Barcelona Port, ES)" 
                  value={estDestinationPort} 
                  onChange={(e) => setEstDestinationPort(e.target.value)} 
                  className="h-9 text-xs font-medium"
                />
              </div>

              <Button
                disabled={estLoading || !estHsCode}
                onClick={calculateCustomsEstimation}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                {estLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Computing Bilateral Duties...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Calculate Tariffs & Delays
                  </>
                )}
              </Button>
            </div>

            {/* Estimation output results panel */}
            <div className="md:col-span-8 p-5 bg-muted/20 border rounded-2xl flex flex-col justify-between">
              {estimationResult ? (
                <div className="space-y-5 animate-in fade-in duration-300">
                  
                  {/* Cards block */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-background border rounded-xl shadow-sm">
                      <span className="text-[9px] text-muted-foreground font-bold uppercase block tracking-wider">Import Duty Rate</span>
                      <p className="text-lg font-black text-blue-600 dark:text-blue-400 mt-1">{estimationResult.dutyPercentage}</p>
                      <span className="text-[10px] text-zinc-500 font-mono">${estimationResult.dutyFeeUsd?.toLocaleString()} USD</span>
                    </div>

                    <div className="p-3 bg-background border rounded-xl shadow-sm">
                      <span className="text-[9px] text-muted-foreground font-bold uppercase block tracking-wider">Destination VAT</span>
                      <p className="text-lg font-black text-blue-600 dark:text-blue-400 mt-1">{estimationResult.vatPercentage}</p>
                      <span className="text-[10px] text-zinc-500 font-mono">${estimationResult.vatFeeUsd?.toLocaleString()} USD</span>
                    </div>

                    <div className="p-3 bg-indigo-50/60 dark:bg-zinc-900 border border-indigo-100 dark:border-zinc-800 rounded-xl shadow-sm">
                      <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold uppercase block tracking-wider">Total Customs Fees</span>
                      <p className="text-lg font-black text-indigo-700 dark:text-indigo-300 mt-1">${estimationResult.totalCustomsFeesUsd?.toLocaleString()} USD</p>
                      <span className="text-[10px] text-zinc-500 font-medium">Duty + VAT + Port Admin</span>
                    </div>
                  </div>

                  {/* Delay probability banner */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-background border rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[9px] text-muted-foreground block font-bold uppercase">Anticipated Clearance Delay</span>
                        <span className="text-sm font-black font-mono mt-0.5 block">{estimationResult.estimatedClearanceDelayDays} Days</span>
                      </div>
                      <Badge className="bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 h-6 px-2.5 font-bold border-none">
                        Delay Est
                      </Badge>
                    </div>

                    <div className="p-3 bg-background border rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[9px] text-muted-foreground block font-bold uppercase">Clearance Risk Status</span>
                        <span className={`text-sm font-black mt-0.5 block ${
                          estimationResult.clearanceDelayRisk === 'Low' ? 'text-emerald-600 dark:text-emerald-400' :
                          estimationResult.clearanceDelayRisk === 'Medium' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {estimationResult.clearanceDelayRisk} Risk
                        </span>
                      </div>
                      <Badge className={`${
                        estimationResult.clearanceDelayRisk === 'Low' ? 'bg-emerald-500 text-white' :
                        estimationResult.clearanceDelayRisk === 'Medium' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
                      } h-6 px-2.5 font-bold border-none`}>
                        {estimationResult.clearanceDelayRisk}
                      </Badge>
                    </div>
                  </div>

                  {/* Trade agreements and Alerts board */}
                  <div className="p-4 bg-background border rounded-xl space-y-3">
                    <div>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Bilateral Trade Agreement Exemption</span>
                      <p className="text-xs font-semibold text-foreground mt-0.5 leading-relaxed">{estimationResult.applicableTradeAgreements}</p>
                    </div>
                    
                    {estimationResult.complianceAlerts?.length > 0 && (
                      <div className="pt-2 border-t border-dashed">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Compliance Advisories & Restrictions</span>
                        <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
                          {estimationResult.complianceAlerts.map((alert: string, idx: number) => (
                            <li key={idx} className="leading-relaxed">
                              {alert}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Gemini Detailed text explanation */}
                  <div className="p-3 bg-indigo-50/10 border border-indigo-100/40 rounded-xl space-y-1">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">AI Tax and delay Analysis Breakdown</span>
                    <p className="text-xs text-muted-foreground leading-relaxed italic">{estimationResult.feeBreakdownExplanation}</p>
                  </div>

                </div>
              ) : (
                <div className="my-auto flex flex-col items-center justify-center text-center p-8 space-y-2">
                  <Database className="w-10 h-10 text-muted-foreground/35" />
                  <p className="text-xs font-bold text-foreground">Awaiting Customs Duty Calculation Parameters</p>
                  <p className="text-[10px] text-muted-foreground max-w-sm">
                    Enter the HS Code, cargo value, origin, and destination ports on the left, then click Calculate to trigger the AI international trade economist estimation.
                  </p>
                </div>
              )}
            </div>

          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Declarations</CardTitle>
          <CardDescription>View and manage the status of ongoing customs clearance processes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search declarations by ID, shipment, country..." 
                className="pl-9" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline"><Filter className="w-4 h-4 mr-2"/> Filter</Button>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading declarations...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Declaration ID</TableHead>
                  <TableHead>Shipment Ref</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Origin</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Est. Duties</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeclarations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No matching declarations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDeclarations.map((dec) => (
                    <TableRow key={dec.id}>
                      <TableCell className="font-medium">{dec.id}</TableCell>
                      <TableCell>{dec.shipmentRef}</TableCell>
                      <TableCell>{dec.type}</TableCell>
                      <TableCell>{dec.originCountry}</TableCell>
                      <TableCell>{dec.destinationCountry}</TableCell>
                      <TableCell>{dec.duties}</TableCell>
                      <TableCell>
                        <Badge variant={
                          dec.status === 'Cleared' ? 'default' : 
                          dec.status === 'Action Required' ? 'destructive' : 
                          dec.status === 'Pending' ? 'secondary' : 'outline'
                        }>
                          {dec.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleStatusChange(dec.dbId, dec.status)}
                            disabled={profile?.role === 'Ejecutivo'}
                          >
                            Cycle Status
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <Card className="w-full max-w-md bg-background shadow-lg">
            <CardHeader className="flex flex-row justify-between items-center space-y-0">
              <div>
                <CardTitle>Create Declaration</CardTitle>
                <CardDescription>Enter details for the customs clearance process.</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <form onSubmit={handleCreateDeclaration}>
              <CardContent className="space-y-4 pt-0">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Declaration ID</label>
                  <Input value={newDecId} onChange={(e) => setNewDecId(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Shipment Reference</label>
                  <Input value={newShipmentRef} onChange={(e) => setNewShipmentRef(e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Type</label>
                    <select 
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      value={newType} 
                      onChange={(e) => setNewType(e.target.value)}
                    >
                      <option value="Import">Import</option>
                      <option value="Export">Export</option>
                      <option value="Transit">Transit</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Status</label>
                    <select 
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      value={newStatus} 
                      onChange={(e) => setNewStatus(e.target.value)}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Cleared">Cleared</option>
                      <option value="Action Required">Action Required</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Origin Country (code)</label>
                    <Input value={newOrigin} onChange={(e) => setNewOrigin(e.target.value)} maxLength={2} required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Destination Country (code)</label>
                    <Input value={newDestination} onChange={(e) => setNewDestination(e.target.value)} maxLength={2} required />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Estimated Duties</label>
                  <Input value={newDuties} onChange={(e) => setNewDuties(e.target.value)} required />
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                  <Button type="submit">Create</Button>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
