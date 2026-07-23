import React, { useState, useEffect, useRef } from 'react';
import { Bell, AlertCircle, Clock, Settings2, Webhook } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/overlays/dialog';
import { Switch } from '@/components/ui/forms/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/forms/select';
import { Button } from '@/components/ui/forms/button';
import { generateAlerts } from '../../lib/notificationUtils';

export function AlertPanel() {
  const { token, updateProfile, profile } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [dbNotifications, setDbNotifications] = useState<any[]>([]);
  
  // Settings State initialized from profile or defaults
  const [enableDelayAlerts, setEnableDelayAlerts] = useState(true);
  const [enableArrivalAlerts, setEnableArrivalAlerts] = useState(true);
  const [enableNativePush, setEnableNativePush] = useState(false);
  const [priorityLevel, setPriorityLevel] = useState('all');

  useEffect(() => {
    // Load preferences from local storage or profile if needed
    const prefs = localStorage.getItem('scm_notif_prefs');
    if (prefs) {
      try {
        const parsed = JSON.parse(prefs);
        setEnableDelayAlerts(parsed.enableDelayAlerts ?? true);
        setEnableArrivalAlerts(parsed.enableArrivalAlerts ?? true);
        setEnableNativePush(parsed.enableNativePush ?? false);
        setPriorityLevel(parsed.priorityLevel ?? 'all');
      } catch (e) {}
    }
  }, []);

  const savePreferences = (newPrefs: any) => {
    const prefs = { enableDelayAlerts, enableArrivalAlerts, enableNativePush, priorityLevel, ...newPrefs };
    localStorage.setItem('scm_notif_prefs', JSON.stringify(prefs));
  };

  const handleNativePushToggle = async (checked: boolean) => {
    if (checked) {
      if (!("Notification" in window)) {
        toast.error("This browser does not support desktop notification");
        return;
      }
      if (Notification.permission === "granted") {
        setEnableNativePush(true);
        savePreferences({ enableNativePush: true });
        toast.success("Push notifications enabled.");
      } else if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          setEnableNativePush(true);
          savePreferences({ enableNativePush: true });
          toast.success("Push notifications enabled.");
        } else {
          toast.error("Permission for push notifications was denied.");
        }
      }
    } else {
      setEnableNativePush(false);
      savePreferences({ enableNativePush: false });
    }
  };

  const sendNativeNotification = (title: string, options: NotificationOptions) => {
    if (enableNativePush && "Notification" in window && Notification.permission === "granted") {
      new Notification(title, options);
    }
  };

  useEffect(() => {
    if (!token) return;
    const fetchNotifs = async () => {
      try {
        const data = await fetchApi('/notifications', token);
        setDbNotifications(data || []);
        
        const unreadDb = data.filter((n: any) => n.isRead === 0);
        if (unreadDb.length > 0) {
          setUnreadCount(prev => prev + unreadDb.length);
        }
      } catch (err) {
        console.error("Failed to fetch db notifications", err);
      }
    };
    fetchNotifs();
    
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [token]);
  
  const handleMarkAsRead = async (id: string) => {
    try {
      await fetchApi(`/notifications/${id}/read`, token, { method: 'PUT' });
      setDbNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch(e) {}
  };
  
  const [isOpen, setIsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevAlertIds = useRef<Set<string>>(new Set());
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [shipments, setShipments] = useState<any[]>([]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!token) return;
    const fetchShipments = async () => {
      try {
        const data = await fetchApi('/shipments', token);
        setShipments(data);
      } catch (err) {
        console.error("Failed to fetch shipments for alerts", err);
      }
    };
    fetchShipments();
  }, [token]);

  useEffect(() => {
    const handleWsMessage = (e: any) => {
      const { type, payload } = e.detail;
      
      if (type === 'SHIPMENT_UPDATED') {
        const ship = payload.shipment || payload;
        if (ship) {
          setShipments(prev => {
            const exists = prev.find(s => s.id === ship.id);
            if (exists) {
              return prev.map(s => s.id === ship.id ? { ...s, ...ship } : s);
            }
            return [...prev, ship];
          });
          const msg = `Shipment ${ship.referenceNumber || 'status'} updated`;
          toast.info(msg, { icon: <AlertCircle className="w-4 h-4 text-blue-500" />});
          sendNativeNotification("Shipment Update", { body: msg, icon: '/vite.svg' });
        }
      } else if (type === 'NOTIFICATION_CREATED') {
        const notif = payload;
        setDbNotifications(prev => [notif, ...prev]);
        setUnreadCount(prev => prev + 1);
        toast.warning(notif.message, { icon: <AlertCircle className="w-4 h-4 text-indigo-500" /> });
        sendNativeNotification("New Alert", { body: notif.message, icon: '/vite.svg' });
      } else if (type === 'DOCUMENT_UPLOADED') {
        const ship = payload.shipment;
        if (ship) {
          const msg = `New document uploaded for ${ship.referenceNumber}: ${payload.fileName}`;
          toast.success(msg);
          sendNativeNotification("Document Uploaded", { body: msg, icon: '/vite.svg' });
        }
      }
    };

    document.addEventListener('ws-message', handleWsMessage);
    return () => document.removeEventListener('ws-message', handleWsMessage);
  }, [enableNativePush]);

  useEffect(() => {
    const newAlerts = generateAlerts(
      shipments, 
      enableDelayAlerts, 
      enableArrivalAlerts, 
      priorityLevel, 
      new Date()
    );
    setAlerts(newAlerts);
    
    let newUnread = 0;
    const currentIds = new Set<string>();
    newAlerts.forEach(a => {
      currentIds.add(a.id);
      if (!prevAlertIds.current.has(a.id)) {
        newUnread++;
        if (a.type === 'delayed') {
          toast.error(a.message, { icon: <AlertCircle className="w-4 h-4" /> });
          sendNativeNotification("Shipment Delayed", { body: a.message });
        } else {
          toast.warning(a.message, { icon: <Clock className="w-4 h-4" /> });
          sendNativeNotification("Shipment Approaching", { body: a.message });
        }
      }
    });
    
    if (newUnread > 0) {
      setUnreadCount(prev => prev + newUnread);
    }
    prevAlertIds.current = currentIds;
  }, [shipments, enableDelayAlerts, enableArrivalAlerts, priorityLevel, enableNativePush]);

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0); // clear unread on open
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button 
        onClick={handleOpen}
        className="relative p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-card border border-border rounded-lg shadow-xl overflow-hidden z-50">
          <div className="p-3 border-b border-border flex justify-between items-center bg-background">
            <h3 className="font-semibold text-foreground text-sm">Alerts & Notifications</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                {alerts.length + dbNotifications.filter((n: any) => n.isRead === 0).length}
              </span>
              <button 
                className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md transition-colors text-muted-foreground"
                onClick={() => setSettingsOpen(true)}
                title="Notification Settings"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto p-2 space-y-2">
            {alerts.length === 0 && dbNotifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No active alerts.
              </div>
            ) : (
              [...dbNotifications, ...alerts].map((alert: any) => (
                alert.isRead !== undefined ? (
                  <div key={alert.id} className={`p-3 rounded-md border ${alert.isRead === 0 ? 'bg-indigo-50/50 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-zinc-50 dark:bg-zinc-900 border-border'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        <AlertCircle className="w-4 h-4 text-indigo-500 mt-0.5 mr-2 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{alert.type || 'Alert'}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                        </div>
                      </div>
                      {alert.isRead === 0 && (
                         <button onClick={() => handleMarkAsRead(alert.id)} className="text-[10px] text-indigo-600 font-medium ml-2 hover:underline">Mark Read</button>
                      )}
                    </div>
                  </div>
                ) : 
                <div key={alert.id} className={`p-3 rounded-md border ${alert.type === 'delayed' ? 'bg-red-50/50 border-red-100 dark:bg-red-950/20 dark:border-red-900/50' : 'bg-amber-50/50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/50'}`}>
                  <div className="flex items-start">
                    {alert.type === 'delayed' ? (
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 mr-2 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500 mt-0.5 mr-2 shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">{alert.reference}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Notification Preferences</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="text-sm font-medium">Desktop Push Notifications</h4>
                <p className="text-xs text-muted-foreground">Receive OS-level notifications for critical alerts even when app is in background.</p>
              </div>
              <Switch checked={enableNativePush} onCheckedChange={handleNativePushToggle} />
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <div className="space-y-1">
                <h4 className="text-sm font-medium">Delay Alerts</h4>
                <p className="text-xs text-muted-foreground">Receive notifications when a shipment's ETA is delayed past current time.</p>
              </div>
              <Switch checked={enableDelayAlerts} onCheckedChange={(c) => { setEnableDelayAlerts(c); savePreferences({ enableDelayAlerts: c }); }} />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="text-sm font-medium">Approaching Arrival</h4>
                <p className="text-xs text-muted-foreground">Receive notifications when a shipment is within 48 hours of ETA.</p>
              </div>
              <Switch checked={enableArrivalAlerts} onCheckedChange={(c) => { setEnableArrivalAlerts(c); savePreferences({ enableArrivalAlerts: c }); }} />
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <h4 className="text-sm font-medium">Priority Filter</h4>
              <Select value={priorityLevel} onValueChange={(v) => { setPriorityLevel(v); savePreferences({ priorityLevel: v }); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Alerts</SelectItem>
                  <SelectItem value="high">High Priority Only (Delays)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

