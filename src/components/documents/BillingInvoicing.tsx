import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { Button } from '@/components/ui/forms/button';
import { Input } from '@/components/ui/forms/input';
import { Label } from '@/components/ui/forms/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/forms/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/data-display/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/overlays/dialog';
import { Badge } from '@/components/ui/data-display/badge';
import { fetchApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { Receipt, Plus, DollarSign, FileText, Download, Scale, Users } from 'lucide-react';
import { FreightInvoiceAuditor } from './FreightInvoiceAuditor';
import { SplitPaymentWidget } from './SplitPaymentWidget';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs';

import { buttonVariants } from '@/components/ui/forms/button';

export function BillingInvoicing() {
  const { t } = useTranslation();
  const { token, profile } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [previewDoc, setPreviewDoc] = useState<{url: string, title: string} | null>(null);
  const [loading, setLoading] = useState(false);

  // New Invoice State
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    invoiceNumber: '',
    shipmentId: '',
    partyId: '',
    amount: '',
    currency: 'USD',
    dueDate: ''
  });

  // Payment State
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [invData, shipData, partyData, docData] = await Promise.all([
        fetchApi('/invoices', token),
        fetchApi('/shipments', token),
        fetchApi('/parties', token),
        fetchApi('/documents', token)
      ]);
      setInvoices(invData || []);
      setShipments(shipData || []);
      setParties(partyData || []);
      setDocuments(docData || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      await fetchApi('/invoices', token, {
        method: 'POST',
        body: JSON.stringify({
          ...newInvoice,
          amount: parseFloat(newInvoice.amount)
        })
      });
      toast.success('Invoice created successfully');
      setIsNewInvoiceOpen(false);
      setNewInvoice({ invoiceNumber: '', shipmentId: '', partyId: '', amount: '', currency: 'USD', dueDate: '' });
      loadData();
    } catch (err) {
      toast.error('Failed to create invoice');
    }
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !paymentInvoiceId) return;
    try {
      await fetchApi(`/invoices/${paymentInvoiceId}/payments`, token, {
        method: 'POST',
        body: JSON.stringify({
          amount: parseFloat(paymentAmount),
          currency: 'USD', // Simplified for now
          reference: paymentReference,
          method: paymentMethod
        })
      });
      toast.success('Payment registered successfully');
      setPaymentInvoiceId(null);
      setPaymentAmount('');
      setPaymentReference('');
      loadData();
    } catch (err) {
      toast.error('Failed to register payment');
    }
  };


  const exportInvoicesListPdf = () => {
    const doc = new jsPDF();
    doc.text('Invoices Report', 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [['Invoice #', 'Client', 'Shipment', 'Amount', 'Due Date', 'Status']],
      body: invoices.map(inv => [
        inv.invoiceNumber,
        getPartyName(inv.partyId),
        inv.shipmentId ? getShipmentRef(inv.shipmentId) : '-',
        `${parseFloat(inv.amount).toFixed(2)} ${inv.currency}`,
        new Date(inv.dueDate).toLocaleDateString(),
        inv.status
      ]),
    });
    doc.save('invoices_report.pdf');
  };

  const exportDocsListPdf = () => {
    const doc = new jsPDF();
    doc.text('Shipment Documentation Report', 14, 15);
    const docsToExport = documents.filter(d => d.documentType === 'BL' || d.fileName.toLowerCase().includes('bl'));
    autoTable(doc, {
      startY: 20,
      head: [['Document Name', 'Shipment', 'Uploaded By', 'Date']],
      body: docsToExport.map(doc => [
        doc.fileName,
        doc.shipmentId ? getShipmentRef(doc.shipmentId) : '-',
        doc.uploadedBy,
        new Date(doc.createdAt).toLocaleDateString()
      ]),
    });
    doc.save('documentation_report.pdf');
  };

  const exportSingleInvoicePdf = (inv: any) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(`INVOICE: ${inv.invoiceNumber}`, 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Client: ${getPartyName(inv.partyId)}`, 14, 32);
    doc.text(`Shipment Ref: ${inv.shipmentId ? getShipmentRef(inv.shipmentId) : '-'}`, 14, 40);
    doc.text(`Amount: ${parseFloat(inv.amount).toFixed(2)} ${inv.currency}`, 14, 48);
    doc.text(`Due Date: ${new Date(inv.dueDate).toLocaleDateString()}`, 14, 56);
    doc.text(`Status: ${inv.status}`, 14, 64);
    
    doc.save(`invoice_${inv.invoiceNumber}.pdf`);
  };

  const getPartyName = (id: string) => parties.find(p => p.id === id)?.companyName || 'Unknown';
  const getShipmentRef = (id: string) => shipments.find(s => s.id === id)?.referenceNumber || 'N/A';

  const isOperatorOrAdmin = profile?.role === 'Admin' || profile?.role === 'Operador';


  return (
    <div className="space-y-6">
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-4">
          <DialogHeader className="shrink-0 mb-2">
            <DialogTitle>{previewDoc?.title || 'Document Preview'}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-muted rounded-md border border-border overflow-hidden relative">
            {previewDoc && (
              <iframe 
                src={previewDoc.url} 
                className="w-full h-full border-none"
                title={previewDoc.title}
                sandbox="allow-same-origin allow-scripts"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t('billing', { defaultValue: 'Billing & Documentation' })}</h2>
          <p className="text-muted-foreground text-sm">Manage invoices, B/L documents, and client billing</p>
        </div>
        {isOperatorOrAdmin && (
          <Dialog open={isNewInvoiceOpen} onOpenChange={setIsNewInvoiceOpen}>
            <DialogTrigger className={buttonVariants()}>
              <Plus className="w-4 h-4 mr-2" /> New Invoice
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Invoice</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateInvoice} className="space-y-4">
                <div className="space-y-2">
                  <Label>Invoice Number</Label>
                  <Input value={newInvoice.invoiceNumber} onChange={e => setNewInvoice({...newInvoice, invoiceNumber: e.target.value})} required placeholder="INV-2023-001" />
                </div>
                <div className="space-y-2">
                  <Label>Shipment</Label>
                  <Select value={newInvoice.shipmentId} onValueChange={val => setNewInvoice({...newInvoice, shipmentId: val})}>
                    <SelectTrigger><SelectValue placeholder="Select Shipment (Optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {shipments.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.referenceNumber} - {s.status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Client (Party)</Label>
                  <Select value={newInvoice.partyId} onValueChange={val => setNewInvoice({...newInvoice, partyId: val})} required>
                    <SelectTrigger><SelectValue placeholder="Select Client" /></SelectTrigger>
                    <SelectContent>
                      {parties.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.companyName} ({p.category})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input type="number" step="0.01" value={newInvoice.amount} onChange={e => setNewInvoice({...newInvoice, amount: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={newInvoice.currency} onValueChange={val => setNewInvoice({...newInvoice, currency: val})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" value={newInvoice.dueDate} onChange={e => setNewInvoice({...newInvoice, dueDate: e.target.value})} required />
                </div>
                <Button type="submit" className="w-full">Create Invoice</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="invoices" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="bl-docs">Bills of Lading (B/L)</TabsTrigger>
          <TabsTrigger value="invoice-audits" className="flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-indigo-500" />
            Autonomous Freight Invoice Auditing
          </TabsTrigger>
          <TabsTrigger value="split-payment" className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-500" />
            Split-Payment Gateway
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Invoices</CardTitle>
                <CardDescription>All generated invoices and their statuses.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={exportInvoicesListPdf}>
                <Download className="w-4 h-4 mr-2" /> Export to PDF
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Shipment</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : invoices.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No invoices found.</TableCell></TableRow>
                  ) : (
                    invoices.map(inv => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          {inv.invoiceNumber}
                        </TableCell>
                        <TableCell>{getPartyName(inv.partyId)}</TableCell>
                        <TableCell>{inv.shipmentId ? getShipmentRef(inv.shipmentId) : '-'}</TableCell>
                        <TableCell>{parseFloat(inv.amount).toFixed(2)} {inv.currency}</TableCell>
                        <TableCell>{new Date(inv.dueDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            inv.status === 'Paid' ? 'bg-green-100 text-green-700' :
                            inv.status === 'Overdue' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          }>
                            {inv.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="mr-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            onClick={() => setPreviewDoc({url: `/api/invoices/${inv.id}/pdf?token=${token}`, title: `Invoice ${inv.invoiceNumber}`})}
                          >
                            Preview
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="mr-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                            onClick={() => exportSingleInvoicePdf(inv)}
                          >
                            PDF
                          </Button>
                          {inv.status !== 'Paid' && isOperatorOrAdmin && (
                            <Dialog open={paymentInvoiceId === inv.id} onOpenChange={(open) => {
                              if (open) {
                                setPaymentInvoiceId(inv.id);
                                setPaymentAmount(inv.amount);
                              } else {
                                setPaymentInvoiceId(null);
                              }
                            }}>
                              <DialogTrigger className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                                <DollarSign className="w-4 h-4 mr-1" /> Pay
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Register Payment</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleRegisterPayment} className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>Amount to Pay</Label>
                                    <Input type="number" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} required />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Payment Method</Label>
                                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                        <SelectItem value="Credit Card">Credit Card</SelectItem>
                                        <SelectItem value="Cash">Cash</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Reference (e.g. Transaction ID)</Label>
                                    <Input value={paymentReference} onChange={e => setPaymentReference(e.target.value)} placeholder="TXN-987654321" />
                                  </div>
                                  <Button type="submit" className="w-full">Register Payment</Button>
                                </form>
                              </DialogContent>
                            </Dialog>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bl-docs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Bills of Lading (B/L)</CardTitle>
                <CardDescription>Generated and uploaded B/L documents across all shipments.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={exportDocsListPdf}>
                <Download className="w-4 h-4 mr-2" /> Export to PDF
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Name</TableHead>
                    <TableHead>Shipment</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : documents.filter(d => d.documentType === 'BL' || d.fileName.toLowerCase().includes('bl')).length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No B/L documents found.</TableCell></TableRow>
                  ) : (
                    documents.filter(d => d.documentType === 'BL' || d.fileName.toLowerCase().includes('bl')).map(doc => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          {doc.fileName}
                        </TableCell>
                        <TableCell>{doc.shipmentId ? getShipmentRef(doc.shipmentId) : '-'}</TableCell>
                        <TableCell>{doc.uploadedBy}</TableCell>
                        <TableCell>{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="mr-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            onClick={() => setPreviewDoc({url: doc.fileUrl + (doc.fileUrl.includes("?") ? "&" : "?") + `token=${token}`, title: doc.fileName})}
                          >
                            Preview
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoice-audits" className="m-0">
          <FreightInvoiceAuditor />
        </TabsContent>

        <TabsContent value="split-payment" className="m-0">
          <SplitPaymentWidget />
        </TabsContent>
      </Tabs>
    </div>
  );
}
