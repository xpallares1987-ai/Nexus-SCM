import { ShipmentTrackingMap } from './ShipmentTrackingMap';
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/data-display/card';
import { Button } from '@/components/ui/forms/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/data-display/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/overlays/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/forms/select';
import { Input } from '@/components/ui/forms/input';
import { Label } from '@/components/ui/forms/label';
import { Badge } from '@/components/ui/data-display/badge';
import { Checkbox } from '@/components/ui/forms/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs';
import {  Ship, Plus, Activity, MapPin, Calendar, FileText, List, Kanban, Search, SortAsc, SortDesc, FileCheck , ChevronDown, ChevronRight, Leaf } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import { ShipmentTracking } from './ShipmentTracking';
import { ShipmentTimeline } from './ShipmentTimeline';
import { InsuranceBourseWidget } from './InsuranceBourseWidget';
import { CarbonLedgerWidget } from './CarbonLedgerWidget';

import { DocumentManager } from '../documents/DocumentManager';
import { ShipmentGanttChart } from './ShipmentGanttChart';
import { DocumentScanner } from '../documents/DocumentScanner';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Skeleton } from '@/components/ui/feedback/skeleton';
import { CostEstimator } from '../documents/CostEstimator';
import { ComplianceAuditTool } from '../admin/ComplianceAuditTool';
import { UNLocodeSelector } from '../shared/UNLocodeSelector';
import { Calculator, Filter, X, TrendingUp, Clock, Package, DollarSign, ChevronLeft, ChevronsLeft, ChevronsRight, Sparkles } from 'lucide-react';




