import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/forms/button';
import { Badge } from '@/components/ui/data-display/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/data-display/table';
import { FileText, Download, Upload, Eye, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';

interface ShipmentDocument {
  id: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  uploadedBy: string;
  status: string;
  createdAt: string;
  fileSize?: string;
  extractedMetadata?: any;
}

const DOCUMENT_TYPES = [
  'Bill of Lading',
  'Commercial Invoice',
  'Packing List',
  'Certificate of Origin',
  'Customs Declaration',
  'Insurance Certificate',
  'Other'
];

export const ShipmentDocumentsTab: React.FC<{ shipmentId: string }> = ({ shipmentId }) => {
  const { token } = useAuth();
  const [documents, setDocuments] = useState<ShipmentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState('Bill of Lading');

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const data = await fetchApi(`/shipments/${shipmentId}/documents`, token);
      if (Array.isArray(data)) {
        setDocuments(data);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shipmentId) {
      fetchDocuments();
    }
  }, [shipmentId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large (max 5MB)');
      return;
    }

    setUploading(true);
    toast.loading('Uploading document...', { id: 'upload-doc' });

    try {
      const base64Url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const payload = {
        documentType: selectedType,
        fileName: file.name,
        fileUrl: base64Url,
        fileSize: `${(file.size / 1024).toFixed(1)} KB`,
        uploadedBy: 'System User',
      };

      await fetchApi(`/shipments/${shipmentId}/documents`, token, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      toast.success('Document uploaded successfully', { id: 'upload-doc' });
      fetchDocuments();
    } catch (e) {
      console.error(e);
      toast.error('Failed to upload document', { id: 'upload-doc' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold">Shipment Documents</h3>
          <p className="text-xs text-muted-foreground">Manage and view documents associated with this shipment</p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs border-zinc-200 dark:border-zinc-800 rounded-md p-1.5 bg-background"
          >
            {DOCUMENT_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <Button 
            size="sm" 
            className="text-xs flex items-center gap-2" 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Search className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Upload Document
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileChange} 
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
          />
        </div>
      </div>

      <div className="bg-background rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Document Type</TableHead>
              <TableHead className="text-xs">File Name</TableHead>
              <TableHead className="text-xs">Uploaded</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-xs text-muted-foreground">
                  Loading documents...
                </TableCell>
              </TableRow>
            ) : documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-xs text-muted-foreground">
                  No documents found for this shipment.
                </TableCell>
              </TableRow>
            ) : (
              documents.map(doc => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium text-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      {doc.documentType}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{doc.fileName}</span>
                      <span className="text-[10px] text-muted-foreground">{doc.fileSize || 'Unknown size'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={doc.status === 'Approved' ? 'default' : 'secondary'} className="text-[10px]">
                      {doc.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-indigo-500" 
                      onClick={() => {
                        const w = window.open('about:blank', '_blank');
                        if (w) {
                          if (doc.fileUrl.startsWith('data:')) {
                            w.document.write(`<iframe src="${doc.fileUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                          } else {
                            w.location.href = doc.fileUrl;
                          }
                        }
                      }}
                      title="View Document"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    {doc.fileUrl.startsWith('data:') && (
                      <a href={doc.fileUrl} download={doc.fileName} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 w-7">
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
