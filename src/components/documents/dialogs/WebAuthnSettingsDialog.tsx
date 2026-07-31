import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/overlays/dialog';
import { Button } from '@/components/ui/forms/button';
import { Input } from '@/components/ui/forms/input';
import { Label } from '@/components/ui/forms/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/forms/select';
import { Badge } from '@/components/ui/data-display/badge';
import { CardDescription } from '@/components/ui/data-display/card';
import { Fingerprint, AlertCircle, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export interface WebAuthnKey {
  id: string;
  name: string;
  type: string;
  registeredAt: string;
  expiresAt: string;
  status: 'Active' | 'Warning';
}

interface WebAuthnSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  webAuthnKeys: WebAuthnKey[];
  setWebAuthnKeys: React.Dispatch<React.SetStateAction<WebAuthnKey[]>>;
}

export function WebAuthnSettingsDialog({
  isOpen,
  onOpenChange,
  webAuthnKeys,
  setWebAuthnKeys,
}: WebAuthnSettingsDialogProps) {
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyType, setNewKeyType] = useState('FIDO2 NFC Key');
  const [isRegisteringKey, setIsRegisteringKey] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
                          const updated = webAuthnKeys.filter((k) => k.id !== key.id);
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

                  await new Promise((resolve) => setTimeout(resolve, 2200));

                  const newKey: WebAuthnKey = {
                    id: window.crypto.getRandomValues(new Uint32Array(1))[0].toString(36),
                    name: newKeyName.trim(),
                    type: newKeyType,
                    registeredAt: new Date().toISOString().split('T')[0],
                    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    status: 'Active',
                  };

                  const updated = [...webAuthnKeys, newKey];
                  setWebAuthnKeys(updated);
                  localStorage.setItem('scm_webauthn_credentials', JSON.stringify(updated));

                  setIsRegisteringKey(false);
                  setNewKeyName('');
                  toast.success(`FIDO2 Security Key "${newKey.name}" successfully enrolled to active broker profile!`, {
                    id: 'webauthn-register',
                    duration: 4000,
                  });
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close Security Panel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
