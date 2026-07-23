import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Command } from 'cmdk';
import { Search, Package, Building2, Users, MapPin, Ship, FileText, LayoutDashboard, DollarSign, FileBox, Calendar, Anchor, ShieldCheck, Folder, TruckIcon, Map, ArrowDownToLine, ArrowUpFromLine, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchApi } from '../../lib/api';

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { token } = useAuth();

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    const openMenu = () => setOpen(true);

    document.addEventListener('keydown', down);
    window.addEventListener('open-command-menu', openMenu);
    return () => {
      document.removeEventListener('keydown', down);
      window.removeEventListener('open-command-menu', openMenu);
    };
  }, []);

  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (!query.trim() || !token) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetchApi(`/search?q=${encodeURIComponent(query)}`, token);
        setResults(response.results || []);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query, token]);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  const staticActions = [
    {
      id: 'create-shipment',
      title: 'Create New Shipment',
      subtitle: 'Open the shipment builder form',
      icon: <Ship className="mr-2 h-4 w-4 text-blue-500" />,
      action: () => navigate('/shipments?action=create-shipment')
    },
    {
      id: 'create-entity',
      title: 'Register New Entity',
      subtitle: 'Add shipper, consignee, or carrier',
      icon: <Users className="mr-2 h-4 w-4 text-green-500" />,
      action: () => navigate('/directory?action=create-entity')
    },
    {
      id: 'open-billing',
      title: 'Open Billing & Invoicing',
      subtitle: 'Manage B/Ls, invoices and payments',
      icon: <DollarSign className="mr-2 h-4 w-4 text-amber-500" />,
      action: () => navigate('/billing')
    },
    {
      id: 'warehouse-status',
      title: 'Warehouse Status & Inventory',
      subtitle: 'Check stock, locations and space',
      icon: <Building2 className="mr-2 h-4 w-4 text-purple-500" />,
      action: () => navigate('/warehouses')
    },
    {
      id: 'compliance-history',
      title: 'View Trade Compliance Audit',
      subtitle: 'AEO, FDA, customs and audit trails',
      icon: <ShieldCheck className="mr-2 h-4 w-4 text-emerald-500" />,
      action: () => navigate('/compliance')
    }
  ];

  const filteredStaticActions = query
    ? staticActions.filter(act => 
        act.title.toLowerCase().includes(query.toLowerCase()) || 
        act.subtitle.toLowerCase().includes(query.toLowerCase())
      )
    : staticActions;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setOpen(false)} />
      <div className="relative z-50 w-full max-w-2xl bg-card rounded-xl shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <Command
          className="w-full h-full flex flex-col"
          shouldFilter={false}
        >
          <div className="flex items-center px-4 border-b border-border">
            <Search className="w-5 h-5 text-muted-foreground mr-2 shrink-0" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              autoFocus
              placeholder="Search documents, warehouses, entities or type a command..."
              className="flex-1 h-14 bg-transparent outline-none border-none text-foreground placeholder:text-muted-foreground text-base focus:ring-0"
            />
            <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>

          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              {loading ? "Searching..." : "No results found."}
            </Command.Empty>

            {/* Quick Actions */}
            {filteredStaticActions.length > 0 && (
              <Command.Group heading="Quick Actions" className="text-xs font-medium text-muted-foreground px-2 py-1.5 [&_[cmdk-group-items]]:flex [&_[cmdk-group-items]]:flex-col [&_[cmdk-group-items]]:gap-1">
                {filteredStaticActions.map((act) => (
                  <Command.Item
                    key={act.id}
                    value={act.title}
                    onSelect={() => runCommand(act.action)}
                    className="flex flex-col items-start px-2 py-2 text-sm rounded-md cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground text-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground transition-colors"
                  >
                    <div className="flex items-center w-full">
                      {act.icon}
                      <span className="font-medium text-foreground">{act.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground pl-6">{act.subtitle}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Static Navigation Shortcuts */}
            {!query && (
              <Command.Group heading="Quick Links" className="text-xs font-medium text-muted-foreground px-2 py-1.5 [&_[cmdk-group-items]]:flex [&_[cmdk-group-items]]:flex-col [&_[cmdk-group-items]]:gap-1">
                <Command.Item
                  onSelect={() => runCommand(() => navigate('/dashboard'))}
                  className="flex items-center px-2 py-2.5 text-sm rounded-md cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground text-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground transition-colors"
                >
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>Control Tower Dashboard</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => runCommand(() => navigate('/documents'))}
                  className="flex items-center px-2 py-2.5 text-sm rounded-md cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground text-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground transition-colors"
                >
                  <Folder className="mr-2 h-4 w-4" />
                  <span>Document Hub</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => runCommand(() => navigate('/warehouses'))}
                  className="flex items-center px-2 py-2.5 text-sm rounded-md cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground text-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground transition-colors"
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  <span>Warehouses</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => runCommand(() => navigate('/directory'))}
                  className="flex items-center px-2 py-2.5 text-sm rounded-md cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground text-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground transition-colors"
                >
                  <Users className="mr-2 h-4 w-4" />
                  <span>Entities (Shippers, Carriers)</span>
                </Command.Item>
              </Command.Group>
            )}

            {/* API Search Results */}
            {results.length > 0 && (
              <>
                {['shipment', 'inventory', 'document', 'warehouse', 'party'].map((category) => {
                  const categoryResults = results.filter((r) => r.type === category);
                  if (categoryResults.length === 0) return null;

                  let categoryTitle = '';
                  if (category === 'party') categoryTitle = 'Entities & Clients';
                  else if (category === 'shipment') categoryTitle = 'Shipments';
                  else if (category === 'warehouse') categoryTitle = 'Warehouses';
                  else if (category === 'inventory') categoryTitle = 'Inventory';
                  else if (category === 'document') categoryTitle = 'Documents';

                  const getIcon = (type: string) => {
                    switch (type) {
                      case 'shipment': return <Ship className="mr-2 w-4 h-4 text-blue-500" />;
                      case 'warehouse': return <Building2 className="mr-2 w-4 h-4 text-amber-500" />;
                      case 'party': return <Users className="mr-2 w-4 h-4 text-green-500" />;
                      case 'inventory': return <Package className="mr-2 w-4 h-4 text-orange-500" />;
                      case 'document': return <FileText className="mr-2 w-4 h-4 text-purple-500" />;
                      default: return <Search className="mr-2 w-4 h-4 text-muted-foreground" />;
                    }
                  };

                  return (
                    <Command.Group key={category} heading={categoryTitle} className="text-xs font-medium text-muted-foreground px-2 py-1.5 [&_[cmdk-group-items]]:flex [&_[cmdk-group-items]]:flex-col [&_[cmdk-group-items]]:gap-1">
                      {categoryResults.map((result) => (
                        <Command.Item
                          key={`${result.type}-${result.id}`}
                          value={`${result.title} ${result.subtitle}`}
                          onSelect={() => runCommand(() => navigate(result.url))}
                          className="flex flex-col items-start px-2 py-2 text-sm rounded-md cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground text-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground transition-colors"
                        >
                          <div className="flex items-center w-full">
                            {getIcon(result.type)}
                            <span className="font-medium text-foreground">{result.title}</span>
                          </div>
                          <span className="text-xs text-muted-foreground pl-6">{result.subtitle}</span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  );
                })}
              </>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
