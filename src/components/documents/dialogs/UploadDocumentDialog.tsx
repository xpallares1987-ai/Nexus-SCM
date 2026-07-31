import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/overlays/dialog';
import { Button } from '@/components/ui/forms/button';
import { Input } from '@/components/ui/forms/input';
import { Label } from '@/components/ui/forms/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/forms/select';
import { CardDescription } from '@/components/ui/data-display/card';
import { FilePlus, Upload } from 'lucide-react';

interface FolderItem {
  id: string;
  name: string;
}

interface ShipmentItem {
  id: string;
  referenceNumber: string;
  originPort: string;
  destinationPort: string;
}

interface UploadDocumentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  uploadType: string;
  setUploadType: (val: string) => void;
  uploadFolderId: string;
  setUploadFolderId: (val: string) => void;
  uploadShipmentId: string;
  setUploadShipmentId: (val: string) => void;
  folders: FolderItem[];
  shipments: ShipmentItem[];
  isDraggingSingle: boolean;
  setIsDraggingSingle: (val: boolean) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>, type: string) => void;
  uploadFileSize: string | null;
  uploadFileName: string;
  setUploadFileName: (val: string) => void;
  uploadComments: string;
  setUploadComments: (val: string) => void;
  isUploading: boolean;
  t: any;
}

export function UploadDocumentDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  uploadType,
  setUploadType,
  uploadFolderId,
  setUploadFolderId,
  uploadShipmentId,
  setUploadShipmentId,
  folders,
  shipments,
  isDraggingSingle,
  setIsDraggingSingle,
  handleFileChange,
  uploadFileSize,
  uploadFileName,
  setUploadFileName,
  uploadComments,
  setUploadComments,
  isUploading,
  t,
}: UploadDocumentDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <FilePlus className="w-5 h-5 text-indigo-500" /> Add New Shipping Document
          </DialogTitle>
          <CardDescription>
            Upload a digital shipping form, categorize it, and bind it securely to an active shipment.
          </CardDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('document_type', 'Document Type')}</Label>
              <Select value={uploadType} onValueChange={setUploadType}>
                <SelectTrigger>
                  <SelectValue placeholder={t('document_type', 'Select type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bill of Lading (HBL)">{t('doc_types.hbl', 'Bill of Lading (HBL)')}</SelectItem>
                  <SelectItem value="Bill of Lading (MBL)">{t('doc_types.mbl', 'Bill of Lading (MBL)')}</SelectItem>
                  <SelectItem value="Air Waybill (AWB)">{t('doc_types.awb', 'Air Waybill (AWB)')}</SelectItem>
                  <SelectItem value="Commercial Invoice">{t('doc_types.invoice', 'Commercial Invoice')}</SelectItem>
                  <SelectItem value="Packing List">{t('doc_types.packing_list', 'Packing List')}</SelectItem>
                  <SelectItem value="Customs Form">{t('doc_types.customs_form', 'Customs Form')}</SelectItem>
                  <SelectItem value="Certificate of Origin">{t('doc_types.co', 'Certificate of Origin')}</SelectItem>
                  <SelectItem value="Other">{t('doc_types.other', 'Other')}</SelectItem>
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
                  {folders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
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
                  {shipments.map((s) => (
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
            <div
              className={`relative border-2 border-dashed rounded-md p-4 transition-colors ${
                isDraggingSingle
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-input hover:bg-muted/50'
              }`}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingSingle(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingSingle(false);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingSingle(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleFileChange({ target: { files: e.dataTransfer.files } } as unknown as React.ChangeEvent<HTMLInputElement>, 'new');
                }
              }}
            >
              <Input
                type="file"
                onChange={(e) => handleFileChange(e, 'new')}
                accept=".pdf,.png,.jpg,.jpeg"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                required
              />
              <div className="flex flex-col items-center justify-center text-sm text-muted-foreground pointer-events-none">
                <Upload className="w-6 h-6 mb-2 text-indigo-400" />
                <span className="font-medium">Click or drag file here</span>
              </div>
            </div>
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isUploading}>
              {isUploading ? 'Uploading & Securing...' : 'Verify & Store'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
