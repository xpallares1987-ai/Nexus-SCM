import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/overlays/dialog';
import { Button } from '@/components/ui/forms/button';
import { Input } from '@/components/ui/forms/input';
import { CardDescription } from '@/components/ui/data-display/card';
import { CalendarRange } from 'lucide-react';
import { toast } from 'sonner';

interface ExpiryConfigDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  customExpiryDays: Record<string, number>;
  setCustomExpiryDays: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}

export function ExpiryConfigDialog({
  isOpen,
  onOpenChange,
  customExpiryDays,
  setCustomExpiryDays,
}: ExpiryConfigDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
                    setCustomExpiryDays((prev) => ({
                      ...prev,
                      [docType]: val,
                    }));
                  }}
                />
                <span className="text-xs text-muted-foreground font-medium">Days</span>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-indigo-600 text-white hover:bg-indigo-700 font-bold"
            onClick={() => {
              localStorage.setItem('scm_custom_expiry_thresholds', JSON.stringify(customExpiryDays));
              toast.success('Custom document warning dispatch thresholds successfully synchronized!');
              onOpenChange(false);
            }}
          >
            Save Configurations
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
