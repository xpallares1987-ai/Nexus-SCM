import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, 
  Cpu, 
  Layers, 
  Clock, 
  Link as LinkIcon, 
  CheckCircle2, 
  AlertTriangle, 
  Key, 
  RefreshCw, 
  Lock, 
  Unlock, 
  Activity, 
  DollarSign, 
  HelpCircle, 
  Check, 
  ArrowRight,
  Fingerprint,
  FileText,
  Workflow
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

// =========================================================================
// TYPES & INTERFACES
// =========================================================================

export interface BlockchainBlock {
  blockNumber: number;
  timestamp: string;
  txHash: string;
  prevHash: string;
  payload: {
    event: 'DISCHARGE' | 'GATE_IN' | 'GATE_OUT' | 'TELEMETRY_ALERT' | 'SMART_LOCK_STATE' | 'CONTRACT_SETTLEMENT';
    containerNo: string;
    details: string;
    sensorReading?: {
      tempCelsius: number;
      batteryPercent: number;
      lockStatus: 'LOCKED' | 'UNLOCKED' | 'TAMPERED';
    };
  };
  signature: string;
  gasUsed: number;
}

export interface ContainerAuditRecord {
  id: string;
  containerNo: string;
  shipmentRef: string;
  carrier: string;
  portOfDischarge: string;
  freeTimeDays: number;
  dailyRate: number;
  dischargeTime: string;
  gateInTime: string;
  gateOutTime: string | null;
  smartLockStatus: 'LOCKED' | 'UNLOCKED' | 'TAMPERED';
  carrierInvoiceAmount: number;
  smartContractCalculated: number;
  auditStatus: 'VERIFIED' | 'DISPUTED_RESOLVED' | 'PENDING_OUT';
  discrepancyReason?: string;
  blocks: BlockchainBlock[];
}

// =========================================================================
// SEED DATA
// =========================================================================

