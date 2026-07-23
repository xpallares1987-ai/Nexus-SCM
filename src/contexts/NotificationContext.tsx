import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface NotificationContextType {
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
  sendNotification: (title: string, options?: NotificationOptions) => void;
  settings: NotificationSettings;
  updateSettings: (settings: Partial<NotificationSettings>) => void;
}

interface NotificationSettings {
  pushEnabled: boolean;
  statusChanges: boolean;
  exceptions: boolean;
  milestones: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    const saved = localStorage.getItem('notificationSettings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      pushEnabled: false,
      statusChanges: true,
      exceptions: true,
      milestones: true,
    };
  });
  const { user } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
  }, [settings]);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error(t('This browser does not support desktop notification', 'This browser does not support desktop notification'));
      return 'denied' as NotificationPermission;
    }
    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm === 'granted') {
      updateSettings({ pushEnabled: true });
    } else {
      updateSettings({ pushEnabled: false });
    }
    return perm;
  };

  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const sendNotification = (title: string, options?: NotificationOptions) => {
    if (permission === 'granted' && settings.pushEnabled) {
      try {
        // We use Service Worker registration if available to show notification in mobile/PWA reliably, otherwise fallback to standard Notification
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, {
            icon: '/vite.svg',
            badge: '/vite.svg',
            ...options,
          });
        }).catch(() => {
          new Notification(title, { 
             icon: '/vite.svg', 
             ...options
          });
        });
      } catch (e) {
        new Notification(title, {
          icon: '/vite.svg',
          ...options
        });
      }
    }
  };

  // Listen to SSE events
  useEffect(() => {
    const handleEvent = (e: any) => {
      const data = e.detail;
      if (!data) return;
      const { type, payload } = data;
      
      if (type === 'SHIPMENT_UPDATED' || type === 'SHIPMENT_STATUS_CHANGED') {
         if (settings.statusChanges) {
           sendNotification(t('Shipment Updated', 'Shipment Updated') + `: ${payload.shipment?.reference || payload.shipmentReference || 'Unknown'}`, {
             body: t('Status changed to', 'Status changed to') + ` ${payload.shipment?.status || payload.status || 'Updated'}`
           });
         }
            
      } else if (type === 'EXCEPTION_ALERT' || type === 'SHIPMENT_EXCEPTION') {
         if (settings.exceptions) {
           sendNotification('⚠️ ' + t('Shipment Exception', 'Shipment Exception'), {
             body: t('Exception reported for', 'Exception reported for') + ` ${payload.shipmentReference || 'a shipment'}`,
             requireInteraction: true
           });
         }
      } else if (type === 'ETA_DELAY_ALERT') {
         if (settings.exceptions || settings.milestones) {
           sendNotification('⚠️ ' + t('Significant ETA Delay', 'Significant ETA Delay'), {
             body: payload.description || t('Shipment ETA changed by more than 24 hours', 'Shipment ETA changed by more than 24 hours') + ` (${payload.shipmentReference})`,
             requireInteraction: true
           });
         }
      } else if (type === 'MILESTONE_REACHED' || type === 'ETA_UPDATED') {
         if (settings.milestones) {
           sendNotification(t('Milestone Reached', 'Milestone Reached'), {
             body: t('Update for', 'Update for') + ` ${payload.shipmentReference || 'a shipment'}`
           });
         }
      } else if (type === 'CONTROL_TOWER_ALERT' || type === 'AI_RISK_ALERT') {
         if (settings.exceptions) {
           sendNotification('🚨 ' + t('Control Tower Alert', 'Control Tower Alert'), {
             body: payload.message || payload.description || t('New risk detected for shipment', 'New risk detected for shipment') + ` ${payload.shipmentReference || ''}`,
             requireInteraction: true
           });
         }
      } else if (type === 'IMPORTANT_ASSIGNMENT' || type === 'TASK_ASSIGNED') {
         sendNotification('📋 ' + t('Important Assignment', 'Important Assignment'), {
           body: payload.message || t('You have been assigned a new task', 'You have been assigned a new task'),
           requireInteraction: true
         });
      }
    };
    
    document.addEventListener('ws-message', handleEvent);
    return () => {
      document.removeEventListener('ws-message', handleEvent);
    };
  }, [settings, permission, t]);

  return (
    <NotificationContext.Provider value={{ permission, requestPermission, sendNotification, settings, updateSettings }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
