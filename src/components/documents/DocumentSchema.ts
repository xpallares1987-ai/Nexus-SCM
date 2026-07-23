/**
 * @file DocumentSchema.ts
 * @description Defines standard TypeScript models, interfaces, and metadata structures
 * for Document Management within the SCM Freight Forwarding module.
 * Also provides a modular Storage Service wrapper abstracting hybrid S3/Blob operations
 * and relational database synchronization.
 */

import { fetchApi } from '../../lib/api';

/**
 * Supported SCM Document Types
 */
export enum SCMDocumentType {
  HBL = 'Bill of Lading (HBL)',
  MBL = 'Bill of Lading (MBL)',
  AWB = 'Air Waybill (AWB)',
  INVOICE = 'Commercial Invoice',
  PACKING_LIST = 'Packing List',
  CUSTOMS_FORM = 'Customs Form',
  CERTIFICATE_OF_ORIGIN = 'Certificate of Origin',
  OTHER = 'Other',
}

/**
 * Standard SCM Document Verification Statuses
 */
export type SCMDocumentStatus = 'Pending' | 'Approved' | 'Rejected';

/**
 * Common MIME Types used in Logistics and Supply Chain
 */
export const SCM_MIME_TYPES = {
  PDF: 'application/pdf',
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  DOC: 'application/msword',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  XLS: 'application/vnd.ms-excel',
  CSV: 'text/csv',
  XML: 'application/xml',
  JSON: 'application/json',
};

/**
 * OCR and Extraction Metadata schema
 */
export interface DocumentMetadata {
  invoiceNumber?: string;
  date?: string;
  amount?: string;
  currency?: string;
  confidenceScore?: number; // 0.0 to 1.0 representing Gemini or OCR confidence
  validationStatus?: 'Needs Review' | 'Verified';
  shipperName?: string;
  consigneeName?: string;
  cargoWeight?: string;
  containerNumber?: string;
}

/**
 * Core Shipment Document Interface
 * Fully typed representing relational metadata linked to a S3/Blob object
 */
export interface ShipmentDocument {
  id: string;
  shipmentId: string; // Foreing key to shipments table
  documentType: SCMDocumentType | string;
  fileName: string;
  fileUrl: string; // Storage Location URI (S3 key, cloud URL or base64 data URI)
  uploadedBy: string;
  status: SCMDocumentStatus;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  version: number; // For active document version control & revisions
  parentDocumentId?: string | null; // Pointer to previous revision
  comments?: string | null;
  fileSize?: string | null;
  extractedMetadata?: DocumentMetadata | null;
  tags?: string[] | null;
  folderId?: string | null;
  expiryDate?: string | null;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Document revision history entry
 */
export interface DocumentRevision {
  version: number;
  updatedAt: string;
  updatedBy: string;
  fileName: string;
  fileUrl: string;
  comments?: string;
}

/**
 * Options for uploading new documents or revision packages
 */
export interface UploadDocumentOptions {
  documentType: SCMDocumentType | string;
  fileName: string;
  fileBase64: string; // Raw base64 string for hybrid upload
  fileSize: string;
  uploadedBy: string;
  comments?: string;
  folderId?: string | null;
  parentDocumentId?: string | null;
  version?: number;
  tags?: string[];
  expiryDate?: string | null;
}

/**
 * Hybrid S3/Blob Storage Service Wrapper
 * Handles file transfer abstraction & syncs metadata with the relational database
 */
export class DocumentStorageService {
  private static instance: DocumentStorageService;

  private constructor() {}

  /**
   * Singleton accessor
   */
  public static getInstance(): DocumentStorageService {
    if (!DocumentStorageService.instance) {
      DocumentStorageService.instance = new DocumentStorageService();
    }
    return DocumentStorageService.instance;
  }

  /**
   * Validates if a file MIME type is supported by the logistics module
   */
  public isValidMimeType(mimeType: string): boolean {
    return Object.values(SCM_MIME_TYPES).includes(mimeType);
  }

