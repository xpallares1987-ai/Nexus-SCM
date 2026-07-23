import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { Button } from '@/components/ui/forms/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/data-display/table';
import { Badge } from '@/components/ui/data-display/badge';
import { Input } from '@/components/ui/forms/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs';
import { AuditTrailDashboard } from './AuditTrailDashboard';
import { SmartLettersOfCredit } from './SmartLettersOfCredit';
import { TariffScannerWidget } from './TariffScannerWidget';
import { DemurrageAlarmWidget } from './DemurrageAlarmWidget';
import { SanctionScreenerWidget } from './SanctionScreenerWidget';
import { EblNotaryWidget } from '../documents/EblNotaryWidget';
import { CryptographicExportWidget } from './CryptographicExportWidget';

import { useAuth } from '../../contexts/AuthContext';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import { 
  Shield, 
  FileCheck, 
  Search, 
  Plus, 
  Filter, 
  AlertTriangle, 
  Calendar, 
  Upload, 
  FileText, 
  Download, 
  Paperclip, 
  FileImage,
  RefreshCw,
  X,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileCode,
  ArrowRight,
  User,
  Info
} from 'lucide-react';

interface Shipment {
  id: string;
  referenceNumber: string;
  originPort: string;
  destinationPort: string;
  status: string;
}

