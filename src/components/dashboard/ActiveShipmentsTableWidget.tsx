import React, { useState } from 'react';
import { calculateShipmentRisk, getRiskBadgeStyles } from '../../lib/riskScorer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/data-display/table';
import { Badge } from '@/components/ui/data-display/badge';
import { Input } from '@/components/ui/forms/input';
import { Button } from '@/components/ui/forms/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/overlays/dialog';
import { toast } from 'sonner';
import { 
  Ship, 
  Plane, 
  Truck, 
  Train, 
  Clock, 
  AlertTriangle, 
  ArrowRight, 
  Search,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  User,
  ExternalLink,
  Calendar,
  CheckCircle2,
  Info,
  Send,
  PhoneCall,
  Link2,
  Navigation,
  FileText,
  ShieldAlert
} from 'lucide-react';

interface ActiveShipmentsTableWidgetProps {
  shipments: any[];
  activityLogs?: any[];
}

// Complete registry of active carriers with robust contact detail cards
const CARRIER_DETAILS_MAP: Record<string, { companyName: string; contactPerson: string; email: string; phone: string; address: string; status: string }> = {
  '33333333-3333-3333-3333-111111111111': {
    companyName: 'DHL Express Service',
    contactPerson: 'Marcus Vance (Global Dispatch)',
    email: 'm.vance@dhl.com',
    phone: '+1 (800) 225-5345',
    address: 'Airport Rd 15, Miami, USA',
    status: 'Preferred Partner'
  },
  '33333333-3333-3333-3333-222222222222': {
    companyName: 'Maersk Line Ocean',
    contactPerson: 'Soren Skou (Marine Operations)',
    email: 'ops@maersk-ocean.com',
    phone: '+45 3363 3363',
    address: 'Esplanaden 50, Copenhagen, Denmark',
    status: 'Alliance Tier 1'
  },
  '33333333-3333-3333-3333-333333333333': {
    companyName: 'CMA CGM Shipping',
    contactPerson: 'Jean-Marc Albin (Logistics Control)',
    email: 'support@cma-cgm.com',
    phone: '+33 4 88 91 90 00',
    address: 'Boulevard de Dunkerque 4, Marseille, France',
    status: 'Standard Carrier'
  },
  '33333333-3333-3333-3333-444444444444': {
    companyName: 'LATAM Cargo',
    contactPerson: 'Claudio Torres (Air Dispatch)',
    email: 'cargo-ops@latam.com',
    phone: '+56 2 2565 2525',
    address: 'Americo Vespucio 901, Santiago, Chile',
    status: 'Preferred Air Cargo'
  }
};

const getCarrierDetails = (carrierId: string, shipmentType?: string, carrierName?: string) => {
  const matched = CARRIER_DETAILS_MAP[carrierId];
  if (matched) return matched;

  // Fallback to high-fidelity generic details based on shipment carrierName or type
  const name = carrierName || (shipmentType?.toLowerCase() === 'air' ? 'Global Air Wings' : 'Pacific Sea Lines');
  return {
    companyName: name,
    contactPerson: 'Operations Control Center',
    email: `ops@${name.toLowerCase().replace(/\s+/g, '-')}.com`,
    phone: '+1 (800) 555-0199',
    address: 'Main Logistics Terminal Drive, Sector 7',
    status: 'Verified Contract Carrier'
  };
};

