import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { Button } from '@/components/ui/forms/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/data-display/table';
import { Badge } from '@/components/ui/data-display/badge';
import { Label } from '@/components/ui/forms/label';
import { fetchApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  DollarSign, 
  Plus, 
  Send,
  ShieldCheck,
  Building,
  Scale,
  FileCheck
} from 'lucide-react';

interface Surcharge {
  name: string;
  amount: number;
  approved: boolean;
  reason: string;
}

interface AuditedInvoice {
  id: string;
  invoiceNumber: string;
  carrier: string;
  shipmentId: string;
  quotedAmount: number;
  billedAmount: number;
  discrepancyAmount: number;
  surchargesList: Surcharge[];
  status: 'FLAGGED_DISCREPANCY' | 'MATCHED_CLEARED' | 'DISPUTED';
  auditDate: string;
}

export function FreightInvoiceAuditor() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [auditedList, setAuditedList] = useState<AuditedInvoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<AuditedInvoice | null>(null);
  
  // Dispute state
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeLetter, setDisputeLetter] = useState<any>(null);

  const loadAudits = async () => {
    setLoading(true);
    try {
      const data = await fetchApi('/billing/reconciliation', token);
      if (Array.isArray(data)) {
        setAuditedList(data);
        if (data.length > 0 && !selectedInvoice) {
          setSelectedInvoice(data[0]);
        }
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to retrieve audited freight invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudits();
  }, []);

  const triggerDispute = async (inv: AuditedInvoice) => {
    setDisputeLoading(true);
    try {
      const reason = disputeReason || `Discrepancy of $${inv.discrepancyAmount} due to unauthorized surcharges: ${
        inv.surchargesList.filter(s => !s.approved).map(s => s.name).join(', ')
      }`;

      const res = await fetchApi('/billing/reconcile-invoice/dispute', token, {
        method: 'POST',
        body: JSON.stringify({
          invoiceNumber: inv.invoiceNumber,
          carrier: inv.carrier,
          disputeReason: reason,
          discrepantAmount: inv.discrepancyAmount
        })
      });

      if (res && res.success) {
        setDisputeLetter(res);
        toast.success(`Dispute letter dispatched! Ref: ${res.disputeRefCode}`);
        
        // Update local state to mark invoice as disputed
        setAuditedList(prev => prev.map(item => {
          if (item.id === inv.id) {
            return { ...item, status: 'DISPUTED' as const };
          }
          return item;
        }));
        setSelectedInvoice(prev => prev && prev.id === inv.id ? { ...prev, status: 'DISPUTED' as const } : prev);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to trigger dispute.');
    } finally {
      setDisputeLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'MATCHED_CLEARED':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Cleared & Matched</Badge>;
      case 'DISPUTED':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Dispute Raised</Badge>;
      default:
        return <Badge className="bg-rose-100 text-rose-800 border-rose-200">Flagged Variance</Badge>;
    }
  };

  // Metrics
  const totalAuditedCount = auditedList.length;
  const clearedCount = auditedList.filter(i => i.status === 'MATCHED_CLEARED').length;
  const varianceCount = auditedList.filter(i => i.status === 'FLAGGED_DISCREPANCY').length;
  const disputedCount = auditedList.filter(i => i.status === 'DISPUTED').length;

  return (
    <div className="space-y-6">
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-zinc-400">Total Audited</p>
              <h3 className="text-xl font-bold mt-1">{totalAuditedCount} Bills</h3>
            </div>
            <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
              <FileText className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-zinc-400">Auto-Cleared</p>
              <h3 className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{clearedCount} Bills</h3>
            </div>
            <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-zinc-400">Surcharge Variances</p>
              <h3 className="text-xl font-bold mt-1 text-rose-600 dark:text-rose-400">{varianceCount} Flagged</h3>
            </div>
            <div className="w-9 h-9 rounded-full bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-zinc-400">Disputes Active</p>
              <h3 className="text-xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">{disputedCount} Cases</h3>
            </div>
            <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Scale className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Ledger List */}
        <div className="lg:col-span-7">
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <div>
                <CardTitle className="text-base font-bold">Autonomous Match Ledger</CardTitle>
                <CardDescription>Reconciles carrier invoices against original contract quotes in real-time.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadAudits} disabled={loading} className="h-8">
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Audit Run
              </Button>
            </CardHeader>
            <CardContent className="p-0 border-t">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill Ref</TableHead>
                    <TableHead>Carrier</TableHead>
                    <TableHead className="text-right">Quoted</TableHead>
                    <TableHead className="text-right">Billed</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead>Audit Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-zinc-400">Reconciling carrier bills...</TableCell>
                    </TableRow>
                  ) : auditedList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-zinc-400">No audited invoices found.</TableCell>
                    </TableRow>
                  ) : (
                    auditedList.map((item) => (
                      <TableRow 
                        key={item.id} 
                        className={`cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 ${
                          selectedInvoice?.id === item.id ? 'bg-zinc-50 dark:bg-zinc-900 font-medium' : ''
                        }`}
                        onClick={() => {
                          setSelectedInvoice(item);
                          setDisputeLetter(null);
                          setDisputeReason('');
                        }}
                      >
                        <TableCell className="font-bold text-xs">{item.invoiceNumber}</TableCell>
                        <TableCell className="text-xs">{item.carrier}</TableCell>
                        <TableCell className="text-right text-xs font-mono">${item.quotedAmount.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-xs font-mono">${item.billedAmount.toFixed(2)}</TableCell>
                        <TableCell className={`text-right text-xs font-mono font-bold ${
                          item.discrepancyAmount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'
                        }`}>
                          ${item.discrepancyAmount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs">{getStatusBadge(item.status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Audit Details */}
        <div className="lg:col-span-5">
          {selectedInvoice ? (
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardHeader className="border-b bg-zinc-50/50 dark:bg-zinc-900/30">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {selectedInvoice.shipmentId}
                  </Badge>
                  {getStatusBadge(selectedInvoice.status)}
                </div>
                <CardTitle className="text-base font-bold mt-2">
                  Bill Audit: {selectedInvoice.invoiceNumber}
                </CardTitle>
                <CardDescription>
                  Issued by {selectedInvoice.carrier} on {new Date(selectedInvoice.auditDate).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                
                {/* Variance Display */}
                <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                  <div>
                    <span className="text-[9px] uppercase text-zinc-400 font-bold block">Quoted Amount</span>
                    <span className="text-sm font-bold font-mono text-zinc-700 dark:text-zinc-300">${selectedInvoice.quotedAmount.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-zinc-400 font-bold block">Carrier Bill</span>
                    <span className="text-sm font-bold font-mono text-zinc-800 dark:text-zinc-200">${selectedInvoice.billedAmount.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-zinc-400 font-bold block">Variance</span>
                    <span className={`text-sm font-bold font-mono ${
                      selectedInvoice.discrepancyAmount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'
                    }`}>
                      +${selectedInvoice.discrepancyAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Surcharge breakdown list */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Itemized Reconciliation Checklist</h4>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {selectedInvoice.surchargesList.map((s, idx) => (
                      <div key={idx} className="p-2.5 rounded border border-zinc-100 dark:border-zinc-800 text-xs flex justify-between gap-3 bg-zinc-50/30">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-bold">
                            {s.approved ? (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            )}
                            <span className={s.approved ? 'text-zinc-700 dark:text-zinc-300' : 'text-rose-700 dark:text-rose-400'}>
                              {s.name}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-400 leading-tight">{s.reason}</p>
                        </div>
                        <div className="text-right font-mono font-bold shrink-0 text-zinc-700 dark:text-zinc-300">
                          ${s.amount.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dispute actions */}
                {selectedInvoice.status === 'FLAGGED_DISCREPANCY' && (
                  <div className="border-t pt-4 space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="dispute-reason" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        Custom Dispute Argument (Optional)
                      </Label>
                      <textarea
                        id="dispute-reason"
                        placeholder="e.g. Challenging unscheduled demurrage fee since terminal delays were caused by carrier berthing delay."
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        className="w-full text-xs rounded-md border p-2 bg-background border-zinc-200 dark:border-zinc-800 focus:outline-none"
                        rows={2}
                      />
                    </div>

                    <Button 
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center gap-1.5 text-xs font-bold"
                      onClick={() => triggerDispute(selectedInvoice)}
                      disabled={disputeLoading}
                    >
                      {disputeLoading ? 'Generating Dispute Letter...' : 'Trigger Automated Rejection Dispute'}
                    </Button>
                  </div>
                )}

                {disputeLetter && (
                  <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-200 text-xs rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-800 dark:text-indigo-400 flex items-center gap-1">
                        <Send className="w-3.5 h-3.5 text-indigo-500" />
                        Dispute Letter Generated
                      </span>
                      <span className="font-mono text-[9px] text-indigo-500 font-bold">
                        {disputeLetter.disputeRefCode}
                      </span>
                    </div>
                    <pre className="text-[10px] font-mono leading-relaxed whitespace-pre-wrap bg-white dark:bg-zinc-950 p-2 rounded border border-indigo-100 overflow-x-auto max-h-[150px] text-zinc-600 dark:text-zinc-300">
                      {disputeLetter.letterBody}
                    </pre>
                  </div>
                )}

                {selectedInvoice.status === 'DISPUTED' && !disputeLetter && (
                  <div className="p-3 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-200 text-xs rounded-lg flex items-start gap-2.5">
                    <Building className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-blue-800 dark:text-blue-300">Automated Dispute Active</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5 leading-tight">
                        Dispute documents have been synced to the carrier's booking portal. Standard dispute processing window is 3-5 business days. No further action needed.
                      </p>
                    </div>
                  </div>
                )}

                {selectedInvoice.status === 'MATCHED_CLEARED' && (
                  <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200 text-xs rounded-lg flex items-start gap-2.5">
                    <FileCheck className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-emerald-800 dark:text-emerald-300">Billing Clear</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5 leading-tight">
                        Invoice is verified clean of any unapproved demurrage, wait fee, chassis split, or late gate retroactive charges. Ready for general ledger release.
                      </p>
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>
          ) : null}
        </div>

      </div>

    </div>
  );
}