const SEED_AUDITS: ContainerAuditRecord[] = [
  {
    id: 'rec1',
    containerNo: 'MSKU8842109',
    shipmentRef: 'FFW-2026-101',
    carrier: 'Maersk',
    portOfDischarge: 'Los Angeles (US)',
    freeTimeDays: 5,
    dailyRate: 150,
    dischargeTime: '2026-07-12 08:30:00',
    gateInTime: '2026-07-12 11:15:00',
    gateOutTime: '2026-07-19 14:20:00', // 7 days inside port. Free time was 5. Overstayed by 2 days.
    smartLockStatus: 'UNLOCKED',
    carrierInvoiceAmount: 450, // Carrier tries to bill 3 days ($450)
    smartContractCalculated: 300, // Ledger proves only 2 days of overstay ($300) based on precise immutable timestamps
    auditStatus: 'DISPUTED_RESOLVED',
    discrepancyReason: 'Carrier invoiced for 3 days of demurrage. Ledger verified gate-out milestone was on day 2.1; automatic deduction applied saving $150.',
    blocks: [
      {
        blockNumber: 1845920,
        timestamp: '2026-07-12 08:31:05',
        txHash: '0x8f2d5c1901a88b835efc1c9e9929a7526938a411cf098fe11e74a81ba0cd2819',
        prevHash: '0x3a01d9f823bc0195ee03efcb0eefc3a9d82137cf982f01ac21df92bc0ad21ee3',
        payload: {
          event: 'DISCHARGE',
          containerNo: 'MSKU8842109',
          details: 'Discharged from Maersk Salina vessel. Port Crane IoT telemetry anchor.'
        },
        signature: 'ecdsa:0x88f2...09bc',
        gasUsed: 21000
      },
      {
        blockNumber: 1845934,
        timestamp: '2026-07-12 11:16:12',
        txHash: '0x1c83a59d9fc830df2947ea87c3bc217d83be18cf902df1ac1a9f029bc0ad2cf3',
        prevHash: '0x8f2d5c1901a88b835efc1c9e9929a7526938a411cf098fe11e74a81ba0cd2819',
        payload: {
          event: 'GATE_IN',
          containerNo: 'MSKU8842109',
          details: 'Entered Terminal Gate 4A. Automatic OCR Camera Match + GPS RFID ping.'
        },
        signature: 'ecdsa:0x7cf1...11de',
        gasUsed: 42000
      },
      {
        blockNumber: 1850112,
        timestamp: '2026-07-19 14:21:45',
        txHash: '0x7da4d90f23cb0a81db9c83fa90ef817cba18dcf9cf0adef218ca9f02cb8ad8ef',
        prevHash: '0x1c83a59d9fc830df2947ea87c3bc217d83be18cf902df1ac1a9f029bc0ad2cf3',
        payload: {
          event: 'GATE_OUT',
          containerNo: 'MSKU8842109',
          details: 'Exited Terminal Gate 2B. IoT smart lock verified and unlocked by consignee.',
          sensorReading: {
            tempCelsius: 16.4,
            batteryPercent: 88,
            lockStatus: 'UNLOCKED'
          }
        },
        signature: 'ecdsa:0x4fa8...92ca',
        gasUsed: 31500
      },
      {
        blockNumber: 1850125,
        timestamp: '2026-07-19 14:25:00',
        txHash: '0xbb82f09a8cf329ad89cb127eef891ca90fa83cdef90f21ca9df028cb9adfe2ef',
        prevHash: '0x7da4d90f23cb0a81db9c83fa90ef817cba18dcf9cf0adef218ca9f02cb8ad8ef',
        payload: {
          event: 'CONTRACT_SETTLEMENT',
          containerNo: 'MSKU8842109',
          details: 'Smart Contract auto-audit executed. Calculated actual demurrage: 2 days ($300). Flagged $150 carrier invoice discrepancy, auto-settled via Escrow.'
        },
        signature: 'ecdsa:0x11ab...ff43',
        gasUsed: 65000
      }
    ]
  },
  {
    id: 'rec2',
    containerNo: 'MEDU7753120',
    shipmentRef: 'FFW-2026-103',
    carrier: 'MSC',
    portOfDischarge: 'Shanghai Port (CN)',
    freeTimeDays: 7,
    dailyRate: 200,
    dischargeTime: '2026-07-14 10:05:00',
    gateInTime: '2026-07-14 12:40:00',
    gateOutTime: '2026-07-18 09:15:00', // 4 days. Within free time of 7 days.
    smartLockStatus: 'LOCKED',
    carrierInvoiceAmount: 0,
    smartContractCalculated: 0,
    auditStatus: 'VERIFIED',
    discrepancyReason: 'No dispute. Container cleared and gated out well within the 7-day free window.',
    blocks: [
      {
        blockNumber: 1846942,
        timestamp: '2026-07-14 10:06:12',
        txHash: '0x3acbfa90ef291ca8fb28cfd0eefcb892acfd1a92bf98efac1a9f0cd23bc9ef2d',
        prevHash: '0xbb82f09a8cf329ad89cb127eef891ca90fa83cdef90f21ca9df028cb9adfe2ef',
        payload: {
          event: 'DISCHARGE',
          containerNo: 'MEDU7753120',
          details: 'Discharged at Shanghai Yangshan Terminal. Crane load-cell telemetry anchored.'
        },
        signature: 'ecdsa:0x22cf...99ea',
        gasUsed: 21000
      },
      {
        blockNumber: 1846960,
        timestamp: '2026-07-14 12:42:01',
        txHash: '0x992fa8cbd830fa9dfcb029ca9efdcb0fa9dfcb0ae92fa8cb9dfcb0adbfd29cba',
        prevHash: '0x3acbfa90ef291ca8fb28cfd0eefcb892acfd1a92bf98efac1a9f0cd23bc9ef2d',
        payload: {
          event: 'GATE_IN',
          containerNo: 'MEDU7753120',
          details: 'Gated in port staging area. IoT Smart Lock telemetry set to active monitoring.'
        },
        signature: 'ecdsa:0x8fa2...31ac',
        gasUsed: 42000
      },
      {
        blockNumber: 1849120,
        timestamp: '2026-07-18 09:17:15',
        txHash: '0xcc8a0df92a3cb0a81dbfd90ef81fa890e90f23cb09efac218ca9f02dca029fba',
        prevHash: '0x992fa8cbd830fa9dfcb029ca9efdcb0fa9dfcb0ae92fa8cb9dfcb0adbfd29cba',
        payload: {
          event: 'GATE_OUT',
          containerNo: 'MEDU7753120',
          details: 'Gated out. IoT Smart Lock remained intact. Telemetry confirms lock sealed during harbor stay.',
          sensorReading: {
            tempCelsius: 22.1,
            batteryPercent: 94,
            lockStatus: 'LOCKED'
          }
        },
        signature: 'ecdsa:0xcc09...ef11',
        gasUsed: 31500
      },
      {
        blockNumber: 1849132,
        timestamp: '2026-07-18 09:20:00',
        txHash: '0x12fa8cbde9a8cbd90fab02eef92fcba09e18bcf902df1ac21fa809bcdfe23fa9',
        prevHash: '0xcc8a0df92a3cb0a81dbfd90ef81fa890e90f23cb09efac218ca9f02dca029fba',
        payload: {
          event: 'CONTRACT_SETTLEMENT',
          containerNo: 'MEDU7753120',
          details: 'Smart Contract executed. Days inside free-time: 4/7. Final Demurrage: $0. Audit verified closed.'
        },
        signature: 'ecdsa:0x55df...ab88',
        gasUsed: 65000
      }
    ]
  },
  {
    id: 'rec3',
    containerNo: 'CMAU9910452',
    shipmentRef: 'FFW-2026-107',
    carrier: 'CMA CGM',
    portOfDischarge: 'Los Angeles (US)',
    freeTimeDays: 5,
    dailyRate: 180,
    dischargeTime: '2026-07-15 06:15:00',
    gateInTime: '2026-07-15 09:00:00',
    gateOutTime: null, // Still inside the port!
    smartLockStatus: 'LOCKED',
    carrierInvoiceAmount: 0,
    smartContractCalculated: 180, // Currently on Day 6 (1 day over free time, so $180 accrued)
    auditStatus: 'PENDING_OUT',
    discrepancyReason: 'Container is still at the port on Day 6. Currently accruing $180/day.',
    blocks: [
      {
        blockNumber: 1847520,
        timestamp: '2026-07-15 06:17:00',
        txHash: '0x4fa8cdba92fa8cb9dfcb20adbe9a8cbd092fcba1ea8cbde9a82fca9bda8fca23',
        prevHash: '0x12fa8cbde9a8cbd90fab02eef92fcba09e18bcf902df1ac21fa809bcdfe23fa9',
        payload: {
          event: 'DISCHARGE',
          containerNo: 'CMAU9910452',
          details: 'Discharged from CMA CGM Alexander vessel. Port automation OCR linked.'
        },
        signature: 'ecdsa:0x99aa...ee11',
        gasUsed: 21000
      },
      {
        blockNumber: 1847545,
        timestamp: '2026-07-15 09:02:11',
        txHash: '0x889fa0bcde9a8cfd0a92f0cbdae90fa2cfda90bcfa92fa8cb0adbcda8fca8cbf',
        prevHash: '0x4fa8cdba92fa8cb9dfcb20adbe9a8cbd092fcba1ea8cbde9a82fca9bda8fca23',
        payload: {
          event: 'GATE_IN',
          containerNo: 'CMAU9910452',
          details: 'Staged in G-Sector. High Congestion alert. IoT Smart Lock reporting sealed status.'
        },
        signature: 'ecdsa:0x44ab...88bb',
        gasUsed: 42000
      }
    ]
  }
];