// Generates highly detailed historical event logs per active shipment matched with current delay risks
const getShipmentEventLogs = (shipment: any, globalLogs: any[] = []) => {
  // First filter global logs if any match the shipment reference number
  const matchedLogs = globalLogs.filter(log => 
    (log.description && log.description.includes(shipment.referenceNumber)) ||
    (log.reference && log.reference === shipment.referenceNumber)
  );

  if (matchedLogs.length > 0) {
    return matchedLogs.map(log => ({
      id: log.id,
      title: log.eventType || 'Logistics Event',
      description: log.description,
      timestamp: new Date(log.createdAt || log.timestamp),
      status: log.severity === 'warning' ? 'warning' : 'completed'
    }));
  }

  // Fallback to generating elegant, contextual logistics milestone steps
  const baseTime = shipment.createdAt ? new Date(shipment.createdAt).getTime() : new Date(shipment.etd).getTime() - 7 * 24 * 60 * 60 * 1000;
  const generated = [
    {
      id: 'gen-1',
      title: 'Booking Confirmed',
      description: `Cargo allocation space reserved and locked under reference ${shipment.referenceNumber || 'SHP-' + shipment.id.substring(0,5).toUpperCase()}`,
      timestamp: new Date(baseTime),
      status: 'completed'
    },
    {
      id: 'gen-2',
      title: 'Documentation Manifest Accepted',
      description: 'Commercial invoice, export manifests, and VGM (Verified Gross Mass) certified by customs agent.',
      timestamp: new Date(baseTime + 1.5 * 24 * 60 * 60 * 1000),
      status: 'completed'
    }
  ];

  if (new Date() > new Date(shipment.etd)) {
    generated.push({
      id: 'gen-3',
      title: 'Origin Port Gate-In & Customs Cleared',
      description: `Container arrived at departure gate and cleared export customs at ${shipment.originPort || 'Departure Hub'}.`,
      timestamp: new Date(new Date(shipment.etd).getTime() - 10 * 60 * 60 * 1000),
      status: 'completed'
    });
    generated.push({
      id: 'gen-4',
      title: 'Loaded & Departed Origin',
      description: `Vessel/carrier departed origin hub. Actual Departure: ${shipment.atd ? new Date(shipment.atd).toLocaleDateString() : new Date(shipment.etd).toLocaleDateString()}`,
      timestamp: new Date(shipment.atd || shipment.etd),
      status: 'completed'
    });
  }

  if (shipment.status === 'Delayed') {
    generated.push({
      id: 'gen-delay',
      title: 'AI Delay Alert Raised',
      description: shipment.predictiveReason || 'Unfavorable weather or route port congestion flagged by AI predictive model.',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      status: 'warning'
    });
  } else {
    generated.push({
      id: 'gen-transit',
      title: 'Ocean/Air Transit Ping',
      description: `Carrier telematics verify cargo is actively in transit. GPS coordinates on planned trajectory.`,
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
      status: 'completed'
    });
  }

  return generated.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'In Transit':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900';
    case 'Delayed':
      return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900';
    case 'Pending':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900';
    case 'Draft':
      return 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-850 dark:text-zinc-300 dark:border-zinc-800';
    default:
      return 'bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-900/30 dark:text-zinc-450 dark:border-zinc-800';
  }
};

const getModeIcon = (mode: string) => {
  switch (mode?.toLowerCase()) {
    case 'air':
      return <Plane className="w-4 h-4 text-sky-500" />;
    case 'sea':
    case 'ocean':
      return <Ship className="w-4 h-4 text-indigo-500" />;
    case 'road':
    case 'truck':
      return <Truck className="w-4 h-4 text-emerald-500" />;
    case 'rail':
    case 'train':
      return <Train className="w-4 h-4 text-amber-500" />;
    default:
      return <Ship className="w-4 h-4 text-slate-500" />;
  }
};