interface ComplianceDoc {
  id: string;
  shipmentId: string | null;
  documentName: string;
  documentType: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  status: string;
  notes: string | null;
  uploadedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export function ComplianceModule() {
  const { token, user } = useAuth();
  
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'documents' | 'certifications'>('documents');
  
  // Data State
  const [documents, setDocuments] = useState<ComplianceDoc[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search & Filtering State
  const [docSearch, setDocSearch] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('All');
  const [docStatusFilter, setDocStatusFilter] = useState('All');
  
  // Certifications Search
  const [certSearch, setCertSearch] = useState('');
  const [certFilter, setCertFilter] = useState('All');

  // Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // File Upload Form State
  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [documentType, setDocumentType] = useState('Certificate of Origin');
  const [documentName, setDocumentName] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Static General Certifications (from original implementation)
  const [certifications, setCertifications] = useState([
    { id: 'CERT-001', name: 'AEO Certificate', type: 'Customs', entity: 'Maersk Logistics', issueDate: '2024-01-15', expiryDate: '2027-01-14', status: 'Valid' },
    { id: 'CERT-002', name: 'ISO 9001:2015', type: 'Quality', entity: 'Global Freight Ltd', issueDate: '2023-05-20', expiryDate: '2026-05-19', status: 'Valid' },
    { id: 'CERT-003', name: 'C-TPAT', type: 'Security', entity: 'FastTrack Shipping', issueDate: '2025-11-10', expiryDate: '2026-08-01', status: 'Expiring Soon' },
    { id: 'CERT-004', name: 'FDA Prior Notice', type: 'Regulatory', entity: 'HealthCorp Imports', issueDate: '2026-06-20', expiryDate: '2026-07-20', status: 'Valid' },
    { id: 'CERT-005', name: 'Phytosanitary Certificate', type: 'Health', entity: 'AgriExport Co', issueDate: '2025-02-11', expiryDate: '2026-02-11', status: 'Expired' },
    { id: 'CERT-006', name: 'Dangerous Goods Reg.', type: 'Safety', entity: 'ChemLogistics Inc', issueDate: '2024-03-01', expiryDate: '2025-03-01', status: 'Expired' },
    { id: 'CERT-007', name: 'IATA Agent Cert.', type: 'Industry', entity: 'AirFast Global', issueDate: '2025-01-01', expiryDate: '2026-01-01', status: 'Valid' },
    { id: 'CERT-008', name: 'TAPA FSR Class A', type: 'Security', entity: 'SecureStore Logistics', issueDate: '2024-08-15', expiryDate: '2027-08-15', status: 'Valid' },
    { id: 'CERT-009', name: 'FMC OTI License', type: 'Regulatory', entity: 'OceanGateway Co', issueDate: '2022-04-10', expiryDate: '2027-04-10', status: 'Valid' },
    { id: 'CERT-010', name: 'EU REACH Compliance', type: 'Regulatory', entity: 'EuroChemicals', issueDate: '2023-09-01', expiryDate: '2026-09-01', status: 'Expiring Soon' },
  ]);

  // Load Data
  const loadData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [fetchedDocs, fetchedShipments] = await Promise.all([
        fetchApi('/compliance/documents', token),
        fetchApi('/shipments', token)
      ]);
      setDocuments(fetchedDocs);
      setShipments(fetchedShipments);
    } catch (err: any) {
      console.error('Error loading compliance data:', err);
      toast.error('Failed to load compliance data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // File selection helpers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (!documentName) {
        setDocumentName(selectedFile.name);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      setFile(selectedFile);
      if (!documentName) {
        setDocumentName(selectedFile.name);
      }
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }
    if (!documentName.trim()) {
      toast.error('Please provide a document name');
      return;
    }

    setIsUploading(true);
    try {
      const base64Content = await convertToBase64(file);
      const payload = {
        shipmentId: selectedShipmentId || null,
        documentName,
        documentType,
        fileUrl: base64Content,
        fileSize: file.size,
        mimeType: file.type || 'application/pdf',
        notes: notes || null,
        uploadedBy: user?.email || 'User'
      };

      await fetchApi('/compliance/documents', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      toast.success('Regulatory document uploaded and associated successfully!');
      setIsUploadModalOpen(false);
      
      // Reset form
      setFile(null);
      setSelectedShipmentId('');
      setDocumentName('');
      setDocumentType('Certificate of Origin');
      setNotes('');

      // Reload
      loadData();
    } catch (err: any) {
      console.error('Error uploading document:', err);
      toast.error(err.message || 'Failed to upload compliance document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleStatusChange = async (docId: string, newStatus: string) => {
    if (!token) return;
    try {
      await fetchApi(`/compliance/documents/${docId}/status`, token, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      toast.success(`Document status updated to ${newStatus}`);
      
      // Locally update the status
      setDocuments(prev => prev.map(d => d.id === docId ? { ...d, status: newStatus } : d));
    } catch (err: any) {
      console.error('Failed to update status:', err);
      toast.error(err.message || 'Failed to update document status');
    }
  };

  const downloadDocument = (doc: ComplianceDoc) => {
    try {
      const link = document.createElement('a');
      link.href = doc.fileUrl;
      link.download = doc.documentName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Downloading ${doc.documentName}`);
    } catch (err) {
      console.error('Download failed:', err);
      toast.error('Failed to download document');
    }
  };

  // Metrics Calculations
  const totalRegulatoryDocs = documents.length;
  const pendingDocsCount = documents.filter(d => d.status === 'Pending Review').length;
  const approvedDocsCount = documents.filter(d => d.status === 'Approved').length;
  const rejectedDocsCount = documents.filter(d => d.status === 'Rejected').length;

  const totalActiveCertifications = certifications.filter(c => c.status === 'Valid').length;
  const expiringCertifications = certifications.filter(c => c.status === 'Expiring Soon').length;
  const expiredCertifications = certifications.filter(c => c.status === 'Expired').length;

  // Format Helper
  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mime?: string | null) => {
    if (!mime) return <FileText className="w-5 h-5 text-zinc-500" />;
    if (mime.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (mime.includes('image')) return <FileImage className="w-5 h-5 text-emerald-500" />;
    if (mime.includes('json') || mime.includes('xml')) return <FileCode className="w-5 h-5 text-blue-500" />;
    return <FileText className="w-5 h-5 text-zinc-500" />;
  };

  // Filter lists
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.documentName.toLowerCase().includes(docSearch.toLowerCase()) || 
                          doc.documentType.toLowerCase().includes(docSearch.toLowerCase()) ||
                          (doc.notes && doc.notes.toLowerCase().includes(docSearch.toLowerCase()));
    
    const matchesType = docTypeFilter === 'All' || doc.documentType === docTypeFilter;
    const matchesStatus = docStatusFilter === 'All' || doc.status === docStatusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const filteredCerts = certifications.filter(cert => {
    const matchesSearch = cert.name.toLowerCase().includes(certSearch.toLowerCase()) ||
                          cert.entity.toLowerCase().includes(certSearch.toLowerCase()) ||
                          cert.id.toLowerCase().includes(certSearch.toLowerCase());
    
    const matchesStatus = certFilter === 'All' || cert.status === certFilter;

    return matchesSearch && matchesStatus;
  });

  // Get Shipment Details Helper
  const getShipmentDetails = (shipmentId: string | null) => {
    if (!shipmentId) return null;
    return shipments.find(s => s.id === shipmentId);
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Trade Compliance</h2>
          <p className="text-muted-foreground">Manage and audit regulatory certifications, standards, and shipments documents.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsUploadModalOpen(true)} className="gap-2">
            <Upload className="w-4 h-4" />
            Attach Document
          </Button>
        </div>
      </div>

      <Tabs defaultValue="documents" className="space-y-6">
        <TabsList>
          <TabsTrigger value="documents">Compliance Documents</TabsTrigger>
          <TabsTrigger value="ebl">Blockchain E-B/L Notary</TabsTrigger>
          <TabsTrigger value="release">Cargo Release Security Gate</TabsTrigger>
          <TabsTrigger value="audit">Audit & Activity Trail</TabsTrigger>
          <TabsTrigger value="loc">Smart Letters of Credit</TabsTrigger>
          <TabsTrigger value="tariff">AI HS Code Scanner</TabsTrigger>
          <TabsTrigger value="demurrage">Detention & Demurrage Alarms</TabsTrigger>
          <TabsTrigger value="sanctions">OFAC Sanctions & SDN Screener</TabsTrigger>
          <TabsTrigger value="crypto-export">🔒 Sealed Audit Export</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-6 m-0">
      {/* Dynamic Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Attached Docs</p>
                <p className="text-3xl font-bold mt-2">{isLoading ? '...' : totalRegulatoryDocs}</p>
                <p className="text-xs text-muted-foreground mt-1">Regulatory files in vault</p>
              </div>
              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <Paperclip className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Review</p>
                <p className="text-3xl font-bold mt-2 text-amber-600">{isLoading ? '...' : pendingDocsCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Awaiting verification</p>
              </div>
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Approved Files</p>
                <p className="text-3xl font-bold mt-2 text-emerald-600">{isLoading ? '...' : approvedDocsCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Cleared and validated</p>
              </div>
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                <FileCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rejected Alerts</p>
                <p className="text-3xl font-bold mt-2 text-red-600">{isLoading ? '...' : rejectedDocsCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Action required</p>
              </div>
              <div className="p-2.5 bg-red-50 dark:bg-red-950/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('documents')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'documents'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Paperclip className="w-4 h-4" />
          Regulatory Documents ({documents.length})
        </button>
        <button
          onClick={() => setActiveTab('certifications')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'certifications'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Shield className="w-4 h-4" />
          Partner Certifications ({certifications.length})
        </button>
      </div>

      {/* TAB 1: REGULATORY DOCUMENTS VAULT */}
      {activeTab === 'documents' && (
        <Card className="shadow-sm border border-border">
          <CardHeader className="pb-3">
            <CardTitle>Regulatory Document Vault</CardTitle>
            <CardDescription>
              Upload official trade forms (PDFs/Images) and attach them to active shipment profiles to keep track of compliance status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name, notes, type..." 
                  className="pl-9 h-9" 
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Type:</span>
                  <select
                    value={docTypeFilter}
                    onChange={(e) => setDocTypeFilter(e.target.value)}
                    className="border border-input bg-transparent rounded-md text-xs px-2.5 py-1.5 outline-none dark:bg-zinc-900"
                  >
                    <option value="All">All Types</option>
                    <option value="Certificate of Origin">Certificate of Origin</option>
                    <option value="FDA Prior Notice">FDA Prior Notice</option>
                    <option value="Phytosanitary Certificate">Phytosanitary Certificate</option>
                    <option value="Dangerous Goods Declaration">Dangerous Goods</option>
                    <option value="AEO Certificate">AEO Certificate</option>
                    <option value="Customs Bond">Customs Bond</option>
                    <option value="EU REACH Certificate">EU REACH Certificate</option>
                    <option value="Other Regulatory">Other</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Status:</span>
                  <select
                    value={docStatusFilter}
                    onChange={(e) => setDocStatusFilter(e.target.value)}
                    className="border border-input bg-transparent rounded-md text-xs px-2.5 py-1.5 outline-none dark:bg-zinc-900"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Pending Review">Pending Review</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                {isLoading && (
                  <Button variant="ghost" size="sm" className="h-9 px-2.5">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  </Button>
                )}
              </div>
            </div>

            {/* Documents Table */}
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                <p className="text-sm font-medium">Fetching regulatory documents...</p>
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="py-12 border-2 border-dashed border-border rounded-xl text-center text-muted-foreground max-w-lg mx-auto my-4 p-6">
                <Paperclip className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                <h3 className="font-semibold text-foreground text-base mb-1">No Documents Found</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  {docSearch || docTypeFilter !== 'All' || docStatusFilter !== 'All' 
                    ? 'No regulatory documents match your current filter preferences.' 
                    : 'Get started by uploading and attaching your first trade regulatory document to an active shipment.'}
                </p>
                <Button size="sm" onClick={() => setIsUploadModalOpen(true)}>
                  <Upload className="w-3.5 h-3.5 mr-2" /> Upload Document
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto border border-border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="py-3">Document Name</TableHead>
                      <TableHead className="py-3">Associated Shipment</TableHead>
                      <TableHead className="py-3">File Metadata</TableHead>
                      <TableHead className="py-3">Uploaded By</TableHead>
                      <TableHead className="py-3">Status</TableHead>
                      <TableHead className="py-3 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocs.map((doc) => {
                      const shipmentDetails = getShipmentDetails(doc.shipmentId);
                      return (
                        <TableRow key={doc.id} className="hover:bg-muted/20">
                          {/* Name & Type */}
                          <TableCell className="align-top py-3.5">
                            <div className="flex items-start gap-2.5">
                              <div className="mt-0.5">{getFileIcon(doc.mimeType)}</div>
                              <div className="space-y-0.5">
                                <div className="font-semibold text-foreground text-sm leading-tight">{doc.documentName}</div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-1.5 py-0.5 rounded">
                                    {doc.documentType}
                                  </span>
                                </div>
                                {doc.notes && (
                                  <p className="text-xs text-muted-foreground line-clamp-1 italic max-w-xs mt-1" title={doc.notes}>
                                    "{doc.notes}"
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Associated Shipment */}
                          <TableCell className="align-top py-3.5">
                            {shipmentDetails ? (
                              <div className="space-y-0.5">
                                <div className="font-semibold text-sm text-foreground">{shipmentDetails.referenceNumber}</div>
                                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <span>{shipmentDetails.originPort}</span>
                                  <ArrowRight className="w-2.5 h-2.5" />
                                  <span>{shipmentDetails.destinationPort}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-zinc-400 italic">Unassigned Shipment</div>
                            )}
                          </TableCell>

                          {/* File Metadata */}
                          <TableCell className="align-top py-3.5">
                            <div className="space-y-0.5 font-mono text-[11px] text-muted-foreground">
                              <div>{formatFileSize(doc.fileSize)}</div>
                              <div className="truncate max-w-[120px]" title={doc.mimeType || ''}>
                                {doc.mimeType || 'unknown'}
                              </div>
                            </div>
                          </TableCell>

                          {/* Uploaded By */}
                          <TableCell className="align-top py-3.5">
                            <div className="space-y-0.5 text-xs">
                              <div className="flex items-center gap-1 text-foreground font-medium">
                                <User className="w-3 h-3 text-muted-foreground" />
                                <span className="truncate max-w-[110px]" title={doc.uploadedBy || 'System'}>
                                  {doc.uploadedBy || 'System'}
                                </span>
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {new Date(doc.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </TableCell>

                          {/* Status Badge */}
                          <TableCell className="align-top py-3.5">
                            <div className="space-y-1.5">
                              <Badge variant={
                                doc.status === 'Approved' ? 'default' : 
                                doc.status === 'Rejected' ? 'destructive' : 'secondary'
                              } className="text-[10px] font-semibold py-0.5 px-2 rounded-full">
                                {doc.status}
                              </Badge>

                              {/* Dropdown to switch status instantly */}
                              <div className="block">
                                <select
                                  value={doc.status}
                                  onChange={(e) => handleStatusChange(doc.id, e.target.value)}
                                  className="text-[10px] border border-border rounded px-1.5 py-0.5 bg-background text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                  <option value="Pending Review">Pending</option>
                                  <option value="Approved">Approve</option>
                                  <option value="Rejected">Reject</option>
                                </select>
                              </div>
                            </div>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="align-top py-3.5 text-right">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => downloadDocument(doc)}
                              className="h-8 gap-1.5"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 2: PARTNER CERTIFICATIONS & STANDARDS */}
      {activeTab === 'certifications' && (
        <Card className="shadow-sm border border-border">
          <CardHeader className="pb-3">
            <CardTitle>Certifications & Standards</CardTitle>
            <CardDescription>
              Track and audit active partner certificates, security credentials, and general regulatory authorizations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filter panel */}
            <div className="flex flex-col md:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search certifications..." 
                  className="pl-9 h-9" 
                  value={certSearch}
                  onChange={(e) => setCertSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={certFilter}
                  onChange={(e) => setCertFilter(e.target.value)}
                  className="border border-input bg-transparent rounded-md text-xs px-2.5 py-1.5 outline-none dark:bg-zinc-900"
                >
                  <option value="All">All Statuses</option>
                  <option value="Valid">Valid</option>
                  <option value="Expiring Soon">Expiring Soon</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="py-3">Cert ID</TableHead>
                    <TableHead className="py-3">Document Name</TableHead>
                    <TableHead className="py-3">Type</TableHead>
                    <TableHead className="py-3">Entity/Partner</TableHead>
                    <TableHead className="py-3">Issue Date</TableHead>
                    <TableHead className="py-3">Expiry Date</TableHead>
                    <TableHead className="py-3">Status</TableHead>
                    <TableHead className="py-3 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCerts.map((cert) => (
                    <TableRow key={cert.id} className="hover:bg-muted/20">
                      <TableCell className="font-semibold text-xs py-3.5">{cert.id}</TableCell>
                      <TableCell className="font-medium text-sm py-3.5 text-foreground">{cert.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground py-3.5">{cert.type}</TableCell>
                      <TableCell className="text-xs font-medium py-3.5">{cert.entity}</TableCell>
                      <TableCell className="text-xs text-muted-foreground py-3.5">{cert.issueDate}</TableCell>
                      <TableCell className="text-xs text-muted-foreground py-3.5">{cert.expiryDate}</TableCell>
                      <TableCell className="py-3.5">
                        <Badge variant={
                          cert.status === 'Valid' ? 'default' : 
                          cert.status === 'Expired' ? 'destructive' : 'secondary'
                        } className="text-[10px] font-semibold py-0.5 px-2 rounded-full">
                          {cert.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3.5 text-right">
                        <Button variant="ghost" size="sm" className="h-8">Audit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CUSTOM DRAG-AND-DROP FILE UPLOAD MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-foreground">Attach Regulatory Document</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Attach custom compliance documents with proper metadata to shipment profiles.</p>
              </div>
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUploadSubmit} className="space-y-4 pt-4 overflow-y-auto pr-1 flex-1">
              {/* Shipment selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Associate Shipment</label>
                <select
                  value={selectedShipmentId}
                  onChange={(e) => setSelectedShipmentId(e.target.value)}
                  className="w-full h-9 border border-input bg-background rounded-lg text-sm px-3 outline-none focus:border-ring focus:ring-1 focus:ring-ring dark:bg-zinc-900"
                >
                  <option value="">-- General Document / No Specific Shipment --</option>
                  {shipments.map(ship => (
                    <option key={ship.id} value={ship.id}>
                      {ship.referenceNumber} ({ship.originPort} &rarr; {ship.destinationPort})
                    </option>
                  ))}
                </select>
              </div>

              {/* Document Type select */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Document Type</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full h-9 border border-input bg-background rounded-lg text-sm px-3 outline-none focus:border-ring focus:ring-1 focus:ring-ring dark:bg-zinc-900"
                >
                  <option value="Certificate of Origin">Certificate of Origin</option>
                  <option value="FDA Prior Notice">FDA Prior Notice</option>
                  <option value="Phytosanitary Certificate">Phytosanitary Certificate</option>
                  <option value="Dangerous Goods Declaration">Dangerous Goods Declaration</option>
                  <option value="AEO Certificate">AEO Certificate</option>
                  <option value="Customs Bond">Customs Bond</option>
                  <option value="EU REACH Certificate">EU REACH Certificate</option>
                  <option value="Other Regulatory">Other Regulatory Form</option>
                </select>
              </div>

              {/* Drag-and-Drop Area */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Document File</label>
                
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all ${
                    isDragging 
                      ? 'border-blue-500 bg-blue-500/5 ring-4 ring-blue-500/10' 
                      : file 
                        ? 'border-emerald-500 bg-emerald-500/5' 
                        : 'border-border bg-background/50 hover:bg-background/80 hover:border-muted-foreground/40'
                  }`}
                  onClick={() => document.getElementById('compliance-file-input')?.click()}
                >
                  <input
                    id="compliance-file-input"
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  
                  {file ? (
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground truncate max-w-xs mx-auto">{file.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatFileSize(file.size)} • {file.type || 'unknown format'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                        className="text-xs font-semibold text-red-500 hover:text-red-600 inline-flex items-center gap-1 mt-1 hover:underline"
                      >
                        <X className="w-3 h-3" /> Remove File
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Drag and drop file here, or <span className="text-blue-600 dark:text-blue-400 hover:underline">browse</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Accepts PDF files and images up to 10MB</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Document Name input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Document Label</label>
                <Input
                  placeholder="e.g. Phytosanitary_CERT_EU"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  required
                  className="h-9"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Regulatory Notes / References</label>
                <textarea
                  placeholder="Include any customs reference codes, inspection numbers, or relevant clauses..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full min-h-[70px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-900"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={isUploading}
                  className="h-9"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isUploading || !file} 
                  className="h-9 min-w-[120px]"
                >
                  {isUploading ? (
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Uploading...
                    </span>
                  ) : (
                    'Attach to Profile'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
        </TabsContent>

        <TabsContent value="ebl" className="m-0">
          <EblNotaryWidget />
        </TabsContent>

        <TabsContent value="audit" className="m-0">
          <AuditTrailDashboard />
        </TabsContent>

        <TabsContent value="release" className="m-0">
          <CargoReleaseSecurityGate />
        </TabsContent>

        <TabsContent value="loc" className="m-0">
          <SmartLettersOfCredit />
        </TabsContent>

        <TabsContent value="tariff" className="m-0">
          <TariffScannerWidget />
        </TabsContent>

        <TabsContent value="demurrage" className="m-0">
          <DemurrageAlarmWidget />
        </TabsContent>

        <TabsContent value="sanctions" className="m-0">
          <SanctionScreenerWidget />
        </TabsContent>

        <TabsContent value="crypto-export" className="m-0">
          <CryptographicExportWidget />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Interactive Biometric Security Gate & Virtual MFA Cargo Release Component
import { Fingerprint, Lock, Unlock, ShieldAlert, Smartphone, Key, ShieldCheck, QrCode, CreditCard } from 'lucide-react';

interface ReleaseConsignment {
  id: string;
  value: string;
  description: string;
  depot: string;
  origin: string;
  destination: string;
  status: string;
  hbl: string;
  releasedAt?: string;
  verifiedBy?: string;
}

function CargoReleaseSecurityGate() {
  const { token } = useAuth();
  const [consignments, setConsignments] = useState<ReleaseConsignment[]>([
    {
      id: "FFW-2026-809",
      value: "$148,000",
      description: "Lithium-Ion Semiconductor Battery Packs",
      depot: "Rotterdam Depot Alpha",
      origin: "Shanghai (CNSHA)",
      destination: "Rotterdam (NLRTM)",
      status: "Awaiting Verification",
      hbl: "HBL-9041203"
    },
    {
      id: "FFW-2026-312",
      value: "$84,500",
      description: "Precision Electronic Engine Control Units (ECUs)",
      depot: "Munich Air Cargo Terminal 3",
      origin: "Miami (USMIA)",
      destination: "Frankfurt (DEFRA)",
      status: "Awaiting Verification",
      hbl: "HBL-8812034"
    },
    {
      id: "FFW-2026-441",
      value: "$52,000",
      description: "North apparel high-end designer wool garments",
      depot: "Paris Retail Distribution Hub",
      origin: "Hamburg (DEHAM)",
      destination: "Paris (FRCDG)",
      status: "Released & Dispatched",
      hbl: "HBL-7712398",
      releasedAt: "2026-07-18 14:32:11",
      verifiedBy: "biometric-fingerprint-mfa"
    }
  ]);

  const [activeRelease, setActiveRelease] = useState<any | null>(null);
  const [selectedPassShipment, setSelectedPassShipment] = useState<any | null>(null);
  const [passAdded, setPassAdded] = useState<boolean>(false);
  const [offlineBiometrics, setOfflineBiometrics] = useState<boolean>(true);
  const [mfaMethod, setMfaMethod] = useState<'fingerprint' | 'totp'>('fingerprint');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanVerified, setScanVerified] = useState(false);
  
  // TOTP Rolling States
  const [totpToken, setTotpToken] = useState('449 108');
  const [totpSeconds, setTotpSeconds] = useState(24);
  const [userCode, setUserCode] = useState('');
  const [totpVerified, setTotpVerified] = useState(false);

  // Periodic TOTP countdown generator
  useEffect(() => {
    const interval = setInterval(() => {
      setTotpSeconds(prev => {
        if (prev <= 1) {
          // Generate new token
          const part1 = Math.floor(100 + Math.random() * 900);
          const part2 = Math.floor(100 + Math.random() * 900);
          setTotpToken(`${part1} ${part2}`);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const startFingerprintScan = () => {
    setIsScanning(true);
    setScanProgress(0);
    setScanVerified(false);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setScanProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setIsScanning(false);
        setScanVerified(true);
        toast.success("Biometric Credential Key successfully verified (FIDO2/WebAuthn Token match).");
      }
    }, 200);
  };

  const verifyTotp = () => {
    const cleanUser = userCode.replace(/\s+/g, '');
    const cleanToken = totpToken.replace(/\s+/g, '');
    
    if (cleanUser === cleanToken) {
      setTotpVerified(true);
      toast.success("Virtual MFA TOTP token successfully authenticated.");
    } else {
      toast.error("Invalid MFA code. Please enter the active token from your authenticator app.");
    }
  };

  const handleFinalRelease = () => {
    if (!activeRelease) return;

    setConsignments(prev => prev.map(c => {
      if (c.id === activeRelease.id) {
        return {
          ...c,
          status: "Released & Dispatched",
          releasedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          verifiedBy: mfaMethod === 'fingerprint' ? 'biometric-credential-fido2' : 'virtual-totp-mfa'
        };
      }
      return c;
    }));

    toast.success(`Cargo digital release authorized for ${activeRelease.id}! Destination depot has been notified.`);
    
    // Automatically trigger Bank-backed Smart Letter of Credit auto-remittance API
    fetchApi('/compliance/loc/release', token, {
      method: 'POST',
      body: JSON.stringify({ 
        shipmentId: activeRelease.id, 
        verifiedBy: mfaMethod === 'fingerprint' ? 'FIDO2 Biometric Security Key' : 'Virtual TOTP MFA Token' 
      })
    }).then(res => {
      if (res && res.success) {
        toast.success(`Smart Letter of Credit: Automatically triggered $${res.loc.amount.toLocaleString()} SWIFT remittance to ${res.loc.shipper}!`);
      }
    }).catch(err => {
      console.warn("Letter of Credit automated remittance check complete.", err);
    });

    setActiveRelease(null);
    setScanVerified(false);
    setTotpVerified(false);
    setUserCode('');
  };

  return (
    <div className="space-y-6">
      <Card className="border border-indigo-100 dark:border-indigo-950/40 bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-indigo-500 animate-pulse" />
            <CardTitle>Biometric Security Gate for Cargo Release</CardTitle>
          </div>
          <CardDescription>
            Enforce Zero-Trust security rules on high-value shipping releases. Authorize digital release of freight consignments at target destination depots using modern security credential keys or virtual MFA.
          </CardDescription>
        </CardHeader>
        <CardContent>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shipment ID</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Goods Description</TableHead>
                <TableHead>Destination Depot</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Security Release</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consignments.map((con) => (
                <TableRow key={con.id}>
                  <TableCell className="font-mono font-bold text-xs">{con.id}</TableCell>
                  <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono text-xs">{con.value}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{con.description}</TableCell>
                  <TableCell className="text-xs">{con.depot}</TableCell>
                  <TableCell>
                    <Badge variant={con.status.startsWith('Released') ? 'default' : 'outline'} className="text-[10px] uppercase font-bold">
                      {con.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {con.status.startsWith('Released') ? (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex flex-col text-[10px] text-muted-foreground">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">RELEASED</span>
                          <span>{con.releasedAt}</span>
                          <span className="font-mono bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded text-[9px] w-fit mt-1">{con.verifiedBy}</span>
                        </div>
                        <Button
                          size="sm"
                          className="h-6 text-[9.5px] px-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 text-left justify-start"
                          variant="outline"
                          onClick={() => {
                            setSelectedPassShipment(con);
                            setPassAdded(false);
                          }}
                        >
                          <Smartphone className="w-3 h-3 mr-1 shrink-0" />
                          Driver Wallet Pass
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        className="text-xs h-8 gap-1 border-indigo-100 dark:border-indigo-950 hover:bg-indigo-50/20"
                        variant="outline"
                        onClick={() => {
                          setActiveRelease(con);
                          setScanVerified(false);
                          setTotpVerified(false);
                          setUserCode('');
                        }}
                      >
                        <Lock className="w-3.5 h-3.5 text-indigo-500" />
                        Unlock Release
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

        </CardContent>
      </Card>

      {/* Interactive Authentication Modal Gate */}
      {activeRelease && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl max-w-md w-full shadow-2xl overflow-hidden relative animate-in fade-in zoom-in duration-150">
            
            <div className="bg-indigo-950/20 p-5 border-b flex justify-between items-center">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Fingerprint className="w-5 h-5 animate-pulse" />
                <span className="font-bold text-sm">Biometric Cargo Release Gate</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-1 h-7 w-7 rounded-full" 
                onClick={() => setActiveRelease(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              
              {/* Target consignment overview */}
              <div className="bg-zinc-50 dark:bg-zinc-900/30 p-3.5 rounded-xl border space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">CONSIGNMENT UNDER AUDIT</span>
                <div className="flex items-center justify-between">
                  <strong className="text-sm font-mono text-foreground">{activeRelease.id}</strong>
                  <Badge variant="outline" className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">
                    Value: {activeRelease.value}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                  {activeRelease.description} (Bound for {activeRelease.depot})
                </p>
              </div>

              {/* MFA Selection tabs */}
              <div className="grid grid-cols-2 gap-2 border p-1 rounded-xl bg-zinc-100/50 dark:bg-zinc-900/40">
                <button
                  type="button"
                  className={`text-xs py-2 rounded-lg font-medium transition-all ${
                    mfaMethod === 'fingerprint' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setMfaMethod('fingerprint')}
                >
                  Credential key (TouchID)
                </button>
                <button
                  type="button"
                  className={`text-xs py-2 rounded-lg font-medium transition-all ${
                    mfaMethod === 'totp' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setMfaMethod('totp')}
                >
                  Google Authenticator
                </button>
              </div>

              {/* Method 1: Fingerprint scan animation */}
              {mfaMethod === 'fingerprint' && (
                <div className="flex flex-col items-center justify-center space-y-4">
                  <button
                    type="button"
                    onClick={startFingerprintScan}
                    disabled={isScanning || scanVerified}
                    className={`relative p-8 rounded-full border-2 transition-all group ${
                      scanVerified 
                        ? 'border-emerald-500 bg-emerald-50/20 text-emerald-600' 
                        : isScanning 
                        ? 'border-indigo-500 bg-indigo-50/20 text-indigo-500 animate-pulse' 
                        : 'border-zinc-300 hover:border-indigo-400 hover:bg-zinc-100/50 text-zinc-500'
                    }`}
                  >
                    <Fingerprint className="w-14 h-14" />
                    
                    {/* Live radial scanning overlay */}
                    {isScanning && (
                      <div 
                        className="absolute inset-0 rounded-full border-4 border-indigo-500 animate-ping opacity-60"
                        style={{ animationDuration: '1.2s' }}
                      />
                    )}
                  </button>

                  <div className="text-center">
                    <p className="text-xs font-semibold text-foreground">
                      {scanVerified 
                        ? "Biometric Access Cleared" 
                        : isScanning 
                        ? `Scanning Identity Fingerprint... (${scanProgress}%)` 
                        : "Hold / Click fingerprint scanner to scan"
                      }
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 max-w-xs">
                      Enforces WebAuthn FIDO2 public key validation on your local hardware module.
                    </p>
                  </div>
                </div>
              )}

              {/* Method 2: TOTP Input */}
              {mfaMethod === 'totp' && (
                <div className="space-y-4 flex flex-col items-center">
                  
                  {/* Rolling authenticator app emulator */}
                  <div className="border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl w-full bg-gradient-to-br from-card to-zinc-50/20 text-center relative overflow-hidden">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block mb-2">Simulated Authenticator App Token</span>
                    <strong className="text-3xl font-mono text-indigo-600 dark:text-indigo-400 tracking-wider block">{totpToken}</strong>
                    
                    <div className="flex items-center justify-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Rolling next token in <strong>{totpSeconds}s</strong></span>
                    </div>
                  </div>

                  <div className="w-full space-y-1.5">
                    <span className="text-xs font-semibold text-muted-foreground block mb-1">Enter Authenticator Security Code:</span>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={userCode}
                        onChange={(e) => setUserCode(e.target.value)}
                        placeholder="e.g. 449108"
                        className="text-xs text-center font-mono font-bold tracking-wider"
                        disabled={totpVerified}
                      />
                      <Button size="sm" onClick={verifyTotp} disabled={totpVerified || !userCode}>
                        {totpVerified ? <ShieldCheck className="w-4 h-4" /> : "Verify Code"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Verified Lock Status Panel & Submit */}
              <div className="border-t pt-5 mt-4 flex gap-3">
                <Button 
                  variant="outline" 
                  className="w-1/2 text-xs"
                  onClick={() => setActiveRelease(null)}
                >
                  Cancel
                </Button>
                <Button 
                  className="w-1/2 text-xs"
                  disabled={!(scanVerified || totpVerified)}
                  onClick={handleFinalRelease}
                >
                  <Unlock className="w-3.5 h-3.5 mr-1" />
                  Authorize Release
                </Button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Driver Mobile Wallet Gatepass Modal */}
      {selectedPassShipment && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden relative animate-in fade-in zoom-in duration-150 text-white">
            
            {/* Header / Brand */}
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs tracking-wider uppercase">SCM secure wallet pass</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-1 h-7 w-7 rounded-full text-zinc-400 hover:text-white" 
                onClick={() => setSelectedPassShipment(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-6 space-y-6 flex flex-col items-center">
              
              {/* Simulated Pass Layout */}
              <div className="w-full bg-gradient-to-b from-indigo-700 to-indigo-900 rounded-2xl p-4 shadow-xl border border-indigo-500/30 space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-10 -mt-10" />
                
                {/* Pass Header */}
                <div className="flex justify-between items-start border-b border-white/10 pb-2">
                  <div>
                    <span className="text-[8px] font-bold uppercase opacity-60 tracking-widest block">OPERATOR PASS</span>
                    <span className="text-xs font-extrabold tracking-tight">FFW FREIGHT GATEPASS</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-bold uppercase opacity-60 tracking-widest block">DEPOT CONTAINER RELEASE</span>
                    <span className="text-[10px] font-mono font-bold text-emerald-300">AUTHORIZED</span>
                  </div>
                </div>

                {/* Pass Fields */}
                <div className="grid grid-cols-2 gap-3 text-left text-white">
                  <div>
                    <span className="text-[8px] uppercase tracking-widest opacity-60 block">Consignment</span>
                    <strong className="text-xs font-mono tracking-tight block">{selectedPassShipment.id}</strong>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase tracking-widest opacity-60 block">HBL Reference</span>
                    <strong className="text-xs font-mono tracking-tight block">{selectedPassShipment.hbl}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[8px] uppercase tracking-widest opacity-60 block">Destination Release Depot</span>
                    <strong className="text-xs tracking-tight block truncate">{selectedPassShipment.depot}</strong>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase tracking-widest opacity-60 block">MFA Release Signature</span>
                    <strong className="text-[10px] font-mono tracking-tight text-indigo-200 block truncate">{selectedPassShipment.verifiedBy}</strong>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase tracking-widest opacity-60 block">Security Verification PIN</span>
                    <strong className="text-[10px] font-mono tracking-tight text-indigo-200 block">PIN-8841-SEC</strong>
                  </div>
                </div>

                {/* Simulated Barcode */}
                <div className="bg-white p-3 rounded-xl flex flex-col items-center justify-center space-y-1.5 shadow-inner">
                  <div className="flex items-center justify-center gap-0.5 h-10 w-full overflow-hidden">
                    {/* CSS styled barcode lines */}
                    {[2,4,1,3,2,1,4,2,3,1,2,4,1,3,2,1,4,2,3,1,2,4,1,3,2].map((w, idx) => (
                      <div 
                        key={idx} 
                        className="bg-black h-full" 
                        style={{ width: `${w}px` }} 
                      />
                    ))}
                  </div>
                  <span className="text-[9px] font-mono font-bold text-black tracking-widest uppercase font-bold">FFW-{selectedPassShipment.id}-SEC</span>
                </div>
              </div>

              {/* Action Badges / Add To Wallet buttons */}
              <div className="w-full space-y-3.5 text-white">
                
                {/* Offline gate matching toggle */}
                <div className="flex items-center justify-between bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
                  <div className="flex items-center gap-1.5">
                    <Fingerprint className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-semibold text-zinc-300">Offline Biometric Validation at Gate</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={offlineBiometrics} 
                    onChange={(e) => setOfflineBiometrics(e.target.checked)}
                    className="accent-emerald-500 rounded h-3.5 w-3.5 bg-zinc-800 border-zinc-700 cursor-pointer"
                  />
                </div>

                <p className="text-xs text-zinc-400 text-center">
                  Share this secure pass token directly with the transport driver to grant instant gate access.
                </p>

                {passAdded ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl p-3 text-center text-xs font-semibold flex items-center justify-center gap-1.5 animate-in fade-in duration-200">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Pass key added to Driver Mobile Wallet</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Apple Wallet Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setPassAdded(true);
                        toast.success("Gatepass successfully added to Apple Wallet secure container!");
                      }}
                      className="bg-black hover:bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 flex items-center justify-center gap-1.5 transition-all text-xs font-semibold text-white cursor-pointer"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,22C14.32,22.05 13.89,21.24 12.37,21.24C10.84,21.24 10.37,21.97 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.1,16.67C20.08,16.74 19.67,18.11 18.71,19.5M15.97,4.17C16.63,3.37 17.07,2.28 16.95,1C16,1.04 14.9,1.6 14.24,2.38C13.68,3.04 13.19,4.14 13.34,5.39C14.39,5.47 15.4,4.88 15.97,4.17Z" />
                      </svg>
                      <span>Apple Wallet</span>
                    </button>

                    {/* Google Wallet Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setPassAdded(true);
                        toast.success("Gatepass successfully added to Google Wallet secure storage!");
                      }}
                      className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl py-2 px-3 flex items-center justify-center gap-1.5 transition-all text-xs font-semibold text-white cursor-pointer"
                    >
                      <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-2 10H7v-2h10v2z" />
                      </svg>
                      <span>Google Wallet</span>
                    </button>
                  </div>
                )}

                <div className="border-t border-zinc-800 pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const pkpassData = {
                        passTypeIdentifier: "pass.com.ffw.gatepass",
                        serialNumber: `FFW-${selectedPassShipment.id}-SEC`,
                        teamIdentifier: "FFWTRADE88",
                        barcode: {
                          message: `FFW-${selectedPassShipment.id}-SEC`,
                          format: "PKBarcodeFormatPDF417",
                          messageEncoding: "iso-8859-1"
                        },
                        organizationName: "FFW Freight Forwarding",
                        description: "Offline Biometric Gatepass",
                        logoText: "FFW Secure release gate",
                        foregroundColor: "rgb(255, 255, 255)",
                        backgroundColor: "rgb(67, 56, 202)",
                        offlineBiometricValidation: offlineBiometrics ? "ENABLED" : "DISABLED",
                        consignment: selectedPassShipment.id,
                        destinationDepot: selectedPassShipment.depot,
                        authorizedSignature: selectedPassShipment.verifiedBy
                      };
                      const blob = new Blob([JSON.stringify(pkpassData, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = `${selectedPassShipment.id}_driver_gatepass.pkpass`;
                      link.click();
                      toast.success("Native PKPass secure configuration downloaded!");
                    }}
                    className="w-full text-[10px] h-8 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-zinc-400" />
                    Download Native PKPass Key File
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
