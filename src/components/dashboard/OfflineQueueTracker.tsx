import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  CloudLightning, 
  RefreshCw, 
  AlertTriangle, 
  Signal, 
  SignalHigh, 
  SignalMedium, 
  SignalLow, 
  CheckCircle, 
  CloudIcon, 
  Database,
  ArrowUpRight,
  Info,
  Settings,
  X,
  FileText,
  Activity
} from 'lucide-react';
import { getQueuedOfflineDocuments, synchronizeOfflineQueue } from '../../lib/offlineQueue';
import { getQueuedUpdatesCount, flushSyncQueue } from '../../lib/syncQueue';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

type SignalProfile = 'fiber' | 'weak_cell' | 'satellite' | 'outage';

export function OfflineQueueTracker() {
  const { token } = useAuth();
  
  // Real Network State
  const [realOnline, setRealOnline] = useState<boolean>(navigator.onLine);
  
  // Simulator Profile State (stored in session/local state so user can toggle)
  const [signalProfile, setSignalProfile] = useState<SignalProfile>('fiber');
  
  // Combined Queue Counts
  const [documentQueueCount, setDocumentQueueCount] = useState<number>(0);
  const [updateQueueCount, setUpdateQueueCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  
  // Connection Details
  const [bandwidthDownlink, setBandwidthDownlink] = useState<number>(15.4); // Mbps
  const [rttLatency, setRttLatency] = useState<number>(45); // ms
  const [connectionType, setConnectionType] = useState<string>('4G LTE');

  // Load and refresh queue metrics from both IndexedDBs
  const refreshQueueCounts = async () => {
    try {
      // 1. Get queued documents count
      const queuedDocs = await getQueuedOfflineDocuments();
      setDocumentQueueCount(queuedDocs.length);

      // 2. Get queued metadata updates count
      const updateCount = await getQueuedUpdatesCount();
      setUpdateQueueCount(updateCount);
    } catch (e) {
      console.warn('Failed to fetch offline queue counts:', e);
    }
  };

  // Set initial network metrics
  useEffect(() => {
    const conn = (navigator as any).connection;
    if (conn) {
      setBandwidthDownlink(conn.downlink || 10);
      setRttLatency(conn.rtt || 50);
      setConnectionType(conn.effectiveType ? conn.effectiveType.toUpperCase() : 'Wi-Fi/Ethernet');
    }

    const handleConnChange = () => {
      if (conn) {
        setBandwidthDownlink(conn.downlink || 10);
        setRttLatency(conn.rtt || 50);
        setConnectionType(conn.effectiveType ? conn.effectiveType.toUpperCase() : 'Wi-Fi/Ethernet');
      }
    };

    if (conn) {
      conn.addEventListener('change', handleConnChange);
    }
    return () => {
      if (conn) {
        conn.removeEventListener('change', handleConnChange);
      }
    };
  }, []);

  // Poll queues frequently to stay updated instantly
  useEffect(() => {
    refreshQueueCounts();
    const interval = setInterval(refreshQueueCounts, 3000);
    return () => clearInterval(interval);
  }, []);

  // Real offline/online event listeners
  useEffect(() => {
    const goOnline = () => {
      setRealOnline(true);
      // Auto-trigger sync if profile matches online
      if (signalProfile !== 'outage') {
        triggerAutomaticSync();
      }
    };
    const goOffline = () => {
      setRealOnline(false);
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [signalProfile]);

  // Handle auto-sync triggers on transition
  const triggerAutomaticSync = async () => {
    if (!token || isSyncing) return;
    
    // Check if network profile allows sync (i.e. not outage)
    if (signalProfile === 'outage' || !realOnline) {
      return;
    }

    const queuedDocsCount = await getQueuedOfflineDocuments().then(q => q.length);
    const queuedUpdatesCount = await getQueuedUpdatesCount();
    
    if (queuedDocsCount === 0 && queuedUpdatesCount === 0) return;

    setIsSyncing(true);
    toast.loading('Cellular Handshake Established! Autore-synchronizing port operations queue...', { id: 'auto-sync-status' });

    try {
      // 1. Sync Shipment updates
      if (queuedUpdatesCount > 0) {
        await flushSyncQueue();
      }

      // 2. Sync Document uploads
      if (queuedDocsCount > 0) {
        await synchronizeOfflineQueue(token, async (shipmentId, payload) => {
          return fetch(`/api/shipments/${shipmentId}/documents`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          }).then(res => res.json());
        });
      }

      toast.success('Offline queue synchronized successfully. Logistics database is now congruent!', { id: 'auto-sync-status', duration: 4000 });
      await refreshQueueCounts();
    } catch (err) {
      console.error(err);
      toast.error('Auto-sync failed: Connection interrupted.', { id: 'auto-sync-status' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Watch profile changes: when switching back to fiber/high signal, auto-sync!
  useEffect(() => {
    if (signalProfile !== 'outage' && realOnline) {
      triggerAutomaticSync();
    }
  }, [signalProfile, realOnline]);

  const handleManualSync = async () => {
    if (!token) {
      toast.error('Session expired. Please sign in again.');
      return;
    }

    if (signalProfile === 'outage' || !realOnline) {
      toast.error('Cannot synchronize while offline! Check simulator profile or cell reception.', {
        description: 'Simulated cell tower signal is currently offline.'
      });
      return;
    }

    setIsSyncing(true);
    const syncToastId = toast.loading('Initiating deep sync handshake with cloud storage...');

    try {
      // Flush metadata edits
      await flushSyncQueue();

      // Flush file uploads
      await synchronizeOfflineQueue(token, async (shipmentId, payload) => {
        return fetch(`/api/shipments/${shipmentId}/documents`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        }).then(res => res.json());
      });

      toast.success('SCM queue synchronized successfully!', { id: syncToastId });
      await refreshQueueCounts();
    } catch (e: any) {
      toast.error(e.message || 'Synchronization failed.', { id: syncToastId });
    } finally {
      setIsSyncing(false);
    }
  };

  const totalQueueCount = documentQueueCount + updateQueueCount;
  const isCurrentlyOffline = !realOnline || signalProfile === 'outage';

  // Get current active connection stats based on selected profile
  const getProfileStats = () => {
    switch (signalProfile) {
      case 'weak_cell':
        return {
          label: 'Congested Port 3G',
          downlink: 1.2,
          latency: 280,
          signalIcon: <SignalLow className="w-4 h-4 text-amber-500 animate-pulse" />,
          statusColor: 'text-amber-500',
          badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
        };
      case 'satellite':
        return {
          label: 'In-Transit Sat-Link',
          downlink: 4.8,
          latency: 620,
          signalIcon: <SignalMedium className="w-4 h-4 text-indigo-500" />,
          statusColor: 'text-indigo-500',
          badgeBg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
        };
      case 'outage':
        return {
          label: 'Disconnected Outage',
          downlink: 0.0,
          latency: 9999,
          signalIcon: <WifiOff className="w-4 h-4 text-red-500" />,
          statusColor: 'text-red-500 animate-pulse',
          badgeBg: 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
        };
      case 'fiber':
      default:
        return {
          label: 'High-speed 5G / Fiber',
          downlink: realOnline ? bandwidthDownlink : 0,
          latency: realOnline ? rttLatency : 9999,
          signalIcon: <Wifi className="w-4 h-4 text-emerald-500" />,
          statusColor: 'text-emerald-500',
          badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
        };
    }
  };

  const stats = getProfileStats();

  return (
    <div id="scm-offline-pwa-tracker" className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Pill Trigger */}
      {!isExpanded && (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className={`group flex items-center gap-2.5 px-4 py-3 rounded-full shadow-2xl border transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer select-none ${
            isCurrentlyOffline 
              ? 'bg-amber-550 border-amber-500 text-white dark:bg-amber-750 dark:border-amber-700' 
              : 'bg-card border-border text-foreground hover:border-zinc-300 dark:hover:border-zinc-700'
          }`}
        >
          <div className="relative">
            {stats.signalIcon}
            {totalQueueCount > 0 && (
              <span className="absolute -top-2.5 -right-2 bg-red-500 text-white text-[9px] font-black h-4 min-w-4 px-1 rounded-full flex items-center justify-center animate-bounce border border-white">
                {totalQueueCount}
              </span>
            )}
          </div>
          
          <div className="flex flex-col items-start leading-none text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">
              {isCurrentlyOffline ? 'Offline Queue' : 'SCM Net-Link'}
            </span>
            <span className="text-[9px] opacity-60 mt-0.5 font-mono">
              {totalQueueCount > 0 ? `${totalQueueCount} items to sync` : stats.label}
            </span>
          </div>
        </button>
      )}

      {/* Expanded Status Panel */}
      {isExpanded && (
        <div className="w-80 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-fade-in flex flex-col justify-between">
          
          {/* Header */}
          <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CloudIcon className="w-4 h-4 text-indigo-500" />
              <div>
                <h4 className="text-xs font-bold text-foreground">PWA Queue Tracker</h4>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-mono">SCM Resilience Engine</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-4 space-y-4">
            
            {/* Real Network Banner if completely disconnected via browser */}
            {!realOnline && (
              <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] text-red-600 dark:text-red-400 font-medium flex items-start gap-2 animate-pulse">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold uppercase">Severe Loss of Port Service</p>
                  <p className="opacity-90 mt-0.5">Your browser reports complete loss of active internet connection. Switched to secure Local Cache.</p>
                </div>
              </div>
            )}

            {/* Network Profile Stats */}
            <div className="p-3 bg-muted/40 rounded-xl space-y-2 border">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase font-mono">Active Handshake</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stats.badgeBg}`}>
                  {stats.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-dashed">
                <div>
                  <span className="text-[9px] text-muted-foreground block">Bandwidth (Downlink)</span>
                  <span className="text-xs font-bold text-foreground font-mono">
                    {stats.downlink > 0 ? `${stats.downlink.toFixed(1)} Mbps` : '0.0 Mbps'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-muted-foreground block">RTT Connection Delay</span>
                  <span className="text-xs font-bold text-foreground font-mono">
                    {stats.latency < 9999 ? `${stats.latency} ms` : '∞ Out of Range'}
                  </span>
                </div>
              </div>
            </div>

            {/* Queue Counts Breakdown */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Offline Queue Ledger
              </span>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Document queue */}
                <div className="p-2.5 bg-background border rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-[11px] font-medium">Manifest Files</span>
                  </div>
                  <span className="font-mono font-bold px-1.5 py-0.5 bg-muted rounded">
                    {documentQueueCount}
                  </span>
                </div>

                {/* Edits queue */}
                <div className="p-2.5 bg-background border rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-cyan-500" />
                    <span className="text-[11px] font-medium">SCM Records</span>
                  </div>
                  <span className="font-mono font-bold px-1.5 py-0.5 bg-muted rounded">
                    {updateQueueCount}
                  </span>
                </div>
              </div>

              {totalQueueCount > 0 ? (
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 animate-pulse text-amber-500" />
                  <span>{totalQueueCount} updates pending cell signal handshake.</span>
                </div>
              ) : (
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>All SCM assets fully synchronized with master server.</span>
                </div>
              )}
            </div>

            {/* Intermittent Signal Simulator controls */}
            <div className="space-y-1.5 pt-2 border-t border-dashed">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Settings className="w-3 h-3 text-muted-foreground" />
                Intermittent Signal Simulator (QA)
              </label>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setSignalProfile('fiber')}
                  className={`py-1 rounded-md border font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                    signalProfile === 'fiber'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'bg-background hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <Wifi className="w-3 h-3" /> Excellent 5G
                </button>
                <button
                  type="button"
                  onClick={() => setSignalProfile('weak_cell')}
                  className={`py-1 rounded-md border font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                    signalProfile === 'weak_cell'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400'
                      : 'bg-background hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <SignalLow className="w-3 h-3" /> Port 3G Block
                </button>
                <button
                  type="button"
                  onClick={() => setSignalProfile('satellite')}
                  className={`py-1 rounded-md border font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                    signalProfile === 'satellite'
                      ? 'bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'bg-background hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <ArrowUpRight className="w-3 h-3" /> Sat-Link
                </button>
                <button
                  type="button"
                  onClick={() => setSignalProfile('outage')}
                  className={`py-1 rounded-md border font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                    signalProfile === 'outage'
                      ? 'bg-red-500/10 border-red-500 text-red-600 dark:text-red-400'
                      : 'bg-background hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <WifiOff className="w-3 h-3" /> Outage Mode
                </button>
              </div>
            </div>

          </div>

          {/* Sync Trigger Footer */}
          <div className="p-3 border-t bg-muted/20 flex gap-2">
            <button
              type="button"
              disabled={isSyncing || totalQueueCount === 0 || signalProfile === 'outage'}
              onClick={handleManualSync}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed text-white font-bold h-9 text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Synchronizing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" /> Force Sync Now
                </>
              )}
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
