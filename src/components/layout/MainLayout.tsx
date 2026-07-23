import React, { useEffect, Suspense } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { GlobalSearch } from '../shared/GlobalSearch';
import { CommandMenu } from '../shared/CommandMenu';
import { Breadcrumbs } from '../shared/Breadcrumbs';
import { AlertPanel } from '../shared/AlertPanel';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/overlays/dropdown-menu';
import { Button } from '@/components/ui/forms/button';
import { ErrorBoundary } from "../shared/ErrorBoundary";
import { ChevronDown, Calendar, TruckIcon, Bell, ArrowDownToLine, ArrowUpFromLine, Anchor, Ship, FileText, UserCircle, Users, LayoutDashboard, Building2, Map, Lock, Sun, Moon, Keyboard, ShieldCheck, Wifi, WifiOff, LogOut, Package, Folder, FileBox, Receipt, DollarSign, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useWebSocket } from '../../lib/useWebSocket';
import { useSessionTimeout } from '../../hooks/useSessionTimeout';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { OfflineQueueTracker } from '../dashboard/OfflineQueueTracker';

function NavItem({ to, icon: Icon, children }: { to: string, icon: React.ElementType, children: React.ReactNode }) {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);
  return (
    <Link 
      to={to} 
      className={`text-sm font-medium flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
        isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-background'
      }`}
    >
      <Icon className="w-4 h-4" />
      {children}
    </Link>
  );
}