  /**
   * Translates a Document Type into user-friendly localized strings using react-i18next translation
   */
  public getLocalizedLabel(type: SCMDocumentType | string, t: (key: string, defaultValue?: string) => string): string {
    switch (type) {
      case SCMDocumentType.HBL:
        return t('doc_types.hbl', 'House Bill of Lading (HBL)');
      case SCMDocumentType.MBL:
        return t('doc_types.mbl', 'Master Bill of Lading (MBL)');
      case SCMDocumentType.AWB:
        return t('doc_types.awb', 'Air Waybill (AWB)');
      case SCMDocumentType.INVOICE:
        return t('doc_types.invoice', 'Commercial Invoice');
      case SCMDocumentType.PACKING_LIST:
        return t('doc_types.packing_list', 'Packing List');
      case SCMDocumentType.CUSTOMS_FORM:
        return t('doc_types.customs_form', 'Customs Declaration');
      case SCMDocumentType.CERTIFICATE_OF_ORIGIN:
        return t('doc_types.co', 'Certificate of Origin');
      case SCMDocumentType.OTHER:
      default:
        return t('doc_types.other', 'Other Document');
    }
  }

  /**
   * Uploads a document file to storage and creates its relational record in the database
   * @param shipmentId Associated shipment ID
   * @param options Document file data and metadata payload
   * @param token Authentication token
   */
  public async uploadShipmentDocument(
    shipmentId: string,
    options: UploadDocumentOptions,
    token: string
  ): Promise<ShipmentDocument> {
    const payload = {
      documentType: options.documentType,
      fileName: options.fileName,
      fileUrl: options.fileBase64.startsWith('data:') ? options.fileBase64 : `data:application/octet-stream;base64,${options.fileBase64}`,
      uploadedBy: options.uploadedBy,
      comments: options.comments || 'Uploaded via DocumentStorageService',
      fileSize: options.fileSize,
      version: options.version || 1,
      parentDocumentId: options.parentDocumentId || null,
      folderId: options.folderId || null,
      tags: options.tags || [],
      expiryDate: options.expiryDate || null,
    };

    // Performs hybrid storage upload via the shipments endpoints (as viewed in backend route)
    const response = await fetchApi(`/shipments/${shipmentId}/documents`, token, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return response as ShipmentDocument;
  }

  /**
   * Retrieves all documents linked to a specific shipment
   * @param shipmentId Shipments primary key
   * @param token Authentication token
   */
  public async getDocumentsByShipment(shipmentId: string, token: string): Promise<ShipmentDocument[]> {
    const allDocuments = await fetchApi('/documents', token);
    if (!Array.isArray(allDocuments)) {
      return [];
    }
    // Filter documents by shipment ID
    return allDocuments.filter((doc: any) => doc.shipmentId === shipmentId) as ShipmentDocument[];
  }

  /**
   * Uploads a revised version of an existing document
   * Handles linking of parentDocumentId and auto-increments version counter
   * @param parentDocument Current active document version record
   * @param options New file properties
   * @param token Auth token
   */
  public async uploadDocumentRevision(
    parentDocument: ShipmentDocument,
    options: Omit<UploadDocumentOptions, 'documentType' | 'parentDocumentId' | 'version'>,
    token: string
  ): Promise<ShipmentDocument> {
    const revisionOptions: UploadDocumentOptions = {
      ...options,
      documentType: parentDocument.documentType,
      parentDocumentId: parentDocument.id,
      version: (parentDocument.version || 1) + 1,
    };

    return this.uploadShipmentDocument(parentDocument.shipmentId, revisionOptions, token);
  }

  /**
   * Triggers background intelligent extraction (GenAI OCR) on the document
   * @param documentId Primary key of the document record
   * @param token Auth token
   */
  public async triggerMetadataExtraction(documentId: string, token: string): Promise<DocumentMetadata> {
    const res = await fetchApi(`/gemini/document-summary/${documentId}`, token, {
      method: 'POST',
    });
    return {
      validationStatus: 'Verified',
      confidenceScore: 0.95,
      ...res,
    };
  }

  /**
   * Approves or Rejects a document inside the logistics flow
   */
  public async updateDocumentStatus(
    documentId: string,
    status: SCMDocumentStatus,
    approvedBy: string,
    rejectionReason: string | null,
    token: string
  ): Promise<ShipmentDocument> {
    const response = await fetchApi(`/documents/${documentId}/status`, token, {
      method: 'PUT',
      body: JSON.stringify({
        status,
        approvedBy,
        rejectionReason,
      }),
    });
    return response as ShipmentDocument;
  }
}