const LiveTrackingMap = ({ shipment }: { shipment: any }) => {
  const [position, setPosition] = React.useState({ lat: 40, lng: -40 }); // Mock mid-Atlantic
  const [isTracking, setIsTracking] = React.useState(true);

  React.useEffect(() => {
    // Generate a deterministically random start based on shipment id
    const seed = shipment.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    setPosition({
      lat: 20 + (seed % 40) - 20,
      lng: -60 + (seed % 100) - 50
    });
  }, [shipment.id]);

  React.useEffect(() => {
    if (!isTracking) return;
    const interval = setInterval(() => {
      setPosition(prev => ({
        lat: prev.lat + (Math.random() - 0.5) * 0.5,
        lng: prev.lng + (Math.random() - 0.2) * 0.5, 
      }));
    }, 2000);
return () => clearInterval(interval);
  }, [isTracking]);

  React.useEffect(() => {
    if (shipment.status === 'Delivered' || shipment.status === 'Draft' || shipment.status === 'Booked') {
      setIsTracking(false);
    } else {
      setIsTracking(true);
    }
  }, [shipment.status]);

  return (
    <div className="relative w-full h-48 bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden border mt-4">
      <div 
        className="absolute inset-0 opacity-40 dark:opacity-20"
        style={{
          backgroundImage: 'url("https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      {/* Route Line Mock */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
        <path d={`M 20 100 Q ${50 + position.lng * 2} ${50 - position.lat * 2} ${80 + position.lng * 3} 40`} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-primary" />
      </svg>
      
      <div 
        className="absolute transition-all duration-1000 ease-linear flex flex-col items-center z-10"
        style={{ 
          top: `${Math.max(10, Math.min(90, 50 - position.lat))}%`, 
          left: `${Math.max(10, Math.min(90, 50 + position.lng))}%` 
        }}
      >
        <div className="relative">
          {isTracking && <div className="absolute -inset-2 bg-blue-500/40 rounded-full animate-ping" />}
          <div className={`relative w-3.5 h-3.5 ${isTracking ? 'bg-blue-600' : 'bg-muted-foreground'} rounded-full border-2 border-white dark:border-zinc-900 shadow-md`} />
        </div>
        <div className="mt-1.5 bg-background/95 backdrop-blur-sm text-[10px] font-medium px-2 py-0.5 rounded shadow-sm whitespace-nowrap border flex items-center gap-1">
          <MapPin className="w-3 h-3 text-muted-foreground" />
          {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
        </div>
      </div>
      <div className="absolute top-2 right-2 flex items-center gap-2 z-20">
        <Badge variant={isTracking ? 'default' : 'secondary'} className={isTracking ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' : ''}>
          {isTracking ? <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live GPS</span> : 'Last Known Location'}
        </Badge>
      </div>
    </div>
  );
};

const calculateProgress = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'booked': return 10;
    case 'pending': return 15;
    case 'gate in': return 25;
    case 'loaded': return 40;
    case 'departed': return 50;
    case 'in transit': return 60;
    case 'arrived': return 80;
    case 'customs cleared': return 90;
    case 'out for delivery': return 95;
    case 'delivered': return 100;
    case 'cancelled': return 0;
    case 'delayed': return 50;
    default: return 0;
  }
};

const getStatusBadgeStyle = (status: string) => {
  const s = (status || '').toLowerCase().replace(/[\s-_]/g, '');
  switch (s) {
    case 'delivered':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50';
    case 'intransit':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50';
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50';
    case 'draft':
      return 'bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-950/30 dark:text-zinc-400 dark:border-zinc-900/50';
    case 'booked':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50';
    case 'gatein':
    case 'loaded':
    case 'departed':
      return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-900/50';
    case 'arrived':
      return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/50';
    case 'customscleared':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50';
    case 'outfordelivery':
      return 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/30 dark:text-pink-400 dark:border-pink-900/50';
    case 'cancelled':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50';
    case 'delayed':
      return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/30 dark:text-slate-400 dark:border-slate-900/50';
  }
};

const StepProgressTracker = ({ status }: { status: string }) => {
  const steps = [
    { label: 'Booked', activeStates: ['booked', 'pending'] },
    { label: 'Loaded', activeStates: ['gate in', 'loaded', 'departed'] },
    { label: 'In Transit', activeStates: ['in transit', 'delayed'] },
    { label: 'Arrived', activeStates: ['arrived', 'customs cleared', 'out for delivery'] },
    { label: 'Delivered', activeStates: ['delivered'] }
  ];

  let currentStepIndex = 0;
  const s = (status || '').toLowerCase();
  
  if (s === 'delivered') currentStepIndex = 4;
  else if (['arrived', 'customs cleared', 'out for delivery'].includes(s)) currentStepIndex = 3;
  else if (['in transit', 'delayed'].includes(s)) currentStepIndex = 2;
  else if (['gate in', 'loaded', 'departed'].includes(s)) currentStepIndex = 1;
  else if (['booked', 'pending'].includes(s)) currentStepIndex = 0;
  else currentStepIndex = -1;
  
  const isCancelled = s === 'cancelled';

  return (
    <div className="flex flex-col gap-1.5 w-full max-w-[140px]">
      <div className="flex items-center justify-between relative px-1 h-3">
        <div className="absolute left-1 right-1 top-1/2 -translate-y-1/2 h-0.5 bg-muted rounded-full" />
        
        {!isCancelled && currentStepIndex >= 0 && (
          <div 
            className={`absolute left-1 top-1/2 -translate-y-1/2 h-0.5 rounded-full transition-all duration-500 ${currentStepIndex === 4 ? 'bg-emerald-500' : 'bg-primary'}`} 
            style={{ width: `calc(${currentStepIndex / (steps.length - 1) * 100}% - 2px)` }} 
          />
        )}

        {steps.map((step, i) => {
          const isCompleted = !isCancelled && i <= currentStepIndex;
          const isActive = !isCancelled && i === currentStepIndex;
          const bgClass = currentStepIndex === 4 ? 'bg-emerald-500 border-emerald-500' : 'bg-primary border-primary';
          const ringClass = currentStepIndex === 4 ? 'ring-emerald-500/30' : 'ring-primary/30';
          
          return (
            <div key={step.label} className="relative z-10 group flex items-center justify-center">
              <div 
                className={`w-2 h-2 rounded-full border transition-all duration-300 ${
                  isCompleted ? bgClass : 'bg-background border-muted-foreground/30'
                } ${isActive ? `ring-2 ${ringClass} scale-125` : ''}`} 
              />
              <div className="absolute -bottom-6 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-[10px] font-medium bg-popover text-popover-foreground px-1.5 py-0.5 rounded shadow-sm border pointer-events-none z-20">
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between items-center px-0.5 mt-0.5">
        <span className="text-[10px] font-medium text-muted-foreground">{steps[0].label}</span>
        <span className="text-[10px] font-medium text-muted-foreground">{steps[steps.length - 1].label}</span>
      </div>
    </div>
  );
};

const ShipmentHistoryLog = ({ shipmentId }: { shipmentId: string }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const data = await fetchApi(`/shipments/${shipmentId}/events`, token);
        setEvents(data);
      } catch (err) {
        console.error("Failed to fetch events", err);
      } finally {
        setLoading(false);
      }
    };
    if (token && shipmentId) loadEvents();
  }, [shipmentId, token]);

  if (loading) return <div className="p-8 flex items-center justify-center text-muted-foreground"><Skeleton className="h-20 w-full" /></div>;

  if (!events || events.length === 0) return <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-md">No history available for this shipment.</div>;

  return (
    <div className="space-y-0 p-4 max-h-[400px] overflow-y-auto relative before:absolute before:inset-0 before:ml-[27px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-muted before:to-transparent">
      {events.map((evt, idx) => (
        <div key={evt.id || idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active pb-8 last:pb-0">
          <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-background bg-primary text-primary-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
            <Clock className="w-3 h-3" />
          </div>
          <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] bg-card p-4 rounded-lg border shadow-sm">
            <div className="flex justify-between items-start mb-1 gap-2">
              <p className="text-sm font-semibold">{evt.eventType}</p>
              <span className="text-xs text-muted-foreground whitespace-nowrap bg-muted px-2 py-0.5 rounded-full">
                {new Date(evt.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{evt.description}</p>
            {(evt.oldStatus || evt.newStatus) && (
              <div className="flex items-center gap-2 text-xs">
                {evt.oldStatus && <Badge variant="outline">{evt.oldStatus}</Badge>}
                {evt.oldStatus && evt.newStatus && <span className="text-muted-foreground">&rarr;</span>}
                {evt.newStatus && <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-0">{evt.newStatus}</Badge>}
              </div>
            )}
            {evt.performedBy && <p className="text-xs text-muted-foreground mt-2 border-t pt-2 border-border/50">User: {evt.performedBy}</p>}
          </div>
        </div>
      ))}
    </div>
  );
};

const ShipmentTableRow = React.memo(({ 
  s, 
  isSelected, 
  etaChanged,
  onToggleSelect, 
  onOpenDetails, 
  onOpenEdit, 
  onHandleDelete,
  onGetPartyName
}: any) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <React.Fragment>
      <TableRow className="group hover:bg-muted/40 transition-colors cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <Checkbox 
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(s.id)}
            aria-label={`Select ${s.referenceNumber}`}
          />
        </TableCell>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-6 w-6 mr-1" onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}>
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            {s.referenceNumber}
            {etaChanged && (
              <Badge variant="destructive" className="animate-pulse shadow-sm">ETA Changed</Badge>
            )}
          </div>
        </TableCell>
        <TableCell>{s.type}</TableCell>
        <TableCell>{s.originPort} - {s.destinationPort}</TableCell>
        <TableCell>
          <Badge variant={s.priority === 'High' ? 'destructive' : s.priority === 'Low' ? 'secondary' : 'outline'} className="font-normal">
            {s.priority || 'Normal'}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className={`font-medium border capitalize px-2.5 py-0.5 rounded-full text-xs shadow-none ${getStatusBadgeStyle(s.status)}`}>
            {s.status}
          </Badge>
        </TableCell>
        <TableCell>
          <StepProgressTracker status={s.status} />
        </TableCell>
        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={() => onOpenDetails(s)}>Details</Button>
          <Button variant="ghost" size="sm" onClick={() => onOpenEdit(s)}>Edit</Button>
          <Button variant="ghost" size="sm" onClick={() => onHandleDelete(s.id)} className="text-red-500 hover:text-red-600">Delete</Button>
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow className="bg-muted/20">
          <TableCell colSpan={8} className="p-0">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 animate-in slide-in-from-top-2 duration-200">
              <Tabs defaultValue="overview" className="w-full">
                <div className="flex justify-between items-center mb-4">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="history">History Log</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="overview" className="m-0 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center"><MapPin className="w-4 h-4 mr-2" />Route Details</h4>
                      <p className="text-sm text-muted-foreground"><strong>Origin:</strong> {s.originPort || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground"><strong>Destination:</strong> {s.destinationPort || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground"><strong>ETD:</strong> {s.etd ? new Date(s.etd).toLocaleDateString() : 'N/A'}</p>
                      <p className="text-sm text-muted-foreground"><strong>ETA:</strong> {s.eta ? new Date(s.eta).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center"><FileText className="w-4 h-4 mr-2" />Documentation</h4>
                      <p className="text-sm text-muted-foreground"><strong>MBL:</strong> {s.mbl || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground"><strong>HBL:</strong> {s.hbl || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground"><strong>AWB:</strong> {s.awb || 'N/A'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center"><Activity className="w-4 h-4 mr-2" />Status & Tracking</h4>
                      <p className="text-sm text-muted-foreground"><strong>Current Status:</strong> {s.status}</p>
                      <p className="text-sm text-muted-foreground"><strong>Priority:</strong> {s.priority || 'Normal'}</p>
                      <Button variant="link" className="p-0 h-auto text-sm mt-2" onClick={() => onOpenDetails(s)}>View Full Timeline &rarr;</Button>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center"><List className="w-4 h-4 mr-2" />Parties & Contacts</h4>
                      <p className="text-sm text-muted-foreground"><strong>Shipper:</strong> {s.shipperId ? (typeof onGetPartyName === 'function' ? onGetPartyName(s.shipperId) : 'View Details') : 'N/A'}</p>
                      <p className="text-sm text-muted-foreground"><strong>Consignee:</strong> {s.consigneeId ? (typeof onGetPartyName === 'function' ? onGetPartyName(s.consigneeId) : 'View Details') : 'N/A'}</p>
                      <p className="text-sm text-muted-foreground"><strong>Carrier:</strong> {s.carrierId ? (typeof onGetPartyName === 'function' ? onGetPartyName(s.carrierId) : 'View Details') : 'N/A'}</p>
                    </div>
                  </div>
                  <LiveTrackingMap shipment={s} />
                </TabsContent>
                <TabsContent value="history" className="m-0 bg-background/50 rounded-md border border-border/50">
                  <ShipmentHistoryLog shipmentId={s.id} />
                </TabsContent>
              </Tabs>
            </div>
          </TableCell>
        </TableRow>
      )}
    </React.Fragment>
  );
});
ShipmentTableRow.displayName = 'ShipmentTableRow';

export function ShipmentManagement() {

  const { t } = useTranslation();
  const { token, profile } = useAuth();
  const [shipments, setShipments] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [newStatus, setNewStatus] = useState('');
  const [statusComment, setStatusComment] = useState('');

  const [exceptionDescription, setExceptionDescription] = useState('');
  const [exceptionSeverity, setExceptionSeverity] = useState('warning');
  const [newEta, setNewEta] = useState('');
  const [newEtd, setNewEtd] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingShipment, setEditingShipment] = useState<any>(null);
  const [ata, setAta] = useState('');
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [atd, setAtd] = useState('');


  const handleReportException = async () => {
    if (!selectedShipment || !exceptionDescription) return;
    try {
      await fetchApi(`/shipments/${selectedShipment.id}/exceptions`, token, {
        method: 'POST',
        body: JSON.stringify({ description: exceptionDescription, severity: exceptionSeverity, reportedBy: 'Current User' })
      });
      toast.success('Exception reported successfully');
      setExceptionDescription('');
      const eventsData = await fetchApi(`/shipments/${selectedShipment.id}/events`, token);
      setEvents(eventsData);
    } catch (e: any) {
      toast.error(e.message || 'Failed to report exception');
    }
  };

  const handleUpdateEta = async () => {
    if (!selectedShipment || (!newEta && !newEtd)) return;
    try {
      await fetchApi(`/shipments/${selectedShipment.id}/eta`, token, {
        method: 'PUT',
        body: JSON.stringify({ eta: newEta, etd: newEtd, updatedBy: 'Current User' })
      });
      toast.success('Milestone updated successfully');
      setNewEta('');
      setNewEtd('');
      const eventsData = await fetchApi(`/shipments/${selectedShipment.id}/events`, token);
      setEvents(eventsData);
    } catch (e: any) {
      toast.error(e.message || 'Failed to update milestone');
    }
  };


  // Bulk Actions State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkEta, setBulkEta] = useState('');
  const [bulkComments, setBulkComments] = useState('');
  const [isUpdatingBulk, setIsUpdatingBulk] = useState(false);

  // Overview Date Range State
  const [overviewDateRange, setOverviewDateRange] = useState('30days');
  const [overviewStartDate, setOverviewStartDate] = useState('');
  const [overviewEndDate, setOverviewEndDate] = useState('');

  // Filter State
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterCarrierId, setFilterCarrierId] = useState('All');
  const [filterOrigin, setFilterOrigin] = useState('');
  const [filterDestination, setFilterDestination] = useState('');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  
  // Advanced Search & Sorting State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('createdAt'); // 'createdAt', 'updatedAt', 'eta', 'referenceNumber'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Active Tab State
  const [activeTab, setActiveTab] = useState('list');

  // Search Input Ref
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Reset page when filters, sorting, or search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterPriority, filterDateFrom, filterDateTo, searchQuery, filterCarrierId, filterOrigin, filterDestination, sortBy, sortOrder]);

  // Form State
  const [ref, setRef] = useState('');
  const [type, setType] = useState('Sea-FCL');
  const [shipperId, setShipperId] = useState('');
  const [consigneeId, setConsigneeId] = useState('');
  const [carrierId, setCarrierId] = useState('');
  const getPartyName = useCallback((id: string) => parties.find(p => p.id === id)?.companyName || 'Unknown', [parties]);
  const [status, setStatus] = useState('Draft');
  const [priority, setPriority] = useState('Normal');
  const [origin, setOrigin] = useState('');
  const [dest, setDest] = useState('');
  const [hbl, setHbl] = useState('');
  const [mbl, setMbl] = useState('');
  const [awb, setAwb] = useState('');
  const [eta, setEta] = useState('');
  const [etd, setEtd] = useState('');

  // Auto-save form draft
  useEffect(() => {
    const saved = localStorage.getItem('scm_shipment_draft');
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (draft.ref) setRef(draft.ref);
        if (draft.type) setType(draft.type);
        if (draft.shipperId) setShipperId(draft.shipperId);
        if (draft.consigneeId) setConsigneeId(draft.consigneeId);
        if (draft.carrierId) setCarrierId(draft.carrierId);
        if (draft.status) setStatus(draft.status);
        if (draft.priority) setPriority(draft.priority);
        if (draft.origin) setOrigin(draft.origin);
        if (draft.dest) setDest(draft.dest);
        if (draft.hbl) setHbl(draft.hbl);
        if (draft.mbl) setMbl(draft.mbl);
        if (draft.awb) setAwb(draft.awb);
        if (draft.eta) setEta(draft.eta);
        if (draft.etd) setEtd(draft.etd);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (!editingShipment) {
      const draft = { ref, type, shipperId, consigneeId, carrierId, status, priority, origin, dest, hbl, mbl, awb, eta, etd };
      if (ref || origin || dest || shipperId || consigneeId) {
        localStorage.setItem('scm_shipment_draft', JSON.stringify(draft));
      }
    }
  }, [ref, type, shipperId, consigneeId, carrierId, status, priority, origin, dest, hbl, mbl, awb, eta, etd, editingShipment]);

    const [etaUpdates, setEtaUpdates] = useState<Record<string, { newEta: string, timestamp: Date }>>({});

  useEffect(() => {
    const handleWsMessageDOM = (e: any) => {
      try {
        const data = e.detail;
        const payload = data.payload;
        
        if (data.type === 'ETA_DELAY_ALERT') {
           const shipRef = payload.shipmentReference;
           if (shipRef) {
              setEtaUpdates(prev => ({ ...prev, [shipRef]: { newEta: 'Delayed', timestamp: new Date() } }));
              toast.warning(`Delay Alert for ${shipRef}: ${payload.description}`);
           }
        } else if (data.type === 'MILESTONE_REACHED') {
           const shipRef = payload.shipmentReference;
           if (shipRef && payload.eta) {
              setEtaUpdates(prev => ({ ...prev, [shipRef]: { newEta: payload.eta, timestamp: new Date() } }));
           }
        } else if (data.type === 'SHIPMENT_UPDATED') {
           const updatedShip = payload.shipment || payload;
           if (updatedShip && updatedShip.id) {
              setShipments(prev => prev.map(s => s.id === updatedShip.id ? { ...s, ...updatedShip } : s));
           }
        } else if (data.type === 'SHIPMENT_CREATED') {
           const newShip = payload.shipment || payload;
           if (newShip && newShip.id) {
              setShipments(prev => {
                const exists = prev.some(s => s.id === newShip.id);
                if (exists) return prev;
                return [newShip, ...prev];
              });
           }
        } else if (data.type === 'SHIPMENT_DELETED') {
           const deletedId = payload.id || payload;
           if (deletedId) {
              setShipments(prev => prev.filter(s => s.id !== deletedId));
           }
        }
      } catch (err) {
        console.error("WebSocket message parsing error", err);
      }
    };
    
    document.addEventListener('ws-message', handleWsMessageDOM);
    return () => {
      document.removeEventListener('ws-message', handleWsMessageDOM);
    };
  }, []);

  useEffect(() => {
    loadData();
  }, [token]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchVal = params.get('search');
    if (searchVal) {
      setSearchQuery(decodeURIComponent(searchVal));
    }
    if (params.get('action') === 'create-shipment') {
      setIsOpen(true);
    }
    if (searchVal || params.get('action') === 'create-shipment') {
      // Clean up search param without full reload
      const search = window.location.search
        .replace(/[?&]action=create-shipment/, '')
        .replace(/[?&]search=[^&]+/, '')
        .replace(/^&/, '?')
        .replace(/^\?&/, '?');
      const newUrl = window.location.pathname + (search === '?' || search === '' ? '' : search);
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const [shipData, partyData] = await Promise.all([
        fetchApi('/shipments', token),
        fetchApi('/parties', token)
      ]);
      setShipments(shipData);
      setParties(partyData);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchInsights = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingInsights(true);
      const data = await fetchApi('/shipments/insights', token);
      if (data && data.insights) {
        setAiInsights(data.insights);
      }
    } catch (err) {
      console.error("Failed to fetch AI insights");
    } finally {
      setLoadingInsights(false);
    }
  }, [token]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  
  const openEdit = useCallback((shipment: any) => {
    setEditingShipment(shipment);
    setRef(shipment.referenceNumber);
    setType(shipment.type);
    setStatus(shipment.status);
    setPriority(shipment.priority || 'Normal');
    setOrigin(shipment.originPort || '');
    setDest(shipment.destinationPort || '');
    setShipperId(shipment.shipperId || '');
    setConsigneeId(shipment.consigneeId || '');
    setCarrierId(shipment.carrierId || '');
    setHbl(shipment.hbl || '');
    setMbl(shipment.mbl || '');
    setAwb(shipment.awb || '');
    setEta(shipment.eta ? new Date(shipment.eta).toISOString().split('T')[0] : '');
    setEtd(shipment.etd ? new Date(shipment.etd).toISOString().split('T')[0] : '');
    setAta(shipment.ata ? new Date(shipment.ata).toISOString().split('T')[0] : '');
    setAtd(shipment.atd ? new Date(shipment.atd).toISOString().split('T')[0] : '');
    setIsEditOpen(true);
  }, []);

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingShipment) return;
    try {
      await fetchApi(`/shipments/${editingShipment.id}`, token, {
        method: 'PUT',
        body: JSON.stringify({
          referenceNumber: ref,
          type,
          status,
          priority,
          originPort: origin,
          destinationPort: dest,
          shipperId,
          consigneeId,
          carrierId,
          hbl,
          mbl,
          awb,
          eta: eta || null,
          etd: etd || null,
          ata: ata || null,
          atd: atd || null,
          baseUpdatedAt: editingShipment.updatedAt,
        })
      });
      toast.success('Shipment updated successfully');
      setIsEditOpen(false);
      loadData();
    } catch (error) {
      toast.error('Failed to update shipment');
    }
  };

  const handleDelete = useCallback(async (id: string) => {
    if (!token || !window.confirm('Are you sure you want to delete this shipment?')) return;
    try {
      await fetchApi(`/shipments/${id}`, token, { method: 'DELETE' });
      toast.success('Shipment deleted successfully');
      setIsDetailsOpen(false);
      loadData();
    } catch (error) {
      toast.error('Failed to delete shipment');
    }
  }, [token, loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/shipments', token, {
        method: 'POST',
        body: JSON.stringify({
          referenceNumber: ref,
          type,
          status,
          priority,
          originPort: origin,
          destinationPort: dest,
          shipperId,
          consigneeId,
          carrierId,
          hbl,
          mbl,
          awb,
          eta: eta || null,
          etd: etd || null
        })
      });
      setIsOpen(false);
      toast.success('Shipment created successfully');
      localStorage.removeItem('scm_shipment_draft');
      loadData();
      // Reset form
      setRef(''); setOrigin(''); setDest(''); setShipperId(''); setConsigneeId(''); setCarrierId(''); setHbl(''); setMbl(''); setAwb(''); setEta(''); setEtd(''); setPriority('Normal');
    } catch (err) {
      toast.error('Failed to create shipment');
    }
  };

  const handleDocumentDataExtracted = (data: any) => {
    if (data.referenceNumber !== undefined) setRef(data.referenceNumber);
    if (data.type !== undefined) setType(data.type);
    if (data.originPort !== undefined) setOrigin(data.originPort);
    if (data.shipperId !== undefined) setShipperId(data.shipperId);
    if (data.consigneeId !== undefined) setConsigneeId(data.consigneeId);
    if (data.carrierId !== undefined) setCarrierId(data.carrierId);
    if (data.destinationPort !== undefined) setDest(data.destinationPort);
  };

  const openDetails = useCallback(async (shipment: any) => {
    setSelectedShipment(shipment);
    setNewStatus(shipment.status);
    setStatusComment('');
    setIsDetailsOpen(true);
    setEvents([]);
    
    if (!token) return;
    try {
      const data = await fetchApi(`/shipments/${shipment.id}/events`, token);
      setEvents(data);
    } catch (error) {
      toast.error('Failed to load shipment events');
    }
  }, [token]);

  const handleUpdateStatus = async () => {
    if (!token || !selectedShipment) return;
    try {
      await fetchApi(`/shipments/${selectedShipment.id}/status`, token, {
        method: 'PUT',
        body: JSON.stringify({
          status: newStatus,
          comments: statusComment
        })
      });
      toast.success('Status updated successfully');
      
      // Refresh current shipment and events
      const updatedShipment = { ...selectedShipment, status: newStatus };
      setSelectedShipment(updatedShipment);
      
      const eventsData = await fetchApi(`/shipments/${selectedShipment.id}/events`, token);
      setEvents(eventsData);
      
      setStatusComment('');
      loadData();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredShipments.length && filteredShipments.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredShipments.map((s: any) => s.id));
    }
  };

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const handleBulkUpdate = async () => {
    if (!token) return;
    if (!bulkStatus && !bulkEta) {
      toast.error('Please select a status or estimated arrival date to update');
      return;
    }
    setIsUpdatingBulk(true);
    try {
      const response = await fetchApi('/shipments/bulk-update', token, {
        method: 'PUT',
        body: JSON.stringify({
          ids: selectedIds,
          status: bulkStatus || undefined,
          eta: bulkEta || undefined,
          comments: bulkComments || 'Batch shipment update'
        })
      });

      const { successes, failures, results } = response;

      if (failures === 0) {
        toast.success(`Successfully updated ${successes} shipments`);
      } else if (successes === 0) {
        const errMessages = results 
          ? results.filter((r: any) => !r.success).map((r: any) => `${r.error || 'Validation failed'}`).slice(0, 3).join(', ') 
          : '';
        toast.error(`Failed to update shipments: ${errMessages || 'Invalid transition'}`);
      } else {
        const errMessages = results 
          ? results.filter((r: any) => !r.success).map((r: any) => `${r.error || 'Validation failed'}`).slice(0, 2).join(', ') 
          : '';
        toast.warning(`Updated ${successes} shipments, but ${failures} failed. Errors: ${errMessages || 'BPMN rule violation'}`);
      }

      setSelectedIds([]);
      setBulkStatus('');
      setBulkEta('');
      setBulkComments('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred during bulk update');
    } finally {
      setIsUpdatingBulk(false);
    }
  };

  const filteredShipments = useMemo(() => {
    return shipments.filter((s: any) => {
      let match = true;
      if (filterPriority !== 'All' && s.priority !== filterPriority) match = false;
      if (filterCarrierId !== 'All' && s.carrierId !== filterCarrierId) match = false;
      if (filterOrigin && !(s.originPort || '').toLowerCase().includes(filterOrigin.toLowerCase())) match = false;
      if (filterDestination && !(s.destinationPort || '').toLowerCase().includes(filterDestination.toLowerCase())) match = false;
      
      if (filterDateFrom || filterDateTo) {
        const sDate = s.eta ? new Date(s.eta) : null;
        if (sDate) {
          if (filterDateFrom && sDate < new Date(filterDateFrom)) match = false;
          if (filterDateTo && sDate > new Date(filterDateTo + 'T23:59:59')) match = false;
        } else {
          match = false; // No ETA means it won't match a date filter
        }
      }
      
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const ref = (s.referenceNumber || '').toLowerCase();
        const tracking = (s.trackingNumber || '').toLowerCase();
        const destPort = (s.destinationPort || '').toLowerCase();
        const status = (s.status || '').toLowerCase();
        const shipper = getPartyName(s.shipperId).toLowerCase();
        const consignee = getPartyName(s.consigneeId).toLowerCase();
        const carrier = getPartyName(s.carrierId).toLowerCase();
        if (
          !ref.includes(q) && 
          !tracking.includes(q) && 
          !destPort.includes(q) && 
          !status.includes(q) && 
          !shipper.includes(q) && 
          !consignee.includes(q) && 
          !carrier.includes(q)
        ) {
          match = false;
        }
      }
      
      return match;
    }).sort((a: any, b: any) => {
       let valA, valB;
       if (sortBy === 'createdAt') {
          valA = new Date(a.createdAt || 0).getTime();
          valB = new Date(b.createdAt || 0).getTime();
       } else if (sortBy === 'updatedAt') {
          valA = new Date(a.updatedAt || 0).getTime();
          valB = new Date(b.updatedAt || 0).getTime();
       } else if (sortBy === 'eta') {
          valA = a.eta ? new Date(a.eta).getTime() : 0;
          valB = b.eta ? new Date(b.eta).getTime() : 0;
       } else if (sortBy === 'referenceNumber') {
          valA = a.referenceNumber;
          valB = b.referenceNumber;
       }
       
       if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
       if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
       return 0;
    });
  }, [shipments, filterPriority, filterDateFrom, filterDateTo, searchQuery, getPartyName, sortBy, sortOrder]);

  const totalShipments = filteredShipments.length;
  const totalPages = useMemo(() => Math.ceil(totalShipments / pageSize) || 1, [totalShipments, pageSize]);
  const activePage = useMemo(() => Math.min(currentPage, totalPages), [currentPage, totalPages]);

  const paginatedShipments = useMemo(() => {
    const startIndex = (activePage - 1) * pageSize;
    return filteredShipments.slice(startIndex, startIndex + pageSize);
  }, [filteredShipments, activePage, pageSize]);

  
  const statusDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};
    filteredShipments.forEach((s: any) => {
      distribution[s.status || 'Unknown'] = (distribution[s.status || 'Unknown'] || 0) + 1;
    });
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  }, [filteredShipments]);

  const statusColors: Record<string, string> = {
    Draft: '#94a3b8',
    Booked: '#60a5fa',
    InTransit: '#3b82f6',
    Arrived: '#f59e0b',
    CustomsCleared: '#8b5cf6',
    Delivered: '#10b981',
    Delayed: '#ef4444',
    Unknown: '#cbd5e1'
  };

  // Keyboard Shortcuts Hook
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Search shortcut (Ctrl+F or Cmd+F)
      const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
      const isSearchShortcut = (e.ctrlKey || (isMac && e.metaKey)) && e.key.toLowerCase() === 'f';
      
      if (isSearchShortcut) {
        e.preventDefault();
        setActiveTab('list'); // Switch to List tab where search is visible
        setTimeout(() => {
          if (searchInputRef.current) {
            searchInputRef.current.focus();
            searchInputRef.current.select();
            toast.info('Search input focused (Ctrl+F)', { duration: 1500 });
          }
        }, 100);
        return;
      }

      // Check if user is typing in any input, textarea, select or editable element
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.getAttribute('contenteditable') === 'true' ||
        activeEl.tagName === 'SELECT'
      );

      if (isTyping) return;

      // 2. Pagination Navigation
      // We only want pagination shortcuts to run if we are on the 'list' tab
      if (activeTab !== 'list') return;

      if (e.key === 'ArrowLeft' || e.key === '[') {
        e.preventDefault();
        setCurrentPage((p) => {
          const prev = Math.max(1, p - 1);
          if (prev !== p) {
            toast.info(`Navigated to page ${prev}`, { duration: 1000 });
          }
          return prev;
        });
      } else if (e.key === 'ArrowRight' || e.key === ']') {
        e.preventDefault();
        setCurrentPage((p) => {
          const next = Math.min(totalPages, p + 1);
          if (next !== p) {
            toast.info(`Navigated to page ${next}`, { duration: 1000 });
          }
          return next;
        });
      } else if (e.key === 'Home' || e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setCurrentPage((p) => {
          if (p !== 1) {
            toast.info('Navigated to first page', { duration: 1000 });
          }
          return 1;
        });
      } else if (e.key === 'End' || e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setCurrentPage((p) => {
          if (p !== totalPages) {
            toast.info('Navigated to last page', { duration: 1000 });
          }
          return totalPages;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [totalPages, activeTab]);

  const overviewShipments = useMemo(() => {
    return shipments.filter(s => {
      if (!s.createdAt && !s.eta) return true;
      const dateToUse = new Date(s.createdAt || s.eta);
      const now = new Date();
      
      if (overviewDateRange === 'custom') {
        if (overviewStartDate && dateToUse < new Date(overviewStartDate)) return false;
        if (overviewEndDate && dateToUse > new Date(overviewEndDate + 'T23:59:59')) return false;
        return true;
      }
      
      const days = overviewDateRange === '7days' ? 7 : overviewDateRange === '30days' ? 30 : 90;
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      return dateToUse >= cutoff;
    });
  }, [shipments, overviewDateRange, overviewStartDate, overviewEndDate]);

  const activeShipmentsCount = overviewShipments.filter(s => !['Delivered', 'Cancelled', 'Draft'].includes(s.status)).length;
  const delayedShipmentsCount = overviewShipments.filter(s => s.status === 'Delayed').length;
  const averageDelayTime = delayedShipmentsCount > 0 ? (delayedShipmentsCount * 1.5).toFixed(1) + ' days' : '0 days';
  const totalTransitValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(activeShipmentsCount * 12500);
  
  const trendDays = overviewDateRange === '7days' ? 7 : overviewDateRange === '30days' ? 30 : overviewDateRange === '90days' ? 90 : 15;
  const activeTrendData = useMemo(() => {
    return Array.from({ length: trendDays }).map((_, i) => ({
      name: `Day ${i + 1}`,
      value: Math.max(1, activeShipmentsCount + Math.floor(Math.sin(i / 2) * 4) + (i % 3))
    }));
  }, [activeShipmentsCount, trendDays]);

  const delayTrendData = useMemo(() => {
    return Array.from({ length: trendDays }).map((_, i) => ({
      name: `Day ${i + 1}`,
      value: Math.max(0, delayedShipmentsCount + Math.floor(Math.cos(i / 3) * 2))
    }));
  }, [delayedShipmentsCount, trendDays]);

  const valueTrendData = useMemo(() => {
    return Array.from({ length: trendDays }).map((_, i) => ({
      name: `Day ${i + 1}`,
      value: (activeShipmentsCount * 12500) + Math.floor(Math.sin(i / 4) * 20000)
    }));
  }, [activeShipmentsCount, trendDays]);

  return (

    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t('shipments')}</h2>
          <p className="text-muted-foreground text-sm">Manage FCL/LCL, Air and Road operations</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Global Search Bar in Header */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="global-shipment-search-header"
              placeholder="Search tracking no. or destination..."
              className="pl-9 h-10 bg-background"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                type="button"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger render={
              <Button className="h-10"><Plus className="w-4 h-4 mr-2" /> {t('add')} Shipment</Button>
            } />
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight">Create New Shipment</DialogTitle>
            </DialogHeader>
            
            <div className="mb-6">
              <DocumentScanner 
                onDataExtracted={handleDocumentDataExtracted} 
                parties={parties}
                activeFormValues={{
                  referenceNumber: ref,
                  type,
                  originPort: origin,
                  destinationPort: dest,
                  shipperId,
                  consigneeId,
                  carrierId
                }}
              />
            </div>
            
            <form onSubmit={handleCreate} className="space-y-6">
              {/* Section 1: General Info */}
              <div className="bg-card dark:bg-card/40 border rounded-xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center gap-2 border-b pb-2 mb-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">1</span>
                  <h4 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">General Info & Cargo</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Reference No.</Label>
                    <Input value={ref} onChange={e => setRef(e.target.value)} required placeholder="FFW-2026-101" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Transport Mode & Type</Label>
                    <select 
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:bg-background/20"
                      value={type} 
                      onChange={e => setType(e.target.value)}
                    >
                      <option value="Sea-FCL">Sea-FCL</option>
                      <option value="Sea-FCL 20' DV">Sea-FCL 20' DV</option>
                      <option value="Sea-FCL 40' DV">Sea-FCL 40' DV</option>
                      <option value="Sea-FCL 40' HC">Sea-FCL 40' HC</option>
                      <option value="Sea-LCL">Sea-LCL</option>
                      <option value="Air">Air</option>
                      <option value="Road">Road</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Priority</Label>
                    <select 
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:bg-background/20"
                      value={priority} 
                      onChange={e => setPriority(e.target.value)}
                    >
                      <option value="Low">Low</option>
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Status</Label>
                    <select 
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:bg-background/20"
                      value={status} 
                      onChange={e => setStatus(e.target.value)}
                    >
                      <option value="Draft">Draft</option>
                      <option value="Booked">Booked</option>
                      <option value="InTransit">InTransit</option>
                      <option value="Arrived">Arrived</option>
                      <option value="CustomsCleared">CustomsCleared</option>
                      <option value="Delivered">Delivered</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Route Ports */}
              <div className="bg-card dark:bg-card/40 border rounded-xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center gap-2 border-b pb-2 mb-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">2</span>
                  <h4 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Route & Key Ports</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Origin Port (UN/LOCODE)</Label>
                    <UNLocodeSelector value={origin} onChange={setOrigin} placeholder="e.g., CNSHA (Shanghai)" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Destination Port (UN/LOCODE)</Label>
                    <UNLocodeSelector value={dest} onChange={setDest} placeholder="e.g., ESBCN (Barcelona)" />
                  </div>
                </div>
              </div>

              {/* Section 3: Commercial Parties */}
              <div className="bg-card dark:bg-card/40 border rounded-xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center gap-2 border-b pb-2 mb-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">3</span>
                  <h4 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Commercial Parties</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Shipper</Label>
                    <select 
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:bg-background/20"
                      value={shipperId} 
                      onChange={e => setShipperId(e.target.value)}
                    >
                      <option value="">Select Shipper...</option>
                      {parties.filter(p => {
                        const typeVal = (p.category || p.type || '').toLowerCase();
                        return typeVal === 'client' || typeVal === 'shipper' || typeVal === 'supplier';
                      }).map(p => (
                        <option key={p.id} value={p.id}>{p.companyName || p.name || p.id}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Consignee</Label>
                    <select 
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:bg-background/20"
                      value={consigneeId} 
                      onChange={e => setConsigneeId(e.target.value)}
                    >
                      <option value="">Select Consignee...</option>
                      {parties.filter(p => {
                        const typeVal = (p.category || p.type || '').toLowerCase();
                        return typeVal === 'client' || typeVal === 'consignee' || typeVal === 'supplier';
                      }).map(p => (
                        <option key={p.id} value={p.id}>{p.companyName || p.name || p.id}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Carrier / Shipping Line</Label>
                    <select 
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:bg-background/20"
                      value={carrierId} 
                      onChange={e => setCarrierId(e.target.value)}
                    >
                      <option value="">Select Carrier...</option>
                      {parties.filter(p => {
                        const typeVal = (p.category || p.type || '').toLowerCase();
                        return typeVal === 'carrier' || typeVal === 'shipping line' || typeVal === 'agent';
                      }).map(p => (
                        <option key={p.id} value={p.id}>{p.companyName || p.name || p.id}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Section 4: Shipping Documents */}
              <div className="bg-card dark:bg-card/40 border rounded-xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center gap-2 border-b pb-2 mb-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">4</span>
                  <h4 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Shipping Documents</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block font-mono">House Bill of Lading (HBL)</Label>
                    <Input value={hbl} onChange={e => setHbl(e.target.value)} placeholder="e.g., HBLSH10293" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block font-mono">Master Bill of Lading (MBL)</Label>
                    <Input value={mbl} onChange={e => setMbl(e.target.value)} placeholder="e.g., MBLMAEU83749" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block font-mono">Air Waybill (AWB)</Label>
                    <Input value={awb} onChange={e => setAwb(e.target.value)} placeholder="e.g., AWB012-39485" />
                  </div>
                </div>
              </div>

              {/* Section 5: Milestones */}
              <div className="bg-card dark:bg-card/40 border rounded-xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center gap-2 border-b pb-2 mb-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">5</span>
                  <h4 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Milestones & Timelines</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">ETD (Estimated Departure)</Label>
                    <Input type="datetime-local" value={etd} onChange={e => setEtd(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">ETA (Estimated Arrival)</Label>
                    <Input type="datetime-local" value={eta} onChange={e => setEta(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="w-1/4">Cancel</Button>
                <Button type="submit" className="w-3/4">{t('save')} Shipment</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight">Edit Shipment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEdit} className="space-y-6">
              {/* Section 1: General Info */}
              <div className="bg-card dark:bg-card/40 border rounded-xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center gap-2 border-b pb-2 mb-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">1</span>
                  <h4 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">General Info & Cargo</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Reference No.</Label>
                    <Input value={ref} onChange={e => setRef(e.target.value)} required />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Transport Mode & Type</Label>
                    <select 
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:bg-background/20"
                      value={type} 
                      onChange={e => setType(e.target.value)}
                    >
                      <option value="Sea-FCL">Sea-FCL</option>
                      <option value="Sea-FCL 20' DV">Sea-FCL 20' DV</option>
                      <option value="Sea-FCL 40' DV">Sea-FCL 40' DV</option>
                      <option value="Sea-FCL 40' HC">Sea-FCL 40' HC</option>
                      <option value="Sea-LCL">Sea-LCL</option>
                      <option value="Air">Air</option>
                      <option value="Road">Road</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Priority</Label>
                    <select 
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:bg-background/20"
                      value={priority} 
                      onChange={e => setPriority(e.target.value)}
                    >
                      <option value="Low">Low</option>
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Status</Label>
                    <select 
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:bg-background/20"
                      value={status} 
                      onChange={e => setStatus(e.target.value)}
                    >
                      <option value="Draft">Draft</option>
                      <option value="Booked">Booked</option>
                      <option value="InTransit">InTransit</option>
                      <option value="Arrived">Arrived</option>
                      <option value="CustomsCleared">CustomsCleared</option>
                      <option value="Delivered">Delivered</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Route Ports */}
              <div className="bg-card dark:bg-card/40 border rounded-xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center gap-2 border-b pb-2 mb-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">2</span>
                  <h4 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Route & Key Ports</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Origin Port (UN/LOCODE)</Label>
                    <UNLocodeSelector value={origin} onChange={setOrigin} placeholder="e.g., CNSHA (Shanghai)" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Destination Port (UN/LOCODE)</Label>
                    <UNLocodeSelector value={dest} onChange={setDest} placeholder="e.g., ESBCN (Barcelona)" />
                  </div>
                </div>
              </div>

              {/* Section 3: Commercial Parties */}
              <div className="bg-card dark:bg-card/40 border rounded-xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center gap-2 border-b pb-2 mb-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">3</span>
                  <h4 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Commercial Parties</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Shipper</Label>
                    <select 
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:bg-background/20"
                      value={shipperId} 
                      onChange={e => setShipperId(e.target.value)}
                    >
                      <option value="">Select Shipper...</option>
                      {parties.filter(p => {
                        const typeVal = (p.category || p.type || '').toLowerCase();
                        return typeVal === 'client' || typeVal === 'shipper' || typeVal === 'supplier';
                      }).map(p => (
                        <option key={p.id} value={p.id}>{p.companyName || p.name || p.id}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Consignee</Label>
                    <select 
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:bg-background/20"
                      value={consigneeId} 
                      onChange={e => setConsigneeId(e.target.value)}
                    >
                      <option value="">Select Consignee...</option>
                      {parties.filter(p => {
                        const typeVal = (p.category || p.type || '').toLowerCase();
                        return typeVal === 'client' || typeVal === 'consignee' || typeVal === 'supplier';
                      }).map(p => (
                        <option key={p.id} value={p.id}>{p.companyName || p.name || p.id}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Carrier / Shipping Line</Label>
                    <select 
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:bg-background/20"
                      value={carrierId} 
                      onChange={e => setCarrierId(e.target.value)}
                    >
                      <option value="">Select Carrier...</option>
                      {parties.filter(p => {
                        const typeVal = (p.category || p.type || '').toLowerCase();
                        return typeVal === 'carrier' || typeVal === 'shipping line' || typeVal === 'agent';
                      }).map(p => (
                        <option key={p.id} value={p.id}>{p.companyName || p.name || p.id}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 4: Shipping Documents */}
              <div className="bg-card dark:bg-card/40 border rounded-xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center gap-2 border-b pb-2 mb-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">4</span>
                  <h4 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Shipping Documents</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block font-mono">House Bill of Lading (HBL)</Label>
                    <Input value={hbl} onChange={e => setHbl(e.target.value)} placeholder="e.g., HBLSH10293" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block font-mono">Master Bill of Lading (MBL)</Label>
                    <Input value={mbl} onChange={e => setMbl(e.target.value)} placeholder="e.g., MBLMAEU83749" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block font-mono">Air Waybill (AWB)</Label>
                    <Input value={awb} onChange={e => setAwb(e.target.value)} placeholder="e.g., AWB012-39485" />
                  </div>
                </div>
              </div>

              {/* Section 5: Milestones & Dates */}
              <div className="bg-card dark:bg-card/40 border rounded-xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center gap-2 border-b pb-2 mb-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">5</span>
                  <h4 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Milestones & Timelines</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">ETD (Estimated Departure)</Label>
                    <Input type="date" value={etd} onChange={e => setEtd(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">ETA (Estimated Arrival)</Label>
                    <Input type="date" value={eta} onChange={e => setEta(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">ATD (Actual Departure)</Label>
                    <Input type="date" value={atd} onChange={e => setAtd(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">ATA (Actual Arrival)</Label>
                    <Input type="date" value={ata} onChange={e => setAta(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="w-1/4">Cancel</Button>
                <Button type="submit" className="w-3/4">Save Changes</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
      
      {/* AI Insights Panel */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border-blue-100 dark:border-blue-800/30">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="flex items-center justify-center p-3 rounded-full bg-blue-100/50 dark:bg-blue-800/50">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
              AI Insights
              {loadingInsights && <span className="text-xs font-normal text-blue-600/70 dark:text-blue-400/70 animate-pulse">Analyzing active shipments...</span>}
            </h3>
            <div className="text-sm text-blue-800/80 dark:text-blue-200/80 leading-relaxed">
              {loadingInsights ? (
                <div className="space-y-2 mt-2">
                  <Skeleton className="h-4 w-full bg-blue-200/50 dark:bg-blue-800/20" />
                  <Skeleton className="h-4 w-[90%] bg-blue-200/50 dark:bg-blue-800/20" />
                </div>
              ) : aiInsights ? (
                <p>{aiInsights}</p>
              ) : (
                <p>No insights currently available.</p>
              )}
            </div>
          </div>
          {aiInsights && !loadingInsights && (
            <Button variant="outline" size="sm" onClick={() => fetchInsights()} className="shrink-0 bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 border-blue-200 dark:border-blue-800/50">
              Refresh
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Shipment Overview Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-3 rounded-lg border shadow-sm">
        <div>
          <h3 className="font-semibold">Performance Overview</h3>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select 
            className="flex h-9 items-center justify-between whitespace-nowrap rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            value={overviewDateRange}
            onChange={(e) => setOverviewDateRange(e.target.value)}
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="custom">Custom Range</option>
          </select>
          {overviewDateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <Input type="date" className="h-9 w-[140px]" value={overviewStartDate} onChange={(e) => setOverviewStartDate(e.target.value)} />
              <span className="text-muted-foreground">-</span>
              <Input type="date" className="h-9 w-[140px]" value={overviewEndDate} onChange={(e) => setOverviewEndDate(e.target.value)} />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Shipments</p>
                <h3 className="text-2xl font-bold mt-1">{activeShipmentsCount}</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="h-[40px] w-full mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activeTrendData}>
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-emerald-500 mr-1" />
              <span className="text-emerald-500 font-medium">+12%</span>
              {overviewDateRange !== "custom" && <span className="text-muted-foreground ml-1">last {overviewDateRange.replace("days", "")} days</span>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Delay</p>
                <h3 className="text-2xl font-bold mt-1">{averageDelayTime}</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="h-[40px] w-full mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={delayTrendData}>
                  <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center text-sm">
              {delayedShipmentsCount > 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-red-500 mr-1" />
                  <span className="text-red-500 font-medium">{delayedShipmentsCount} delayed</span>
                </>
              ) : (
                <span className="text-emerald-500 font-medium">On time performance</span>
              )}
              {overviewDateRange !== "custom" && <span className="text-muted-foreground ml-1">last {overviewDateRange.replace("days", "")} days</span>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Transit Value</p>
                <h3 className="text-2xl font-bold mt-1">{totalTransitValue}</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="h-[40px] w-full mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={valueTrendData}>
                  <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-emerald-500 mr-1" />
              <span className="text-emerald-500 font-medium">+5%</span>
              {overviewDateRange !== "custom" && <span className="text-muted-foreground ml-1">last {overviewDateRange.replace("days", "")} days</span>}
            </div>
          </CardContent>
        </Card>
      </div>

      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="col-span-1 border-border shadow-sm">
          <CardContent className="p-4 h-[240px] flex flex-col">
            <h3 className="text-sm font-medium text-muted-foreground mb-1 text-center">Status Distribution</h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={statusColors[entry.name] || '#8884d8'} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="col-span-1 lg:col-span-3 flex flex-col gap-4 bg-background p-4 rounded-lg border border-border shadow-sm">
        <div className="flex flex-wrap gap-4 items-end w-full">
          <div className="flex-1 min-w-[200px] space-y-1.5">
            <div className="flex justify-between items-center">
              <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Advanced Search</Label>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border">
                <kbd className="font-sans font-semibold">Ctrl</kbd> + <kbd className="font-sans font-semibold">F</kbd>
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search by ID, Shipper, Carrier, Status..."
                className="pl-9 pr-12 bg-card w-full"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <div className="absolute right-2.5 top-2 flex items-center pointer-events-none select-none">
                <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  <span>⌘</span>F
                </kbd>
              </div>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Sort By</Label>
            <div className="flex items-center gap-2">
              <select 
                className="flex h-9 w-[160px] items-center justify-between whitespace-nowrap rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                <option value="createdAt">Creation Date</option>
                <option value="updatedAt">Last Updated</option>
                <option value="eta">ETA</option>
                <option value="referenceNumber">Reference Number</option>
              </select>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-9 w-9 bg-card" 
                onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5">
            <Button 
              variant="outline" 
              className="h-9 gap-2 bg-card"
              onClick={() => setIsFilterPanelOpen(true)}
            >
              <Filter className="w-4 h-4" />
              Filters
              {(filterPriority !== 'All' || filterDateFrom || filterDateTo || filterCarrierId !== 'All' || filterOrigin || filterDestination) && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {[filterPriority !== 'All', filterDateFrom, filterDateTo, filterCarrierId !== 'All', filterOrigin, filterDestination].filter(Boolean).length}
                </span>
              )}
            </Button>
          </div>
          <div className="flex-1" />
          {(filterPriority !== 'All' || filterDateFrom || filterDateTo || searchQuery || filterCarrierId !== 'All' || filterOrigin || filterDestination) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterPriority('All'); setFilterDateFrom(''); setFilterDateTo(''); setSearchQuery(''); setFilterCarrierId('All'); setFilterOrigin(''); setFilterDestination(''); }}>
              Clear Filters
            </Button>
          )}
        </div>
        
        {/* Slide-out Filter Panel */}
        <div className={`fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm transition-opacity duration-300 ${isFilterPanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsFilterPanelOpen(false)}>
          <div 
            className={`fixed inset-y-0 right-0 z-[101] w-full sm:w-96 border-l bg-background p-6 shadow-lg transition-transform duration-300 ease-in-out ${isFilterPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Filter className="w-5 h-5" /> Advanced Filters</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsFilterPanelOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-120px)] pb-20">
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Priority</Label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={filterPriority}
                  onChange={e => setFilterPriority(e.target.value)}
                >
                  <option value="All" className="bg-background">All Priorities</option>
                  <option value="High" className="bg-background">High</option>
                  <option value="Normal" className="bg-background">Normal</option>
                  <option value="Low" className="bg-background">Low</option>
                </select>
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Carrier</Label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={filterCarrierId}
                  onChange={e => setFilterCarrierId(e.target.value)}
                >
                  <option value="All" className="bg-background">All Carriers</option>
                  {parties.filter(p => p.type === 'Carrier' || p.category === 'Carrier').map(c => (
                    <option key={c.id} value={c.id} className="bg-background">{c.companyName}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Date Range (ETA)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">From</Label>
                    <Input 
                      type="date" 
                      className="h-10 bg-transparent" 
                      value={filterDateFrom}
                      onChange={e => setFilterDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">To</Label>
                    <Input 
                      type="date" 
                      className="h-10 bg-transparent" 
                      value={filterDateTo}
                      onChange={e => setFilterDateTo(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Origin & Destination</Label>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Origin Port / Country</Label>
                    <Input 
                      placeholder="e.g. Shanghai"
                      className="h-10 bg-transparent" 
                      value={filterOrigin}
                      onChange={e => setFilterOrigin(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Destination Port / Country</Label>
                    <Input 
                      placeholder="e.g. Los Angeles"
                      className="h-10 bg-transparent" 
                      value={filterDestination}
                      onChange={e => setFilterDestination(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
            </div>
            
            <div className="absolute bottom-0 left-0 w-full p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => { setFilterPriority('All'); setFilterDateFrom(''); setFilterDateTo(''); setFilterCarrierId('All'); setFilterOrigin(''); setFilterDestination(''); }}
              >
                Reset
              </Button>
              <Button 
                className="flex-1"
                onClick={() => setIsFilterPanelOpen(false)}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

      {profile?.role !== 'Ejecutivo' && selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-4xl px-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <Card className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border shadow-2xl rounded-xl overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold animate-pulse shadow-sm">
                      {selectedIds.length}
                    </span>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        Bulk Update Shipments
                      </h3>
                      <p className="text-xs text-muted-foreground">Select a new status or ETA for {selectedIds.length} items.</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs self-start sm:self-auto h-8"
                    onClick={() => setSelectedIds([])}
                  >
                    Cancel Selection
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Status
                    </Label>
                    <select 
                      className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                      value={bulkStatus}
                      onChange={e => setBulkStatus(e.target.value)}
                    >
                      <option value="" className="bg-background text-muted-foreground">Keep current status</option>
                      <option value="Draft" className="bg-background">Draft</option>
                      <option value="Booked" className="bg-background">Booked</option>
                      <option value="Pending" className="bg-background">Pending</option>
                      <option value="Gate In" className="bg-background">Gate In</option>
                      <option value="Loaded" className="bg-background">Loaded</option>
                      <option value="Departed" className="bg-background">Departed</option>
                      <option value="In Transit" className="bg-background">In Transit</option>
                      <option value="Arrived" className="bg-background">Arrived</option>
                      <option value="Customs Cleared" className="bg-background">Customs Cleared</option>
                      <option value="Out for Delivery" className="bg-background">Out for Delivery</option>
                      <option value="Delivered" className="bg-background">Delivered</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Estimated Arrival
                    </Label>
                    <Input 
                      type="date"
                      className="h-9 bg-transparent"
                      value={bulkEta}
                      onChange={e => setBulkEta(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Comments
                    </Label>
                    <Input 
                      placeholder="e.g. Delay..."
                      className="h-9 bg-transparent"
                      value={bulkComments}
                      onChange={e => setBulkComments(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setBulkStatus('');
                        setBulkEta('');
                        setBulkComments('');
                      }}
                      className="h-9 w-full flex-1"
                    >
                      Clear
                    </Button>
                    <Button 
                      onClick={handleBulkUpdate} 
                      disabled={(!bulkStatus && !bulkEta) || isUpdatingBulk}
                      size="sm"
                      className="h-9 w-full flex-1 whitespace-nowrap"
                    >
                      {isUpdatingBulk ? 'Updating...' : 'Apply Updates'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              List View
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Kanban className="w-4 h-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="estimator" className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Cost Estimator
            </TabsTrigger>
            <TabsTrigger value="insurance" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
              Spot Insurance Bourse
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Map View
            </TabsTrigger>
            <TabsTrigger value="compliance" className="flex items-center gap-2">
              <FileCheck className="w-4 h-4" />
              Compliance Audit
            </TabsTrigger>
            <TabsTrigger value="carbon" className="flex items-center gap-2">
              <Leaf className="w-4 h-4 text-emerald-500 animate-pulse" />
              Route Carbon Ledger
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list" className="m-0">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox 
                        checked={filteredShipments.length > 0 && selectedIds.length === filteredShipments.length}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Origin - Dest</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="w-4 h-4 rounded" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-[80px] rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-2 w-24 rounded-full" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredShipments.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No shipments match your filters.</TableCell></TableRow>
                  ) : paginatedShipments.map((s: any) => (
                    <ShipmentTableRow 
                      key={s.id} 
                      s={s} 
                      isSelected={selectedIds.includes(s.id)} 
                      etaChanged={!!etaUpdates[s.referenceNumber]}
                      onToggleSelect={toggleSelect} 
                      onOpenDetails={openDetails} 
                      onOpenEdit={openEdit} 
                      onHandleDelete={handleDelete}
                      onGetPartyName={getPartyName}
                    />
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-zinc-100 dark:border-zinc-800 bg-card/30 text-sm">
                <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                  <span>
                    Showing{' '}
                    <span className="font-semibold text-foreground">
                      {totalShipments === 0 ? 0 : (activePage - 1) * pageSize + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-semibold text-foreground">
                      {Math.min(activePage * pageSize, totalShipments)}
                    </span>{' '}
                    of{' '}
                    <span className="font-semibold text-foreground">{totalShipments}</span>{' '}
                    shipments
                  </span>

                  <div className="flex items-center gap-2">
                    <span>Rows per page:</span>
                    <select
                      id="pagination-page-size-select"
                      className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                    >
                      {[5, 10, 25, 50, 100].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="hidden lg:inline-flex items-center gap-1 text-[11px] text-muted-foreground mr-3 select-none">
                    Shortcuts: <kbd className="font-sans border bg-muted px-1 rounded">←</kbd> / <kbd className="font-sans border bg-muted px-1 rounded">[</kbd> Prev, <kbd className="font-sans border bg-muted px-1 rounded">→</kbd> / <kbd className="font-sans border bg-muted px-1 rounded">]</kbd> Next, <kbd className="font-sans border bg-muted px-1.5 rounded text-[10px]">Home</kbd> First, <kbd className="font-sans border bg-muted px-1.5 rounded text-[10px]">End</kbd> Last
                  </span>
                  <Button
                    id="pagination-first-page-btn"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(1)}
                    disabled={activePage === 1}
                    title="First Page"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    id="pagination-prev-page-btn"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={activePage === 1}
                    title="Previous Page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                      let pageNumber = idx + 1;
                      if (totalPages > 5) {
                        if (activePage > 3) {
                          if (activePage + 2 <= totalPages) {
                            pageNumber = activePage - 3 + idx + 1;
                          } else {
                            pageNumber = totalPages - 5 + idx + 1;
                          }
                        }
                      }
                      
                      const isCurrent = pageNumber === activePage;
                      return (
                        <Button
                          key={pageNumber}
                          variant={isCurrent ? 'default' : 'outline'}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setCurrentPage(pageNumber)}
                        >
                          {pageNumber}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    id="pagination-next-page-btn"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={activePage === totalPages}
                    title="Next Page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    id="pagination-last-page-btn"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={activePage === totalPages}
                    title="Last Page"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="map" className="m-0">
          <ShipmentTrackingMap />
        </TabsContent>
        <TabsContent value="timeline" className="m-0">
          <ShipmentGanttChart shipments={filteredShipments} />
        </TabsContent>
        <TabsContent value="estimator" className="m-0">
          <CostEstimator />
        </TabsContent>
        <TabsContent value="insurance" className="m-0">
          <InsuranceBourseWidget />
        </TabsContent>
        <TabsContent value="compliance" className="m-0">
          <ComplianceAuditTool />
        </TabsContent>
        <TabsContent value="carbon" className="m-0">
          <CarbonLedgerWidget />
        </TabsContent>
      </Tabs>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center pr-6">
              <span>Shipment Details</span>
              <Badge variant="outline">{selectedShipment?.referenceNumber}</Badge>
              <Button variant="ghost" size="sm" onClick={() => { setIsDetailsOpen(false); openEdit(selectedShipment); }}>Edit</Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(selectedShipment.id)} className="text-red-500 hover:text-red-600">Delete</Button>
            </DialogTitle>
            <DialogDescription>
              View shipment information and track activity history.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2">
            {selectedShipment && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <p className="flex items-center text-muted-foreground"><Ship className="w-4 h-4 mr-2" /> Mode: <span className="ml-1 text-foreground">{selectedShipment.type}</span></p>
                    <p className="flex items-center text-muted-foreground"><MapPin className="w-4 h-4 mr-2" /> Route: <span className="ml-1 text-foreground">{selectedShipment.originPort} &rarr; {selectedShipment.destinationPort}</span></p>
                    {selectedShipment.shipperId && <p className="flex items-center text-muted-foreground mt-2"><span className="font-semibold text-muted-foreground w-24">Shipper:</span> <span className="ml-1 text-foreground">{getPartyName(selectedShipment.shipperId)}</span></p>}
                    {selectedShipment.consigneeId && <p className="flex items-center text-muted-foreground"><span className="font-semibold text-muted-foreground w-24">Consignee:</span> <span className="ml-1 text-foreground">{getPartyName(selectedShipment.consigneeId)}</span></p>}
                    {selectedShipment.carrierId && <p className="flex items-center text-muted-foreground"><span className="font-semibold text-muted-foreground w-24">Carrier:</span> <span className="ml-1 text-foreground">{getPartyName(selectedShipment.carrierId)}</span></p>}
                  </div>
                  <div className="space-y-2">
                    <p className="flex items-center text-muted-foreground"><FileText className="w-4 h-4 mr-2" /> Documents: <span className="ml-1 text-foreground">{selectedShipment.hbl || selectedShipment.mbl || selectedShipment.awb || 'None'}</span></p>
                    <p className="flex items-center text-muted-foreground"><Calendar className="w-4 h-4 mr-2" /> ETA: <span className="ml-1 text-foreground">{selectedShipment.eta ? new Date(selectedShipment.eta).toLocaleDateString() : 'TBD'}</span></p>
                  </div>
                </div>

                <ShipmentTracking shipment={selectedShipment} events={events} />

                <div className="border rounded-md p-4 bg-background/50">
                  <h4 className="text-sm font-medium mb-3">Update Status</h4>
                  <div className="flex gap-3">
                    <div className="w-1/3">
                      <select 
                        className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
                        value={newStatus}
                        onChange={e => setNewStatus(e.target.value)}
                      >
                        <option value="Draft">Draft</option>
                        <option value="Booked">Booked</option>
                        <option value="InTransit">InTransit</option>
                        <option value="Arrived">Arrived</option>
                        <option value="CustomsCleared">CustomsCleared</option>
                        <option value="Delivered">Delivered</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <Input 
                        placeholder="Add a comment (optional)..." 
                        value={statusComment}
                        onChange={e => setStatusComment(e.target.value)}
                        className="bg-card"
                      />
                    </div>
                    <Button onClick={handleUpdateStatus} disabled={newStatus === selectedShipment.status && !statusComment}>
                      Update
                    </Button>
                  </div>
                </div>

                
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-md p-4 bg-background/50">
                    <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-3">Report Exception</h4>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <select 
                          className="h-9 rounded-md border border-input bg-card px-3 text-sm shadow-sm"
                          value={exceptionSeverity}
                          onChange={e => setExceptionSeverity(e.target.value)}
                        >
                          <option value="info">Info</option>
                          <option value="warning">Warning</option>
                          <option value="critical">Critical</option>
                        </select>
                        <Input 
                          placeholder="Describe exception..." 
                          value={exceptionDescription}
                          onChange={e => setExceptionDescription(e.target.value)}
                          className="bg-card flex-1"
                        />
                      </div>
                      <Button variant="destructive" size="sm" className="w-full" onClick={handleReportException} disabled={!exceptionDescription}>
                        Report Exception
                      </Button>
                    </div>
                  </div>

                  <div className="border rounded-md p-4 bg-background/50">
                    <h4 className="text-sm font-medium mb-3">Update Milestones</h4>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Input 
                          type="datetime-local" 
                          placeholder="New ETA" 
                          value={newEta}
                          onChange={e => setNewEta(e.target.value)}
                          className="bg-card"
                          title="ETA"
                        />
                        <Input 
                          type="datetime-local" 
                          placeholder="New ETD" 
                          value={newEtd}
                          onChange={e => setNewEtd(e.target.value)}
                          className="bg-card"
                          title="ETD"
                        />
                      </div>
                      <Button variant="secondary" size="sm" className="w-full" onClick={handleUpdateEta} disabled={!newEta && !newEtd}>
                        Update ETA/ETD
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="h-[400px]">
                  <DocumentManager shipmentId={selectedShipment.id} />
                </div>

                <ShipmentTimeline shipment={selectedShipment} events={events} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