export function BlockchainSmartContractAuditor() {
  const [records, setRecords] = useState<ContainerAuditRecord[]>(SEED_AUDITS);
  const [selectedContainerId, setSelectedContainerId] = useState<string>('rec1');
  
  // Simulation Panel state
  const [simEvent, setSimEvent] = useState<'GATE_OUT' | 'TAMPER'>('GATE_OUT');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStep, setSimStep] = useState<string>('');
  
  // Active selected record
  const activeRecord = useMemo(() => {
    return records.find(r => r.id === selectedContainerId) || records[0];
  }, [records, selectedContainerId]);

  // Handle simulation of blockchain event anchoring
  const handleSimulateAnchor = async () => {
    if (activeRecord.auditStatus !== 'PENDING_OUT') {
      toast.info('Selected container is already gated out and fully audited.');
      return;
    }

    setIsSimulating(true);
    setSimStep('1. Packaging telemetry event payload...');
    await new Promise(resolve => setTimeout(resolve, 1200));

    setSimStep('2. Digitally signing payload with IoT private key (secp256k1)...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    setSimStep('3. Broadcasting transaction to SCM consortium blockchain nodes...');
    await new Promise(resolve => setTimeout(resolve, 1400));

    setSimStep('4. consensus reached (9/9 validator nodes reached agreement)...');
    await new Promise(resolve => setTimeout(resolve, 1200));

    setSimStep('5. Writing block and executing Smart Contract dispute auditor rules...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Calculate final block
    const prevBlock = activeRecord.blocks[activeRecord.blocks.length - 1];
    const newBlockNum = prevBlock ? prevBlock.blockNumber + 120 : 1851200;
    const blockTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const txHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('');
    
    if (simEvent === 'GATE_OUT') {
      // Simulate Gate out
      const updatedRecord: ContainerAuditRecord = {
        ...activeRecord,
        gateOutTime: blockTime,
        smartLockStatus: 'UNLOCKED',
        carrierInvoiceAmount: 360, // Carrier tries to bill 2 days ($360)
        smartContractCalculated: 180, // Smart contract proves only 1 day of overstay ($180) based on Gate-Out timestamp
        auditStatus: 'DISPUTED_RESOLVED',
        discrepancyReason: 'Carrier invoiced for 2 full days of demurrage ($360). Blockchain immutable ledger proved Gate-Out occurred within 22 hours of day 6 (only 1 day of overstay: $180). Auto-adjusted.',
        blocks: [
          ...activeRecord.blocks,
          {
            blockNumber: newBlockNum,
            timestamp: blockTime,
            txHash: txHash,
            prevHash: prevBlock ? prevBlock.txHash : '0x00000000000000',
            payload: {
              event: 'GATE_OUT',
              containerNo: activeRecord.containerNo,
              details: `Exited Terminal Gate 1A. IoT Smart Lock telemetry confirmed unlock event. Actual days inside port: 6.02 days (Free Limit: 5 days).`,
              sensorReading: {
                tempCelsius: 18.2,
                batteryPercent: 81,
                lockStatus: 'UNLOCKED'
              }
            },
            signature: 'ecdsa:0x77aa...bc32',
            gasUsed: 31500
          },
          {
            blockNumber: newBlockNum + 15,
            timestamp: blockTime,
            txHash: '0x' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join(''),
            prevHash: txHash,
            payload: {
              event: 'CONTRACT_SETTLEMENT',
              containerNo: activeRecord.containerNo,
              details: `Smart contract calculated true overstay: 1.02 days, rounded down as per SLA. Settled invoice at $180. Dispensed escrow payout.`
            },
            signature: 'ecdsa:0x8892...fba9',
            gasUsed: 65000
          }
        ]
      };

      setRecords(prev => prev.map(r => r.id === activeRecord.id ? updatedRecord : r));
      toast.success(`Milestone Gate-Out Anchored! Smart contract resolved dispute: billed $180 instead of $360.`);
    } else {
      // Simulate Seal Tamper
      const updatedRecord: ContainerAuditRecord = {
        ...activeRecord,
        smartLockStatus: 'TAMPERED',
        auditStatus: 'DISPUTED_RESOLVED',
        discrepancyReason: 'SLA violation triggered: IoT Smart Lock reported unauthorized opening at 14:10:00 within the port terminal. Automatic carrier dispute flagged on chain.',
        blocks: [
          ...activeRecord.blocks,
          {
            blockNumber: newBlockNum,
            timestamp: blockTime,
            txHash: txHash,
            prevHash: prevBlock ? prevBlock.txHash : '0x00000000000000',
            payload: {
              event: 'TELEMETRY_ALERT',
              containerNo: activeRecord.containerNo,
              details: `IoT Lock Seal Breach detected! Physical lock unlatched without authorized cryptographic key inside Staging Sector 3.`,
              sensorReading: {
                tempCelsius: 24.5,
                batteryPercent: 79,
                lockStatus: 'TAMPERED'
              }
            },
            signature: 'ecdsa:0x99fa...efc2',
            gasUsed: 48000
          },
          {
            blockNumber: newBlockNum + 10,
            timestamp: blockTime,
            txHash: '0x' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join(''),
            prevHash: txHash,
            payload: {
              event: 'CONTRACT_SETTLEMENT',
              containerNo: activeRecord.containerNo,
              details: `Smart contract triggered cargo integrity dispute. Carrier demurrage accrual frozen immediately, security logs dispatched for manual customs audit.`
            },
            signature: 'ecdsa:0x92f1...dc88',
            gasUsed: 75000
          }
        ]
      };

      setRecords(prev => prev.map(r => r.id === activeRecord.id ? updatedRecord : r));
      toast.error(`SLA Breach Registered! IoT Smart Lock Tampered Event locked on blockchain ledger.`);
    }

    setIsSimulating(false);
    setSimStep('');
  };

  return (
    <div className="space-y-6" id="blockchain-smart-contract-auditor">
      {/* Top Banner introducing the tech */}
      <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-background border border-indigo-500/20 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
              <ShieldCheck className="w-3.5 h-3.5" /> Security & Dispute Mitigation
            </span>
            <h2 className="text-xl font-bold text-foreground">Blockchain-Backed SLA & Demurrage Audits</h2>
            <p className="text-xs text-muted-foreground max-w-3xl leading-relaxed">
              Eliminate manual demurrage audit delays and carrier overcharges. Gate-in/out crane timestamps, container OCR, and IoT smart lock telemetry are cryptographic signed and anchored to a tamper-proof decentralized ledger. Automated smart contracts audit the actual times against SLA boundaries to settle invoices with complete mathematical consensus.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-lg border border-border shrink-0">
            <div className="p-2 rounded-full bg-indigo-500/10 text-indigo-400">
              <Cpu className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-mono">LEDGER STATUS</p>
              <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Consortium Live (9 Nodes)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main split dashboard view */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Container Selector & Interactive Simulation */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Container Audit List Selector */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Workflow className="w-4 h-4 text-indigo-500" />
              Active Demurrage Audits
            </h3>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {records.map(rec => {
                const isActive = rec.id === selectedContainerId;
                return (
                  <button
                    key={rec.id}
                    onClick={() => {
                      if (!isSimulating) setSelectedContainerId(rec.id);
                    }}
                    disabled={isSimulating}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-1.5 ${
                      isActive 
                        ? 'bg-indigo-500/5 border-indigo-500/30 ring-1 ring-indigo-500/20' 
                        : 'bg-background hover:bg-muted/30 border-border'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-mono text-xs font-bold text-foreground">{rec.containerNo}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                        rec.auditStatus === 'VERIFIED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-500/20'
                          : rec.auditStatus === 'DISPUTED_RESOLVED'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-500/20'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-500/20 animate-pulse'
                      }`}>
                        {rec.auditStatus === 'VERIFIED' ? 'Verified' : 
                         rec.auditStatus === 'DISPUTED_RESOLVED' ? 'Disputed Resolved' : 'In Port (Staged)'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                      <span>Carrier: {rec.carrier}</span>
                      <span>Rate: ${rec.dailyRate}/day</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* IoT Telemetry Simulation Console */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Fingerprint className="w-4 h-4 text-purple-500" />
              Consortium Block Anchoring Sandbox
            </h3>
            
            <p className="text-xs text-muted-foreground leading-relaxed">
              Simulate container terminal crane pings and IoT smart lock unlocks to watch consensus node verification and smart contract calculations live.
            </p>

            <div className="space-y-3 pt-1">
              <div>
                <label className="text-[11px] text-muted-foreground font-semibold block mb-1.5">Select Telemetry Event:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSimEvent('GATE_OUT')}
                    disabled={activeRecord.auditStatus !== 'PENDING_OUT' || isSimulating}
                    className={`p-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      simEvent === 'GATE_OUT' 
                        ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400' 
                        : 'bg-background hover:bg-muted border-border text-muted-foreground'
                    }`}
                  >
                    <Unlock className="w-3.5 h-3.5" /> Gate-Out Milestone
                  </button>
                  <button
                    onClick={() => setSimEvent('TAMPER')}
                    disabled={activeRecord.auditStatus !== 'PENDING_OUT' || isSimulating}
                    className={`p-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      simEvent === 'TAMPER' 
                        ? 'bg-rose-500/10 border-rose-500/40 text-rose-400' 
                        : 'bg-background hover:bg-muted border-border text-muted-foreground'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" /> Lock Seal Tamper
                  </button>
                </div>
              </div>

              <div className="bg-muted/40 border border-border rounded-lg p-3 min-h-[90px] flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  {isSimulating ? (
                    <motion.div
                      key="simulating"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-2 text-center py-2"
                    >
                      <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin mx-auto" />
                      <p className="text-xs font-mono font-medium text-foreground capitalize">{simStep}</p>
                    </motion.div>
                  ) : activeRecord.auditStatus !== 'PENDING_OUT' ? (
                    <motion.div
                      key="completed"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center space-y-1.5 py-2 text-xs"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                      <p className="font-semibold text-foreground">SLA Audit Settled on Ledger</p>
                      <p className="text-[10px] text-muted-foreground">Select another container to view or simulate.</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center space-y-2 py-1 text-xs"
                    >
                      <p className="text-muted-foreground">Ready to broadcast telemetry to the decentralized ledger.</p>
                      <button
                        onClick={handleSimulateAnchor}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Anchor Event on Ledger
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

        </div>

        {/* Right Side: Detailed Audit Review, Smart Lock Status, Blocks Ledger */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Audit Verification Details Panel */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
              <div>
                <h3 className="font-bold text-foreground text-base">SLA Smart Contract Audit Report</h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">Container: {activeRecord.containerNo} | Shipment: {activeRecord.shipmentRef}</p>
              </div>
              <div className="flex gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                  activeRecord.smartLockStatus === 'LOCKED' 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : activeRecord.smartLockStatus === 'UNLOCKED'
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse'
                }`}>
                  <Lock className="w-3.5 h-3.5" />
                  IoT Seal: {activeRecord.smartLockStatus}
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold font-mono">
                  <Layers className="w-3.5 h-3.5" />
                  Blocks: {activeRecord.blocks.length}
                </div>
              </div>
            </div>

            {/* Timestones Comparison Graph */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted/40 border border-border p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold">Vessel Discharge</span>
                  <span className="text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded">Milestone 1</span>
                </div>
                <p className="text-sm font-bold text-foreground font-mono">{activeRecord.dischargeTime || 'N/A'}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-semibold bg-emerald-500/5 p-1 rounded border border-emerald-500/10">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Crane Anchor Hash Verified
                </div>
              </div>

              <div className="bg-muted/40 border border-border p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold">Staging Gate-In</span>
                  <span className="text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded">Milestone 2</span>
                </div>
                <p className="text-sm font-bold text-foreground font-mono">{activeRecord.gateInTime || 'N/A'}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-semibold bg-emerald-500/5 p-1 rounded border border-emerald-500/10">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> RFID OCR Gate Confirmed
                </div>
              </div>

              <div className="bg-muted/40 border border-border p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold">Staging Gate-Out</span>
                  <span className="text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded">Milestone 3</span>
                </div>
                <p className="text-sm font-bold text-foreground font-mono">{activeRecord.gateOutTime || 'Awaiting Gate-Out Event...'}</p>
                {activeRecord.gateOutTime ? (
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-semibold bg-emerald-500/5 p-1 rounded border border-emerald-500/10">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Terminal Dispatch Hash Locked
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-600 font-semibold bg-amber-500/5 p-1 rounded border border-amber-500/10 animate-pulse">
                    <Activity className="w-3 h-3 text-amber-500" /> Still Inside Harbor Boundary
                  </div>
                )}
              </div>
            </div>

            {/* Financial auditing outcomes */}
            <div className="bg-muted/20 border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Demurrage Dispute Auditing Calculations</h4>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-background border border-border p-3.5 rounded-lg">
                  <span className="text-[10px] text-muted-foreground font-semibold block uppercase">Carrier Invoiced Demurrage</span>
                  <span className="text-lg font-bold text-muted-foreground font-mono">
                    ${activeRecord.carrierInvoiceAmount.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">Reported by carrier invoice system</span>
                </div>

                <div className="bg-background border border-border p-3.5 rounded-lg relative overflow-hidden">
                  <span className="text-[10px] text-indigo-400 font-bold block uppercase">Ledger Audited Amount</span>
                  <span className="text-lg font-bold text-indigo-500 font-mono">
                    ${activeRecord.smartContractCalculated.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">Calculated by Immutable SLA contract</span>
                  <div className="absolute right-0 bottom-0 translate-x-1 translate-y-1 opacity-10">
                    <ShieldCheck className="w-12 h-12 text-indigo-500" />
                  </div>
                </div>

                <div className="bg-background border border-border p-3.5 rounded-lg">
                  <span className="text-[10px] text-emerald-500 font-bold block uppercase">Verified Discrepancy Savings</span>
                  <span className="text-lg font-bold text-emerald-500 font-mono">
                    ${(activeRecord.carrierInvoiceAmount - activeRecord.smartContractCalculated).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">Dispute mitigated automatically</span>
                </div>
              </div>

              {activeRecord.discrepancyReason && (
                <div className="bg-indigo-500/5 border border-indigo-500/10 p-3 rounded-lg text-xs flex items-start gap-2.5">
                  <FileText className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-indigo-400 font-mono block mb-0.5">Audit Resolution Log</span>
                    <p className="text-muted-foreground leading-relaxed">{activeRecord.discrepancyReason}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Cryptographic Ledger log list (Simulated blocks) */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <LinkIcon className="w-4 h-4 text-indigo-500" />
                Immutable Blockchain Transaction Ledger ({activeRecord.blocks.length} Blocks)
              </h4>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {activeRecord.blocks.map((block, index) => {
                  const isLast = index === activeRecord.blocks.length - 1;
                  return (
                    <div key={block.txHash} className="bg-background border border-border rounded-xl p-4 relative overflow-hidden flex flex-col md:flex-row justify-between gap-4">
                      {/* Top indicator ribbon */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
                      
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="text-xs font-bold text-foreground font-mono">Block #{block.blockNumber}</span>
                          <span className="text-[10px] text-indigo-400 bg-indigo-500/5 px-2 py-0.5 rounded font-bold font-mono">
                            {block.payload.event}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">{block.timestamp}</span>
                        </div>

                        <p className="text-xs text-foreground font-medium leading-relaxed">
                          {block.payload.details}
                        </p>

                        {block.payload.sensorReading && (
                          <div className="grid grid-cols-3 gap-2 bg-muted/40 p-2 rounded text-[10px] text-muted-foreground font-mono max-w-md">
                            <div>TEMP: <span className="text-foreground font-bold">{block.payload.sensorReading.tempCelsius}°C</span></div>
                            <div>BATTERY: <span className="text-foreground font-bold">{block.payload.sensorReading.batteryPercent}%</span></div>
                            <div>SEAL STATUS: <span className="text-indigo-400 font-bold">{block.payload.sensorReading.lockStatus}</span></div>
                          </div>
                        )}

                        <div className="text-[10px] text-muted-foreground font-mono truncate max-w-lg" title={block.txHash}>
                          Tx Hash: <span className="text-foreground/80">{block.txHash}</span>
                        </div>
                      </div>

                      <div className="flex flex-col justify-between items-end shrink-0 border-t md:border-t-0 md:border-l border-border pt-2 md:pt-0 md:pl-4 min-w-[120px] text-right font-mono text-[10px]">
                        <div>
                          <span className="text-muted-foreground block">SIGNER KEY</span>
                          <span className="text-foreground font-semibold">{block.signature}</span>
                        </div>
                        <div className="mt-2 md:mt-0">
                          <span className="text-muted-foreground block">CONSENSUS</span>
                          <span className="text-emerald-500 font-bold flex items-center gap-1 justify-end">
                            <Check className="w-3 h-3" /> 9/9 Validated
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
