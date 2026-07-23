import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { Button } from '@/components/ui/forms/button';
import { Input } from '@/components/ui/forms/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/forms/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/data-display/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/overlays/dialog';
import { fetchApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { 
  FileText, 
  Upload, 
  Paperclip, 
  Download, 
  CheckCircle, 
  XCircle, 
  FilePlus, 
  Eye, 
  History, 
  MessageSquare,
  Layers,
  User,
  ExternalLink,
  FileCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/data-display/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs';
import { FileDropzone } from './FileDropzone';
import * as idb from 'idb-keyval';

interface Document {
  id: string;
  shipmentId: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  uploadedBy: string;
  status: string;
  approvedBy?: string;
  rejectionReason?: string;
  version: number;
  parentDocumentId?: string;
  comments?: string;
  fileSize?: string;
  createdAt: string;
}

interface Template {
  id: string;
  name: string;
  type: string;
  content: string;
}

interface DocumentManagerProps {
  shipmentId: string;
  onUploadSuccess?: () => void;
}

export function DocumentManager({ shipmentId, onUploadSuccess }: DocumentManagerProps) {
  const { token, user, profile } = useAuth();
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<Document[]>([]);

  const getLocalizedDocType = (type: string) => {
    switch (type) {
      case 'Bill of Lading':
      case 'Bill of Lading (HBL)':
      case 'Bill of Lading (MBL)':
        return t('doc_types.hbl');
      case 'Air Waybill (AWB)':
        return t('doc_types.awb');
      case 'Commercial Invoice':
        return t('doc_types.invoice');
      case 'Packing List':
        return t('doc_types.packing_list');
      case 'Customs Form':
        return t('doc_types.customs_form');
      case 'Certificate of Origin':
        return t('doc_types.co');
      case 'Other':
      default:
        return t('doc_types.other');
    }
  };
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');
  
  // New Document upload state
  const [documentType, setDocumentType] = useState('Bill of Lading');
  const [fileName, setFileName] = useState('');
  const [fileBase64, setFileBase64] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [comments, setComments] = useState<string>('');

  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState('');
  
  // Create Template State
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateType, setNewTemplateType] = useState('HBL');
  const [newTemplateContent, setNewTemplateContent] = useState('');

  // Direct Revision Upload State
  const [revisionParentDoc, setRevisionParentDoc] = useState<Document | null>(null);
  const [isRevisionOpen, setIsRevisionOpen] = useState(false);
  const [revisionFileName, setRevisionFileName] = useState('');
  const [revisionComments, setRevisionComments] = useState('');
  const [revisionFileBase64, setRevisionFileBase64] = useState('');
  const [revisionFileSize, setRevisionFileSize] = useState('');
  const [isUploadingRevision, setIsUploadingRevision] = useState(false);

  // History Detail Dialog State
  const [historyDoc, setHistoryDoc] = useState<Document | null>(null);
  const [docHistoryList, setDocHistoryList] = useState<Document[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const fetchDocuments = async () => {
    if (!token || !shipmentId) return;
    setIsLoading(true);
    try {
      const data = await fetchApi(`/shipments/${shipmentId}/documents`, token);
      setDocuments(data || []);
      // Hybrid persistence: Save to IndexedDB for offline access
      try { await idb.set(`docs_${shipmentId}`, data || []); } catch(e) {}
    } catch (err) {
      console.error('Failed to fetch documents, trying offline cache', err);
      // Load from IndexedDB
      try {
        const cached = await idb.get(`docs_${shipmentId}`);
        if (cached) {
          setDocuments(cached);
          toast.info("Loaded documents from offline storage");
        }
      } catch(e) {}
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTemplates = async () => {
    if (!token) return;
    try {
      const data = await fetchApi('/documents/templates', token);
      setTemplates(data || []);
      try { await idb.set('doc_templates', data || []); } catch(e) {}
    } catch (err) {
      console.error('Failed to fetch templates, trying offline cache', err);
      try {
        const cached = await idb.get('doc_templates');
        if (cached) setTemplates(cached);
      } catch(e) {}
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchTemplates();
  }, [shipmentId, token]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, mode: 'new' | 'revision') => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0], mode);
    }
  };

  const handleFileSelected = (selectedFile: File, mode: 'new' | 'revision') => {
    const bytes = selectedFile.size;
    const formattedSize = bytes < 1024 * 1024 
      ? `${(bytes / 1024).toFixed(1)} KB` 
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (mode === 'new') {
        setFileBase64(reader.result as string);
        setFileSize(formattedSize);
        if (!fileName || fileName === revisionFileName) {
          setFileName(selectedFile.name);
        }
      } else {
        setRevisionFileBase64(reader.result as string);
        setRevisionFileSize(formattedSize);
        if (!revisionFileName) {
          setRevisionFileName(selectedFile.name);
        }
      }
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !fileName || !documentType) return;
    if (activeTab === 'upload' && !fileBase64) return;
    if (activeTab === 'template' && !selectedTemplate) return;
    
    setIsUploading(true);
    try {
      let finalFileUrl = fileBase64;
      
      if (activeTab === 'template') {
        const tpl = templates.find(t => t.id === selectedTemplate);
        if (tpl) {
          finalFileUrl = 'data:text/html;base64,' + btoa(unescape(encodeURIComponent(tpl.content)));
        }
      }
      
      await fetchApi(`/shipments/${shipmentId}/documents`, token, {
        method: 'POST',
        body: JSON.stringify({
          documentType,
          fileName,
          fileUrl: finalFileUrl,
          uploadedBy: user?.email || 'User',
          comments: comments || 'Initial upload',
          fileSize: fileSize || 'HTML Template',
          version: 1
        })
      });
      
      toast.success("Document added successfully");
      
      setFileBase64('');
      setFileName('');
      setComments('');
      setFileSize('');
      setIsDialogOpen(false);
      fetchDocuments();
      if (onUploadSuccess) onUploadSuccess();
    } catch (err: any) {
      toast.error(err.message || "An error occurred.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !revisionParentDoc || !revisionFileName || !revisionFileBase64) {
      toast.error('Choose a revision file and name');
      return;
    }

    setIsUploadingRevision(true);
    const parentId = revisionParentDoc.parentDocumentId || revisionParentDoc.id;

    try {
      await fetchApi(`/shipments/${shipmentId}/documents`, token, {
        method: 'POST',
        body: JSON.stringify({
          documentType: revisionParentDoc.documentType,
          fileName: revisionFileName,
          fileUrl: revisionFileBase64,
          uploadedBy: user?.email || 'System',
          comments: revisionComments || 'New revision added',
          fileSize: revisionFileSize,
          parentDocumentId: parentId
        })
      });

      toast.success(`New version successfully added`);
      setIsRevisionOpen(false);
      resetRevisionForm();
      fetchDocuments();
      if (onUploadSuccess) onUploadSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload revision");
    } finally {
      setIsUploadingRevision(false);
    }
  };

  const resetRevisionForm = () => {
    setRevisionFileName('');
    setRevisionComments('');
    setRevisionFileBase64('');
    setRevisionFileSize('');
    setRevisionParentDoc(null);
  };

  const handleOpenRevisionDialog = (doc: Document) => {
    setRevisionParentDoc(doc);
    setIsRevisionOpen(true);
  };

  const handleOpenHistory = (doc: Document) => {
    setHistoryDoc(doc);
    const rootId = doc.parentDocumentId || doc.id;
    const history = documents
      .filter(d => d.id === rootId || d.parentDocumentId === rootId)
      .sort((a, b) => b.version - a.version);
    setDocHistoryList(history);
    setIsHistoryOpen(true);
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newTemplateName || !newTemplateType || !newTemplateContent) return;
    
    try {
      await fetchApi('/documents/templates', token, {
        method: 'POST',
        body: JSON.stringify({
          name: newTemplateName,
          type: newTemplateType,
          content: newTemplateContent
        })
      });
      toast.success("Template created successfully");
      setIsCreatingTemplate(false);
      setNewTemplateName('');
      setNewTemplateContent('');
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.message || "Failed to create template");
    }
  };

  const handleApproval = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
      let reason = undefined;
      if (status === 'Rejected') {
        reason = prompt("Rejection Reason:");
        if (reason === null) return;
      }
      
      await fetchApi(`/documents/${id}/status`, token, {
        method: 'PUT',
        body: JSON.stringify({
          status,
          approvedBy: user?.email,
          rejectionReason: reason
        })
      });
      toast.success(`Document ${status.toLowerCase()} successfully`);
      fetchDocuments();
    } catch (e: any) {
      toast.error("Failed to update status: " + e.message);
    }
  };

  // Group and fetch only latest version of each document
  const getLatestDocumentsOnly = () => {
    const map = new Map<string, Document>();
    const sortedDocs = [...documents].sort((a, b) => {
      const vA = a.version || 1;
      const vB = b.version || 1;
      if (vA !== vB) return vA - vB;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    sortedDocs.forEach(doc => {
      const key = doc.parentDocumentId || doc.id;
      const existing = map.get(key);
      const docV = doc.version || 1;
      const extV = existing ? (existing.version || 1) : 0;
      if (!existing || docV > extV) {
        map.set(key, doc);
      }
    });

    return Array.from(map.values());
  };

  const getDocumentIcon = (type: string) => {
    const lower = type.toLowerCase();
    if (lower.includes('bill of lading') || lower.includes('bl')) {
      return <FileCheck className="w-4 h-4 text-blue-500" />;
    } else if (lower.includes('customs')) {
      return <FileText className="w-4 h-4 text-purple-500" />;
    } else if (lower.includes('invoice')) {
      return <FileText className="w-4 h-4 text-green-500" />;
    } else if (lower.includes('packing')) {
      return <FileText className="w-4 h-4 text-cyan-500" />;
    }
    return <FileText className="w-4 h-4 text-muted-foreground" />;
  };

  const isOperatorOrAdmin = profile?.role === 'Admin' || profile?.role === 'Operador';

  return (
    <Card className="h-full flex flex-col shadow-sm border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-4 bg-muted/20 shrink-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Paperclip className="w-5 h-5 text-indigo-500" /> Document Center
          </CardTitle>
          <CardDescription>Attach forms, generate templates, and manage document versions</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsTemplateDialogOpen(true)}>
            <FilePlus className="w-4 h-4" /> Templates
          </Button>
          <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => setIsDialogOpen(true)}>
            <Upload className="w-4 h-4" /> Add Document
          </Button>
        </div>
        
        {/* Document Upload Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Document</DialogTitle>
            </DialogHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload File</TabsTrigger>
                <TabsTrigger value="template">From Template</TabsTrigger>
              </TabsList>
              
              <form onSubmit={handleUpload} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('document_type', 'Document Type')}</label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('document_type', 'Select type')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bill of Lading">{t('doc_types.hbl')}</SelectItem>
                      <SelectItem value="Customs Form">{t('doc_types.customs_form')}</SelectItem>
                      <SelectItem value="Commercial Invoice">{t('doc_types.invoice')}</SelectItem>
                      <SelectItem value="Packing List">{t('doc_types.packing_list')}</SelectItem>
                      <SelectItem value="Certificate of Origin">{t('doc_types.co')}</SelectItem>
                      <SelectItem value="Other">{t('doc_types.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <TabsContent value="upload" className="space-y-4 mt-0">
                  <div className="space-y-2">
                    <FileDropzone 
                      onFileSelect={(file) => handleFileSelected(file, 'new')} 
                      accept=".pdf,.png,.jpg,.jpeg" 
                      fileSize={fileSize}
                      fileName={fileBase64 ? (fileName || "File selected") : undefined}
                      disabled={activeTab !== 'upload'}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="template" className="space-y-4 mt-0">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Template</label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate} required={activeTab === 'template'}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name} ({t.type})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Document Name</label>
                  <Input 
                    placeholder="e.g. HBL_12345.pdf" 
                    value={fileName} 
                    onChange={(e) => setFileName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Upload Comments</label>
                  <Input 
                    placeholder="e.g. Approved signature copy" 
                    value={comments} 
                    onChange={(e) => setComments(e.target.value)}
                  />
                </div>

                <div className="pt-2">
                  <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isUploading || (activeTab === 'upload' && !fileBase64) || (activeTab === 'template' && !selectedTemplate)}>
                    {isUploading ? 'Adding...' : 'Add Document'}
                  </Button>
                </div>
              </form>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Upload Revision Dialog */}
        <Dialog open={isRevisionOpen} onOpenChange={(open) => { setIsRevisionOpen(open); if(!open) resetRevisionForm(); }}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-500" />
                Upload Revised Version
              </DialogTitle>
              <CardDescription>
                Publishing a new revision for {revisionParentDoc?.fileName}. This increments the document's version number.
              </CardDescription>
            </DialogHeader>

            <form onSubmit={handleUploadRevision} className="space-y-4 pt-2">
              <div className="space-y-2">
                <FileDropzone 
                  onFileSelect={(file) => handleFileSelected(file, 'revision')}
                  accept=".pdf,.png,.jpg,.jpeg"
                  fileSize={revisionFileSize}
                  fileName={revisionFileBase64 ? (revisionFileName || "File selected") : undefined}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Revised Name Label</label>
                <Input 
                  placeholder="e.g. HBL_12345_REVISED.pdf" 
                  value={revisionFileName} 
                  onChange={(e) => setRevisionFileName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Change Notes / Comments</label>
                <textarea 
                  className="w-full h-20 p-2 text-sm rounded-md border border-input bg-background font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Explain why this revision is being uploaded..."
                  value={revisionComments}
                  onChange={(e) => setRevisionComments(e.target.value)}
                  required
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsRevisionOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isUploadingRevision}>
                  {isUploadingRevision ? 'Uploading Revision...' : 'Upload Revision'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Template List Dialog */}
        <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Document Templates</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">Manage dynamic HTML templates for documents like House Bill of Lading, Manifests, etc.</p>
              {templates.length === 0 ? (
                <div className="p-8 text-center border rounded-lg bg-muted/20">
                  <p className="text-muted-foreground mb-4">No templates found.</p>
                  <Button variant="outline" onClick={() => { setIsTemplateDialogOpen(false); setIsCreatingTemplate(true); }}>Create First Template</Button>
                </div>
              ) : (
                <>
                  <div className="flex justify-end mb-2">
                     <Button size="sm" onClick={() => { setIsTemplateDialogOpen(false); setIsCreatingTemplate(true); }}><FilePlus className="w-4 h-4 mr-2" /> New Template</Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Template Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.map(t => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell><Badge variant="secondary">{t.type}</Badge></TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => {
                               window.open('data:text/html;base64,' + btoa(unescape(encodeURIComponent(t.content))), '_blank');
                            }}>Preview</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Template Dialog */}
        <Dialog open={isCreatingTemplate} onOpenChange={setIsCreatingTemplate}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Create Document Template</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTemplate} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Template Name</label>
                  <Input 
                    placeholder="e.g. Standard HBL" 
                    value={newTemplateName} 
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Document Type</label>
                  <Select value={newTemplateType} onValueChange={setNewTemplateType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HBL">House Bill of Lading (HBL)</SelectItem>
                      <SelectItem value="MBL">Master Bill of Lading (MBL)</SelectItem>
                      <SelectItem value="Invoice">Commercial Invoice</SelectItem>
                      <SelectItem value="Customs">Customs Declaration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">HTML Content</label>
                <textarea 
                  className="w-full h-[300px] p-3 rounded-md border border-input bg-transparent text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                  placeholder="<h1>Bill of Lading</h1>..." 
                  value={newTemplateContent} 
                  onChange={(e) => setNewTemplateContent(e.target.value)}
                  required
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                 <Button type="button" variant="outline" onClick={() => { setIsCreatingTemplate(false); setIsTemplateDialogOpen(true); }}>Cancel</Button>
                 <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">Save Template</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Revision Timeline / History Dialog */}
        <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-500" />
                Revision History - {historyDoc?.fileName}
              </DialogTitle>
              <CardDescription>
                Full timeline of updates and revisions for this secure vault registry item.
              </CardDescription>
            </DialogHeader>

            <div className="relative border-l border-border pl-6 ml-3 mt-4 space-y-4">
              {docHistoryList.map((hist, index) => (
                <div key={hist.id} className="relative">
                  <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 bg-background flex items-center justify-center ${
                    index === 0 ? 'border-indigo-500' : 'border-zinc-300'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${index === 0 ? 'bg-indigo-500' : 'bg-zinc-400'}`} />
                  </div>

                  <div className="p-3 border rounded-xl space-y-2 bg-muted/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className="font-mono text-[10px]">Version v{hist.version}</Badge>
                        <span className="text-xs font-bold font-mono">{hist.fileName}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(hist.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-xs text-foreground bg-background/50 p-2 rounded border border-border/30 italic flex items-start gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <span>{hist.comments || 'No comment provided.'}</span>
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground font-mono">
                      <span>By: {hist.uploadedBy}</span>
                      <button 
                        onClick={() => window.open(hist.fileUrl, '_blank')}
                        className="text-indigo-500 font-bold hover:underline flex items-center gap-1"
                      >
                        Download v{hist.version} <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

      </CardHeader>
      
      <CardContent className="flex-1 overflow-auto p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
            Loading documents...
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-sm text-muted-foreground">
            <Paperclip className="w-8 h-8 mb-2 opacity-20" />
            <p>No documents attached</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="pl-6">Document</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getLatestDocumentsOnly().map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-2">
                      {getDocumentIcon(doc.documentType)}
                      <span className="font-medium text-sm truncate max-w-[120px] sm:max-w-[200px]" title={doc.fileName}>
                        {doc.fileName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{getLocalizedDocType(doc.documentType)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[10px] bg-indigo-50/5 text-indigo-500 border-indigo-500/10">
                      v{doc.version}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Badge variant={doc.status === 'Approved' ? 'default' : doc.status === 'Rejected' ? 'destructive' : 'outline'} className={doc.status === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
                        {doc.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end items-center gap-1">
                      {doc.status === 'Pending' && isOperatorOrAdmin && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleApproval(doc.id, 'Approved')} title="Approve">
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleApproval(doc.id, 'Rejected')} title="Reject">
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50" onClick={() => handleOpenHistory(doc)} title="Revision History">
                        <History className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" onClick={() => handleOpenRevisionDialog(doc)} title="Upload Revision">
                        <Upload className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => window.open(doc.fileUrl, '_blank')} title="View Document">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