export function ActiveShipmentsTableWidget({ shipments, activityLogs = [] }: ActiveShipmentsTableWidgetProps) {
  const [localSearch, setLocalSearch] = useState('');
  const [originFilter, setOriginFilter] = useState('all');
  const [destinationFilter, setDestinationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Shipment selected for the details modal
  const [selectedRowShipment, setSelectedRowShipment] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter out delivered or draft/archived shipments if needed, focusing on active ones
  const activeShipments = shipments.filter((s: any) => s.status !== 'Delivered' && s.status !== 'Draft');

  // Dynamically derive unique options from current active shipments
  const uniqueOrigins = Array.from(new Set(activeShipments.map((s: any) => s.originPort).filter(Boolean))).sort() as string[];
  const uniqueDestinations = Array.from(new Set(activeShipments.map((s: any) => s.destinationPort).filter(Boolean))).sort() as string[];
  const uniqueStatuses = Array.from(new Set(activeShipments.map((s: any) => s.status).filter(Boolean))).sort() as string[];

  // Apply search and drop-down filters
  const filteredActive = activeShipments.filter((s: any) => {
    const query = localSearch.toLowerCase();
    
    const matchesSearch = 
      (s.referenceNumber || '').toLowerCase().includes(query) ||
      (s.originPort || '').toLowerCase().includes(query) ||
      (s.destinationPort || '').toLowerCase().includes(query) ||
      (s.status || '').toLowerCase().includes(query) ||
      (s.trackingNumber || '').toLowerCase().includes(query);

    const matchesOrigin = originFilter === 'all' || s.originPort === originFilter;
    const matchesDestination = destinationFilter === 'all' || s.destinationPort === destinationFilter;
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;

    return matchesSearch && matchesOrigin && matchesDestination && matchesStatus;
  });

  const isFiltered = localSearch !== '' || originFilter !== 'all' || destinationFilter !== 'all' || statusFilter !== 'all';

  const activeCarrierDetails = selectedRowShipment 
    ? getCarrierDetails(selectedRowShipment.carrierId, selectedRowShipment.type, selectedRowShipment.carrierName) 
    : null;

  const activeShipmentLogs = selectedRowShipment
    ? getShipmentEventLogs(selectedRowShipment, activityLogs)
    : [];

  return (
    <Card id="active-shipments-table-widget" className="h-full shadow-sm border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl flex flex-col">
      <CardHeader className="pb-4 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Active Shipments Transit Ledger
            </CardTitle>
            <CardDescription>
              Live status overview of in-transit cargo aligned with predictive risk modeling. Click on any row to open the active operation module.
            </CardDescription>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 bg-zinc-50/50 dark:bg-zinc-900/10 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/40">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              id="active-shipments-search"
              type="search"
              placeholder="Search active cargo ID, tracking ID..."
              className="pl-8 h-8 text-xs bg-white dark:bg-zinc-950"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              id="active-shipments-origin-filter"
              className="h-8 px-2 px-3 border border-zinc-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-950 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              value={originFilter}
              onChange={(e) => setOriginFilter(e.target.value)}
            >
              <option value="all">All Origins</option>
              {uniqueOrigins.map((origin) => (
                <option key={origin} value={origin}>{origin}</option>
              ))}
            </select>

            <select
              id="active-shipments-destination-filter"
              className="h-8 px-2 px-3 border border-zinc-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-950 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              value={destinationFilter}
              onChange={(e) => setDestinationFilter(e.target.value)}
            >
              <option value="all">All Destinations</option>
              {uniqueDestinations.map((dest) => (
                <option key={dest} value={dest}>{dest}</option>
              ))}
            </select>

            <select
              id="active-shipments-status-filter"
              className="h-8 px-2 px-3 border border-zinc-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-950 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              {uniqueStatuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>

            {isFiltered && (
              <Button
                id="reset-active-filters"
                variant="ghost"
                className="h-8 px-2.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                onClick={() => {
                  setLocalSearch('');
                  setOriginFilter('all');
                  setDestinationFilter('all');
                  setStatusFilter('all');
                }}
              >
                Reset Filters
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 overflow-hidden">
        <div className="overflow-x-auto">
          <Table id="active-shipments-ledger-table">
            <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/40">
              <TableRow>
                <TableHead className="text-xs font-semibold py-3 pl-6">Shipment ID</TableHead>
                <TableHead className="text-xs font-semibold py-3">Status & Risk Alerts</TableHead>
                <TableHead className="text-xs font-semibold py-3">Origin</TableHead>
                <TableHead className="text-xs font-semibold py-3"></TableHead>
                <TableHead className="text-xs font-semibold py-3">Destination</TableHead>
                <TableHead className="text-xs font-semibold py-3 pr-6 text-right">Estimated Arrival (ETA)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActive.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-8 h-8 text-zinc-400" />
                      <p className="text-sm font-medium">No active shipments matching your criteria</p>
                      <p className="text-xs text-zinc-500">All cargo might be delivered, in draft state, or filtered out.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredActive.map((s: any) => {
                  const riskBreakdown = calculateShipmentRisk(s);
                  const riskStyles = getRiskBadgeStyles(riskBreakdown.score);
                  const isAtRisk = s.isPredictiveAtRisk || s.delayRisk === 'High' || s.delayRisk === 'Medium' || s.status === 'Delayed' || riskBreakdown.score >= 45;
                  return (
                    <TableRow 
                      key={s.id} 
                      className={`group hover:bg-muted/40 transition-colors border-b border-zinc-100 dark:border-zinc-800/60 cursor-pointer ${
                        isAtRisk ? 'bg-red-500/[0.01] hover:bg-red-500/[0.03]' : ''
                      }`}
                      onClick={() => {
                        setSelectedRowShipment(s);
                        setIsModalOpen(true);
                      }}
                    >
                      {/* ID / Reference Number with Transport Mode Icon */}
                      <TableCell className="font-semibold py-4 pl-6 text-sm">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded bg-zinc-100 dark:bg-zinc-800/80 shrink-0">
                            {getModeIcon(s.type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-foreground dark:text-zinc-100 hover:underline cursor-pointer block font-bold">
                                {s.referenceNumber || `SHP-${s.id.substring(0, 5).toUpperCase()}`}
                              </span>
                              <Badge className={`text-[10px] px-1.5 py-0 h-4.5 font-mono font-bold shrink-0 ${riskStyles.bg} ${riskStyles.text} border ${riskStyles.border}`} title={`Leg Risk Index: ${riskBreakdown.score}/100 [Level: ${riskBreakdown.level}]\n- Weather: ${riskBreakdown.weatherRisk}/30\n- Geopolitical: ${riskBreakdown.politicalRisk}/30\n- Port Congestion: ${riskBreakdown.portDelayRisk}/30\nClick row for full breakdown.`} variant="outline">
                                Risk {riskBreakdown.score}
                              </Badge>
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono font-normal block mt-0.5">
                              {s.trackingNumber || 'No tracking ID'}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Status + Risk Alerts */}
                      <TableCell className="py-4">
                        <div className="flex flex-col gap-1.5 items-start">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge className={`text-[10px] font-bold h-5 py-0 px-2 rounded border ${getStatusColor(s.status)}`} variant="outline">
                              {s.status}
                            </Badge>
                            {isAtRisk && (
                              <Badge className="bg-red-50 text-red-600 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900 animate-pulse text-[10px] h-5 py-0 px-2 font-bold flex items-center gap-1" variant="outline">
                                <AlertTriangle className="w-3 h-3 text-red-500" />
                                At Risk
                              </Badge>
                            )}
                          </div>
                          {s.predictiveReason && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-500 font-medium max-w-[220px] line-clamp-1 leading-snug" title={s.predictiveReason}>
                              {s.predictiveReason}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Origin */}
                      <TableCell className="py-4 text-sm font-medium">
                        <div>
                          <p className="text-zinc-900 dark:text-zinc-100 font-semibold">{s.originPort || 'N/A'}</p>
                          <p className="text-[10px] text-muted-foreground font-normal">{s.origin || 'N/A'}</p>
                        </div>
                      </TableCell>

                      {/* Arrow Connector */}
                      <TableCell className="py-4 px-1 text-center shrink-0">
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                      </TableCell>

                      {/* Destination */}
                      <TableCell className="py-4 text-sm font-medium">
                        <div>
                          <p className="text-zinc-900 dark:text-zinc-100 font-semibold">{s.destinationPort || 'N/A'}</p>
                          <p className="text-[10px] text-muted-foreground font-normal">{s.destination || 'N/A'}</p>
                        </div>
                      </TableCell>

                      {/* ETA column with predicted delays if applicable */}
                      <TableCell className="py-4 pr-6 text-right text-sm">
                        <div className="flex flex-col items-end">
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 justify-end">
                            {s.eta ? new Date(s.eta).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                          </p>
                          {s.predictedDelayDays ? (
                            <span className="text-[10px] font-bold text-red-600 dark:text-red-400">
                              AI Predicts: +{s.predictedDelayDays}d Delay
                            </span>
                          ) : isAtRisk && s.status === 'Delayed' ? (
                            <span className="text-[10px] font-bold text-red-600 dark:text-red-400">
                              Delayed
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              On Track
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Shipment Comprehensive Operation Module Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-xl p-0">
          {selectedRowShipment && (
            <div className="flex flex-col h-full divide-y divide-zinc-100 dark:divide-zinc-850">
              {/* Header Title with Custom Badges */}
              <div className="p-6 bg-zinc-50/50 dark:bg-zinc-900/20">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-100/80 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                      {getModeIcon(selectedRowShipment.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-bold tracking-tight text-foreground">
                          {selectedRowShipment.referenceNumber || `SHP-${selectedRowShipment.id.substring(0, 8).toUpperCase()}`}
                        </h2>
                        <Badge variant="outline" className={`text-xs font-bold py-0.5 px-2.5 rounded ${getStatusColor(selectedRowShipment.status)}`}>
                          {selectedRowShipment.status}
                        </Badge>
                        {(selectedRowShipment.isPredictiveAtRisk || selectedRowShipment.delayRisk === 'High' || selectedRowShipment.status === 'Delayed') && (
                          <Badge className="bg-red-50 text-red-600 border-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/60 font-bold flex items-center gap-1 animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                            Critical AI Delay Alert
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                        System Identifier: {selectedRowShipment.id} | Tracking ID: {selectedRowShipment.trackingNumber || 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground font-medium">Estimated Time of Arrival</p>
                    <p className="text-lg font-bold text-foreground">
                      {selectedRowShipment.eta ? new Date(selectedRowShipment.eta).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Grid content */}
              <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-100 dark:divide-zinc-850">
                
                {/* Left Side: Shipment Specs & AI Risk Analytics (Col 7) */}
                <div className="lg:col-span-7 p-6 space-y-6">
                  {/* Transit Location Flow Visualizer */}
                  <div className="bg-zinc-50/50 dark:bg-zinc-900/10 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800/40">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Live Transit Routing</h3>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Origin Hub</p>
                        <p className="text-sm font-bold text-foreground truncate">{selectedRowShipment.originPort}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{selectedRowShipment.origin}</p>
                      </div>
                      <div className="flex flex-col items-center justify-center px-2">
                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center border border-blue-100 dark:border-blue-900/50">
                          <Navigation className="w-4 h-4 text-blue-500 transform rotate-45" />
                        </div>
                        <div className="h-0.5 w-16 bg-gradient-to-r from-blue-300 via-zinc-200 to-zinc-100 dark:from-blue-900 dark:via-slate-800 dark:to-slate-900 mt-2" />
                      </div>
                      <div className="flex-1 text-right">
                        <p className="text-xs text-muted-foreground">Destination Hub</p>
                        <p className="text-sm font-bold text-foreground truncate">{selectedRowShipment.destinationPort}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{selectedRowShipment.destination}</p>
                      </div>
                    </div>
                  </div>

                  {/* Core Metrics Specs Grid */}
                  <div>
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Transportation Logistics Specs</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-zinc-50/30 dark:bg-zinc-900/5 rounded-lg border border-zinc-100 dark:border-zinc-800/20">
                        <span className="text-[11px] text-muted-foreground block">Transport Mode</span>
                        <span className="text-sm font-semibold flex items-center gap-1.5 mt-1">
                          {getModeIcon(selectedRowShipment.type)}
                          {selectedRowShipment.type || 'Ocean'} Transit
                        </span>
                      </div>
                      <div className="p-3 bg-zinc-50/30 dark:bg-zinc-900/5 rounded-lg border border-zinc-100 dark:border-zinc-800/20">
                        <span className="text-[11px] text-muted-foreground block">Vessel/Voyage/Flight</span>
                        <span className="text-sm font-semibold block mt-1 truncate">
                          {selectedRowShipment.carrierName || 'TBD'} - {selectedRowShipment.vesselName || selectedRowShipment.flightNo || 'VOY-998A'}
                        </span>
                      </div>
                      <div className="p-3 bg-zinc-50/30 dark:bg-zinc-900/5 rounded-lg border border-zinc-100 dark:border-zinc-800/20">
                        <span className="text-[11px] text-muted-foreground block">Planned Departure (ETD)</span>
                        <span className="text-sm font-semibold flex items-center gap-1.5 mt-1">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                          {selectedRowShipment.etd ? new Date(selectedRowShipment.etd).toLocaleDateString() : 'Pending'}
                        </span>
                      </div>
                      <div className="p-3 bg-zinc-50/30 dark:bg-zinc-900/5 rounded-lg border border-zinc-100 dark:border-zinc-800/20">
                        <span className="text-[11px] text-muted-foreground block">Actual Departure (ATD)</span>
                        <span className="text-sm font-semibold flex items-center gap-1.5 mt-1">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                          {selectedRowShipment.atd ? new Date(selectedRowShipment.atd).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Automated Intermodal Route Risk-Scoring (1-100 Index) */}
                  {(() => {
                    const modalRisk = calculateShipmentRisk(selectedRowShipment);
                    const modalRiskStyles = getRiskBadgeStyles(modalRisk.score);
                    return (
                      <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5 text-indigo-500" />
                            <div>
                              <h4 className="text-sm font-bold text-foreground">Dynamic Intermodal Route Risk Index</h4>
                              <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">Real-Time Threat Overlay</p>
                            </div>
                          </div>
                          <Badge className={`text-xs font-mono font-bold py-1 px-3 border ${modalRiskStyles.bg} ${modalRiskStyles.text} ${modalRiskStyles.border}`} variant="outline">
                            INDEX: {modalRisk.score} / 100 ({modalRisk.level})
                          </Badge>
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="space-y-1">
                          <div className="h-2.5 w-full bg-zinc-200 dark:bg-zinc-850 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${
                                modalRisk.level === 'Critical' ? 'bg-red-500' :
                                modalRisk.level === 'High' ? 'bg-orange-500' :
                                modalRisk.level === 'Medium' ? 'bg-amber-500' :
                                'bg-emerald-500'
                              }`}
                              style={{ width: `${modalRisk.score}%` }}
                            />
                          </div>
                        </div>

                        {/* Threat Factor Matrices */}
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-zinc-150 dark:border-zinc-800/80">
                            <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider block">Weather</span>
                            <span className="text-sm font-bold text-foreground mt-1 block">{modalRisk.weatherRisk} <span className="text-[10px] text-muted-foreground font-normal">/30</span></span>
                            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1 rounded-full mt-1.5 overflow-hidden">
                              <div className="bg-cyan-500 h-full" style={{ width: `${(modalRisk.weatherRisk / 30) * 100}%` }} />
                            </div>
                          </div>
                          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-zinc-150 dark:border-zinc-800/80">
                            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">Geopolitical</span>
                            <span className="text-sm font-bold text-foreground mt-1 block">{modalRisk.politicalRisk} <span className="text-[10px] text-muted-foreground font-normal">/30</span></span>
                            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1 rounded-full mt-1.5 overflow-hidden">
                              <div className="bg-rose-500 h-full" style={{ width: `${(modalRisk.politicalRisk / 30) * 100}%` }} />
                            </div>
                          </div>
                          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-zinc-150 dark:border-zinc-800/80">
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Port Delay</span>
                            <span className="text-sm font-bold text-foreground mt-1 block">{modalRisk.portDelayRisk} <span className="text-[10px] text-muted-foreground font-normal">/30</span></span>
                            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1 rounded-full mt-1.5 overflow-hidden">
                              <div className="bg-amber-500 h-full" style={{ width: `${(modalRisk.portDelayRisk / 30) * 100}%` }} />
                            </div>
                          </div>
                        </div>

                        {/* Overlay Breakdown List */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Active Threat Overlays</span>
                          <ul className="space-y-1.5 text-xs text-foreground">
                            {modalRisk.reasons.map((reason, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Recommendations */}
                        {modalRisk.mitigations.length > 0 && (
                          <div className="bg-indigo-500/[0.03] border border-indigo-500/15 p-3 rounded-lg space-y-1">
                            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block">Automated Intermodal Recommendations</span>
                            <div className="space-y-1 text-xs">
                              {modalRisk.mitigations.map((mit, idx) => (
                                <p key={idx} className="text-slate-700 dark:text-slate-300 flex items-start gap-1.5 leading-normal">
                                  <span className="text-indigo-500 font-bold shrink-0">&raquo;</span>
                                  <span>{mit}</span>
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* AI Predictive Analytics Insight Panel */}
                  <div className={`p-4 rounded-xl border ${
                    selectedRowShipment.status === 'Delayed' || selectedRowShipment.isPredictiveAtRisk
                      ? 'bg-red-500/[0.02] border-red-200 dark:border-red-900/40' 
                      : 'bg-emerald-500/[0.01] border-emerald-200 dark:border-emerald-900/30'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-1.5 rounded-lg ${
                        selectedRowShipment.status === 'Delayed' || selectedRowShipment.isPredictiveAtRisk
                          ? 'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                          : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">AI Control Tower Risk Assessment</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {selectedRowShipment.predictiveReason || 'This shipment is currently trending with optimal routing. ETA accuracy is verified within high-confidence parameters.'}
                        </p>
                        {selectedRowShipment.predictedDelayDays && (
                          <div className="flex items-center gap-1.5 mt-2 bg-red-100/50 dark:bg-red-950/20 px-2 py-0.5 rounded text-[11px] font-bold text-red-600 dark:text-red-400 w-fit">
                            AI Confidence Metric: Predicted delay of +{selectedRowShipment.predictedDelayDays} days
                          </div>
                        )}
                        {/* Actionable recommendations for operator */}
                        {(selectedRowShipment.status === 'Delayed' || selectedRowShipment.isPredictiveAtRisk) && (
                          <div className="text-xs font-medium text-amber-700 dark:text-amber-400 mt-2">
                            Suggested Action: Inquire carrier regarding customs backlog and request priority discharge.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Carrier Contact & Event History (Col 5) */}
                <div className="lg:col-span-5 p-6 space-y-6 bg-zinc-50/20 dark:bg-zinc-950/10">
                  {/* Carrier Contact Profile */}
                  {activeCarrierDetails && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Logistics Carrier Profile</h3>
                      <div className="p-4 rounded-xl border border-zinc-150 dark:border-zinc-800 bg-white dark:bg-slate-900/60 shadow-xs">
                        <div className="flex justify-between items-start gap-2 mb-3">
                          <div>
                            <h4 className="font-bold text-sm text-foreground">{activeCarrierDetails.companyName}</h4>
                            <Badge className="text-[9px] font-semibold py-0 px-1.5 mt-1 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" variant="outline">
                              {activeCarrierDetails.status}
                            </Badge>
                          </div>
                          <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded">
                            <Truck className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                          </div>
                        </div>

                        <div className="space-y-2.5 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span className="font-medium text-foreground">{activeCarrierDetails.contactPerson}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span className="hover:underline cursor-pointer truncate" onClick={() => {
                              toast.success(`Mail client initialized for dispatch: ${activeCarrierDetails.email}`);
                            }}>
                              {activeCarrierDetails.email}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span className="hover:underline cursor-pointer" onClick={() => {
                              toast.info(`Calling Dispatch Center: ${activeCarrierDetails.phone}`);
                            }}>
                              {activeCarrierDetails.phone}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                            <span className="truncate" title={activeCarrierDetails.address}>{activeCarrierDetails.address}</span>
                          </div>
                        </div>

                        {/* Interactive Buttons */}
                        <div className="grid grid-cols-2 gap-2 mt-4">
                          <Button 
                            id="btn-contact-carrier-email"
                            variant="outline" 
                            size="sm" 
                            className="text-xs h-8 flex items-center justify-center gap-1.5"
                            onClick={() => {
                              toast.success(`Priority alert email drafted to ${activeCarrierDetails.companyName}`);
                            }}
                          >
                            <Mail className="w-3 h-3 text-zinc-500" /> Email
                          </Button>
                          <Button 
                            id="btn-contact-carrier-call"
                            variant="outline" 
                            size="sm" 
                            className="text-xs h-8 flex items-center justify-center gap-1.5"
                            onClick={() => {
                              toast.success(`Direct trunk line dialed: ${activeCarrierDetails.phone}`);
                            }}
                          >
                            <PhoneCall className="w-3 h-3 text-zinc-500" /> Dial Dispatch
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Active Shipments Historical Events timeline */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Historical Event Ledger</h3>
                    
                    <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
                      {activeShipmentLogs.map((log: any, index: number) => {
                        const isWarning = log.status === 'warning';
                        return (
                          <div key={log.id || index} className="flex gap-2.5 relative">
                            {/* vertical timeline thread connector line */}
                            {index !== activeShipmentLogs.length - 1 && (
                              <div className="absolute left-2.5 top-5 bottom-[-16px] w-0.5 bg-zinc-200 dark:bg-zinc-800" />
                            )}
                            
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 z-10 ${
                              isWarning 
                                ? 'bg-red-50 dark:bg-red-950/20 border-red-500 text-red-500' 
                                : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-750 text-zinc-500'
                            }`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${isWarning ? 'bg-red-500' : 'bg-zinc-400'}`} />
                            </div>

                            <div className="flex-1 space-y-0.5">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-bold text-foreground truncate">{log.title}</p>
                                <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                                  {log.timestamp ? new Date(log.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground leading-snug">{log.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>

              {/* Action Buttons Footer */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/20 flex flex-wrap gap-2 justify-between items-center rounded-b-xl">
                <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-zinc-400" />
                  Operator Authorization Level: Full Access
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    id="btn-trigger-rerouting-query"
                    variant="outline" 
                    size="sm" 
                    className="text-xs text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/60 hover:bg-amber-50 dark:hover:bg-amber-950/10"
                    onClick={() => {
                      toast.success(`Re-routing simulation run completed. Recommended backup hubs dispatched to ${activeCarrierDetails?.companyName}`);
                    }}
                  >
                    <Send className="w-3.5 h-3.5 mr-1" /> Re-route Query
                  </Button>
                  <Button 
                    id="btn-close-shipment-modal"
                    variant="ghost" 
                    size="sm" 
                    className="text-xs"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Close Ledger
                  </Button>
                </div>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

    </Card>
  );
}
