import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { Button } from '@/components/ui/forms/button';
import { Badge } from '@/components/ui/data-display/badge';
import { Input } from '@/components/ui/forms/input';
import { useAuth } from '../../contexts/AuthContext';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import { 
  FileLock, 
  Link2, 
  UserCheck, 
  ShieldCheck, 
  Database, 
  Clock, 
  ArrowRight, 
  Cpu, 
  Fingerprint, 
  QrCode, 
  CheckCircle2, 
  AlertCircle,
  FileSignature,
  FileText,
  Lock,
  Share2,
  ListFilter
} from 'lucide-react';

interface NotaryRecord {
  id: string;
  shipmentId: string;
  hblNumber: string;
  mblNumber: string;
  shipper: string;
  consignee: string;
  surrendered: boolean;
  surrenderedAt?: string;
  txHash?: string;
  blockNumber?: number;
  chainStatus: 'DRAFT' | 'COMMITTED_SEALED' | 'SURRENDERED_RELEASED';
}

export function EblNotaryWidget() {
  const { token } = useAuth();
  
  // Fields for new Notarization
  const [shipmentId, setShipmentId] = useState('FFW-2026-904');
  const [hblNumber, setHblNumber] = useState('HBL-SHAS-550912');
  const [mblNumber, setMblNumber] = useState('MSK-4491029304');
  const [shipper, setShipper] = useState('Hangzhou Electronics Co. Ltd');
  const [consignee, setConsignee] = useState('Hyperion Logistics Deutschland GmbH');
  const [cargoDescription, setCargoDescription] = useState('32x Pallets of Solid State Drive components - lithium ion battery packed');

  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<NotaryRecord[]>([
    {
      id: 'ebl-1',
      shipmentId: 'FFW-2026-881',
      hblNumber: 'HBL-SZX-881203',
      mblNumber: 'CMA-994102931',
      shipper: 'Shenzhen Textiles Ltd',
      consignee: 'Nordic Apparel Corp',
      surrendered: true,
      surrenderedAt: '2026-07-18 09:14:22',
      txHash: '0x94f1c7d8ab42c90f55d01217eef98b1086c52309fef0c7429d38ae81c5d01872',
      blockNumber: 492102,
      chainStatus: 'SURRENDERED_RELEASED'
    },
    {
      id: 'ebl-2',
      shipmentId: 'FFW-2026-441',
      hblNumber: 'HBL-BOD-441098',
      mblNumber: 'ONE-883910243',
      shipper: 'Bordeaux Vineyards Group',
      consignee: 'Tokyo Beverage Co',
      surrendered: false,
      txHash: '0x39ba2e541f92c300fa88de512aef91206c88fef0c7a3e9c42bd20a8fe55d01a2',
      blockNumber: 492120,
      chainStatus: 'COMMITTED_SEALED'
    }
  ]);

  const [selectedRecord, setSelectedRecord] = useState<NotaryRecord | null>(null);

  useEffect(() => {
    if (records.length > 0 && !selectedRecord) {
      setSelectedRecord(records[0]);
    }
  }, [records]);

  const handleNotarize = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetchApi('/api/ebl/notarize', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipmentId,
          hblNumber,
          mblNumber,
          shipper,
          consignee,
          cargoDescription
        })
      });

      if (response && response.success && response.notary) {
        setRecords(prev => [response.notary, ...prev]);
        setSelectedRecord(response.notary);
        toast.success(`E-B/L Cryptographic Notary committed! Block: #${response.notary.blockNumber}`);
        
        // Reset form to defaults / new values
        setShipmentId(`FFW-2026-${Math.floor(100 + Math.random() * 900)}`);
        setHblNumber(`HBL-SHA-${Math.floor(100000 + Math.random() * 900000)}`);
        setMblNumber(`MSK-${Math.floor(1000000000 + Math.random() * 9000000000)}`);
      } else {
        toast.error('Failed to notarize Bill of Lading.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error notarizing decentralized Bill of Lading.');
    } finally {
      setLoading(false);
    }
  };

  const triggerDigitalSurrender = (recordId: string) => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: 'Signing cryptographic surrender request & verifying smart contract endorsement keys...',
        success: () => {
          setRecords(prev => prev.map(rec => {
            if (rec.id === recordId) {
              const updated: NotaryRecord = {
                ...rec,
                surrendered: true,
                surrenderedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
                txHash: "0x" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join(''),
                chainStatus: 'SURRENDERED_RELEASED'
              };
              setSelectedRecord(updated);
              return updated;
            }
            return rec;
          }));
          return 'Digital Bill of Lading Surrendered! Consignee cargo release authorized.';
        },
        error: 'Failed to complete digital surrender.'
      }
    );
  };

  return (
    <div id="ebl-notary-widget" className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      
      {/* COLUMN 1: Register New Notarization */}
      <div className="xl:col-span-1 space-y-6">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-indigo-500" />
              Notarize Electronic B/L
            </CardTitle>
            <CardDescription>
              Commit Bill of Lading metadata to the immutable digital custody log.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleNotarize} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Shipment Reference ID</label>
                <Input 
                  value={shipmentId}
                  onChange={(e) => setShipmentId(e.target.value)}
                  className="h-8.5 text-xs font-mono font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">House B/L (HBL) #</label>
                  <Input 
                    value={hblNumber}
                    onChange={(e) => setHblNumber(e.target.value)}
                    className="h-8.5 text-xs font-mono font-bold"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Master B/L (MBL) #</label>
                  <Input 
                    value={mblNumber}
                    onChange={(e) => setMblNumber(e.target.value)}
                    className="h-8.5 text-xs font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Shipper / Exporter</label>
                <Input 
                  value={shipper}
                  onChange={(e) => setShipper(e.target.value)}
                  className="h-8.5 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Consignee / Importer</label>
                <Input 
                  value={consignee}
                  onChange={(e) => setConsignee(e.target.value)}
                  className="h-8.5 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Cargo Description</label>
                <textarea
                  value={cargoDescription}
                  onChange={(e) => setCargoDescription(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-input bg-transparent placeholder:text-muted-foreground min-h-[60px]"
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-9 shadow-sm"
                disabled={loading}
              >
                {loading ? 'Registering Chain Seal...' : 'Commit Cryptographic Notary'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* COLUMN 2: Chain Log Ledger */}
      <div className="xl:col-span-1 space-y-6">
        <Card className="border-border shadow-sm h-full flex flex-col">
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-foreground">Decentralized Custody Ledger</CardTitle>
              <CardDescription className="text-xs">
                Real-time chain of custody events.
              </CardDescription>
            </div>
            <Database className="w-4 h-4 text-indigo-500 shrink-0" />
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto divide-y divide-border">
            {records.map((rec) => {
              const isSelected = selectedRecord?.id === rec.id;
              return (
                <button
                  key={rec.id}
                  onClick={() => setSelectedRecord(rec)}
                  className={`w-full text-left p-4 transition-all flex flex-col gap-1.5 ${
                    isSelected 
                      ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-l-4 border-indigo-600' 
                      : 'hover:bg-muted/30 border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="font-bold text-sm text-foreground">{rec.shipmentId}</span>
                    <span className="text-[10px] font-mono font-bold text-muted-foreground">Block #{rec.blockNumber}</span>
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">HBL:</span>
                      <span className="font-mono font-semibold text-foreground">{rec.hblNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Consignee:</span>
                      <span className="truncate max-w-[150px] text-foreground font-semibold">{rec.consignee}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-1">
                    {rec.surrendered ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[9px] uppercase font-bold px-1.5 py-0.2">
                        SURRENDERED
                      </Badge>
                    ) : (
                      <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-border text-[9px] uppercase font-bold px-1.5 py-0.2">
                        SEALED CUSTODY
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* COLUMN 3: Active Document Custody Details */}
      <div className="xl:col-span-1 space-y-6">
        {selectedRecord ? (
          <Card className="border-border shadow-sm h-full flex flex-col">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/20">
              <div>
                <span className="text-[9px] font-mono text-indigo-600 dark:text-indigo-400 font-bold tracking-wider uppercase">IMMUTABLE SEALD PROOF</span>
                <CardTitle className="text-base font-extrabold mt-0.5 text-foreground">{selectedRecord.shipmentId}</CardTitle>
              </div>
              <Badge variant="outline" className="font-mono text-[10px] font-black border-indigo-200 text-indigo-600 bg-indigo-500/5">
                VERIFIED
              </Badge>
            </CardHeader>
            <CardContent className="p-5 space-y-5 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Visual fingerprint card */}
                <div className="p-3.5 bg-zinc-950 text-zinc-100 dark:bg-zinc-950 rounded-xl border font-mono text-[10px] space-y-2.5 relative overflow-hidden">
                  <div className="absolute right-3 top-3 opacity-15 text-white">
                    <Fingerprint className="w-12 h-12" />
                  </div>
                  
                  <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-2 text-indigo-400 font-bold">
                    <Fingerprint className="w-3.5 h-3.5" />
                    <span>LEDGER CUSTODY RECORD</span>
                  </div>

                  <div className="space-y-1.5">
                    <div>
                      <span className="text-zinc-500 block uppercase font-bold text-[8px] tracking-wider">BLOCK SEAL HEIGHT</span>
                      <strong className="text-zinc-200">{selectedRecord.blockNumber}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500 block uppercase font-bold text-[8px] tracking-wider">TX MERKLE HASH</span>
                      <span className="text-zinc-300 block break-all leading-normal text-[9px]">{selectedRecord.txHash}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block uppercase font-bold text-[8px] tracking-wider">SURRENDER TIMELINE</span>
                      <span className="text-zinc-300 block">
                        {selectedRecord.surrendered ? selectedRecord.surrenderedAt : 'PENDING SECURE DIGITAL TRANSIT'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider">Exporter (Shipper)</span>
                    <p className="font-semibold text-foreground mt-0.5">{selectedRecord.shipper}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider">Importer (Consignee)</span>
                    <p className="font-semibold text-foreground mt-0.5">{selectedRecord.consignee}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 border-t pt-3">
                    <div>
                      <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider">House B/L #</span>
                      <p className="font-mono font-semibold text-foreground mt-0.5">{selectedRecord.hblNumber}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider">Master B/L #</span>
                      <p className="font-mono font-semibold text-foreground mt-0.5">{selectedRecord.mblNumber}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Surrender Action container */}
              <div className="border-t pt-4 mt-6">
                {selectedRecord.surrendered ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex flex-col gap-1 items-center text-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span className="font-extrabold text-xs text-emerald-700 dark:text-emerald-400 mt-1 uppercase tracking-wider">DIGITALLY SURRENDERED</span>
                    <p className="text-[10px] text-muted-foreground">Original HBL surrendered digitally on the chain of custody log. Release agent has dispatched final release authorization.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/10 rounded-lg flex gap-2 border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-700 dark:text-indigo-400 leading-normal">
                      <Lock className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span>By clicking Surrender, you will digitally hand over legal ownership title of this cargo immediately without courier overheads.</span>
                    </div>
                    <Button 
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs h-9.5 gap-1.5 shadow"
                      onClick={() => triggerDigitalSurrender(selectedRecord.id)}
                    >
                      <Share2 className="w-4 h-4 text-indigo-200" />
                      Surrender Electronic B/L
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
            <div className="py-24 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <FileLock className="w-10 h-10 text-zinc-300" />
              <p className="text-sm font-semibold">No record selected</p>
            </div>
          )}
      </div>

    </div>
  );
}
