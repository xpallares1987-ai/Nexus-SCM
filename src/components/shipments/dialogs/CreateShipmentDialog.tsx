import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/overlays/dialog';
import { Button } from '@/components/ui/forms/button';
import { Input } from '@/components/ui/forms/input';
import { Label } from '@/components/ui/forms/label';
import { UNLocodeSelector } from '@/src/components/shared/UNLocodeSelector';
import { DocumentScanner } from '../../documents/DocumentScanner';
import { Plus } from 'lucide-react';

interface Party {
  id: string;
  companyName?: string;
  companyType?: string;
}

interface CreateShipmentDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  handleCreate: (e: React.FormEvent) => void;
  handleDocumentDataExtracted: (data: any) => void;
  parties: Party[];
  ref: string;
  setRef: (val: string) => void;
  type: string;
  setType: (val: string) => void;
  origin: string;
  setOrigin: (val: string) => void;
  dest: string;
  setDest: (val: string) => void;
  shipperId: string;
  setShipperId: (val: string) => void;
  consigneeId: string;
  setConsigneeId: (val: string) => void;
  carrierId: string;
  setCarrierId: (val: string) => void;
  hbl: string;
  setHbl: (val: string) => void;
  mbl: string;
  setMbl: (val: string) => void;
  awb: string;
  setAwb: (val: string) => void;
  etd: string;
  setEtd: (val: string) => void;
  eta: string;
  setEta: (val: string) => void;
  t: (key: string) => string;
}

export function CreateShipmentDialog({
  isOpen,
  setIsOpen,
  handleCreate,
  handleDocumentDataExtracted,
  parties,
  ref,
  setRef,
  type,
  setType,
  origin,
  setOrigin,
  dest,
  setDest,
  shipperId,
  setShipperId,
  consigneeId,
  setConsigneeId,
  carrierId,
  setCarrierId,
  hbl,
  setHbl,
  mbl,
  setMbl,
  awb,
  setAwb,
  etd,
  setEtd,
  eta,
  setEta,
  t,
}: CreateShipmentDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={
        <Button className="h-10">
          <Plus className="w-4 h-4 mr-2" /> {t('add')} Shipment
        </Button>
      } />
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">Create New Shipment</DialogTitle>
        </DialogHeader>

        <div className="mb-6">
          <DocumentScanner
            onDataExtracted={handleDocumentDataExtracted}
            parties={parties}
            activeFormValues={{
              referenceNumber: ref,
              type,
              originPort: origin,
              destinationPort: dest,
              shipperId,
              consigneeId,
              carrierId,
            }}
          />
        </div>

        <form onSubmit={handleCreate} className="space-y-6">
          {/* Section 1: General Info */}
          <div className="bg-card dark:bg-card/40 border rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 border-b pb-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">1</span>
              <h4 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">General Info & Cargo</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Reference No.</Label>
                <Input value={ref} onChange={(e) => setRef(e.target.value)} required placeholder="FFW-2026-101" />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Mode / Type</Label>
                <select
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:bg-background/20"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="Ocean FCL">Ocean FCL</option>
                  <option value="Ocean LCL">Ocean LCL</option>
                  <option value="Air Freight">Air Freight</option>
                  <option value="Road Trucking">Road Trucking</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Route & Ports */}
          <div className="bg-card dark:bg-card/40 border rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 border-b pb-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">2</span>
              <h4 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Route & Key Ports</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Origin Port (UN/LOCODE)</Label>
                <UNLocodeSelector value={origin} onChange={setOrigin} placeholder="e.g., CNSHA (Shanghai)" />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Destination Port (UN/LOCODE)</Label>
                <UNLocodeSelector value={dest} onChange={setDest} placeholder="e.g., ESBCN (Barcelona)" />
              </div>
            </div>
          </div>

          {/* Section 3: Commercial Parties */}
          <div className="bg-card dark:bg-card/40 border rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 border-b pb-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">3</span>
              <h4 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Commercial Parties</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Shipper</Label>
                <select
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:bg-background/20"
                  value={shipperId}
                  onChange={(e) => setShipperId(e.target.value)}
                >
                  <option value="">Select Shipper...</option>
                  {parties
                    .filter((p) => {
                      const typeVal = (p.companyType || '').toLowerCase();
                      return typeVal === 'customer' || typeVal === 'shipper' || typeVal === 'supplier';
                    })
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.companyName || p.id}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Consignee</Label>
                <select
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:bg-background/20"
                  value={consigneeId}
                  onChange={(e) => setConsigneeId(e.target.value)}
                >
                  <option value="">Select Consignee...</option>
                  {parties
                    .filter((p) => {
                      const typeVal = (p.companyType || '').toLowerCase();
                      return typeVal === 'customer' || typeVal === 'consignee' || typeVal === 'supplier';
                    })
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.companyName || p.id}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Carrier / Shipping Line</Label>
                <select
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:bg-background/20"
                  value={carrierId}
                  onChange={(e) => setCarrierId(e.target.value)}
                >
                  <option value="">Select Carrier...</option>
                  {parties
                    .filter((p) => {
                      const typeVal = (p.companyType || '').toLowerCase();
                      return typeVal === 'carrier' || typeVal === 'shipping line' || typeVal === 'agent';
                    })
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.companyName || p.id}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Shipping Documents */}
          <div className="bg-card dark:bg-card/40 border rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 border-b pb-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">4</span>
              <h4 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Shipping Documents</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block font-mono">House Bill of Lading (HBL)</Label>
                <Input value={hbl} onChange={(e) => setHbl(e.target.value)} placeholder="e.g., HBLSH10293" />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block font-mono">Master Bill of Lading (MBL)</Label>
                <Input value={mbl} onChange={(e) => setMbl(e.target.value)} placeholder="e.g., MBLMAEU83749" />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block font-mono">Air Waybill (AWB)</Label>
                <Input value={awb} onChange={(e) => setAwb(e.target.value)} placeholder="e.g., AWB012-39485" />
              </div>
            </div>
          </div>

          {/* Section 5: Milestones */}
          <div className="bg-card dark:bg-card/40 border rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 border-b pb-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">5</span>
              <h4 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Milestones & Timelines</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">ETD (Estimated Departure)</Label>
                <Input type="datetime-local" value={etd} onChange={(e) => setEtd(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">ETA (Estimated Arrival)</Label>
                <Input type="datetime-local" value={eta} onChange={(e) => setEta(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="w-1/4">
              Cancel
            </Button>
            <Button type="submit" className="w-3/4">
              {t('save')} Shipment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