function NavDropdown({ title, icon: Icon, children }: { title: string, icon: React.ElementType, children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="text-sm font-medium flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-background outline-none">
        <Icon className="w-4 h-4" />
        {title}
        <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DropdownLink({ to, icon: Icon, children }: { to: string, icon: React.ElementType, children: React.ReactNode }) {
  return (
    <DropdownMenuItem>
      <Link to={to} className="w-full cursor-pointer flex items-center gap-2">
        <Icon className="w-4 h-4" />
        {children}
      </Link>
    </DropdownMenuItem>
  );
}



export function Layout({ children }: { children: React.ReactNode }) {
  const { user, profile, updateProfile, logOut } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  useWebSocket(); // Initialize WS connection

  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);


  useEffect(() => {
    const handleConflict = (item: any, serverVersion: any) => {
      toast.warning('Background Sync Conflict', {
        description: 'A shipment you edited offline was also updated on the server.',
        duration: 20000,
        action: {
          label: 'Force Local Override',
          onClick: async () => {
            try {
              const token = localStorage.getItem('scm_auth_token') || sessionStorage.getItem('scm_auth_token');
              const body = { ...(item.body || {}), forceLocalOverride: true };
              const res = await fetch(item.url, {
                method: item.method,
                headers: { ...item.headers, 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(body)
              });
              if (res.ok) {
                toast.success('Local override applied successfully.');
                // We should ideally reload data here if possible, but window.location.reload() works too
                window.location.reload();
              } else {
                toast.error('Failed to apply local override.');
              }
            } catch (err) {
              toast.error('Network error during override.');
            }
          }
        },
        cancel: {
          label: 'Keep Remote Version',
          onClick: () => {
             toast.info('Kept remote version.');
             window.location.reload();
          }
        }
      });
    };

    const handleCustomConflictEvent = (e: any) => {
      handleConflict(e.detail.item, e.detail.serverVersion);
    };

    const handleMessageEvent = (e: MessageEvent) => {
      if (e.data && e.data.type === 'SYNC_CONFLICT') {
        handleConflict(e.data.item, e.data.serverVersion);
      }
    };

    window.addEventListener('sync_conflict', handleCustomConflictEvent);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessageEvent);
    }

    return () => {
      window.removeEventListener('sync_conflict', handleCustomConflictEvent);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessageEvent);
      }
    };
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOffline(false);
      toast.success("Connection restored! SCM application is live.", {
        icon: "🌐",
        duration: 4000
      });

      try {
        const { getQueuedUpdatesCount, flushSyncQueue } = await import('../../lib/syncQueue');
        const count = await getQueuedUpdatesCount();
        if (count > 0) {
          toast.promise(flushSyncQueue(), {
            loading: `Syncing ${count} offline updates...`,
            success: 'All offline updates synced to server!',
            error: 'Failed to sync some offline updates'
          });
        }
      } catch (err) {
        console.warn('Sync queue module failed to load', err);
      }
    };
    const handleOffline = () => {
      setIsOffline(true);
      toast.error("Network connection lost. Switched to offline mode with cached data.", {
        icon: "⚠️",
        duration: 6000
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useSessionTimeout(logOut);
  const { showShortcuts } = useKeyboardShortcuts();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {isOffline && (
        <div className="bg-amber-600 dark:bg-amber-700 text-white text-xs py-1.5 px-4 text-center font-semibold flex items-center justify-center gap-2 animate-pulse sticky top-0 z-50 shadow-sm border-b border-amber-700 dark:border-amber-800 transition-all">
          <WifiOff className="w-4 h-4 animate-bounce" />
          <span>Offline Mode Active. Viewing locally cached static assets and API data. Updates will not sync until reconnected.</span>
        </div>
      )}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Package className="w-5 h-5" />
              Logistics Hub
            </h1>
            <nav className="hidden md:flex gap-1 ml-4">
              <NavDropdown title="Control Tower" icon={LayoutDashboard}>
                <DropdownLink to="/costs" icon={DollarSign}>Cost Analysis</DropdownLink>
                <DropdownLink to="/dashboard" icon={Ship}>Shipments Analytics</DropdownLink>
                <DropdownLink to="/warehouses" icon={Building2}>Warehouses Analytics</DropdownLink>
                <DropdownLink to="/optimization" icon={Activity}>Cargo Optimizer Suite</DropdownLink>
              </NavDropdown>

              <NavDropdown title="Shipments" icon={Ship}>
                <DropdownLink to="/shipments" icon={Ship}>Shipment Management</DropdownLink>
                <DropdownLink to="/reports" icon={FileBox}>Shipment Reports</DropdownLink>
                <DropdownLink to="/booking" icon={Calendar}>Booking Management</DropdownLink>
                <DropdownLink to="/customs" icon={Anchor}>Customs Clearance</DropdownLink>
                <DropdownLink to="/compliance" icon={ShieldCheck}>Trade Compliance</DropdownLink>
                <DropdownLink to="/billing" icon={FileText}>Documentation (B/L & Invoicing)</DropdownLink>
                <DropdownLink to="/documents" icon={Folder}>Document Hub & Versioning</DropdownLink>
              </NavDropdown>

              <NavDropdown title="CRM & Partners" icon={Users}>
                <DropdownLink to="/carriers" icon={TruckIcon}>Carrier Management</DropdownLink>
                <DropdownLink to="/rates" icon={Map}>Quotations</DropdownLink>
                <DropdownLink to="/directory" icon={Users}>Address Registry</DropdownLink>
              </NavDropdown>

              <NavDropdown title="Warehouse" icon={Building2}>
                <DropdownLink to="/inventory" icon={Package}>Inventory</DropdownLink>
                <DropdownLink to="/warehouse/notifications" icon={Bell}>Notifications</DropdownLink>
                <DropdownLink to="/warehouse/inbound" icon={ArrowDownToLine}>Inbound</DropdownLink>
                <DropdownLink to="/warehouse/outbound" icon={ArrowUpFromLine}>Outbound</DropdownLink>
              </NavDropdown>

              {profile?.role === 'Admin' && (
                <NavItem to="/users" icon={ShieldCheck}>Users</NavItem>
              )}
            </nav>
          </div>
          
          <GlobalSearch />
          <CommandMenu />

          <div className="flex items-center gap-4">
            {isOffline ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50 text-xs font-semibold select-none shadow-sm animate-pulse" title="Offline - Using cached data">
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Offline</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 text-xs font-semibold select-none shadow-sm" title="Online - Syncing live">
                <Wifi className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Online</span>
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={showShortcuts} title="Keyboard Shortcuts">
              <Keyboard className="w-5 h-5 text-muted-foreground" />
            </Button>
            <AlertPanel />
            <Button variant="ghost" size="icon" onClick={() => updateProfile({ theme: profile?.theme === 'dark' ? 'light' : 'dark' })} title="Toggle Theme">
              {profile?.theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <select 
              className="bg-transparent border border-border rounded-md text-sm px-2 py-1 outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:text-zinc-300"
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
            >
              <option value="en">EN</option>
              <option value="es">ES</option>
              <option value="de">DE</option>
              <option value="fr">FR</option>
            </select>
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium text-foreground leading-none">{profile?.displayName || user?.email}</span>
              <span className="text-xs text-muted-foreground mt-1 flex items-center"><ShieldCheck className="w-3 h-3 mr-1"/>{profile?.role || 'Ejecutivo'}</span>
            </div>
            <Link to="/profile">
              <Button variant="ghost" size="icon" title="Profile Settings">
                <UserCircle className="w-5 h-5" />
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={logOut}>
              <LogOut className="w-4 h-4 mr-2" />
              {t('sign_out')}
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs />
        <ErrorBoundary>
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
              <div className="w-10 h-10 border-4 border-blue-600 dark:border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-muted-foreground animate-pulse font-medium">Loading SCM Control Center...</p>
            </div>
          }>
            {children}
          </Suspense>
        </ErrorBoundary>
      </main>
      <OfflineQueueTracker />
    </div>
  );
}

