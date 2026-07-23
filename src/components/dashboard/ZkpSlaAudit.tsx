import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Binary, 
  Cpu, 
  CheckCircle2, 
  Sparkles, 
  RefreshCw, 
  FileCheck2, 
  UserCheck, 
  Network, 
  Scale, 
  ArrowRight, 
  HelpCircle,
  EyeOff,
  Terminal,
  Activity
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/data-display/card';
import { Badge } from '@/components/ui/data-display/badge';
import { Button } from '@/components/ui/forms/button';
import { toast } from 'sonner';

interface SlaAuditRecord {
  id: string;
  carrierId: string;
  carrierName: string;
  contractedTransitHours: number;
  actualTransitHours: number;
  contractRateCommitmentHash: string; // SHA-256 committing rate index
  privateInvoiceRate: number; // Hidden value
  proofStatus: 'Unproven' | 'Generating' | 'Verified' | 'Failed';
  verificationTimestamp?: string;
  proofSignature?: string;
}

export function ZkpSlaAudit() {
  const [selectedRecord, setSelectedRecord] = useState<SlaAuditRecord | null>(null);
  const [provingSpeed, setProvingSpeed] = useState<number>(3); // 1-5 multiplier
  const [auditorSubmissions, setAuditorSubmissions] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'auditor' | 'generator'>('generator');
  const [generatingForId, setGeneratingForId] = useState<string | null>(null);

  // Core SLA dataset containing sensitive data (e.g., private contract rates and actual speeds)
  const [auditRecords, setAuditRecords] = useState<SlaAuditRecord[]>([
    {
      id: 'SLA-101',
      carrierId: 'C-MAERSK',
      carrierName: 'Maersk Ocean Express',
      contractedTransitHours: 168,
      actualTransitHours: 162,
      contractRateCommitmentHash: '0x8f2c7da8211bfa9e394cf8119c824c8b2110ea0984cfb72110c283ea88f28fa1',
      privateInvoiceRate: 4850,
      proofStatus: 'Verified',
      verificationTimestamp: '2026-07-20 04:12:10 UTC',
      proofSignature: '0x3a4b...d89a'
    },
    {
      id: 'SLA-102',
      carrierId: 'C-DHL',
      carrierName: 'DHL Air Sustain Logistics',
      contractedTransitHours: 48,
      actualTransitHours: 46,
      contractRateCommitmentHash: '0x3df1b211fae019c824c8b2110ea098c4d2110ea09840217cfb210c283ea19fbb1',
      privateInvoiceRate: 12400,
      proofStatus: 'Unproven'
    },
    {
      id: 'SLA-103',
      carrierId: 'C-HAPAG',
      carrierName: 'Hapag-Lloyd Green Corridor',
      contractedTransitHours: 144,
      actualTransitHours: 149, // Over SLA!
      contractRateCommitmentHash: '0xae41f17faec119cc824d2110ea091bc3f211ea09848217cfb210a113ea22fa81',
      privateInvoiceRate: 5200,
      proofStatus: 'Unproven'
    },
    {
      id: 'SLA-104',
      carrierId: 'C-FEDEX',
      carrierName: 'FedEx Priority Sourcing',
      contractedTransitHours: 36,
      actualTransitHours: 35,
      contractRateCommitmentHash: '0x6b2210ea0984cfb72110c283ea88f28fa18f2c7da8211bfa9e394cf8119c824c8',
      privateInvoiceRate: 9800,
      proofStatus: 'Verified',
      verificationTimestamp: '2026-07-19 18:33:45 UTC',
      proofSignature: '0xf41c...aa1e'
    },
    {
      id: 'SLA-105',
      carrierId: 'C-MSC',
      carrierName: 'MSC Alliance Cargo',
      contractedTransitHours: 192,
      actualTransitHours: 188,
      contractRateCommitmentHash: '0xca71e211ea09848217cfb210a113ea22fa81ae41f17faec119cc824d2110ea091',
      privateInvoiceRate: 3950,
      proofStatus: 'Unproven'
    }
  ]);

  // Generate zero-knowledge groth16 snark proof simulations
  const handleGenerateProof = (record: SlaAuditRecord) => {
    setGeneratingForId(record.id);
    setAuditRecords(prev => prev.map(r => r.id === record.id ? { ...r, proofStatus: 'Generating' } : r));
    
    toast.info(`Spinning up zk-SNARK prover constraints for ${record.id}...`);

    setTimeout(() => {
      // Evaluate SLA constraints: 
      // Constraint 1: Actual Transit Hours <= Contracted Transit Hours
      // Constraint 2: Secret invoice rate matches Hash Commitment
      const meetsSla = record.actualTransitHours <= record.contractedTransitHours;
      
      setAuditRecords(prev => prev.map(r => {
        if (r.id === record.id) {
          return {
            ...r,
            proofStatus: meetsSla ? 'Verified' : 'Failed',
            verificationTimestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
            proofSignature: meetsSla ? `0x${Math.floor(Math.random()*1000000).toString(16)}zk...${Math.floor(Math.random()*10000).toString(16)}` : undefined
          };
        }
        return r;
      }));

      setGeneratingForId(null);
      if (meetsSla) {
        toast.success(`zk-SNARK proof of performance compiled successfully! Private rate & route nodes securely masked.`);
      } else {
        toast.error(`SLA breach detected! Proof generator rejected: actual hours exceeded contract limits.`);
      }
    }, 2500);
  };

  const submitProofToThirdPartyAuditor = (recordId: string) => {
    setAuditorSubmissions(prev => [...prev, recordId]);
    toast.success(`Cryptographic ZK audit proof for ${recordId} transmitted to external Freight Auditors secure portal.`);
  };

  return (
    <div className="space-y-6" id="zkp-sla-audits-dashboard">
      
      {/* Visual Cryptographic Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-500/10 via-purple-600/5 to-transparent p-5 rounded-2xl border border-indigo-500/20">
        <div className="flex items-start gap-3">
          <span className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl mt-0.5">
            <Lock className="w-5 h-5 animate-pulse" />
          </span>
          <div>
            <h2 className="text-lg font-black text-foreground flex items-center gap-1.5 leading-none">
              Zero-Knowledge Proof Carrier SLA Auditing
              <Badge className="bg-indigo-600 text-white text-[9px] font-black border-none px-2 h-4">
                Groth16 zk-SNARK
              </Badge>
            </h2>
            <p className="text-xs text-muted-foreground mt-1.5">
              Securely verify carrier performance bounds (Transit Duration & Rate compliance) for external freight auditors without revealing sensitive financials or proprietary routing.
            </p>
          </div>
        </div>
        <div className="flex gap-2 bg-zinc-50 dark:bg-zinc-900 border rounded-lg p-0.5 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('generator')}
            className={`px-3 py-1.5 text-xs font-black rounded-md transition-all flex items-center gap-1 ${
              activeTab === 'generator' ? 'bg-zinc-900 text-white dark:bg-zinc-800' : 'text-muted-foreground'
            }`}
          >
            <Binary className="w-3.5 h-3.5" /> Proof Generator
          </button>
          <button
            onClick={() => setActiveTab('auditor')}
            className={`px-3 py-1.5 text-xs font-black rounded-md transition-all flex items-center gap-1 ${
              activeTab === 'auditor' ? 'bg-zinc-900 text-white dark:bg-zinc-800' : 'text-muted-foreground'
            }`}
          >
            <Scale className="w-3.5 h-3.5" /> Auditor Portal
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LHS: Sla record ledger (Col Span 7) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border shadow-xs bg-white dark:bg-zinc-950">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-black flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-indigo-500" /> Active Carrier SLA Logs
              </CardTitle>
              <CardDescription className="text-xs">
                Performance audits requiring cryptographic proof production. Note that private cost indices are completely hidden from the proof payloads.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 divide-y">
              {auditRecords.map(record => {
                const isSelected = selectedRecord?.id === record.id;
                return (
                  <div 
                    key={record.id}
                    onClick={() => setSelectedRecord(record)}
                    className={`p-4 transition-all cursor-pointer flex items-center justify-between gap-4 ${
                      isSelected ? 'bg-indigo-50/20 dark:bg-indigo-950/20' : 'hover:bg-zinc-50/50'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black font-mono text-foreground">{record.id}</span>
                        <Badge variant="outline" className="text-[9px] py-0 px-1.5 h-4.5 font-bold">
                          {record.carrierName.split(' ')[0]}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 text-[11px] text-muted-foreground font-semibold">
                        <span>Contract hours: <strong className="text-zinc-800 dark:text-zinc-200">{record.contractedTransitHours}h</strong></span>
                        <span>Actual hours: <strong className={record.actualTransitHours > record.contractedTransitHours ? 'text-rose-500 font-extrabold' : 'text-emerald-500'}>{record.actualTransitHours}h</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <AnimatePresence mode="wait">
                        {record.proofStatus === 'Verified' ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-200 text-[10px] font-black h-6">
                            <ShieldCheck className="w-3.5 h-3.5 inline mr-1" /> VERIFIED SECURE
                          </Badge>
                        ) : record.proofStatus === 'Failed' ? (
                          <Badge className="bg-rose-500/10 text-rose-600 border border-rose-200 text-[10px] font-black h-6">
                            SLA BREACH
                          </Badge>
                        ) : record.proofStatus === 'Generating' ? (
                          <Badge className="bg-amber-500/10 text-amber-600 border border-amber-200 text-[10px] font-black h-6 animate-pulse">
                            <RefreshCw className="w-3 h-3 animate-spin mr-1 inline" /> PROVING
                          </Badge>
                        ) : (
                          <Badge className="bg-zinc-100 text-muted-foreground border text-[10px] font-bold h-6">
                            UNPROVEN
                          </Badge>
                        )}
                      </AnimatePresence>

                      <ArrowRight className="w-4 h-4 text-zinc-300" />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Cryptographic Proof Verification logic panel */}
          <Card className="border bg-zinc-50/30 dark:bg-zinc-900/10">
            <CardContent className="p-4 flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wide">How zk-SNARK SLA proof checks protect you</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Third-party logistics auditors typically request full invoice records and transit milestone schedules to confirm SLA adherence. Our ZKP compiler maps the carrier metrics into a arithmetic circuit, confirming performance parameters mathematically (e.g. Speed Constraint: <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 rounded">X &lt; SLA_LIMIT</code>) while outputting a verification signature. This allows full compliance checks while hiding the true invoice amounts and terminal nodes.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RHS: Interactive Interactive sandbox workspace (Col Span 5) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border border-indigo-100 dark:border-indigo-950 bg-indigo-50/5 dark:bg-indigo-950/10 shadow-xs">
            <CardHeader className="pb-2 border-b border-indigo-150/50">
              <CardTitle className="text-sm font-black text-indigo-900 dark:text-indigo-400 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-amber-500" /> zk-Circuit Compiler Workbench
              </CardTitle>
              <CardDescription className="text-xs text-indigo-700/80 dark:text-indigo-300/60">
                Setup circuit gates, hash public rates, and generate verifiable proof signatures.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {selectedRecord ? (
                <div className="space-y-4">
                  
                  {/* Selected overview */}
                  <div className="bg-white dark:bg-zinc-950 p-3 rounded-lg border space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground font-black uppercase">Active Audit Subject</span>
                      <Badge className="bg-indigo-100 text-indigo-800 text-[9px] font-black">{selectedRecord.id}</Badge>
                    </div>
                    <h3 className="text-sm font-black text-foreground">{selectedRecord.carrierName}</h3>
                  </div>

                  {/* Private Sensitive Data indicators */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-muted-foreground font-black uppercase block tracking-wider flex items-center gap-1">
                      <EyeOff className="w-3.5 h-3.5 text-indigo-500" /> Secret Inputs (Masked in Proof)
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                      <div className="p-2.5 bg-rose-50/20 dark:bg-rose-950/10 border border-rose-100/30 rounded-lg">
                        <span className="text-[9px] text-rose-500 block font-bold uppercase leading-none">Actual Speed</span>
                        <span className="text-base font-black text-foreground font-mono">{selectedRecord.actualTransitHours} hours</span>
                      </div>
                      <div className="p-2.5 bg-rose-50/20 dark:bg-rose-950/10 border border-rose-100/30 rounded-lg">
                        <span className="text-[9px] text-rose-500 block font-bold uppercase leading-none">Invoice rate</span>
                        <span className="text-base font-black text-foreground font-mono">${selectedRecord.privateInvoiceRate} USD</span>
                      </div>
                    </div>
                  </div>

                  {/* Public Inputs */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-muted-foreground font-black uppercase block tracking-wider">
                      Public Parameter Commitments (Visible)
                    </span>
                    <div className="p-3 bg-zinc-900 text-zinc-300 rounded-lg font-mono text-[9px] space-y-1.5 border border-zinc-800">
                      <div>
                        <span className="text-indigo-400">Public Transit Limit:</span> {selectedRecord.contractedTransitHours} hours
                      </div>
                      <div className="break-all">
                        <span className="text-indigo-400">Rate commitment SHA-256 hash:</span>
                        <p className="text-zinc-400 select-all">{selectedRecord.contractRateCommitmentHash}</p>
                      </div>
                    </div>
                  </div>

                  {/* Proof actions */}
                  <div className="pt-2 space-y-2">
                    {selectedRecord.proofStatus === 'Unproven' ? (
                      <Button
                        onClick={() => handleGenerateProof(selectedRecord)}
                        disabled={generatingForId !== null}
                        className="w-full bg-indigo-600 text-white hover:bg-indigo-700 font-bold flex items-center justify-center gap-1.5"
                      >
                        <Binary className="w-4 h-4" /> 
                        {generatingForId === selectedRecord.id ? 'Generating zk-SNARK...' : 'Generate Verifiable Proof'}
                      </Button>
                    ) : selectedRecord.proofStatus === 'Verified' ? (
                      <div className="space-y-3.5">
                        <div className="bg-emerald-500/10 border border-emerald-200/50 p-3 rounded-lg flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                          <div className="text-xs">
                            <p className="font-extrabold text-emerald-700 dark:text-emerald-400">SLA Proof Validated</p>
                            <p className="text-[10px] text-muted-foreground">Certified without exposing cost variables.</p>
                          </div>
                        </div>

                        {/* Signature Details */}
                        <div className="bg-zinc-950 p-3 rounded-lg text-[9px] font-mono text-zinc-400 space-y-1">
                          <p className="text-indigo-400 uppercase font-black text-[8px]">Verifiable Signature</p>
                          <p className="text-zinc-100">{selectedRecord.proofSignature}</p>
                          <p className="text-[8px] text-muted-foreground mt-1">Checked on EC pairings: G1 * G2</p>
                        </div>

                        {/* Submission trigger */}
                        {auditorSubmissions.includes(selectedRecord.id) ? (
                          <Button disabled className="w-full bg-emerald-500/20 text-emerald-600 font-bold border border-emerald-300 flex items-center justify-center gap-1.5">
                            <UserCheck className="w-4 h-4" /> Proof Filed to Auditor
                          </Button>
                        ) : (
                          <Button
                            onClick={() => submitProofToThirdPartyAuditor(selectedRecord.id)}
                            className="w-full bg-zinc-900 text-white hover:bg-zinc-800 font-bold flex items-center justify-center gap-1.5"
                          >
                            <UserCheck className="w-4 h-4" /> File Cryptographic Proof to Auditor
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="bg-rose-50/40 border border-rose-200 p-3 rounded-lg text-xs space-y-2">
                        <p className="font-black text-rose-600">SLA Proof Generation Rejected</p>
                        <p className="text-[10px] text-muted-foreground">
                          Carrier actual transit hours of <strong>{selectedRecord.actualTransitHours}h</strong> exceeded contracted hours (SLA of {selectedRecord.contractedTransitHours}h). Cryptographic circuit verification constraints unmet.
                        </p>
                        <Button 
                          onClick={() => {
                            // Reset state for trial
                            setAuditRecords(prev => prev.map(r => r.id === selectedRecord.id ? { ...r, actualTransitHours: r.contractedTransitHours - 4, proofStatus: 'Unproven' } : r));
                            setSelectedRecord(prev => prev ? { ...prev, actualTransitHours: prev.contractedTransitHours - 4, proofStatus: 'Unproven' } : null);
                            toast.success(`Simulated speed correction. SLA bounds satisfied.`);
                          }}
                          size="xs" 
                          variant="outline"
                          className="text-[9px] border-rose-200 text-rose-600 hover:bg-rose-100/10 font-bold"
                        >
                          Simulate Speed Correction (Force SLA Compliance)
                        </Button>
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
                  <KeyRound className="w-8 h-8 text-indigo-400 mx-auto" />
                  <p className="font-bold">Proof Setup Ready</p>
                  <p className="text-[10px]">Select any carrier SLA record on the left to review private metrics, construct public commitments, and compile proofs.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cryptographic Pairings Engine Log Console */}
          {selectedRecord && selectedRecord.proofStatus === 'Verified' && (
            <Card className="border bg-zinc-950 border-zinc-800 text-zinc-400">
              <CardContent className="p-4 space-y-3.5">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-[10px] font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-emerald-500" /> zk-SNARK Prover Engine Shell
                  </span>
                  <span className="text-[9px] text-zinc-500 font-mono font-bold">BN254 curve</span>
                </div>
                
                <div className="font-mono text-[9px] leading-relaxed space-y-1 select-all">
                  <p className="text-zinc-500">&gt; circom compile constraints.circom --r1cs --wasm</p>
                  <p className="text-zinc-400">Constraints check: Actual_Transit_Time &lt; SLA_Transit_Limit [OK]</p>
                  <p className="text-zinc-400">Hash commitment match: Hash(Invoice_Rate, Secret_Salt) === {selectedRecord.contractRateCommitmentHash.substring(0, 16)}... [OK]</p>
                  <p className="text-zinc-500">&gt; snarkjs groth16 setup verification_key.json</p>
                  <p className="text-zinc-400">Public inputs mapped: transitLimit={selectedRecord.contractedTransitHours}</p>
                  <p className="text-zinc-300 font-black text-emerald-500">Pairing Check valid: e(A, B) === e(α, β) * e(Public_Inputs, γ) [SUCCEEDED]</p>
                </div>
              </CardContent>
            </Card>
          )}

        </div>

      </div>

    </div>
  );
}
