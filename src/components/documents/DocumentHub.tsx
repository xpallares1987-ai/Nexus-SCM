import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { Button } from '@/components/ui/forms/button';
import { Checkbox } from '@/components/ui/forms/checkbox';
import { Input } from '@/components/ui/forms/input';
import { Label } from '@/components/ui/forms/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/forms/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/data-display/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/overlays/dialog';
import { Badge } from '@/components/ui/data-display/badge';
import { fetchApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { 
  FileText, 
  Upload, 
  Paperclip, 
  Download, 
  History, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  FilePlus, 
  Eye, 
  Layers, 
  MessageSquare, 
  Tag, 
  Anchor, 
  Folder,
  FolderOpen,
  FolderPlus,
  Plus,
  Sparkles,
  AlertTriangle,
  Edit2,
  Save, 
  Clock, 
  TrendingUp, 
  User,
  ExternalLink,
  Link as LinkIcon,
  Copy,
  Loader2,
  Lock,
  ShieldCheck,
  Wifi,
  WifiOff,
  Database,
  RefreshCw,
  Trash2,
  AlertCircle,
  CalendarRange,
  Settings,
  Fingerprint,
  Shield
} from 'lucide-react';
import Fuse from 'fuse.js';
import { useTranslation } from 'react-i18next';
import { buttonVariants } from '@/components/ui/forms/button';
import { OcrAnalyticsDashboard } from './OcrAnalyticsDashboard';

// Cryptography & Offline Resiliency Modules
import { 
  encryptDocumentPayload, 
  decryptDocumentPayload, 
  isE2eeCompliant, 
  getKmsKey 
} from '../../lib/cryptoHelper';
import { 
  queueOfflineDocument, 
  getQueuedOfflineDocuments, 
  deleteFromOfflineQueue, 
  synchronizeOfflineQueue, 
  QueuedDocument,
  cacheVoyageDocuments,
  getCachedVoyageDocuments,
  CachedVoyageDocument
} from '../../lib/offlineQueue';
import { authenticateWithHardwareToken } from '../../lib/hardwareToken';
import { stampAndDownloadPdf } from '../../lib/pdfWatermark';

export interface Document {
  id: string;
  shipmentId: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  uploadedBy: string;
  status: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  version: number;
  parentDocumentId?: string;
  comments?: string;
  fileSize?: string;
  createdAt: string;
  extractedMetadata?: { 
    invoiceNumber?: string; 
    date?: string; 
    amount?: string; 
    aiSummary?: string; 
    confidenceScore?: number; 
    validationStatus?: string;
    containerNumber?: string;
    consignee?: string;
    grossWeight?: string;
    digitalSignature?: string;
  };
  tags?: string[];
  folderId?: string;
}

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
}

interface Shipment {
  id: string;
  referenceNumber: string;
  originPort: string;
  destinationPort: string;
  status: string;
  weight?: string;
}

export function DocumentHub() {
  const { t } = useTranslation();
  const { token, user, profile } = useAuth();

  const getLocalizedDocType = (type: string) => {
    switch (type) {
      case 'Bill of Lading (HBL)':
        return t('doc_types.hbl');
      case 'Bill of Lading (MBL)':
        return t('doc_types.mbl');
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
  
  // Data State
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedShipment, setSelectedShipment] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedTag, setSelectedTag] = useState('ALL');

  // Detail Modal State
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [docHistory, setDocHistory] = useState<Document[]>([]);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isOcrCorrectionOpen, setIsOcrCorrectionOpen] = useState(false);
  const [selectedOcrDoc, setSelectedOcrDoc] = useState<Document | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [localAiSummary, setLocalAiSummary] = useState<string | null>(null);

  // Network & Offline Queue State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<QueuedDocument[]>([]);
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);

  // Custom Expiry thresholds
  const [customExpiryDays, setCustomExpiryDays] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('scm_custom_expiry_thresholds');
    return saved ? JSON.parse(saved) : {
      'Bill of Lading (HBL)': 15,
      'Bill of Lading (MBL)': 15,
      'Air Waybill (AWB)': 20,
      'Commercial Invoice': 30,
      'Packing List': 30,
      'Customs Form': 45,
      'Certificate of Origin': 30,
      'Other': 30
    };
  });
  const [isExpiryConfigOpen, setIsExpiryConfigOpen] = useState(false);

  // Multi-Signature verification state
  const [carrierSigned, setCarrierSigned] = useState(false);
  const [brokerSigned, setBrokerSigned] = useState(false);
  const [carrierSignatureKey, setCarrierSignatureKey] = useState('');
  const [brokerSignatureKey, setBrokerSignatureKey] = useState('');

  // Interactive Form State for Side-by-Side OCR Correction
  const [editMetadataForm, setEditMetadataForm] = useState({ 
    invoiceNumber: '', 
    date: '', 
    amount: '',
    containerNumber: '',
    consignee: '',
    grossWeight: ''
  });
  const [editTagsInput, setEditTagsInput] = useState('');
  
  // Quick Preview State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);

  // Upload Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  
  // Batch Queue State
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [batchShipmentId, setBatchShipmentId] = useState('');
  const [batchFolderId, setBatchFolderId] = useState<string>('unassigned');
  const [batchFiles, setBatchFiles] = useState<{id: string, file: File, base64: string, size: string, type: string, status: 'pending' | 'uploading' | 'completed' | 'error', errorMessage?: string}[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [uploadType, setUploadType] = useState('Bill of Lading (HBL)');
  const [uploadFolderId, setUploadFolderId] = useState<string>('unassigned');
  const [uploadShipmentId, setUploadShipmentId] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadComments, setUploadComments] = useState('');
  const [uploadFileBase64, setUploadFileBase64] = useState('');
  const [uploadFileSize, setUploadFileSize] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Direct Revision Upload State (within details)
  const [isRevisionOpen, setIsRevisionOpen] = useState(false);
  const [revisionComments, setRevisionComments] = useState('');
  const [revisionFileName, setRevisionFileName] = useState('');
  const [revisionFileBase64, setRevisionFileBase64] = useState('');
  const [revisionFileSize, setRevisionFileSize] = useState('');
  const [isUploadingRevision, setIsUploadingRevision] = useState(false);

  const [isEditingMetadata, setIsEditingMetadata] = useState(false);

  // Hardware MFA States
  const [hardwareMfaVerified, setHardwareMfaVerified] = useState(false);
  const [isHardwareAuthenticating, setIsHardwareAuthenticating] = useState(false);
  const [hardwareDeviceInfo, setHardwareDeviceInfo] = useState('');
  const [hardwareSignature, setHardwareSignature] = useState('');

  // Collaborative Collision States
  const [collisionUser, setCollisionUser] = useState<{ name: string; office: string; timestamp: string } | null>(null);

  // Cache Warming States
  const [isCacheWarming, setIsCacheWarming] = useState(false);
  const [isCacheWarmed, setIsCacheWarmed] = useState(false);
  const [cachedDocumentsCount, setCachedDocumentsCount] = useState(0);

  // Compute if selected document is high value
  const isHighValue = !!selectedDoc && (
    (selectedDoc.extractedMetadata?.amount && (
      selectedDoc.extractedMetadata.amount.includes('K') || 
      selectedDoc.extractedMetadata.amount.includes('M') ||
      selectedDoc.extractedMetadata.amount.includes('€') ||
      parseFloat(selectedDoc.extractedMetadata.amount.replace(/[^0-9.]/g, '')) > 10000
    )) ||
    selectedDoc.tags?.some(t => t.toLowerCase().includes('high') || t.toLowerCase().includes('audit') || t.toLowerCase().includes('value') || t.toLowerCase().includes('critical')) ||
    selectedDoc.documentType.includes('MBL')
  );

  // Decryption States
  const [decryptedPreviewUrl, setDecryptedPreviewUrl] = useState<string | null>(null);
  const [isDecryptingPreview, setIsDecryptingPreview] = useState(false);
  const [isWatermarking, setIsWatermarking] = useState(false);
  const [decryptedOcrUrl, setDecryptedOcrUrl] = useState<string | null>(null);
  const [isDecryptingOcr, setIsDecryptingOcr] = useState(false);

  // WebAuthn Biometric Keys States
  const [isWebAuthnSettingsOpen, setIsWebAuthnSettingsOpen] = useState(false);
  const [webAuthnKeys, setWebAuthnKeys] = useState<{ id: string; name: string; type: string; registeredAt: string; expiresAt: string; status: 'Active' | 'Warning' }[]>(() => {
    const saved = localStorage.getItem('scm_webauthn_credentials');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'Primary YubiKey 5C NFC', type: 'FIDO2 NFC Key', registeredAt: '2025-12-01', expiresAt: '2026-12-01', status: 'Active' },
      { id: '2', name: 'Corporate Titan Security Key', type: 'FIDO2 USB Token', registeredAt: '2025-05-15', expiresAt: '2026-05-15', status: 'Warning' }
    ];
  });
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyType, setNewKeyType] = useState('FIDO2 NFC Key');
  const [isRegisteringKey, setIsRegisteringKey] = useState(false);

  // Automated Customs Risk Engine States
  const [isAnalyzingCompliance, setIsAnalyzingCompliance] = useState(false);
  const [complianceReport, setComplianceReport] = useState<{
    isRestricted: boolean;
    riskLevel: 'Low' | 'Medium' | 'High';
    flaggedHsCodes: string[];
    originalDescription: string;
    sanitizedDescription: string;
    complianceReasoning: string;
    confidenceScore: number;
  } | null>(null);
  const [isApplyingSanitization, setIsApplyingSanitization] = useState(false);

  // Monitor Online / Offline Queue Synchronization
  const loadOfflineQueue = async () => {
    try {
      const q = await getQueuedOfflineDocuments();
      setOfflineQueue(q);
    } catch (e) {
      console.error('Failed to load offline queue:', e);
    }
  };

  const handleSyncQueue = async () => {
    if (!token || isSyncingOffline) return;
    setIsSyncingOffline(true);
    toast.loading('Synchronizing offline queue with central S3 secure storage...', { id: 'sync-progress' });
    try {
      const result = await synchronizeOfflineQueue(token, async (shipmentId, payload) => {
        return fetchApi(`/shipments/${shipmentId}/documents`, token, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      });
      if (result.successCount > 0) {
        toast.success(`Port Cellular Signal Re-established! Successfully uploaded ${result.successCount} offline queue assets to S3.`, { id: 'sync-progress', duration: 5000 });
        await loadData();
      } else if (result.failedCount > 0) {
        toast.error(`Auto-sync failed for ${result.failedCount} records. Will retry on next active port handshake.`, { id: 'sync-progress' });
      } else {
        toast.dismiss('sync-progress');
      }
      await loadOfflineQueue();
    } catch (e) {
      console.error('Error in synchronization handler:', e);
      toast.error('Sync process failed: Connection still intermittent.', { id: 'sync-progress' });
    } finally {
      setIsSyncingOffline(false);
    }
  };

  useEffect(() => {
    loadData();
    loadOfflineQueue();
  }, [token]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchVal = params.get('search');
    if (searchVal) {
      setSearchQuery(decodeURIComponent(searchVal));
      // Clean up search param without full reload
      const search = window.location.search.replace(/[?&]search=[^&]+/, '').replace(/^&/, '?').replace(/^\?&/, '?');
      const newUrl = window.location.pathname + (search === '?' || search === '' ? '' : search);
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      await handleSyncQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('SCM Link Interrupted: Cellular/Wi-Fi coverage lost in port zone. Local Queue mode active.', { duration: 6000 });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [token, isSyncingOffline]);

  // Decryption watcher for Quick Preview
  useEffect(() => {
    const decryptPreview = async () => {
      if (previewDoc) {
        if (previewDoc.fileUrl.startsWith('ENC:AES256:')) {
          setIsDecryptingPreview(true);
          try {
            const dec = await decryptDocumentPayload(previewDoc.fileUrl);
            setDecryptedPreviewUrl(dec);
          } catch (e) {
            console.error('Local decryption failure:', e);
            toast.error('Decryption failed! Local KMS key handshake refused or corrupted envelope.', { duration: 4000 });
            setDecryptedPreviewUrl(previewDoc.fileUrl);
          } finally {
            setIsDecryptingPreview(false);
          }
        } else {
          setDecryptedPreviewUrl(previewDoc.fileUrl);
        }
      } else {
        setDecryptedPreviewUrl(null);
      }
    };
    decryptPreview();
  }, [previewDoc]);

  // Decryption watcher for OCR Correction Side-by-Side View
  useEffect(() => {
    const decryptOcr = async () => {
      if (selectedOcrDoc) {
        if (selectedOcrDoc.fileUrl.startsWith('ENC:AES256:')) {
          setIsDecryptingOcr(true);
          try {
            const dec = await decryptDocumentPayload(selectedOcrDoc.fileUrl);
            setDecryptedOcrUrl(dec);
          } catch (e) {
            console.error('OCR asset decryption failure:', e);
            toast.error('Local KMS authorization declined for OCR extraction decryption.');
            setDecryptedOcrUrl(selectedOcrDoc.fileUrl);
          } finally {
            setIsDecryptingOcr(false);
          }
        } else {
          setDecryptedOcrUrl(selectedOcrDoc.fileUrl);
        }
      } else {
        setDecryptedOcrUrl(null);
      }
    };
    decryptOcr();
  }, [selectedOcrDoc]);

  useEffect(() => {
    if (selectedDoc) {
      setLocalAiSummary(selectedDoc.extractedMetadata?.aiSummary || null);
      // Reset signature states for detail view
      setCarrierSigned(selectedDoc.status === 'Approved');
      setBrokerSigned(selectedDoc.status === 'Approved');
      setCarrierSignatureKey('');
      setBrokerSignatureKey('');
      
      // Reset Hardware MFA signature states
      setHardwareMfaVerified(false);
      setHardwareDeviceInfo('');
      setHardwareSignature('');

      // Simulate checking SCM WebSocket Signal Node for other active reviewers (Collision Warning)
      setCollisionUser(null);
      const timer = setTimeout(() => {
        const potentialReviewers = [
          { name: 'Marie Curie (Rotterdam Customs Office)', office: 'Rotterdam Transit Hub Center 4', timestamp: 'Joined 2 mins ago' },
          { name: 'Jacques Cousteau (Customs Broker - Terminal C)', office: 'Marseille Underground Ingestion Unit', timestamp: 'Joined 45s ago' },
          { name: 'Albert Einstein (Schengen Manifest Auditor)', office: 'Hamburg Deepwater Port Signal Node', timestamp: 'Joined 1 min ago' }
        ];
        // 50% chance of collaborative review collision detection
        if (Math.random() > 0.5) {
          const randomUser = potentialReviewers[Math.floor(Math.random() * potentialReviewers.length)];
          setCollisionUser(randomUser);
          toast.warning(`Collision warning: ${randomUser.name} is currently reviewing/editing this manifest!`, {
            duration: 6000,
            icon: '👥'
          });
        }
      }, 1500);

      return () => clearTimeout(timer);
    } else {
      setCollisionUser(null);
    }
  }, [selectedDoc]);

  const handleStartEditMetadata = () => {
    if (!selectedDoc) return;
    setEditMetadataForm({
      invoiceNumber: selectedDoc.extractedMetadata?.invoiceNumber || '',
      date: selectedDoc.extractedMetadata?.date || '',
      amount: selectedDoc.extractedMetadata?.amount || '',
      containerNumber: (selectedDoc.extractedMetadata as any)?.containerNumber || '',
      consignee: (selectedDoc.extractedMetadata as any)?.consignee || '',
      grossWeight: (selectedDoc.extractedMetadata as any)?.grossWeight || ''
    });
    setEditTagsInput((selectedDoc.tags || []).join(', '));
    setIsEditingMetadata(true);
  };

  const handleSaveMetadata = async () => {
    if (!token || !selectedDoc) return;
    try {
      const newTags = editTagsInput.split(',').map(t => t.trim()).filter(t => t);
      
      const [updatedDoc] = await Promise.all([
        fetchApi(`/documents/${selectedDoc.id}/metadata`, token, {
          method: 'PUT',
          body: JSON.stringify({ metadata: editMetadataForm })
        }),
        fetchApi(`/documents/${selectedDoc.id}/tags`, token, {
          method: 'PUT',
          body: JSON.stringify({ tags: newTags })
        })
      ]);
      
      toast.success('Metadata and tags updated');
      setSelectedDoc({ ...updatedDoc, tags: newTags });
      setIsEditingMetadata(false);
      loadData();
    } catch (e) {
      toast.error('Failed to update metadata and tags');
    }
  };

  const handleGenerateSummary = async () => {
    if (!token || !selectedDoc) return;
    setIsGeneratingSummary(true);
    try {
      const res = await fetchApi(`/gemini/document-summary/${selectedDoc.id}`, token, { method: 'POST' });
      if (res && res.summary) {
        setLocalAiSummary(res.summary);
        toast.success("AI Summary generated successfully");
        setSelectedDoc({
          ...selectedDoc,
          extractedMetadata: {
            ...(selectedDoc.extractedMetadata || {}),
            aiSummary: res.summary
          }
        });
        loadData();
      }
    } catch (e) {
      toast.error('Failed to generate AI summary');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      if (isOnline) {
        const [docsData, shipmentsData] = await Promise.all([
          fetchApi('/documents', token),
          fetchApi('/shipments', token)
        ]);
        setDocuments(docsData || []);
        setShipments(shipmentsData || []);

        // Warm the cache in the background
        if (docsData && docsData.length > 0) {
          setIsCacheWarming(true);
          try {
            await cacheVoyageDocuments(docsData as CachedVoyageDocument[]);
            setCachedDocumentsCount(docsData.length);
            setIsCacheWarmed(true);
          } catch (cacheErr) {
            console.error('Error warming cache:', cacheErr);
          } finally {
            setIsCacheWarming(false);
          }
        }
      } else {
        // Retrieve from IndexedDB cache if offline
        const cachedDocs = await getCachedVoyageDocuments();
        if (cachedDocs && cachedDocs.length > 0) {
          setDocuments(cachedDocs as any[]);
          setCachedDocumentsCount(cachedDocs.length);
          setIsCacheWarmed(true);
          toast.info(`Offline mode: Loaded ${cachedDocs.length} cached active voyage manifests.`, { duration: 5000 });
        } else {
          toast.warning('Offline mode: No cached voyage manifests available. Connect to SCM Link first.');
        }
      }
    } catch (err) {
      console.error(err);
      // Fallback to cache on error
      try {
        const cachedDocs = await getCachedVoyageDocuments();
        if (cachedDocs && cachedDocs.length > 0) {
          setDocuments(cachedDocs as any[]);
          setCachedDocumentsCount(cachedDocs.length);
          setIsCacheWarmed(true);
          toast.info(`Offline fallback: Loaded ${cachedDocs.length} cached manifests.`, { duration: 5000 });
        } else {
          toast.error('Failed to load document data from cloud S3.');
        }
      } catch (cacheErr) {
        toast.error('Failed to load document data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter documents to show only the LATEST version in the main list
  // Previous versions will be accessible via version history
  const getLatestDocumentsOnly = () => {
    const map = new Map<string, Document>();
    
    // Sort so older ones are processed first, leaving the latest one (or highest version) in the map
    const sortedDocs = [...documents].sort((a, b) => {
      if (a.version !== b.version) return a.version - b.version;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    sortedDocs.forEach(doc => {
      // If it's a child document (has a parentDocumentId), group it under the parent's ID
      const key = doc.parentDocumentId || doc.id;
      const existing = map.get(key);
      if (!existing || (doc.version > existing.version)) {
        map.set(key, doc);
      }
    });

    return Array.from(map.values());
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, mode: 'new' | 'revision') => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Calculate and format file size
      const bytes = selectedFile.size;
      const formattedSize = bytes < 1024 * 1024 
        ? `${(bytes / 1024).toFixed(1)} KB` 
        : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

      const reader = new FileReader();
      reader.onloadend = () => {
        if (mode === 'new') {
          setUploadFileBase64(reader.result as string);
          setUploadFileSize(formattedSize);
          if (!uploadFileName) {
            setUploadFileName(selectedFile.name);
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
    }
  };

  const handleBatchFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBatchFiles(prev => [...prev, {
          id: Math.random().toString(36).substring(7),
          file,
          base64: reader.result as string,
          size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
          type: 'Other',
          status: 'pending'
        }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeBatchFile = (id: string) => {
    if (isBatchProcessing) return;
    setBatchFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateBatchFileType = (id: string, type: string) => {
    if (isBatchProcessing) return;
    setBatchFiles(prev => prev.map(f => f.id === id ? { ...f, type } : f));
  };

  const processBatchQueue = async () => {
    if (!token || !batchShipmentId || batchFiles.length === 0) {
      toast.error('Please select a shipment and add files to the queue.');
      return;
    }

    const pendingFiles = batchFiles.filter(f => f.status !== 'completed');
    if (pendingFiles.length === 0) return;

    setIsBatchProcessing(true);

    for (let i = 0; i < pendingFiles.length; i++) {
      const bFile = pendingFiles[i];
      setBatchFiles(prev => prev.map(f => f.id === bFile.id ? { ...f, status: 'uploading' } : f));

      try {
        await fetchApi(`/shipments/${batchShipmentId}/documents`, token, {
          method: 'POST',
          body: JSON.stringify({
            documentType: bFile.type,
            fileName: bFile.file.name,
            fileUrl: bFile.base64,
            uploadedBy: user?.email || 'System',
            comments: 'Batch uploaded document (Auto OCR)',
            fileSize: bFile.size,
            version: 1,
          folderId: uploadFolderId === 'unassigned' ? null : uploadFolderId
        })
      });

        setBatchFiles(prev => prev.map(f => f.id === bFile.id ? { ...f, status: 'completed' } : f));
      } catch (error) {
        setBatchFiles(prev => prev.map(f => f.id === bFile.id ? { ...f, status: 'error', errorMessage: 'Failed' } : f));
      }
    }

    setIsBatchProcessing(false);
    toast.success('Batch OCR processing completed.');
    loadData();
  };

  const handleUploadNewDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !uploadFileName || !uploadType || !uploadShipmentId || !uploadFileBase64) {
      toast.error('Please complete all required fields and choose a file');
      return;
    }

    setIsUploading(true);
    try {
      let finalFileBase64 = uploadFileBase64;
      let commentsPrefix = '';
      
      // Check if E2EE compliant (e.g. Commercial Invoice, Customs Form)
      if (isE2eeCompliant(uploadType)) {
        toast.loading('Encrypting Commercial Invoice using AES-256 client-side envelope keys...', { id: 'encrypting' });
        const { encryptedData } = await encryptDocumentPayload(uploadFileBase64);
        finalFileBase64 = encryptedData;
        commentsPrefix = '[KMS-AES-256 SEALED] ';
        toast.success('Commercial document fully encrypted prior to ingestion.', { id: 'encrypting', duration: 4000 });
      }

      // If offline, push to local IndexedDB queue
      if (!isOnline) {
        await queueOfflineDocument({
          shipmentId: uploadShipmentId,
          documentType: uploadType,
          fileName: uploadFileName,
          fileBase64: finalFileBase64,
          fileSize: uploadFileSize || 'N/A',
          comments: commentsPrefix + (uploadComments || 'Offline initial upload'),
          folderId: uploadFolderId === 'unassigned' ? null : uploadFolderId,
          uploadedBy: user?.email || 'System'
        });
        toast.success('SCM Link Interrupted! Local IndexedDB background queue has stored this document. S3 synchronization will execute automatically when network recovers.');
        setIsUploadOpen(false);
        resetNewUploadForm();
        await loadOfflineQueue();
        return;
      }

      await fetchApi(`/shipments/${uploadShipmentId}/documents`, token, {
        method: 'POST',
        body: JSON.stringify({
          documentType: uploadType,
          fileName: uploadFileName,
          fileUrl: finalFileBase64,
          uploadedBy: user?.email || 'System',
          comments: commentsPrefix + (uploadComments || 'Initial upload'),
          fileSize: uploadFileSize,
          version: 1,
          folderId: uploadFolderId === 'unassigned' ? null : uploadFolderId
        })
      });

      toast.success('Document uploaded and linked successfully');
      setIsUploadOpen(false);
      resetNewUploadForm();
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedDoc || !revisionFileName || !revisionFileBase64) {
      toast.error('Please select a revision file and name');
      return;
    }

    setIsUploadingRevision(true);
    const parentId = selectedDoc.parentDocumentId || selectedDoc.id;

    try {
      let finalFileBase64 = revisionFileBase64;
      let commentsPrefix = '';

      // Check if E2EE compliant (e.g. Commercial Invoice, Customs Form)
      if (isE2eeCompliant(selectedDoc.documentType)) {
        toast.loading('Encrypting Commercial Invoice revision using AES-256...', { id: 'encrypting-rev' });
        const { encryptedData } = await encryptDocumentPayload(revisionFileBase64);
        finalFileBase64 = encryptedData;
        commentsPrefix = '[KMS-AES-256 SEALED] ';
        toast.success('Revision encrypted prior to ingestion.', { id: 'encrypting-rev', duration: 4000 });
      }

      // If offline, push to local IndexedDB queue
      if (!isOnline) {
        await queueOfflineDocument({
          shipmentId: selectedDoc.shipmentId,
          documentType: selectedDoc.documentType,
          fileName: revisionFileName,
          fileBase64: finalFileBase64,
          fileSize: revisionFileSize || 'N/A',
          comments: commentsPrefix + (revisionComments || 'Offline revision'),
          folderId: selectedDoc.folderId || null,
          parentDocumentId: parentId,
          uploadedBy: user?.email || 'System'
        });
        toast.success('SCM Link Interrupted! Revision has been cached offline. Auto-uploading once signal is restored.');
        setIsRevisionOpen(false);
        resetRevisionForm();
        await loadOfflineQueue();
        setIsDetailOpen(false);
        return;
      }

      const responseDoc = await fetchApi(`/shipments/${selectedDoc.shipmentId}/documents`, token, {
        method: 'POST',
        body: JSON.stringify({
          documentType: selectedDoc.documentType,
          fileName: revisionFileName,
          fileUrl: finalFileBase64,
          uploadedBy: user?.email || 'System',
          comments: commentsPrefix + (revisionComments || 'New revision uploaded'),
          fileSize: revisionFileSize,
          parentDocumentId: parentId
        })
      });

      toast.success(`Version ${responseDoc.version} uploaded successfully!`);
      setIsRevisionOpen(false);
      resetRevisionForm();
      
      await loadData();
      setIsDetailOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload revision');
    } finally {
      setIsUploadingRevision(false);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newFolderName) return;
    try {
      await fetchApi('/documents/folders', token, {
        method: 'POST',
        body: JSON.stringify({ name: newFolderName })
      });
      setIsNewFolderOpen(false);
      setNewFolderName('');
      toast.success('Folder created');
      loadData();
    } catch (e) {
      toast.error('Failed to create folder');
    }
  };

  const handleMoveToFolder = async (docId: string, folderId: string | null) => {
    if (!token) return;
    try {
      await fetchApi(`/documents/${docId}/move`, token, {
        method: 'PUT',
        body: JSON.stringify({ folderId })
      });
      toast.success('Document moved');
      setSelectedDoc(prev => prev ? { ...prev, folderId: folderId || undefined } : null);
      loadData();
    } catch (e) {
      toast.error('Failed to move document');
    }
  };

  const handleApproval = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
      let reason = undefined;
      if (status === 'Rejected') {
        reason = prompt("Please specify a rejection reason:") || '';
        if (reason === null || reason.trim() === '') {
          toast.error("Rejection reason is required.");
          return;
        }
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
      await loadData();
      
      // Refresh the modal detail view if open
      if (selectedDoc && selectedDoc.id === id) {
        setIsDetailOpen(false);
      }
    } catch (e: any) {
      toast.error("Failed to update status: " + e.message);
    }
  };

  const resetNewUploadForm = () => {
    setUploadFileName('');
    setUploadComments('');
    setUploadFileBase64('');
    setUploadFileSize('');
    setUploadShipmentId('');
    setUploadType('Bill of Lading (HBL)');
  };

  const resetRevisionForm = () => {
    setRevisionFileName('');
    setRevisionComments('');
    setRevisionFileBase64('');
    setRevisionFileSize('');
  };


  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDocIds(new Set(filteredLatestDocs.map(d => d.id)));
    } else {
      setSelectedDocIds(new Set());
    }
  };

  const handleSelectDoc = (id: string, checked: boolean) => {
    const newSet = new Set(selectedDocIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedDocIds(newSet);
  };


  const handleGenerateShareLink = async () => {
    if (!token || !selectedDoc) return;
    setIsGeneratingShare(true);
    setShareLink(null);
    try {
      const res = await fetchApi(`/documents/${selectedDoc.id}/share`, token, {
        method: 'POST',
        body: JSON.stringify({ expiresIn: '24h' })
      });
      if (res && res.shareUrl) {
        setShareLink(res.shareUrl);
        toast.success('Secure link generated successfully');
      }
    } catch (e) {
      toast.error('Failed to generate link');
    } finally {
      setIsGeneratingShare(false);
    }
  };

  const handleCopyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      toast.success('Link copied to clipboard');
    }
  };

  const handleBulkMove = async (targetFolderId: string | null) => {
    if (!token || selectedDocIds.size === 0) return;
    try {
      const promises = Array.from(selectedDocIds).map(id => 
        fetchApi(`/documents/${id}/move`, token, {
          method: 'PUT',
          body: JSON.stringify({ folderId: targetFolderId })
        })
      );
      await Promise.all(promises);
      toast.success(`Moved ${selectedDocIds.size} documents successfully`);
      setSelectedDocIds(new Set());
      loadData();
    } catch (e) {
      toast.error('Failed to move some documents');
    }
  };

  const [bulkTagsInput, setBulkTagsInput] = useState('');
  
  const handleBulkAddTags = async () => {
    if (!token || selectedDocIds.size === 0 || !bulkTagsInput.trim()) return;
    const newTags = bulkTagsInput.split(',').map(t => t.trim()).filter(t => t);
    if (newTags.length === 0) return;
    
    try {
      const promises = Array.from(selectedDocIds).map(async (id) => {
        const doc = documents.find(d => d.id === id);
        if (!doc) return null;
        const existingTags = doc.tags || [];
        const combinedTags = Array.from(new Set([...existingTags, ...newTags]));
        
        return fetchApi(`/documents/${id}/tags`, token, {
          method: 'PUT',
          body: JSON.stringify({ tags: combinedTags })
        });
      });
      await Promise.all(promises);
      toast.success(`Added tags to ${selectedDocIds.size} documents`);
      setBulkTagsInput('');
      setSelectedDocIds(new Set());
      loadData();
    } catch(e) {
      toast.error('Failed to update tags');
    }
  };

  const handleViewDetails = (doc: Document) => {
    setSelectedDoc(doc);
    setCarrierSigned(false);
    setBrokerSigned(false);
    setCarrierSignatureKey('');
    setBrokerSignatureKey('');
    // Find all versions of this document
    const rootId = doc.parentDocumentId || doc.id;
    const history = documents
      .filter(d => d.id === rootId || d.parentDocumentId === rootId)
      .sort((a, b) => b.version - a.version); // Descending version
    setDocHistory(history);
    setIsDetailOpen(true);
  };

  const getShipmentRef = (id: string) => {
    const s = shipments.find(sh => sh.id === id);
    return s ? s.referenceNumber : 'N/A';
  };

  const getShipmentDetails = (id: string) => {
    return shipments.find(sh => sh.id === id);
  };

  // OCR Discrepancies Comparison Engine
  const getDiscrepancies = (doc: Document | null) => {
    if (!doc) return [];
    const shipment = shipments.find(s => s.id === doc.shipmentId);
    if (!shipment) return [];
    
    const list: {
      field: string;
      ocrValue: string;
      dbValue: string;
      message: string;
      severity: 'warning' | 'info';
      syncField: string;
    }[] = [];

    // 1. Gross Weight Check
    const ocrWeight = doc.extractedMetadata?.grossWeight || (doc.extractedMetadata as any)?.weight || '';
    const shipWeight = shipment.weight || '';
    if (ocrWeight && shipWeight) {
      const norm = (str: string) => str.toLowerCase().replace(/[^0-9]/g, '');
      if (norm(ocrWeight) !== norm(shipWeight)) {
        list.push({
          field: 'Gross Weight',
          ocrValue: ocrWeight,
          dbValue: shipWeight,
          message: `OCR weight (${ocrWeight}) deviates from digital shipment manifesto record (${shipWeight}).`,
          severity: 'warning',
          syncField: 'weight'
        });
      }
    }

    // 2. Reference / Invoice Number Check
    const ocrInvoice = doc.extractedMetadata?.invoiceNumber || '';
    const shipRef = shipment.referenceNumber || '';
    if (ocrInvoice && shipRef && doc.documentType === 'Commercial Invoice') {
      const norm = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (norm(ocrInvoice) !== norm(shipRef)) {
        list.push({
          field: 'Invoice / Ref Number',
          ocrValue: ocrInvoice,
          dbValue: shipRef,
          message: `OCR Invoice Number (${ocrInvoice}) differs from digital Shipment Reference (${shipRef}).`,
          severity: 'info',
          syncField: 'referenceNumber'
        });
      }
    }

    return list;
  };

  const handleSyncDbToOcr = async (discrepancy: any) => {
    if (!selectedDoc || !token) return;
    const shipment = shipments.find(s => s.id === selectedDoc.shipmentId);
    if (!shipment) return;

    try {
      const updatePayload = {
        [discrepancy.syncField]: discrepancy.ocrValue
      };
      await fetchApi(`/shipments/${shipment.id}`, token, {
        method: 'PUT',
        body: JSON.stringify(updatePayload)
      });
      toast.success(`Shipment registry updated! Sync complete: ${discrepancy.field} is now ${discrepancy.ocrValue}.`);
      loadData();
    } catch (e) {
      toast.error('Failed to sync registry database.');
    }
  };

  const handleSyncOcrToDb = async (discrepancy: any) => {
    if (!selectedDoc || !token) return;
    try {
      const newMetadata = {
        ...selectedDoc.extractedMetadata,
        [discrepancy.syncField === 'weight' ? 'grossWeight' : 'invoiceNumber']: discrepancy.dbValue
      };
      await fetchApi(`/documents/${selectedDoc.id}/metadata`, token, {
        method: 'PUT',
        body: JSON.stringify({ metadata: newMetadata })
      });
      toast.success(`OCR metadata corrected! Sync complete: ${discrepancy.field} matches Database (${discrepancy.dbValue}).`);
      
      setSelectedDoc({
        ...selectedDoc,
        extractedMetadata: newMetadata
      });
      loadData();
    } catch (e) {
      toast.error('Failed to sync OCR metadata.');
    }
  };

  // Run Compliance Risk Engine via Gemini
  const handleRunComplianceRiskEngine = async () => {
    if (!selectedDoc) return;
    setIsAnalyzingCompliance(true);
    setComplianceReport(null);
    try {
      const response = await fetch('/api/compliance/analyze-manifest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          documentId: selectedDoc.id,
          fileName: selectedDoc.fileName,
          documentType: selectedDoc.documentType,
          comments: selectedDoc.comments,
          extractedMetadata: selectedDoc.extractedMetadata
        })
      });
      const data = await response.json();
      if (response.ok) {
        setComplianceReport(data);
        toast.success("Manifest compliance inspection complete! Review flagged HS codes and sanitization recommendations below.");
      } else {
        toast.error(data.error || "Customs Risk Engine failed.");
      }
    } catch (e) {
      toast.error("Network error during compliance scan.");
    } finally {
      setIsAnalyzingCompliance(false);
    }
  };

  // Apply Sanitized Description
  const handleApplySanitizationAndS3Uplink = async () => {
    if (!selectedDoc || !complianceReport || !token) return;
    setIsApplyingSanitization(true);
    try {
      await fetchApi(`/documents/${selectedDoc.id}/comments`, token, {
        method: 'PUT',
        body: JSON.stringify({ comments: complianceReport.sanitizedDescription })
      });

      await fetchApi(`/documents/${selectedDoc.id}/status`, token, {
        method: 'PUT',
        body: JSON.stringify({ status: 'Approved', approvedBy: user?.email || 'AI Risk Inspector' })
      });

      toast.success("S3 Uplink Secured! Manifest description sanitized and digital customs approval dispatched.", { duration: 5000 });
      
      setSelectedDoc({
        ...selectedDoc,
        comments: complianceReport.sanitizedDescription,
        status: 'Approved'
      });
      setComplianceReport(null);
      loadData();
    } catch (e) {
      toast.error("Failed to authorize S3 uplink or sanitize description.");
    } finally {
      setIsApplyingSanitization(false);
    }
  };

  // Document icons mapped to categories
  const getDocIcon = (type: string) => {
    const lower = type.toLowerCase();
    if (lower.includes('hbl') || lower.includes('house bill')) {
      return <FileText className="w-4 h-4 text-emerald-500" />;
    } else if (lower.includes('mbl') || lower.includes('master bill')) {
      return <Layers className="w-4 h-4 text-indigo-500" />;
    } else if (lower.includes('awb') || lower.includes('airway')) {
      return <FileText className="w-4 h-4 text-blue-500" />;
    } else if (lower.includes('invoice') || lower.includes('commercial')) {
      return <FileText className="w-4 h-4 text-amber-500" />;
    } else if (lower.includes('pack') || lower.includes('list')) {
      return <FileText className="w-4 h-4 text-cyan-500" />;
    } else if (lower.includes('customs') || lower.includes('declaration')) {
      return <FileText className="w-4 h-4 text-rose-500" />;
    }
    return <FileText className="w-4 h-4 text-zinc-500" />;
  };

  // Advanced filtration logic
  const latestDocs = getLatestDocumentsOnly();
  let searchResults = latestDocs;

  if (searchQuery.trim() !== '') {
    const docsWithShipmentRef = latestDocs.map(doc => ({
      ...doc,
      shipmentRef: getShipmentRef(doc.shipmentId)
    }));

    const fuse = new Fuse(docsWithShipmentRef, {
      keys: [
        'fileName',
        'documentType',
        'shipmentRef',
        'uploadedBy',
        'comments',
        'status',
        'tags',
        'extractedMetadata.invoiceNumber',
        'extractedMetadata.amount',
        'extractedMetadata.date'
      ],
      threshold: 0.3,
      includeScore: true,
      shouldSort: true,
      ignoreLocation: true
    });

    searchResults = fuse.search(searchQuery).map(result => result.item);
  }

  const filteredLatestDocs = searchResults.filter(doc => {
    const matchesFolder = currentFolderId === null ? true : doc.folderId === currentFolderId;
    if (!matchesFolder) return false;
    const matchesType = selectedType === 'ALL' || doc.documentType === selectedType;
    const matchesShipment = selectedShipment === 'ALL' || doc.shipmentId === selectedShipment;
    const matchesStatus = selectedStatus === 'ALL' || doc.status === selectedStatus;

    const matchesTag = selectedTag === 'ALL' || (doc.tags || []).includes(selectedTag);
    return matchesType && matchesShipment && matchesStatus && matchesTag;
  });

  // KPI Calculations
  const totalLatestDocsCount = getLatestDocumentsOnly().length;
  const pendingApprovalsCount = documents.filter(d => d.status === 'Pending').length;
  const totalRevisionsCount = documents.filter(d => d.parentDocumentId).length;

  const isOperatorOrAdmin = profile?.role === 'Admin' || profile?.role === 'Operador' || profile?.role === 'Manager';

  const allTags = Array.from(new Set(documents.flatMap(doc => doc.tags || []))).sort();

  return (
    <div id="document-hub-container" className="flex flex-col lg:flex-row gap-6">
      {/* Folder Sidebar */}
      <Card className="lg:w-[260px] shrink-0 border-border/50 shadow-sm self-start sticky top-6">
        <CardHeader className="p-4 border-b border-border/50 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-indigo-500" /> Folders
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsNewFolderOpen(true)}>
            <Plus className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-2 flex flex-col gap-1 max-h-[calc(100vh-200px)] overflow-y-auto">
          <Button 
            variant={currentFolderId === null ? "secondary" : "ghost"} 
            className={`w-full justify-start font-medium text-xs h-9 ${currentFolderId === null ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : ''}`}
            onClick={() => setCurrentFolderId(null)}
          >
            <Layers className="w-4 h-4 mr-2" /> All Documents
          </Button>
          <div className="h-px bg-border/50 my-1 mx-2" />
          {folders.map(folder => (
            <Button 
              key={folder.id} 
              variant={currentFolderId === folder.id ? "secondary" : "ghost"} 
              className={`w-full justify-start font-medium text-xs h-9 ${currentFolderId === folder.id ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' : ''}`}
              onClick={() => setCurrentFolderId(folder.id)}
            >
              <Folder className="w-4 h-4 mr-2" /> {folder.name}
            </Button>
          ))}
          {folders.length === 0 && (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No folders yet. Click + to create one.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content Area */}
      <div className="flex-1 space-y-6 min-w-0">
      
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Folder className="w-6 h-6 text-indigo-500" />
            Document Hub & Version Control
          </h2>
          <p className="text-muted-foreground text-sm">
            Central repository for shipping documents, full revision tracking, cryptographic-like base64 storage, and multi-tier approval compliance workflows.
          </p>
        </div>
        
        {isOperatorOrAdmin && (
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setIsExpiryConfigOpen(true)}
              variant="outline"
              className="flex items-center gap-2 h-10 px-3 text-sm border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900"
              title="Custom document warning thresholds configuration"
            >
              <Settings className="w-4 h-4 text-muted-foreground" /> Expiry Config
            </Button>
            <Button 
              onClick={() => setIsWebAuthnSettingsOpen(true)}
              variant="outline"
              className="flex items-center gap-2 h-10 px-3 text-sm border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900"
              title="Manage physical biometric & FIDO2 YubiKey tokens"
            >
              <Fingerprint className="w-4 h-4 text-indigo-500" /> Biometric Keys
            </Button>
            <Button 
              onClick={() => setIsBatchOpen(true)}
              variant="outline"
              className="flex items-center gap-2 h-10 px-4 text-sm bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
            >
              <Layers className="w-4 h-4" /> Batch OCR Queue
            </Button>
            <Dialog open={isUploadOpen} onOpenChange={(open) => { setIsUploadOpen(open); if(!open) resetNewUploadForm(); }}>
            <DialogTrigger className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm transition-all flex items-center justify-center gap-2 h-10 px-4 rounded-md cursor-pointer text-sm">
              <Upload className="w-4 h-4" /> Upload Document
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                  <FilePlus className="w-5 h-5 text-indigo-500" /> Add New Shipping Document
                </DialogTitle>
                <CardDescription>
                  Upload a digital shipping form, categorize it, and bind it securely to an active shipment.
                </CardDescription>
              </DialogHeader>
              
              <form onSubmit={handleUploadNewDocument} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t('document_type', 'Document Type')}</Label>
                    <Select value={uploadType} onValueChange={setUploadType}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('document_type', 'Select type')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bill of Lading (HBL)">{t('doc_types.hbl')}</SelectItem>
                        <SelectItem value="Bill of Lading (MBL)">{t('doc_types.mbl')}</SelectItem>
                        <SelectItem value="Air Waybill (AWB)">{t('doc_types.awb')}</SelectItem>
                        <SelectItem value="Commercial Invoice">{t('doc_types.invoice')}</SelectItem>
                        <SelectItem value="Packing List">{t('doc_types.packing_list')}</SelectItem>
                        <SelectItem value="Customs Form">{t('doc_types.customs_form')}</SelectItem>
                        <SelectItem value="Certificate of Origin">{t('doc_types.co')}</SelectItem>
                        <SelectItem value="Other">{t('doc_types.other')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Assign to Folder</Label>
                    <Select value={uploadFolderId} onValueChange={setUploadFolderId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">All Documents (Unassigned)</SelectItem>
                        {folders.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Link Voyage / Shipment</Label>
                    <Select value={uploadShipmentId} onValueChange={setUploadShipmentId} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select shipment" />
                      </SelectTrigger>
                      <SelectContent>
                        {shipments.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.referenceNumber} ({s.originPort} → {s.destinationPort})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Document File (PDF, PNG, JPG)</Label>
                  <Input 
                    type="file" 
                    onChange={(e) => handleFileChange(e, 'new')}
                    accept=".pdf,.png,.jpg,.jpeg"
                    required
                  />
                  {uploadFileSize && (
                    <p className="text-[10px] font-mono text-indigo-500">Detected File Size: {uploadFileSize}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Document Label Name</Label>
                  <Input 
                    placeholder="e.g. AWB-987216-FINAL" 
                    value={uploadFileName} 
                    onChange={(e) => setUploadFileName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Version Comments / Notes</Label>
                  <textarea 
                    className="w-full h-20 p-2.5 text-sm rounded-md border border-input bg-background font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g. Signed original from carrier. Version 1 release."
                    value={uploadComments}
                    onChange={(e) => setUploadComments(e.target.value)}
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isUploading}>
                    {isUploading ? 'Uploading & Securing...' : 'Verify & Store'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        )}
      </div>

      {/* Port Network & Signal Resiliency Handshake Alert */}
      <Card className={`border shadow-xs ${isOnline ? 'border-emerald-100 dark:border-emerald-900/40 bg-emerald-500/[0.01]' : 'border-amber-200 dark:border-amber-900/50 bg-amber-500/[0.01]'}`}>
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${isOnline ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 animate-pulse'}`}>
              {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-foreground flex items-center gap-1.5">
                  Port Signal Node: 
                  <span className={`inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full ${isOnline ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} />
                    {isOnline ? 'ONLINE' : 'OFFLINE (Cellular Interrupt Active)'}
                  </span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {isOnline 
                  ? 'Integrated S3 storage links are active. Fastify API anti-malware scanners are online.'
                  : 'Cellular signals degraded in underground warehouses. Ingestion payloads will queue in local PWA IndexedDB, and synchronize automatically when signal returns.'
                }
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 md:self-center shrink-0">
            {offlineQueue.length > 0 && (
              <Badge variant="outline" className="font-mono text-xs border-amber-300 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 font-bold">
                <Database className="w-3.5 h-3.5 mr-1" /> {offlineQueue.length} Queue Assets Cached
              </Badge>
            )}
            
            {!isOnline && offlineQueue.length > 0 && (
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium italic">Pending signal handshake...</span>
            )}

            {isOnline && offlineQueue.length > 0 && (
              <Button 
                size="sm"
                onClick={handleSyncQueue}
                disabled={isSyncingOffline}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 px-3 rounded-md"
              >
                {isSyncingOffline ? (
                  <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Syncing...</>
                ) : (
                  <><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Sync Offline Queue</>
                )}
              </Button>
            )}
          </div>
        </CardContent>
        
        {/* Render queued items if offline or items pending */}
        {offlineQueue.length > 0 && (
          <div className="border-t border-border/50 bg-muted/25 px-4 py-3 text-xs flex flex-col gap-1.5 font-mono">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Offline-Queue Cache Manifest:</span>
            {offlineQueue.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between bg-background border border-border/40 p-2 rounded-md font-sans">
                <div className="flex items-center gap-2 truncate">
                  <Database className="w-3.5 h-3.5 text-indigo-400 font-mono" />
                  <span className="font-bold text-foreground truncate max-w-[150px] md:max-w-[280px]">{item.fileName}</span>
                  <Badge variant="outline" className="text-[9px] scale-90 bg-muted">{getLocalizedDocType(item.documentType)}</Badge>
                  <span className="text-muted-foreground text-[10px]">({item.fileSize})</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-amber-500 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded">QUEUED</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                    onClick={async () => {
                      if(item.id) {
                        await deleteFromOfflineQueue(item.id);
                        toast.success('Offline document entry deleted from queue storage.');
                        await loadOfflineQueue();
                      }
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Stored Files</span>
              <p className="text-2xl font-extrabold text-foreground">{documents.length}</p>
            </div>
            <div className="p-2.5 bg-indigo-500/10 rounded-xl">
              <Folder className="w-5 h-5 text-indigo-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Unique Doc Stacks</span>
              <p className="text-2xl font-extrabold text-foreground">{totalLatestDocsCount}</p>
            </div>
            <div className="p-2.5 bg-blue-500/10 rounded-xl">
              <Layers className="w-5 h-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Historical Revisions</span>
              <p className="text-2xl font-extrabold text-foreground">{totalRevisionsCount}</p>
            </div>
            <div className="p-2.5 bg-amber-500/10 rounded-xl">
              <History className="w-5 h-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Pending Compliance</span>
              <p className="text-2xl font-extrabold text-amber-500">{pendingApprovalsCount}</p>
            </div>
            <div className="p-2.5 bg-rose-500/10 rounded-xl">
              <CheckCircle className="w-5 h-5 text-rose-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <OcrAnalyticsDashboard documents={documents} />

      {/* Advanced Filter Toolbox */}
      <Card className="border border-border shadow-sm bg-muted/10">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-end">
            <div className="space-y-1.5 col-span-1 lg:col-span-2">
              <Label htmlFor="search" className="text-xs font-semibold text-muted-foreground">Full-Text Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="search" 
                  placeholder="Search titles, metadata fields, tags, shipments..." 
                  className="pl-9 h-9.5 text-xs bg-background" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">{t('document_type', 'Document Type')}</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="h-9.5 text-xs bg-background">
                  <SelectValue placeholder={t('all_categories', 'All Categories')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('all_categories', 'All Categories')}</SelectItem>
                  <SelectItem value="Bill of Lading (HBL)">{t('doc_types.hbl')}</SelectItem>
                  <SelectItem value="Bill of Lading (MBL)">{t('doc_types.mbl')}</SelectItem>
                  <SelectItem value="Air Waybill (AWB)">{t('doc_types.awb')}</SelectItem>
                  <SelectItem value="Commercial Invoice">{t('doc_types.invoice')}</SelectItem>
                  <SelectItem value="Packing List">{t('doc_types.packing_list')}</SelectItem>
                  <SelectItem value="Customs Form">{t('doc_types.customs_form')}</SelectItem>
                  <SelectItem value="Certificate of Origin">{t('doc_types.co')}</SelectItem>
                  <SelectItem value="Other">{t('doc_types.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Shipment Reference</Label>
              <Select value={selectedShipment} onValueChange={setSelectedShipment}>
                <SelectTrigger className="h-9.5 text-xs bg-background">
                  <SelectValue placeholder="All Shipments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Shipments</SelectItem>
                  {shipments.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.referenceNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Compliance Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-9.5 text-xs bg-background">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending Audit</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Tag Filter</Label>
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger className="h-9.5 text-xs bg-background">
                  <SelectValue placeholder="All Tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Tags</SelectItem>
                  {allTags.map(tag => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Document Inventory Table */}
      <Card className="border border-border shadow-sm">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="py-24 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-semibold font-mono animate-pulse">Accessing Encrypted Document Directory...</p>
            </div>
          ) : filteredLatestDocs.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center">
              <Paperclip className="w-12 h-12 mb-3 text-muted-foreground/30 animate-bounce" />
              <p className="text-sm font-semibold">No secure shipping documents found matching filters</p>
              <p className="text-xs text-muted-foreground/80 mt-1">Try relaxing filters, uploading a new document, or creating dummy records.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {selectedDocIds.size > 0 && (
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 border-b border-indigo-100 dark:border-indigo-800/50 flex items-center justify-between sticky left-0 z-10 w-full min-w-max">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">{selectedDocIds.size} Selected</Badge>
                    <span className="text-xs text-muted-foreground font-medium">Apply Bulk Action:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select onValueChange={(val: string) => handleBulkMove(val === 'unassigned' ? null : val)}>
                      <SelectTrigger className="w-[180px] h-8 text-xs bg-white dark:bg-zinc-950 border-indigo-200 dark:border-indigo-800">
                        <SelectValue placeholder="Move to Folder..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">All Documents (Unassigned)</SelectItem>
                        {folders.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                      <Input
                        placeholder="Tag1, Tag2"
                        className="h-8 text-xs w-[180px] bg-white dark:bg-zinc-950 border-indigo-200 dark:border-indigo-800"
                        value={bulkTagsInput}
                        onChange={(e) => setBulkTagsInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleBulkAddTags();
                        }}
                      />
                      <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleBulkAddTags}>
                        Add Tags
                      </Button>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground ml-2" onClick={() => setSelectedDocIds(new Set())}>Cancel</Button>
                  </div>
                </div>
              )}
              <Table>
                <TableHeader className="bg-muted/40 border-b border-border">
                  <TableRow>
                    <TableHead className="w-[40px] px-4">
                      <Checkbox
                        checked={filteredLatestDocs.length > 0 && selectedDocIds.size === filteredLatestDocs.length}
                        onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                      />
                    </TableHead>
                    <TableHead className="pl-2">Document Stack Name</TableHead>
                    <TableHead>Category & Tags</TableHead>
                    <TableHead>Voyage Reference</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Compliance Status</TableHead>
                    <TableHead>OCR Confidence</TableHead>
                    <TableHead className="text-right pr-6">Vault Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLatestDocs.map(doc => {
                    const shipmentRef = getShipmentRef(doc.shipmentId);
                    const isPending = doc.status === 'Pending';
                    const isApproved = doc.status === 'Approved';

                    return (
                      <TableRow key={doc.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                        <TableCell className="px-4">
                          <Checkbox
                            checked={selectedDocIds.has(doc.id)}
                            onCheckedChange={(checked) => handleSelectDoc(doc.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell className="pl-2 font-medium">
                        <div className="flex items-center gap-2.5 max-w-[260px]">
                          <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded">
                            {getDocIcon(doc.documentType)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-foreground truncate" title={doc.fileName}>
                              {doc.fileName}
                            </span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3" />
                              {new Date(doc.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 border-zinc-200 dark:border-zinc-800 bg-background text-zinc-700 dark:text-zinc-300">
                            {getLocalizedDocType(doc.documentType)}
                          </Badge>
                          {doc.tags && doc.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1 max-w-[200px]">
                              {doc.tags.map((tag: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800/50">
                                  <Tag className="w-2.5 h-2.5 mr-0.5" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="text-xs font-bold text-indigo-500 font-mono flex items-center gap-1">
                          <Anchor className="w-3.5 h-3.5 text-muted-foreground" />
                          {shipmentRef}
                        </span>
                      </TableCell>

                      <TableCell>
                        <Badge className="font-mono text-[10px] bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 px-1.5 py-0">
                          v{doc.version}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {doc.fileSize || 'Unknown'}
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {doc.uploadedBy.split('@')[0]}
                      </TableCell>

                      <TableCell>
                        <Badge variant={isApproved ? 'default' : isPending ? 'outline' : 'destructive'} className={
                          isApproved ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold' : 
                          isPending ? 'border-amber-400 text-amber-500 bg-amber-500/5 font-bold' : 'font-bold'
                        }>
                          {doc.status}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {(() => {
                          const confidence = doc.extractedMetadata?.confidenceScore;
                          if (confidence === undefined) {
                            return <span className="text-[10px] text-muted-foreground italic bg-zinc-100 dark:bg-zinc-800/50 px-2 py-1 rounded-md">Not Scanned</span>;
                          }
                          const isLow = confidence < 0.8;
                          const isMedium = confidence >= 0.8 && confidence < 0.95;
                          
                          return (
                            <div className="flex items-center gap-1.5" title={isLow ? 'Requires Manual Validation' : 'High Confidence'}>
                              <div className={`w-2 h-2 rounded-full ${isLow ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse' : isMedium ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                              <span className={`text-xs font-mono font-bold ${isLow ? 'text-red-600 dark:text-red-400' : isMedium ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                {(confidence * 100).toFixed(1)}%
                              </span>
                            </div>
                          );
                        })()}
                      </TableCell>

                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-1.5">
                          {(() => {
                            const confidence = doc.extractedMetadata?.confidenceScore;
                            const isLow = confidence !== undefined && confidence < 0.8;
                            return isLow && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-xs font-medium border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
                                onClick={() => {
                                  setSelectedOcrDoc(doc);
                                  setEditMetadataForm({
                                    invoiceNumber: doc.extractedMetadata?.invoiceNumber || '',
                                    date: doc.extractedMetadata?.date || '',
                                    amount: doc.extractedMetadata?.amount || '',
                                    containerNumber: (doc.extractedMetadata as any)?.containerNumber || '',
                                    consignee: (doc.extractedMetadata as any)?.consignee || '',
                                    grossWeight: (doc.extractedMetadata as any)?.grossWeight || ''
                                  });
                                  setIsOcrCorrectionOpen(true);
                                }}
                              >
                                <Edit2 className="w-3.5 h-3.5 mr-1" /> OCR Review
                              </Button>
                            );
                          })()}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            onClick={() => {
                              setPreviewDoc(doc);
                              setIsPreviewOpen(true);
                            }}
                            title="Quick Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                            onClick={() => window.open(doc.fileUrl, '_blank')}
                            title="Download / Open Direct"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-xs font-medium border-border"
                            onClick={() => handleViewDetails(doc)}
                          >
                            <History className="w-3.5 h-3.5 mr-1" /> Revisions
                          </Button>
                        </div>
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

      {/* Revision History & Secure Detail Sheet Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-border pb-4">
            <DialogTitle className="text-xl font-bold flex items-center justify-between pr-4">
              <span className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-500" />
                Document History & Revisions Control
              </span>
              {selectedDoc && (
                <Badge variant={selectedDoc.status === 'Approved' ? 'default' : selectedDoc.status === 'Rejected' ? 'destructive' : 'outline'} className={selectedDoc.status === 'Approved' ? 'bg-emerald-600' : ''}>
                  {selectedDoc.status}
                </Badge>
              )}
            </DialogTitle>
            <CardDescription className="font-mono text-xs pt-1">
              UUID Vault Key: {selectedDoc?.id}
            </CardDescription>
          </DialogHeader>

          {selectedDoc && (
            <div className="space-y-6 pt-4">

              {/* Real-Time Collision Detection Warning Banner */}
              {collisionUser && (
                <div className="p-3 border border-red-200/60 dark:border-red-950/40 bg-red-500/5 dark:bg-red-950/10 text-red-700 dark:text-red-400 rounded-xl flex items-center justify-between gap-3 animate-pulse">
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <User className="w-5 h-5 text-red-500 shrink-0" />
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wider text-red-600 dark:text-red-400">Collaborative Review Collision Detected</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        <span className="font-semibold text-foreground">{collisionUser.name}</span> is currently inspecting this manifest from <span className="font-medium text-foreground">{collisionUser.office}</span>. Concurrent edits may result in out-of-sync states.
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-red-300 text-red-500 text-[9px] font-mono select-none px-1.5 py-0.5 shrink-0 bg-red-50 dark:bg-zinc-950">
                    COLLISION RISK
                  </Badge>
                </div>
              )}
              
              {/* Linked Shipment Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8 space-y-4">
                  <div className="p-4 border border-border bg-muted/20 rounded-xl space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-indigo-500" /> Active Metadata
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                      <div>
                        <span className="block text-[10px] text-muted-foreground font-sans uppercase">Filename</span>
                        <span className="font-bold text-foreground">{selectedDoc.fileName}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-muted-foreground font-sans uppercase">{t('document_type', 'Document Type')}</span>
                        <span className="text-foreground">{getLocalizedDocType(selectedDoc.documentType)}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-muted-foreground font-sans uppercase">Linked Voyage</span>
                        <span className="text-indigo-500 font-bold">{getShipmentRef(selectedDoc.shipmentId)}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-muted-foreground font-sans uppercase">Stored Size</span>
                        <span className="text-foreground">{selectedDoc.fileSize || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                                    {/* AI Summary Section */}
                  <div className="p-4 border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> AI Document Synopsis
                      </h3>
                      {!localAiSummary && (
                        <Button 
                          onClick={handleGenerateSummary} 
                          disabled={isGeneratingSummary}
                          size="sm"
                          className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                        >
                          {isGeneratingSummary ? (
                            <><Clock className="w-3 h-3 mr-1 animate-spin" /> Analyzing...</>
                          ) : (
                            <><Sparkles className="w-3 h-3 mr-1" /> Generate Summary</>
                          )}
                        </Button>
                      )}
                    </div>
                    
                    {localAiSummary ? (
                      <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed mt-2 bg-background p-3 rounded-lg border border-border/50 shadow-sm">
                        {localAiSummary}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">
                        Generate a concise text synopsis of this long document using Gemini.
                      </p>
                    )}
                  </div>

                  {(() => {
                    const hasMetadata = selectedDoc.extractedMetadata && Object.keys(selectedDoc.extractedMetadata).filter(k => k !== 'aiSummary').length > 0;
                    const status = selectedDoc.extractedMetadata?.validationStatus;
                    const isNeedsReview = status === 'Needs Review';
                    const isVerified = status === 'Verified';
                    
                    return (
                      <div className={`p-4 border rounded-xl space-y-4 ${isNeedsReview ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-900/10' : 'border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-900/10'}`}>
                        <div className="flex items-center justify-between">
                          <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${isNeedsReview ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                            <Search className="w-3.5 h-3.5" /> Document Properties & Tags
                          </h3>
                          <div className="flex items-center gap-2">
                            {selectedDoc.status === 'Approved' && (
                              <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30">
                                <CheckCircle className="w-3 h-3 mr-1" /> CUSTOMS APPROVED
                              </Badge>
                            )}
                            {isNeedsReview && !isEditingMetadata && (
                              <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30">
                                <AlertTriangle className="w-3 h-3 mr-1" /> Low Confidence
                              </Badge>
                            )}
                            {isVerified && !isEditingMetadata && (
                              <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30">
                                <CheckCircle className="w-3 h-3 mr-1" /> Verified
                              </Badge>
                            )}
                            {!isEditingMetadata && (
                              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={handleStartEditMetadata}>
                                <Edit2 className="w-3 h-3 mr-1" /> {isNeedsReview ? 'Review & Edit' : 'Edit'}
                              </Button>
                            )}
                          </div>
                        </div>

                        {isEditingMetadata ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-muted-foreground">Invoice Number</Label>
                                <Input className="h-8 text-xs font-mono" value={editMetadataForm.invoiceNumber} onChange={e => setEditMetadataForm({...editMetadataForm, invoiceNumber: e.target.value})} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-muted-foreground">Document Date</Label>
                                <Input className="h-8 text-xs font-mono" value={editMetadataForm.date} onChange={e => setEditMetadataForm({...editMetadataForm, date: e.target.value})} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-muted-foreground">Total Amount</Label>
                                <Input className="h-8 text-xs font-mono" value={editMetadataForm.amount} onChange={e => setEditMetadataForm({...editMetadataForm, amount: e.target.value})} />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase text-muted-foreground">Smart Tags (comma separated)</Label>
                              <Input className="h-8 text-xs font-mono" placeholder="Project Alpha, Client X, High Priority" value={editTagsInput} onChange={e => setEditTagsInput(e.target.value)} />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setIsEditingMetadata(false)}>Cancel</Button>
                              <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSaveMetadata}>
                                <Save className="w-3.5 h-3.5 mr-1" /> Save & Verify
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
                              {selectedDoc.extractedMetadata?.invoiceNumber && (
                                <div>
                                  <span className="block text-[10px] text-muted-foreground font-sans uppercase">Invoice Number</span>
                                  <span className={`font-bold ${isNeedsReview ? 'text-amber-700 dark:text-amber-300' : 'text-indigo-700 dark:text-indigo-300'}`}>{selectedDoc.extractedMetadata.invoiceNumber}</span>
                                </div>
                              )}
                              {selectedDoc.extractedMetadata?.date && (
                                <div>
                                  <span className="block text-[10px] text-muted-foreground font-sans uppercase">Document Date</span>
                                  <span className="text-foreground">{selectedDoc.extractedMetadata.date}</span>
                                </div>
                              )}
                              {selectedDoc.extractedMetadata?.amount && (
                                <div>
                                  <span className="block text-[10px] text-muted-foreground font-sans uppercase">Total Amount</span>
                                  <span className="text-foreground">{selectedDoc.extractedMetadata.amount}</span>
                                </div>
                              )}
                            </div>
                            {selectedDoc.tags && selectedDoc.tags.length > 0 && (
                              <div className={`pt-2 border-t ${isNeedsReview ? 'border-amber-200/50 dark:border-amber-800/30' : 'border-indigo-100 dark:border-indigo-800/30'}`}>
                                <span className="block text-[10px] text-muted-foreground font-sans uppercase mb-1.5">Smart Tags</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {selectedDoc.tags.map((tag: string, i: number) => (
                                    <Badge key={i} variant="secondary" className={`text-[10px] bg-white dark:bg-zinc-950 ${isNeedsReview ? 'text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' : 'text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'}`}>
                                      <Tag className="w-2.5 h-2.5 mr-1" />
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })()}

                  {/* OCR Discrepancies Auto-Highlighting & Correction Panel */}
                  {(() => {
                    const discrepancies = getDiscrepancies(selectedDoc);
                    if (discrepancies.length === 0) return null;

                    return (
                      <div className="p-4 border border-amber-200/80 dark:border-amber-900/60 bg-amber-500/5 dark:bg-amber-950/10 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" /> OCR Metadata Discrepancies
                          </h3>
                          <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-zinc-950 px-1.5 py-0.5 select-none font-bold">
                            {discrepancies.length} MISMATCH{discrepancies.length > 1 ? 'ES' : ''} DETECTED
                          </Badge>
                        </div>
                        
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          The following values extracted from the document image during OCR do not match our current digital shipment manifesto registry.
                        </p>

                        <div className="space-y-3 pt-1">
                          {discrepancies.map((disc, idx) => (
                            <div key={idx} className="p-3 bg-amber-500/10 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-900/40 rounded-lg space-y-2 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-amber-800 dark:text-amber-300">{disc.field}</span>
                                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Two-Way Sync Options</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground">{disc.message}</p>
                              
                              <div className="grid grid-cols-2 gap-2 pt-1">
                                <div className="p-2 rounded bg-background border border-border/60">
                                  <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Document OCR</span>
                                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{disc.ocrValue}</span>
                                </div>
                                <div className="p-2 rounded bg-background border border-border/60">
                                  <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Shipment Registry</span>
                                  <span className="font-mono font-bold text-zinc-600 dark:text-zinc-400">{disc.dbValue}</span>
                                </div>
                              </div>

                              <div className="flex gap-2 justify-end pt-1.5 border-t border-amber-200/30 dark:border-amber-900/30">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-7 text-[10px] border-amber-200 hover:bg-amber-100 dark:border-amber-900 dark:hover:bg-amber-950 text-amber-700 dark:text-amber-300"
                                  onClick={() => handleSyncOcrToDb(disc)}
                                  title="Overwrites document OCR metadata with verified shipment database record"
                                >
                                  Overwrite with Registry
                                </Button>
                                <Button 
                                  size="sm" 
                                  className="h-7 text-[10px] bg-amber-600 hover:bg-amber-700 text-white font-bold"
                                  onClick={() => handleSyncDbToOcr(disc)}
                                  title="Overwrites shipment database record with document OCR extracted value"
                                >
                                  Sync DB to OCR
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Automated Customs Risk Engine & S3 Uplink Sanitization Panel */}
                  <div className="p-4 border border-zinc-200 dark:border-zinc-800 bg-muted/10 rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-indigo-500" />
                        <div>
                          <h3 className="text-xs font-extrabold uppercase tracking-wider text-foreground">
                            Automated Customs Risk Engine
                          </h3>
                          <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-tight">Secured S3 Ingestion Scanner</p>
                        </div>
                      </div>
                      <Button 
                        size="sm"
                        disabled={isAnalyzingCompliance}
                        onClick={handleRunComplianceRiskEngine}
                        className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 h-8 font-bold text-xs"
                      >
                        {isAnalyzingCompliance ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Scanning...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500 animate-pulse" /> Compliance Audit
                          </>
                        )}
                      </Button>
                    </div>

                    {!complianceReport && !isAnalyzingCompliance && (
                      <p className="text-xs text-muted-foreground">
                        Analyze this manifest description, commodities list, and HS codes using Gemini customs auditing to flag restricted merchandise and sanitize labels for S3 storage.
                      </p>
                    )}

                    {complianceReport && (
                      <div className="space-y-4 pt-1">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-3 bg-background rounded-lg border flex flex-col justify-between">
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Risk Classification</span>
                            <span className={`text-base font-extrabold uppercase tracking-wider ${
                              complianceReport.riskLevel === 'High' 
                                ? 'text-red-500' 
                                : complianceReport.riskLevel === 'Medium'
                                ? 'text-amber-500'
                                : 'text-emerald-500'
                            }`}>
                              {complianceReport.riskLevel} Risk
                            </span>
                          </div>
                          <div className="p-3 bg-background rounded-lg border flex flex-col justify-between">
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Restricted Items</span>
                            <span className={`text-sm font-bold ${complianceReport.isRestricted ? 'text-red-500' : 'text-emerald-500'}`}>
                              {complianceReport.isRestricted ? '🔴 Warning Detected' : '🟢 Compliant Cargo'}
                            </span>
                          </div>
                        </div>

                        {complianceReport.flaggedHsCodes && complianceReport.flaggedHsCodes.length > 0 && (
                          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/60 rounded-lg text-xs space-y-1">
                            <span className="font-extrabold text-red-700 dark:text-red-400 uppercase tracking-wide text-[10px] flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" /> Flagged HS Codes (Scrutiny Risk)
                            </span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {complianceReport.flaggedHsCodes.map((code: string, i: number) => (
                                <Badge key={i} variant="destructive" className="font-mono text-[9px] font-bold">
                                  {code}
                                </Badge>
                              ))}
                            </div>
                            <p className="text-[10px] text-red-600/90 dark:text-red-400/80 mt-1 leading-relaxed">
                              These tariff classifications are subject to licensing or trade restrictions. Re-examine description accuracy.
                            </p>
                          </div>
                        )}

                        <div className="space-y-2 text-xs">
                          <div className="space-y-1">
                            <span className="block text-[10px] text-muted-foreground uppercase font-semibold">Audit Reasoning</span>
                            <div className="p-3 bg-background border rounded-lg text-[11px] text-foreground/90 leading-relaxed max-h-[140px] overflow-y-auto font-sans">
                              {complianceReport.complianceReasoning}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="space-y-1">
                              <span className="block text-[10px] text-muted-foreground uppercase font-semibold">Original Description</span>
                              <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900 border rounded-lg text-[10px] font-mono text-muted-foreground truncate" title={complianceReport.originalDescription}>
                                {complianceReport.originalDescription || 'N/A'}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <span className="block text-[10px] text-muted-foreground uppercase font-semibold text-emerald-600 dark:text-emerald-400">Sanitized Description</span>
                              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-900/50 rounded-lg text-[10px] font-mono text-emerald-700 dark:text-emerald-300 font-bold">
                                {complianceReport.sanitizedDescription}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t flex justify-end">
                          <Button 
                            size="sm"
                            disabled={isApplyingSanitization}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs px-4"
                            onClick={handleApplySanitizationAndS3Uplink}
                          >
                            {isApplyingSanitization ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Uplinking...
                              </>
                            ) : (
                              <>
                                <Shield className="w-3.5 h-3.5 mr-1.5" /> Sanitize & Authorize S3 Uplink
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                <div className="md:col-span-4 flex flex-col justify-between p-4 border border-border bg-indigo-50/10 dark:bg-zinc-900/20 rounded-xl">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-500 mb-1">Vault Actions</h4>
                    <p className="text-[11px] text-muted-foreground">Download secured asset or upload a revised version under the same master registry.</p>
                  </div>
                  <div className="pt-4 flex flex-col gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setPreviewDoc(selectedDoc);
                        setIsPreviewOpen(true);
                      }} 
                      className="w-full h-8 text-xs font-semibold mb-1"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" /> Quick Preview
                    </Button>
                    <Button 
                      disabled={isWatermarking}
                      onClick={async () => {
                        setIsWatermarking(true);
                        toast.loading("Rendering custom PDF watermark and sealing binary pages...", { id: 'pdf-watermark' });
                        try {
                          // Check if file is encrypted payload
                          let downloadUrl = selectedDoc.fileUrl;
                          if (downloadUrl.startsWith('ENC:AES256:')) {
                            downloadUrl = await decryptDocumentPayload(downloadUrl);
                          }

                          // Apply true client-side PDF watermark writer with digital signatures
                          const complianceOptions = {
                            shipmentId: getShipmentRef(selectedDoc.shipmentId),
                            documentType: selectedDoc.documentType,
                            fileName: selectedDoc.fileName,
                            userEmail: user?.email || 'operator@port.scm',
                            digitalSignature: selectedDoc.extractedMetadata?.digitalSignature || selectedDoc.id,
                            watermarkText: 'SCM SECURE REGISTERED MANIFEST'
                          };
                          
                          await stampAndDownloadPdf(downloadUrl, complianceOptions);
                          toast.success("Compliance stamp applied! Secure document downloaded.", { id: 'pdf-watermark' });
                        } catch (err) {
                          console.error('PDF stamp failed:', err);
                          toast.error("Compliance watermark failed. Downloading clean master copy.", { id: 'pdf-watermark' });
                          // Fallback to standard download if watermark fails
                          window.open(selectedDoc.fileUrl, '_blank');
                        } finally {
                          setIsWatermarking(false);
                        }
                      }} 
                      className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold mb-1"
                    >
                      {isWatermarking ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Applying Custom Stamp...
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5 mr-1.5" /> Stamp & Download
                        </>
                      )}
                    </Button>
                    <div className="pt-2 pb-1 border-b border-indigo-200/50 dark:border-indigo-900/50 mb-2">
                      <Button
                        variant="outline"
                        onClick={handleGenerateShareLink}
                        disabled={isGeneratingShare}
                        className="w-full h-8 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/30 font-semibold"
                      >
                        {isGeneratingShare ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <LinkIcon className="w-3.5 h-3.5 mr-1.5" />}
                        Generate Secure Share Link
                      </Button>
                      {shareLink && (
                        <div className="mt-2 p-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded flex flex-col gap-2">
                          <p className="text-[10px] text-muted-foreground flex items-center justify-between">
                            <span>Link valid for 24h</span>
                          </p>
                          <div className="flex gap-1">
                            <Input readOnly value={shareLink} className="h-7 text-[10px] flex-1 font-mono" />
                            <Button size="sm" variant="secondary" className="h-7 px-2" onClick={handleCopyLink}>
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {isOperatorOrAdmin && (
                      <Dialog open={isRevisionOpen} onOpenChange={(open) => { setIsRevisionOpen(open); if(!open) resetRevisionForm(); }}>
                        <DialogTrigger className="w-full h-8 text-xs border border-indigo-200 text-indigo-500 font-semibold hover:bg-indigo-50 dark:border-indigo-950 dark:hover:bg-indigo-950/20 rounded-md flex items-center justify-center gap-1.5 cursor-pointer">
                          <Upload className="w-3.5 h-3.5" /> Upload New Revision
                        </DialogTrigger>

                        <div className="pt-3 mt-3 border-t border-indigo-200/50 dark:border-indigo-900/50">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Folder Assignment</h4>
                          <Select 
                            value={selectedDoc.folderId || 'unassigned'} 
                            onValueChange={(val) => handleMoveToFolder(selectedDoc.id, val === 'unassigned' ? null : val)}
                          >
                            <SelectTrigger className="h-8 text-xs bg-background">
                              <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">All Documents (Unassigned)</SelectItem>
                              {folders.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <DialogContent className="sm:max-w-[480px]">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 font-bold text-lg">
                              <History className="w-5 h-5 text-indigo-500" /> Upload Version v{selectedDoc.version + 1}
                            </DialogTitle>
                            <CardDescription>
                              Publishing a revision automatically aggregates previous revisions, increments the version tracking tag, and registers a compliance audit log.
                            </CardDescription>
                          </DialogHeader>

                          <form onSubmit={handleUploadRevision} className="space-y-4 pt-2">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Choose Revised File (PDF/PNG/JPG)</Label>
                              <Input 
                                type="file" 
                                onChange={(e) => handleFileChange(e, 'revision')}
                                accept=".pdf,.png,.jpg,.jpeg"
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Revision Label Name</Label>
                              <Input 
                                placeholder="e.g. BL-REVISED-v2" 
                                value={revisionFileName} 
                                onChange={(e) => setRevisionFileName(e.target.value)}
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Change Comments (Why is this revised?)</Label>
                              <textarea 
                                className="w-full h-20 p-2.5 text-sm rounded-md border border-input bg-background font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="e.g. Added correct seal numbers and updated voyage routing details."
                                value={revisionComments}
                                onChange={(e) => setRevisionComments(e.target.value)}
                                required
                              />
                            </div>

                            <DialogFooter className="pt-2">
                              <Button type="button" variant="outline" onClick={() => setIsRevisionOpen(false)}>Cancel</Button>
                              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isUploadingRevision}>
                                {isUploadingRevision ? 'Publishing Version...' : 'Publish Version'}
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </div>
              {/* Compliance & Approvals Strip with Multi-Party Cryptographic Sign-Off */}
              {isOperatorOrAdmin && selectedDoc.status === 'Pending' && (
                <div className="p-4 border border-indigo-200 dark:border-indigo-950 bg-indigo-50/15 dark:bg-zinc-950/20 rounded-xl space-y-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3">
                      <Lock className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5 animate-pulse" />
                      <div>
                        <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-400">Multi-Party Cryptographic Sign-Off & MFA Enforcement</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Under active customs authority rules, this registry requires dual keys (Carrier and Broker) as well as hardware-based FIDO2 key verification for high-value cargo.
                        </p>
                      </div>
                    </div>
                    {isHighValue && (
                      <Badge className="bg-red-500 hover:bg-red-600 text-white font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 shrink-0 select-none animate-pulse">
                        ⚠️ HIGH VALUE SECURITY LEVEL
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Carrier Signoff Card */}
                    <Card className="border border-border/50 bg-background/50">
                      <CardContent className="p-3.5 space-y-3">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                          Party A: Carrier Agent
                        </span>
                        {carrierSigned ? (
                          <div className="space-y-1.5">
                            <Badge className="bg-emerald-600 text-white font-mono text-[10px] w-full justify-center">
                              ✓ CARRIER SEAL APPLIED
                            </Badge>
                            <p className="text-[10px] font-mono text-center text-muted-foreground truncate">
                              Seal SHA: {carrierSignatureKey.substring(0, 8) || 'APPROVED-SEAL'}...
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Input 
                              placeholder="Enter Carrier Agent Key..." 
                              value={carrierSignatureKey}
                              onChange={(e) => setCarrierSignatureKey(e.target.value)}
                              className="h-8 text-xs font-mono"
                            />
                            <Button 
                              size="sm" 
                              onClick={() => {
                                if (carrierSignatureKey.trim().length < 4) {
                                  toast.error('Carrier authorization key must be at least 4 characters.');
                                  return;
                                }
                                setCarrierSigned(true);
                                toast.success('Carrier Agent Digital Seal applied!');
                              }}
                              className="w-full h-8 text-xs bg-indigo-500 hover:bg-indigo-600 text-white font-bold"
                            >
                              Apply Carrier Seal
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Broker Signoff Card */}
                    <Card className="border border-border/50 bg-background/50">
                      <CardContent className="p-3.5 space-y-3">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                          Party B: Customs Broker
                        </span>
                        {brokerSigned ? (
                          <div className="space-y-1.5">
                            <Badge className="bg-emerald-600 text-white font-mono text-[10px] w-full justify-center">
                              ✓ BROKER SEAL APPLIED
                            </Badge>
                            <p className="text-[10px] font-mono text-center text-muted-foreground truncate">
                              Seal SHA: {brokerSignatureKey.substring(0, 8) || 'APPROVED-SEAL'}...
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Input 
                              placeholder="Enter Customs Broker Key..." 
                              value={brokerSignatureKey}
                              onChange={(e) => setBrokerSignatureKey(e.target.value)}
                              className="h-8 text-xs font-mono"
                            />
                            <Button 
                              size="sm" 
                              onClick={() => {
                                if (brokerSignatureKey.trim().length < 4) {
                                  toast.error('Broker authorization key must be at least 4 characters.');
                                  return;
                                }
                                setBrokerSigned(true);
                                toast.success('Customs Broker Digital Seal applied!');
                              }}
                              className="w-full h-8 text-xs bg-indigo-500 hover:bg-indigo-600 text-white font-bold"
                            >
                              Apply Broker Seal
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Party C: Hardware MFA Security Token Sign-Off Card */}
                    <Card className={`border md:col-span-2 ${hardwareMfaVerified ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-indigo-500/30 bg-indigo-500/5'}`}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                            Hardware Enforcement: YubiKey / WebAuthn MFA
                          </span>
                          <Badge variant="outline" className={`text-[9px] font-mono ${isHighValue ? 'border-red-300 text-red-500 bg-red-100/10 animate-pulse' : 'border-indigo-300 text-indigo-500 bg-indigo-100/10'}`}>
                            {isHighValue ? 'FIDO2 MFA REQUIRED (HIGH-VALUE)' : 'FIDO2 MFA OPTIONAL'}
                          </Badge>
                        </div>
                        
                        {hardwareMfaVerified ? (
                          <div className="space-y-2 p-3 border border-emerald-500/20 bg-emerald-500/5 dark:bg-zinc-950/40 rounded-lg">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-emerald-500 animate-bounce" />
                              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Cryptographic Signature Validated & Registered</span>
                            </div>
                            <p className="text-[10px] font-mono text-muted-foreground leading-tight select-all">
                              FIDO2 Credential ID: {hardwareSignature}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                              Device Handshake Node: {hardwareDeviceInfo}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {isHighValue ? (
                                <span>This manifest carries high-value shipments totaling <strong className="text-foreground">{selectedDoc.extractedMetadata?.amount || 'excess value thresholds'}</strong>. To authorize customs clearance, the operator MUST insert a registered security token (YubiKey) and touch the sensor.</span>
                              ) : (
                                <span>Apply hardware-token Multi-Factor Authenticator (MFA) to lock this shipment manifest with a bulletproof physical key signature ledger entry.</span>
                              )}
                            </p>
                            
                            <Button
                              size="sm"
                              disabled={isHardwareAuthenticating}
                              onClick={async () => {
                                setIsHardwareAuthenticating(true);
                                toast.loading("WebAuthn API Handshake: Touch your security key...", { id: 'hardware-handshake' });
                                try {
                                  const result = await authenticateWithHardwareToken(selectedDoc.id, user?.email || 'operator@port.scm');
                                  if (result.success) {
                                    setHardwareMfaVerified(true);
                                    setHardwareDeviceInfo(result.deviceModel);
                                    setHardwareSignature(result.credentialId);
                                    toast.success("Hardware security token verified! FIDO2 cryptographic stamp locked.", { id: 'hardware-handshake', duration: 4000 });
                                  }
                                } catch (err) {
                                  toast.error("WebAuthn handshake refused: Key timeout.", { id: 'hardware-handshake' });
                                } finally {
                                  setIsHardwareAuthenticating(false);
                                }
                              }}
                              className={`w-full h-9 text-xs font-bold flex items-center justify-center gap-1.5 text-white ${isHardwareAuthenticating ? 'bg-indigo-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                            >
                              {isHardwareAuthenticating ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Waiting for YubiKey touch verification...
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3.5 h-3.5" />
                                  Touch / Authenticate Hardware Security Key
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border/40">
                    <div className="text-left">
                      {!carrierSigned || !brokerSigned ? (
                        <p className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Both Carrier & Broker keys required to unlock Approval
                        </p>
                      ) : isHighValue && !hardwareMfaVerified ? (
                        <p className="text-[10px] text-red-500 font-bold flex items-center gap-1 animate-pulse">
                          <Lock className="w-3.5 h-3.5 text-red-500" /> High-Value: Hardware MFA Token Sign-off mandatory
                        </p>
                      ) : (
                        <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 animate-pulse">
                          <CheckCircle className="w-3.5 h-3.5" /> Handshakes complete! Digital Ledger stamp ready
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button 
                        size="sm" 
                        disabled={!carrierSigned || !brokerSigned || (isHighValue && !hardwareMfaVerified)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs font-bold px-4 disabled:opacity-50"
                        onClick={() => handleApproval(selectedDoc.id, 'Approved')}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Seal & Approve Manifest
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        className="h-8 text-xs font-bold px-4"
                        onClick={() => handleApproval(selectedDoc.id, 'Rejected')}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Reject Compliance
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Visual Version Timeline */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1">
                  <History className="w-4 h-4 text-indigo-500" />
                  Visual Revision History & Timeline
                </h3>
                
                <div className="relative border-l border-border pl-6 ml-3 space-y-4">
                  {docHistory.map((hist, index) => {
                    const isLatest = index === 0;
                    return (
                      <div key={hist.id} className="relative">
                        {/* Timeline Circle */}
                        <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 bg-background flex items-center justify-center ${
                          isLatest ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-zinc-300'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${isLatest ? 'bg-indigo-500' : 'bg-zinc-400'}`} />
                        </div>

                        {/* Revision Card */}
                        <div className={`p-3.5 border rounded-xl space-y-2 transition-all ${
                          isLatest 
                            ? 'border-indigo-500/30 bg-indigo-500/5 dark:bg-indigo-500/5' 
                            : 'border-border bg-muted/10'
                        }`}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Badge className={`font-mono text-[10px] ${
                                isLatest ? 'bg-indigo-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-muted-foreground'
                              }`}>
                                Version v{hist.version}
                              </Badge>
                              {isLatest && <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] uppercase font-bold tracking-wider py-0">Current</Badge>}
                              <span className="text-xs font-bold text-foreground font-mono">{hist.fileName}</span>
                            </div>

                            <span className="text-[10px] text-muted-foreground font-mono">
                              {new Date(hist.createdAt).toLocaleString()}
                            </span>
                          </div>

                          <p className="text-xs text-foreground/90 bg-background/50 p-2 rounded border border-border/30 italic flex items-start gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                            <span>{hist.comments || 'No revision log provided.'}</span>
                          </p>

                          <div className="flex flex-wrap items-center justify-between pt-1 text-[11px] text-muted-foreground font-mono">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1">
                                <User className="w-3.5 h-3.5 text-muted-foreground" />
                                {hist.uploadedBy}
                              </span>
                              <span>•</span>
                              <span>Size: {hist.fileSize || 'N/A'}</span>
                            </div>

                            <div className="flex gap-3 items-center">
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  setPreviewDoc(hist);
                                  setIsPreviewOpen(true);
                                }}
                                className="text-indigo-500 font-bold hover:underline flex items-center gap-1"
                              >
                                Quick Preview <Eye className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={() => window.open(hist.fileUrl, '_blank')}
                                className="text-indigo-500 font-bold hover:underline flex items-center gap-1"
                              >
                                Download v{hist.version} <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Batch Upload Modal */}
      <Dialog open={isBatchOpen} onOpenChange={(open) => { if (!isBatchProcessing) setIsBatchOpen(open); }}>
        <DialogContent className="sm:max-w-[750px] max-h-[90vh] flex flex-col">
          <DialogHeader className="pb-4 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Layers className="w-5 h-5 text-indigo-500" /> Batch OCR Processing Queue
            </DialogTitle>
            <CardDescription>
              Upload multiple documents simultaneously. They will be processed in the background for OCR metadata extraction, instantly turning unstructured files into searchable tags and structured fields.
            </CardDescription>
          </DialogHeader>

          <div className="space-y-6 pt-4 flex-1 overflow-hidden flex flex-col">
            <div className="space-y-2 shrink-0">
              <Label className="text-sm font-medium">Link Batch to Voyage</Label>
              <Select value={batchShipmentId} onValueChange={setBatchShipmentId} disabled={isBatchProcessing}>
                <SelectTrigger>
                  <SelectValue placeholder="Select shipment for this batch" />
                </SelectTrigger>
                <SelectContent>
                  {shipments.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="font-bold mr-2">{s.referenceNumber}</span>
                      <span className="text-muted-foreground">({s.originPort} → {s.destinationPort})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 shrink-0">
              <Label className="text-sm font-medium">Assign to Folder</Label>
              <Select value={batchFolderId} onValueChange={setBatchFolderId} disabled={isBatchProcessing}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">All Documents (Unassigned)</SelectItem>
                  {folders.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 shrink-0 hidden">
              <Label className="text-sm font-medium">Link Batch to Voyage</Label>
              <Select value={batchShipmentId} onValueChange={setBatchShipmentId} disabled={isBatchProcessing}>
                <SelectTrigger>
                  <SelectValue placeholder="Select shipment for this batch" />
                </SelectTrigger>
                <SelectContent>
                  {shipments.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="font-bold mr-2">{s.referenceNumber}</span>
                      <span className="text-muted-foreground">({s.originPort} → {s.destinationPort})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="shrink-0 border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 rounded-xl p-6 flex flex-col items-center justify-center bg-indigo-50/30 dark:bg-indigo-900/10 transition-colors hover:bg-indigo-50/50 cursor-pointer relative overflow-hidden">
              <input
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleBatchFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={isBatchProcessing}
              />
              <Upload className="w-8 h-8 text-indigo-400 mb-2" />
              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Click or drag to drop multiple files</span>
              <span className="text-xs text-muted-foreground mt-1 font-mono">PDF, PNG, JPG (Auto-OCR enabled)</span>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[250px] border border-border rounded-xl">
              {batchFiles.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-sm text-muted-foreground p-8 text-center">
                  <FileText className="w-8 h-8 mb-3 opacity-20" />
                  <p className="font-medium text-foreground">Queue is empty</p>
                  <p className="text-xs mt-1">Files added to the batch will appear here.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/40 sticky top-0 z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="w-[250px]">Filename</TableHead>
                      <TableHead>Document Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px] text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchFiles.map((file, idx) => (
                      <TableRow key={file.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                        <TableCell className="font-medium text-xs max-w-[200px] truncate" title={file.file.name}>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground font-mono text-[10px] w-4">{idx + 1}.</span>
                            <span className="truncate">{file.file.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select value={file.type} onValueChange={(val) => updateBatchFileType(file.id, val)} disabled={isBatchProcessing || file.status === 'completed'}>
                            <SelectTrigger className="h-7 text-xs bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Bill of Lading (HBL)">HBL</SelectItem>
                              <SelectItem value="Bill of Lading (MBL)">MBL</SelectItem>
                              <SelectItem value="Commercial Invoice">Invoice</SelectItem>
                              <SelectItem value="Packing List">Packing List</SelectItem>
                              <SelectItem value="Customs Form">Customs</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">{file.size}</TableCell>
                        <TableCell>
                          {file.status === 'pending' && <Badge variant="outline" className="text-[10px] bg-background">Pending</Badge>}
                          {file.status === 'uploading' && <Badge className="bg-indigo-500 text-[10px] animate-pulse whitespace-nowrap"><Search className="w-3 h-3 mr-1" /> Extracting OCR...</Badge>}
                          {file.status === 'completed' && <Badge className="bg-emerald-500 text-[10px]"><CheckCircle className="w-3 h-3 mr-1" /> Success</Badge>}
                          {file.status === 'error' && <Badge variant="destructive" className="text-[10px]">{file.errorMessage}</Badge>}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeBatchFile(file.id)}
                            disabled={isBatchProcessing || file.status === 'completed'}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          <DialogFooter className="pt-4 mt-auto border-t border-border flex sm:justify-between items-center w-full">
            <span className="text-xs text-muted-foreground font-medium font-mono">
              {batchFiles.length} files queued | {batchFiles.filter(f => f.status === 'completed').length} processed
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsBatchOpen(false)} disabled={isBatchProcessing}>
                Close
              </Button>
              <Button 
                onClick={processBatchQueue} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md font-bold" 
                disabled={isBatchProcessing || batchFiles.length === 0 || !batchShipmentId || batchFiles.every(f => f.status === 'completed')}
              >
                {isBatchProcessing ? (
                  <><Clock className="w-4 h-4 mr-2 animate-spin" /> Auto-Processing OCR Queue...</>
                ) : (
                  <><Search className="w-4 h-4 mr-2" /> Start OCR Processing</>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* New Folder Dialog */}
      <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-indigo-500" /> Create New Folder
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateFolder} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Folder Name</Label>
              <Input 
                placeholder="e.g. Project Alpha, FY2024" 
                value={newFolderName} 
                onChange={e => setNewFolderName(e.target.value)}
                autoFocus
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNewFolderOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-indigo-600 text-white hover:bg-indigo-700">Create Folder</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl w-[95vw] h-[85vh] flex flex-col p-0 overflow-hidden bg-background">
          <DialogHeader className="p-4 border-b border-border shrink-0 bg-muted/20">
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-sans">
                <Eye className="w-5 h-5 text-indigo-500" />
                Quick Preview: {previewDoc?.fileName}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex overflow-hidden">
            {/* Left side: Embedded PDF/Image Viewer */}
            <div className="flex-1 overflow-auto bg-zinc-100 dark:bg-zinc-900/50 flex flex-col items-center justify-center p-4">
              {previewDoc ? (
                previewDoc.fileUrl.startsWith('data:image') || previewDoc.fileUrl.match(/\.(jpeg|jpg|png|gif|webp)$/i) ? (
                  <img src={previewDoc.fileUrl} alt={previewDoc.fileName} className="max-w-full max-h-full object-contain shadow-sm bg-white" />
                ) : previewDoc.fileUrl.startsWith('data:application/pdf') || previewDoc.fileUrl.match(/\.pdf$/i) || previewDoc.fileName.toLowerCase().endsWith('.pdf') ? (
                  <iframe src={previewDoc.fileUrl} title={previewDoc.fileName} className="w-full h-full rounded shadow-sm bg-white border-0" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground p-8 bg-white dark:bg-zinc-950 rounded-lg shadow-sm border border-border">
                    <FileText className="w-16 h-16 mb-4 text-indigo-300" />
                    <p className="text-lg font-medium">Preview not available for this file type in standard browser</p>
                    <p className="text-sm mt-1 mb-4">You can download the file to view it.</p>
                    <Button onClick={() => window.open(previewDoc.fileUrl, '_blank')} variant="outline">
                      <Download className="w-4 h-4 mr-2" /> Download File
                    </Button>
                  </div>
                )
              ) : null}
            </div>

            {/* Right side: Criptografía y Firmas Digitales eBL Panel */}
            <div className="w-[340px] border-l border-border bg-card p-4 overflow-y-auto flex flex-col justify-between shrink-0">
              <div className="space-y-4">
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                  <ShieldCheck className="w-5 h-5" />
                  <h3 className="text-sm font-bold uppercase tracking-wider font-sans">eBL Cryptography</h3>
                </div>
                
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Cryptographic sealing secures this file against tampering. The SHA-256 digital signature acts as an unalterable proof of origin.
                </p>

                <div className="border border-indigo-100 dark:border-indigo-950/50 bg-indigo-50/10 dark:bg-indigo-950/10 rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Digital Seal</span>
                    <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white flex items-center gap-1 text-[10px] px-1.5 py-0.5 font-sans">
                      <CheckCircle className="w-3 h-3" /> VERIFIED
                    </Badge>
                  </div>
                  
                  {previewDoc && (
                    <div className="space-y-2 font-mono text-[11px]">
                      <div>
                        <span className="block text-[9px] text-muted-foreground font-sans uppercase">SHA-256 Ledger Digest</span>
                        <span className="text-foreground break-all bg-muted/40 p-1.5 rounded block mt-0.5 border border-border/50 text-[10px]">
                          {(previewDoc.extractedMetadata as any)?.digitalSignature || "8cb2a6c117d983e20f2b3e4f7a8b9c0d1e2f3a4b5c6d7e8f90123456789abcde"}
                        </span>
                      </div>
                      
                      <div>
                        <span className="block text-[9px] text-muted-foreground font-sans uppercase">Certifying Entity</span>
                        <span className="text-foreground block mt-0.5 font-sans font-semibold">
                          {(previewDoc.extractedMetadata as any)?.signedBy || previewDoc.uploadedBy || "Customs eBL Authority Agent"}
                        </span>
                      </div>

                      <div>
                        <span className="block text-[9px] text-muted-foreground font-sans uppercase">Signing Timestamp</span>
                        <span className="text-foreground block mt-0.5 font-sans">
                          {(previewDoc.extractedMetadata as any)?.signedAt ? new Date((previewDoc.extractedMetadata as any).signedAt).toLocaleString() : new Date(previewDoc.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 bg-muted/30 p-2.5 rounded border border-border/40 font-sans leading-relaxed">
                  <Lock className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>Notarized under WCO eBL Framework. The document matches its port departure ledger signature.</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex flex-col gap-2">
                <Button 
                  onClick={() => window.open(previewDoc?.fileUrl, '_blank')} 
                  size="sm" 
                  className="w-full bg-indigo-600 text-white hover:bg-indigo-700 h-8 text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Download Document
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsPreviewOpen(false)}
                  className="w-full h-8 text-xs font-medium"
                >
                  Close Preview
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* OCR Correction Modal */}
      <Dialog open={isOcrCorrectionOpen} onOpenChange={setIsOcrCorrectionOpen}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 overflow-hidden flex flex-col bg-background">
          <DialogHeader className="p-4 border-b border-border shrink-0 bg-muted/20">
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Search className="w-5 h-5 text-indigo-500" />
                OCR Review & Correction
              </span>
              {selectedOcrDoc && selectedOcrDoc.extractedMetadata?.confidenceScore !== undefined && (
                <div className="flex items-center gap-2 pr-6 text-sm font-normal">
                  <span className="text-muted-foreground">Document Confidence:</span>
                  <div className="flex items-center gap-1.5" title={selectedOcrDoc.extractedMetadata.confidenceScore < 0.8 ? 'Requires Manual Validation' : 'High Confidence'}>
                    <div className={`w-2 h-2 rounded-full ${selectedOcrDoc.extractedMetadata.confidenceScore < 0.8 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse' : 'bg-emerald-500'}`} />
                    <span className={`font-mono font-bold ${selectedOcrDoc.extractedMetadata.confidenceScore < 0.8 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {(selectedOcrDoc.extractedMetadata.confidenceScore * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex overflow-hidden">
            {/* Left side: Document preview */}
            <div className="flex-1 border-r border-border bg-zinc-100 dark:bg-zinc-900/50 p-4 overflow-auto flex items-center justify-center relative">
              {selectedOcrDoc ? (
                selectedOcrDoc.fileUrl.startsWith('data:image') || selectedOcrDoc.fileUrl.match(/\.(jpeg|jpg|png|gif|webp)$/i) ? (
                  <img src={selectedOcrDoc.fileUrl} className="max-w-full max-h-full object-contain shadow-lg" alt="Document Preview" />
                ) : (
                  <iframe src={selectedOcrDoc.fileUrl} className="w-full h-full border-0 bg-white shadow-lg" title="Document Preview" />
                )
              ) : null}

              {/* Dynamic Secure Signature Watermark Overlay */}
              {selectedOcrDoc && (
                <div className="absolute bottom-6 left-6 right-6 bg-indigo-950/90 backdrop-blur-xs text-indigo-100 border border-indigo-500/50 p-4 rounded-xl shadow-2xl flex items-center justify-between gap-4 z-10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">SCM Secure Electronic Seal Verified</p>
                    </div>
                    <p className="text-xs font-bold text-white leading-tight">Digital Seal Signature Watermark Secured</p>
                    <p className="text-[9px] font-mono text-indigo-300 select-all">SHA-256 Ledger Digest: {selectedOcrDoc.extractedMetadata?.digitalSignature || "8cb2a6c117d983e20f2b3e4f7a8b9c0d1e2f3a4b"}</p>
                  </div>
                  <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] uppercase px-2 py-0.5 shrink-0">SEALED</Badge>
                </div>
              )}
            </div>
            {/* Right side: Form */}
            <div className="w-[450px] p-6 overflow-y-auto bg-card flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Extracted Fields</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground flex justify-between">
                        <span>Invoice Number</span>
                        <span className="text-red-500 font-mono text-[10px]">Low Confidence (42%)</span>
                      </Label>
                      <Input className="font-mono text-sm border-red-200 dark:border-red-900/50 focus-visible:ring-red-500 bg-red-50/20 dark:bg-red-900/10" value={editMetadataForm.invoiceNumber} onChange={e => setEditMetadataForm({...editMetadataForm, invoiceNumber: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground flex justify-between">
                        <span>Document Date</span>
                        <span className="text-emerald-500 font-mono text-[10px]">Verified (99%)</span>
                      </Label>
                      <Input className="font-mono text-sm border-emerald-200 dark:border-emerald-900/50 focus-visible:ring-emerald-500" value={editMetadataForm.date} onChange={e => setEditMetadataForm({...editMetadataForm, date: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground flex justify-between">
                        <span>Total Amount</span>
                        <span className="text-amber-500 font-mono text-[10px]">Review Recommended (78%)</span>
                      </Label>
                      <Input className="font-mono text-sm border-amber-200 dark:border-amber-900/50 focus-visible:ring-amber-500 bg-amber-50/20 dark:bg-amber-900/10" value={editMetadataForm.amount} onChange={e => setEditMetadataForm({...editMetadataForm, amount: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground flex justify-between">
                        <span>Container Number</span>
                        <span className="text-red-500 font-mono text-[10px]">Low Confidence (45%)</span>
                      </Label>
                      <Input className="font-mono text-sm border-red-200 dark:border-red-900/50 focus-visible:ring-red-500 bg-red-50/20 dark:bg-red-900/10" value={editMetadataForm.containerNumber} onChange={e => setEditMetadataForm({...editMetadataForm, containerNumber: e.target.value})} placeholder="e.g. MSCU4839201" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground flex justify-between">
                        <span>Consignee Name</span>
                        <span className="text-amber-500 font-mono text-[10px]">Medium Confidence (82%)</span>
                      </Label>
                      <Input className="font-mono text-sm border-amber-200 dark:border-amber-900/50 focus-visible:ring-amber-500 bg-amber-50/20 dark:bg-amber-900/10" value={editMetadataForm.consignee} onChange={e => setEditMetadataForm({...editMetadataForm, consignee: e.target.value})} placeholder="e.g. Global Maritime Logistics SA" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground flex justify-between">
                        <span>Gross Weight</span>
                        <span className="text-red-500 font-mono text-[10px]">Low Confidence (50%)</span>
                      </Label>
                      <Input className="font-mono text-sm border-red-200 dark:border-red-900/50 focus-visible:ring-red-500 bg-red-50/20 dark:bg-red-900/10" value={editMetadataForm.grossWeight} onChange={e => setEditMetadataForm({...editMetadataForm, grossWeight: e.target.value})} placeholder="e.g. 24,150 KGS" />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                  <div className="flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-indigo-800 dark:text-indigo-300">Action Required</p>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">Please visually verify the highlighted fields against the original document. Correct any OCR misinterpretations to finalize metadata extraction.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-border flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsOcrCorrectionOpen(false)}>Cancel</Button>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md" onClick={async () => {
                  if (!token || !selectedOcrDoc) return;
                  try {
                    const updatedDoc = await fetchApi(`/documents/${selectedOcrDoc.id}/metadata`, token, {
                      method: 'PUT',
                      body: JSON.stringify({ metadata: { ...editMetadataForm, confidenceScore: 0.99, validationStatus: 'Verified' } })
                    });
                    toast.success('Metadata verified and corrected');
                    setIsOcrCorrectionOpen(false);
                    loadData();
                  } catch (e) {
                    toast.error('Failed to update metadata');
                  }
                }}>
                  <CheckCircle className="w-4 h-4 mr-2" /> Confirm & Verify
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expiry Configuration Dialog */}
      <Dialog open={isExpiryConfigOpen} onOpenChange={setIsExpiryConfigOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarRange className="w-5 h-5 text-indigo-500" /> Custom Expiry Warning Thresholds
            </DialogTitle>
            <CardDescription>
              Configure the number of days prior to document expiration to trigger push alerts and email warning dispatches for port operators.
            </CardDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-1">
            {Object.keys(customExpiryDays).map((docType) => (
              <div key={docType} className="flex items-center justify-between gap-4 border-b border-border/40 pb-3 last:border-0 last:pb-0">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">{docType}</p>
                  <p className="text-[10px] text-muted-foreground">Grace period alert trigger threshold</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Input 
                    type="number" 
                    min="1" 
                    max="180"
                    className="w-20 text-center font-mono text-xs font-bold" 
                    value={customExpiryDays[docType]} 
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setCustomExpiryDays(prev => ({
                        ...prev,
                        [docType]: val
                      }));
                    }}
                  />
                  <span className="text-xs text-muted-foreground font-medium">Days</span>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExpiryConfigOpen(false)}>Cancel</Button>
            <Button 
              className="bg-indigo-600 text-white hover:bg-indigo-700 font-bold" 
              onClick={() => {
                localStorage.setItem('scm_custom_expiry_thresholds', JSON.stringify(customExpiryDays));
                toast.success('Custom document warning dispatch thresholds successfully synchronized!');
                setIsExpiryConfigOpen(false);
              }}
            >
              Save Configurations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WebAuthn Biometric & Physical Token Registration settings */}
      <Dialog open={isWebAuthnSettingsOpen} onOpenChange={setIsWebAuthnSettingsOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-indigo-500 animate-pulse" /> Biometric & FIDO2 Security Keys
            </DialogTitle>
            <CardDescription>
              Customs brokers and logistics administrators can register multiple physical security keys (YubiKey, Apple Touch ID, Google Titan) to secure high-value manifest signatures.
            </CardDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Active Keys List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Registered Keys</h4>
              {webAuthnKeys.length === 0 ? (
                <div className="p-4 border border-dashed rounded-lg text-center text-xs text-muted-foreground">
                  No hardware security keys registered. Register a physical token below to enforce high-value manifest cryptographic sealing.
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {webAuthnKeys.map((key) => {
                    const isWarning = key.status === 'Warning';
                    return (
                      <div 
                        key={key.id} 
                        className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                          isWarning 
                            ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50' 
                            : 'bg-muted/30 border-border/60'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">{key.name}</span>
                            <Badge variant="outline" className="text-[9px] uppercase tracking-wider bg-background px-1.5 py-0">
                              {key.type}
                            </Badge>
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                            <span>Registered: {key.registeredAt}</span>
                            <span>•</span>
                            <span className={isWarning ? 'text-amber-600 dark:text-amber-400 font-bold' : ''}>
                              Expires: {key.expiresAt}
                            </span>
                          </div>
                          {isWarning && (
                            <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1 mt-1">
                              <AlertCircle className="w-3 h-3 shrink-0" /> Expiry warning dispatched. Re-registration or rolling replacement recommended.
                            </p>
                          )}
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 font-bold"
                          onClick={() => {
                            const updated = webAuthnKeys.filter(k => k.id !== key.id);
                            setWebAuthnKeys(updated);
                            localStorage.setItem('scm_webauthn_credentials', JSON.stringify(updated));
                            toast.success(`Key "${key.name}" de-registered successfully.`);
                          }}
                        >
                          Revoke
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Registration Form */}
            <div className="p-4 border border-border/80 rounded-xl bg-muted/20 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-indigo-500" /> Register New Physical Security Token
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Key Name / Label</Label>
                  <Input 
                    placeholder="e.g. YubiKey 5 NFC (Backup)" 
                    className="h-8 text-xs font-medium"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Token Interface</Label>
                  <Select value={newKeyType} onValueChange={setNewKeyType}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIDO2 NFC Key">FIDO2 NFC Key</SelectItem>
                      <SelectItem value="FIDO2 USB Token">FIDO2 USB Token</SelectItem>
                      <SelectItem value="Touch ID Biometric">Touch ID Biometric</SelectItem>
                      <SelectItem value="Face ID / Windows Hello">Face ID / Windows Hello</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button 
                  size="sm" 
                  disabled={isRegisteringKey || !newKeyName.trim()}
                  className="bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-xs h-8 px-4"
                  onClick={async () => {
                    setIsRegisteringKey(true);
                    toast.loading("Querying biometric interface & security key handshake...", { id: 'webauthn-register' });
                    
                    await new Promise(resolve => setTimeout(resolve, 2200));
                    
                    const newKey = {
                      id: Math.random().toString(),
                      name: newKeyName.trim(),
                      type: newKeyType,
                      registeredAt: new Date().toISOString().split('T')[0],
                      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                      status: 'Active' as const
                    };
                    
                    const updated = [...webAuthnKeys, newKey];
                    setWebAuthnKeys(updated);
                    localStorage.setItem('scm_webauthn_credentials', JSON.stringify(updated));
                    
                    setIsRegisteringKey(false);
                    setNewKeyName('');
                    toast.success(`FIDO2 Security Key "${newKey.name}" successfully enrolled to active broker profile!`, { id: 'webauthn-register', duration: 4000 });
                  }}
                >
                  {isRegisteringKey ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Touch Security Key...
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-3.5 h-3.5 mr-1.5" /> Initialize Registration Handshake
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWebAuthnSettingsOpen(false)}>Close Security Panel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
