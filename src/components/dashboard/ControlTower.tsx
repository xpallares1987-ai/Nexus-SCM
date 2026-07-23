import React, { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { Button } from '@/components/ui/forms/button';
import { Label } from '@/components/ui/forms/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/forms/select';
import { Plus, FileText, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/forms/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/data-display/table';
import { Activity, AlertTriangle, CheckCircle2, Package, Ship, Search, Bell, Clock, AlertCircle, Sparkles, GripHorizontal, TrendingUp, X, RefreshCw, CloudLightning, Map as MapIcon, BrainCircuit, ShieldAlert, Scale, Smartphone, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, Legend, ComposedChart, PieChart, Pie, Cell } from 'recharts';
import { Badge } from '@/components/ui/data-display/badge';
import { ShipmentTrackingMap } from '../shipments/ShipmentTrackingMap';
import { SummaryDashboard } from './SummaryDashboard';
import { RiskAnalyticsTab } from './RiskAnalyticsTab';
import { SmartCarrierMatcher } from './SmartCarrierMatcher';
import { PerformanceTrendsWidget } from './PerformanceTrendsWidget';
import { DemurrageDetentionAlarm } from './DemurrageDetentionAlarm';
import { ZkpSlaAudit } from './ZkpSlaAudit';
import { BiometricPodApplet } from './BiometricPodApplet';
import { DashboardKPIs } from './DashboardKPIs';
import { Skeleton } from '@/components/ui/feedback/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/overlays/dialog';
import { MilestoneTimeline } from '../shipments/MilestoneTimeline';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ShipmentDataGridWidget } from './ShipmentDataGridWidget';
import { MLEtaPredictionWidget } from './MLEtaPredictionWidget';
import { PortCongestionWidget } from './PortCongestionWidget';
import { CongestionAlertsWidget } from './CongestionAlertsWidget';
import { VesselTelemetryWidget } from './VesselTelemetryWidget';
import { RouteOptimizationWidget } from './RouteOptimizationWidget';
import { GeopoliticalRiskWidget } from './GeopoliticalRiskWidget';
import { FleetUtilizationWidget } from './FleetUtilizationWidget';
import { SystemStatusWidget } from './SystemStatusWidget';
import { TrackingSimulatorWidget } from './TrackingSimulatorWidget';
import { OperationsOverviewWidget } from './OperationsOverviewWidget';
import { ActivityFeedWidget } from './ActivityFeedWidget';
import { KPICardsWidget } from './KPICardsWidget';
import { KPIOverviewWidget } from './KPIOverviewWidget';
import { OnTimeDeliveryTrendWidget } from './OnTimeDeliveryTrendWidget';
import { GlobalShipmentMapWidget } from './GlobalShipmentMapWidget';
import { ActiveShipmentsTableWidget } from './ActiveShipmentsTableWidget';
import { ManifestSummaryWidget } from './ManifestSummaryWidget';


function SortableWidget({ 
  id, 
  children, 
  className,
  isCustomizing,
  currentWidth,
  onWidthChange,
  onHide
}: { 
  id: string, 
  children: React.ReactNode, 
  className?: string,
  isCustomizing?: boolean,
  currentWidth?: string,
  onWidthChange?: (width: string) => void,
  onHide?: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`relative group transition-all duration-300 ${
        isCustomizing 
          ? 'border-2 border-dashed border-primary/30 rounded-2xl p-2 bg-primary/5 dark:bg-primary/5' 
          : ''
      } ${className || ''}`}
    >
      {isCustomizing ? (
        <div className="flex items-center justify-between gap-2 p-2 mb-2 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div 
            {...attributes} 
            {...listeners} 
            className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded-md transition-colors"
          >
            <GripHorizontal className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary select-none">Grip to Drag</span>
          </div>
          <div className="flex items-center gap-2">
            <select 
              value={currentWidth || 'col-span-6'} 
              onChange={(e) => onWidthChange?.(e.target.value)}
              className="text-[10px] bg-background border border-border rounded-lg px-2 py-1 font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
            >
              <option value="col-span-4">1/3 Width</option>
              <option value="col-span-6">1/2 Width</option>
              <option value="col-span-8">2/3 Width</option>
              <option value="col-span-12">Full Width</option>
            </select>
            <button 
              onClick={onHide} 
              className="text-[10px] bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-900/30 rounded-lg px-2 py-1 font-bold cursor-pointer transition-colors"
            >
              Hide
            </button>
          </div>
        </div>
      ) : (
        <div 
          {...attributes} 
          {...listeners} 
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing z-10 p-1 bg-card/80 dark:bg-zinc-900/80 rounded-md transition-opacity"
          title="Drag widget to rearrange"
        >
          <GripHorizontal className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      {children}
    </div>
  );
}

const PORT_COORDINATES: Record<string, [number, number]> = {
  'CNSHA': [121.4737, 31.2304],
  'ESBCN': [2.1734, 41.3851],
  'USLAX': [-118.2437, 34.0522],
  'NLRTM': [4.4792, 51.9225],
  'JPTYO': [139.6917, 35.6895],
  'SGSIN': [103.8198, 1.3521],
  'GBFEL': [1.3503, 51.9612],
  'DEHAM': [9.9937, 53.5511],
  'INBOM': [72.8777, 19.0760],
  'ZADUR': [31.0218, -29.8587],
  'BRSSZ': [-46.3312, -23.9608],
  'AUMEL': [144.9631, -37.8136],
  'USNYC': [-74.0060, 40.7128],
  'Aedxb': [55.2708, 25.2048]
};

function calculateDistance(coord1: [number, number], coord2: [number, number]) {
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;
    return Math.sqrt(Math.pow(lon2 - lon1, 2) + Math.pow(lat2 - lat1, 2));
}

function checkGPSDelayRisk(shipment: any): { isDelayed: boolean, distanceRemaining: number, requiredSpeed: number } | null {
    if (!shipment.etd || !shipment.eta || shipment.status === 'Delivered') return null;
    const origin = PORT_COORDINATES[shipment.originPort];
    const dest = PORT_COORDINATES[shipment.destinationPort];
    if (!origin || !dest) return null;

    const now = new Date();
    const etd = new Date(shipment.etd);
    const eta = new Date(shipment.eta);
    if (now < etd || now > eta) return null;

    const totalDuration = eta.getTime() - etd.getTime();
    const elapsed = now.getTime() - etd.getTime();
    const expectedProgress = elapsed / totalDuration;

    // Simulate real GPS progress with a pseudo-random seed based on shipment ID
    // Some shipments will be naturally slower (e.g. 80% of expected speed)
    const seed = shipment.id.charCodeAt(0) + shipment.id.charCodeAt(shipment.id.length - 1);
    const speedFactor = 0.75 + ((seed % 100) / 100) * 0.4; // 0.75 to 1.15
    
    let actualProgress = expectedProgress * speedFactor;
    actualProgress = Math.min(1, Math.max(0, actualProgress));

    const totalDistance = calculateDistance(origin, dest);
    const distanceRemaining = totalDistance * (1 - actualProgress);
    
    // Check if required speed to arrive on time is > 20% higher than average speed
    const remainingTime = eta.getTime() - now.getTime();
    if (remainingTime <= 0) return null;

    const requiredPacing = distanceRemaining / remainingTime;
    const originalPacing = totalDistance / totalDuration;

    if (requiredPacing > originalPacing * 1.2) {
        return { isDelayed: true, distanceRemaining, requiredSpeed: requiredPacing };
    }
    return null;
}

const getWidgetGridClasses = (id: string, customWidths?: Record<string, string>): string => {
  if (customWidths && customWidths[id]) {
    return customWidths[id];
  }
  switch (id) {
    case 'tracking-map':
    case 'global-shipment-map':
    case 'tracking-simulator':
      return 'col-span-1 md:col-span-2 lg:col-span-12';
    case 'recent-shipments':
      return 'col-span-1 md:col-span-2 lg:col-span-8';
    case 'activity-log':
      return 'col-span-1 md:col-span-1 lg:col-span-4';
    case 'volume-trends':
    case 'operations-overview':
    case 'kpi-summary':
    case 'kpi-overview':
    case 'active-shipments-table':
      return 'col-span-1 md:col-span-2 lg:col-span-12';
    case 'performance-metrics':
    case 'on-time-delivery-trend':
    case 'status-chart':
    case 'predictive-risks':
    case 'geopolitical-risks':
    case 'ml-eta-predictions':
    case 'vessel-telemetry':
    case 'congestion-alerts':
    case 'port-congestion':
    case 'route-optimization':
    case 'fleet-utilization':
    case 'notifications':
    case 'ai-anomalies':
    case 'shipment-data-grid':
    case 'system-status':
    case 'manifest-summary-generator':
      return 'col-span-1 md:col-span-2 lg:col-span-12';
    default:
      return 'col-span-1 md:col-span-1 lg:col-span-6';
  }
};

const WIDGET_METADATA: Record<string, { title: string, desc: string }> = {
  'manifest-summary-generator': { title: 'AI Manifest Summary Generator', desc: 'Gemini-powered shipment manifest summarization tool producing concise status bulletins' },
  'operations-overview': { title: 'Operations Overview', desc: 'Real-time volume and warehouse activity trend' },
  'volume-trends': { title: 'Shipment Volumes', desc: 'Area chart showing daily processed volumes' },
  'kpi-summary': { title: 'KPI Summary Cards', desc: 'High-level performance metrics' },
  'kpi-overview': { title: 'KPI Overview', desc: 'Real-time indicators using Recharts' },
  'active-shipments-table': { title: 'Active Shipments Ledger', desc: 'Real-time table of active shipments with predictive risk indicators' },
  'performance-metrics': { title: 'Performance Metrics', desc: 'Bar chart showing delivery status by transport mode' },
  'on-time-delivery-trend': { title: 'On-Time Delivery Trend', desc: 'Line chart of 30-day delivery performance' },
  'performance-trends': { title: 'D3 Carrier Reliability & Accuracy Correlation', desc: 'Interactive D3 multi-axis scatter correlation with regression analysis' },
  'status-chart': { title: 'Shipments by Status', desc: 'Status frequency distribution bar chart' },
  'tracking-map': { title: 'Live Tracking Map', desc: 'Active shipments geocoordinates plotting' },
  'tracking-simulator': { title: 'Real-Time Telemetry & Alert Simulator', desc: 'Live event dispatcher and milestone telemetry simulator' },
  'predictive-risks': { title: 'Weather & Route Delay Prediction', desc: 'Simulated route analysis via Gemini AI' },
  'geopolitical-risks': { title: 'Predictive Port Strikes & Geopolitical Risk Analyzer', desc: 'AI-driven monitoring of labor strikes, storm advisories, and bypass routing' },
  'ml-eta-predictions': { title: 'ML ETA Predictions', desc: 'Dynamic ETA estimations comparison matrix' },
  'port-congestion': { title: 'Predictive Port Congestion Intelligence', desc: 'Live simulated berthing wait times and alternative routing' },
  'vessel-telemetry': { title: 'Satellite AIS Vessel Telemetry & ETA Drift Alarm', desc: 'Real-time satellite tracking and drift calculations' },
  'congestion-alerts': { title: 'Predictive Port Congestion Trends & Alerts', desc: 'D3 line chart correlating historical dwell times and incoming vessel schedules' },
  'route-optimization': { title: 'Route Optimization', desc: 'Dynamic port-to-port path finding tool' },
  'notifications': { title: 'Live Feed Notifications', desc: 'Push alert feeds via Server-Sent Events' },
  'recent-shipments': { title: 'Recent Shipments List', desc: 'Data table of five latest shipments' },
  'activity-log': { title: 'Activity Feed', desc: 'Latest updates and actions in reverse chronological order' },
  'ai-anomalies': { title: 'AI Anomaly Analysis', desc: 'Automated high-risk outlier detection' },
  'shipment-data-grid': { title: 'Shipment Data Grid', desc: 'Detailed tracking list with filtering' },
  'system-status': { title: 'Logistics Gateway Status', desc: 'Real-time API uptime & response benchmarks' }
};

export function ControlTower() {
  const { t } = useTranslation();
  const { token, profile } = useAuth();
  const [allShipments, setAllShipments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [alerts, setAlerts] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [aiAnomalies, setAiAnomalies] = useState<any[]>([]);
  const [isAnalyzingAnomalies, setIsAnalyzingAnomalies] = useState(false);
  const [predictiveRisks, setPredictiveRisks] = useState<any[]>([]);
  const [simulationHazard, setSimulationHazard] = useState<string>('none');

  // Real-time notification feed states
  const [alertFilter, setAlertFilter] = useState<'all' | 'delay' | 'customs'>('all');
  const [alertSearch, setAlertSearch] = useState('');
  const [transportModeFilter, setTransportModeFilter] = useState<'All' | 'Air' | 'Sea' | 'Road'>('All');
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);

  // Live Refresh and Polling states
  const [isLiveRefresh, setIsLiveRefresh] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(22);
      doc.text("Control Tower KPI Summary", 14, 22);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
      
      const totalShipments = allShipments.length;
      const activeShipments = allShipments.filter(s => s.status !== 'Delivered' && s.status !== 'Draft').length;
      const delayedShipments = allShipments.filter(s => s.status === 'Delayed').length;
      const deliveredShipments = allShipments.filter(s => s.status === 'Delivered').length;

      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text("Key Performance Indicators", 14, 45);
      
      autoTable(doc, {
        startY: 50,
        head: [['Metric', 'Value']],
        body: [
          ['Total Shipments', totalShipments.toString()],
          ['Active Shipments', activeShipments.toString()],
          ['Average Lead Time (Estimated)', '14.5 days'],
          ['Total Cost (MTD)', '$284,500.00'],
          ['Delayed Shipments', delayedShipments.toString()],
          ['Delivered Shipments', deliveredShipments.toString()],
        ],
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42] }
      });
      
      const finalY = (doc as any).lastAutoTable.finalY || 50;
      doc.text("Active Shipments", 14, finalY + 15);
      
      const activeData = allShipments
        .filter(s => s.status !== 'Delivered' && s.status !== 'Draft')
        .slice(0, 20)
        .map(s => [
          s.referenceNumber || 'N/A',
          s.type || 'N/A',
          s.originPort || 'N/A',
          s.destinationPort || 'N/A',
          s.status || 'N/A',
          s.eta ? new Date(s.eta).toLocaleDateString() : 'N/A'
        ]);
      
      autoTable(doc, {
        startY: finalY + 20,
        head: [['Reference', 'Mode', 'Origin', 'Destination', 'Status', 'ETA']],
        body: activeData.length > 0 ? activeData : [['No active shipments found', '', '', '', '', '']],
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] }
      });
      
      doc.save(`KPI_Summary_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("PDF Report generated successfully!");
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error("Failed to generate PDF report");
    }
  };

  
  const [isPredictingRisks, setIsPredictingRisks] = useState(false);
  const [volumeTrends, setVolumeTrends] = useState<any[]>([]);
  const [isAnalyzingVolume, setIsAnalyzingVolume] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [quickActionType, setQuickActionType] = useState<'booking' | 'shipment'>('booking');
  const [isSubmittingQuickAction, setIsSubmittingQuickAction] = useState(false);
  
  const handleQuickSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;
    
    setIsSubmittingQuickAction(true);
    const formData = new FormData(e.currentTarget);
    
    const payload = {
      referenceNumber: formData.get('reference'),
      type: formData.get('type'),
      status: quickActionType === 'booking' ? 'Draft' : 'In Transit',
      originPort: formData.get('origin'),
      destinationPort: formData.get('destination'),
      priority: 'Normal'
    };

    try {
      const res = await fetch('/api/shipments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        toast.success(quickActionType === 'booking' ? 'Booking created successfully' : 'Shipment created successfully');
        setIsQuickActionOpen(false);
        // Refresh data
        const shipmentsData = await fetchApi('/shipments', token);
        setAllShipments(shipmentsData);
        localStorage.setItem('cachedShipments', JSON.stringify(shipmentsData));
      } else {
        toast.error('Failed to create record');
      }
    } catch (err) {
      toast.error('An error occurred');
    } finally {
      setIsSubmittingQuickAction(false);
    }
  };


  const [widgetOrder, setWidgetOrder] = useState<string[]>([
    'operations-overview',
    'manifest-summary-generator',
    'volume-trends',
    'kpi-summary',
        'kpi-overview',
    'active-shipments-table',
    'performance-metrics',
    'on-time-delivery-trend',
    'performance-trends',
    'status-chart',
    'tracking-simulator',
    'global-shipment-map',
    'tracking-map',
    'predictive-risks',
    'geopolitical-risks',
    'ml-eta-predictions',
    'vessel-telemetry',
    'congestion-alerts',
    'port-congestion',
    'fleet-utilization',
    'route-optimization',
    'notifications',
    'recent-shipments',
    'activity-log',
    'ai-anomalies',
    'shipment-data-grid',
    'system-status'
  ]);

  const [isCustomizing, setIsCustomizing] = useState(false);
  const [activeDashboardTab, setActiveDashboardTab] = useState<'operations' | 'risk-analytics' | 'carrier-matcher' | 'demurrage' | 'zkp-audit' | 'biometric-pod'>('operations');
  const [widgetWidths, setWidgetWidths] = useState<Record<string, string>>({});
  const [hiddenWidgets, setHiddenWidgets] = useState<string[]>([]);

  const handleToggleVisibility = (id: string) => {
    setHiddenWidgets(prev => {
      const updated = prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id];
      localStorage.setItem('control-tower-hidden-widgets-v3', JSON.stringify(updated));
      return updated;
    });
  };

  const handleWidthChange = (id: string, width: string) => {
    setWidgetWidths(prev => {
      const updated = { ...prev, [id]: width };
      localStorage.setItem('control-tower-widget-widths-v3', JSON.stringify(updated));
      return updated;
    });
  };

  const handleResetLayout = () => {
    localStorage.removeItem('control-tower-widget-order-v3');
    localStorage.removeItem('control-tower-widget-widths-v3');
    localStorage.removeItem('control-tower-hidden-widgets-v3');
    localStorage.removeItem('kpi-order-v2');
    
    if (profile?.role === 'Operador') {
      setWidgetOrder([
        'operations-overview',
        'active-shipments-table',
        'activity-log',
        'notifications',
        'status-chart',
        'volume-trends',
        'fleet-utilization',
        'system-status'
      ]);
    } else if (profile?.role === 'Ejecutivo') {
      setWidgetOrder([
        'operations-overview',
        'global-shipment-map',
        'tracking-map',
        'recent-shipments',
        'notifications',
        'predictive-risks',
        'ml-eta-predictions',
        'route-optimization',
        'ai-anomalies',
        'fleet-utilization',
        'kpi-summary',
        'kpi-overview',
        'active-shipments-table',
        'performance-metrics',
        'on-time-delivery-trend',
        'performance-trends',
        'system-status'
      ]);
    } else {
      setWidgetOrder([
        'volume-trends',
        'kpi-summary',
        'kpi-overview',
        'active-shipments-table',
        'performance-metrics',
        'on-time-delivery-trend',
        'performance-trends',
        'status-chart',
        'global-shipment-map',
        'tracking-map',
        'predictive-risks',
        'ml-eta-predictions',
        'vessel-telemetry',
        'congestion-alerts',
        'route-optimization',
        'notifications',
        'recent-shipments',
        'activity-log',
        'ai-anomalies',
        'system-status'
      ]);
    }
    setWidgetWidths({});
    setHiddenWidgets([]);
    toast.success("Dashboard layout and top KPI cards have been reset to defaults!");
  };

  useEffect(() => {
    // 1. Try loading custom widths & hidden widgets
    const savedWidths = localStorage.getItem('control-tower-widget-widths-v3');
    if (savedWidths) {
      try { setWidgetWidths(JSON.parse(savedWidths)); } catch (e) { console.error(e); }
    }
    const savedHidden = localStorage.getItem('control-tower-hidden-widgets-v3');
    if (savedHidden) {
      try { setHiddenWidgets(JSON.parse(savedHidden)); } catch (e) { console.error(e); }
    }

    // 2. Load custom order or default based on role
    const savedOrder = localStorage.getItem('control-tower-widget-order-v3');
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
          const allPossibles = [
            'operations-overview',
            'volume-trends',
            'kpi-summary',
        'kpi-overview',
            'active-shipments-table',
            'performance-metrics',
            'on-time-delivery-trend',
            'status-chart',
            'global-shipment-map',
            'tracking-map',
            'predictive-risks',
            'geopolitical-risks',
            'ml-eta-predictions',
            'vessel-telemetry',
            'congestion-alerts',
            'fleet-utilization',
            'route-optimization',
            'notifications',
            'recent-shipments',
            'activity-log',
            'ai-anomalies',
            'shipment-data-grid',
            'system-status'
          ];
          const combined = [...parsed];
          allPossibles.forEach(w => {
            if (!combined.includes(w)) {
              combined.push(w);
            }
          });
          setWidgetOrder(combined);
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (profile?.role === 'Operador') {
      setWidgetOrder([
        'activity-log',
        'active-shipments-table',
        'notifications',
        'status-chart',
        'volume-trends',
        'fleet-utilization',
        'system-status'
      ]);
    } else if (profile?.role === 'Ejecutivo') {
      setWidgetOrder([
        'global-shipment-map',
        'tracking-map',
        'recent-shipments',
        'notifications',
        'predictive-risks',
        'ml-eta-predictions',
        'route-optimization',
        'ai-anomalies',
        'fleet-utilization',
        'kpi-summary',
        'kpi-overview',
        'active-shipments-table',
        'performance-metrics',
        'on-time-delivery-trend',
        'system-status'
      ]);
    } else {
      setWidgetOrder([
        'volume-trends',
        'kpi-summary',
        'kpi-overview',
        'active-shipments-table',
        'performance-metrics',
        'on-time-delivery-trend',
        'status-chart',
        'global-shipment-map',
        'tracking-map',
        'predictive-risks',
        'ml-eta-predictions',
        'vessel-telemetry',
        'congestion-alerts',
        'route-optimization',
        'notifications',
        'recent-shipments',
        'activity-log',
        'ai-anomalies',
        'system-status'
      ]);
    }
  }, [profile?.role]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setWidgetOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const updated = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('control-tower-widget-order-v3', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const analyzeAnomalies = async (shipmentsToAnalyze: any[]) => {
    setIsAnalyzingAnomalies(true);
    try {
      const data = await fetchApi('/gemini/analyze-anomalies', token, {
        method: 'POST',
        body: JSON.stringify({ shipments: shipmentsToAnalyze })
      });
      setAiAnomalies(data);
    } catch (err: any) {
      console.error('Failed to fetch anomalies', err);
    } finally {
      setIsAnalyzingAnomalies(false);
    }
  };

  const analyzeVolumeTrends = async (shipmentsToAnalyze: any[]) => {
    setIsAnalyzingVolume(true);
    try {
      const data = await fetchApi('/gemini/volume-trends', token, {
        method: 'POST',
        body: JSON.stringify({ shipments: shipmentsToAnalyze })
      });
      setVolumeTrends(data);
    } catch (err: any) {
      console.error('Failed to analyze volume trends', err);
    } finally {
      setIsAnalyzingVolume(false);
    }
  };

  const predictRisks = async (historicalShipments: any[], activeShipments: any[], logs: any[]) => {
    setIsPredictingRisks(true);
    try {
      const data = await fetchApi('/gemini/predict-risks', token, {
        method: 'POST',
        body: JSON.stringify({ historicalShipments, activeShipments, activityLogs: logs })
      });
      setPredictiveRisks(data);
      
      // Inject AI predictions into Live Feed Notifications
      if (Array.isArray(data)) {
        setAlerts(prev => {
          const newAlerts = [...prev];
          data.forEach(risk => {
            if (risk.riskLevel === 'High' || risk.riskLevel === 'Medium') {
              const alertId = `ai-risk-${risk.shipmentId}`;
              if (!newAlerts.some(a => a.id === alertId)) {
                newAlerts.push({
                  id: alertId,
                  reference: risk.referenceNumber,
                  shipmentId: risk.shipmentId,
                  type: 'delay',
                  severity: risk.riskLevel === 'High' ? 'critical' : 'warning',
                  title: `AI Prediction: ${risk.weatherCondition || risk.routeStatus || 'Potential Delay'}`,
                  message: `Predicted ${risk.estimatedDelayDays} days delay. ${risk.reasoning}`,
                  timestamp: new Date().toISOString()
                });
              }
            }
          });
          // Re-sort alerts by timestamp descending
          return newAlerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch predictive risks', err);
    } finally {
      setIsPredictingRisks(false);
    }
  };

  const loadShipmentsAndLogs = async (isBackground: boolean = false) => {
    if (!token) return;
    
    if (isBackground) {
      setIsRefreshing(true);
    } else {
      const cachedShipments = localStorage.getItem('cachedShipments');
      const cachedLogs = localStorage.getItem('cachedActivityLogs');
      
      if (cachedShipments) {
        setAllShipments(JSON.parse(cachedShipments));
      }
      if (cachedLogs) {
        setActivityLogs(JSON.parse(cachedLogs));
      }
      
      if (!cachedShipments || !cachedLogs) {
        setIsLoading(true);
      }
    }
    
    try {
      const [shipmentsData, logsData, customsData, docsData] = await Promise.all([
        fetchApi('/shipments', token),
        fetchApi('/activity-logs', token),
        fetchApi('/customs-declarations', token),
        fetchApi('/shipment-documents', token).catch(() => [])
      ]);
      
      localStorage.setItem('cachedShipments', JSON.stringify(shipmentsData));
      localStorage.setItem('cachedActivityLogs', JSON.stringify(logsData || []));
      
      setAllShipments(shipmentsData);
      setActivityLogs(logsData || []);
      setLastSyncTime(new Date());
      setIsLoading(false);

      // Trigger AI Anomaly Analysis for active shipments
      const activeShipments = shipmentsData.filter((s: any) => s.status !== 'Delivered').slice(0, 10); // Analyze up to 10 active shipments
      const historicalShipments = shipmentsData.filter((s: any) => s.status === 'Delivered').slice(0, 50); // Use up to 50 historical

      if (!isBackground) {
        if (activeShipments.length > 0) {
          analyzeAnomalies(activeShipments);
          setTimeout(() => predictRisks(historicalShipments, activeShipments, logsData || []), 2000);
        }
        
        if (historicalShipments.length > 0) {
          setTimeout(() => analyzeVolumeTrends(historicalShipments), 4000);
        }
      }

      // Generate alerts based on ETA and Customs status
      const now = new Date();
      const next48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const newAlerts: any[] = [];


      // Historical transit times map
      const historicalTransitTimes = new Map<string, { totalTime: number, count: number }>();
      const deliveredShipments = shipmentsData.filter((s: any) => s.status === 'Delivered');
      
      deliveredShipments.forEach((s: any) => {
        if (!s.originPort || !s.destinationPort) return;
        const key = `${s.originPort}-${s.destinationPort}-${s.type}`;
        
        const start = s.atd ? new Date(s.atd) : (s.etd ? new Date(s.etd) : null);
        const end = s.ata ? new Date(s.ata) : (s.eta ? new Date(s.eta) : null);
        
        if (start && end) {
          const transitTimeMs = end.getTime() - start.getTime();
          if (transitTimeMs > 0) {
            const current = historicalTransitTimes.get(key) || { totalTime: 0, count: 0 };
            historicalTransitTimes.set(key, {
              totalTime: current.totalTime + transitTimeMs,
              count: current.count + 1
            });
          }
        }
      });

      // 1. Process delays for active shipments
      shipmentsData.forEach((s: any) => {
        if (s.status !== 'Delivered') {
          const isInTransit = s.status === 'InTransit' || s.status === 'In Transit' || s.status === 'Delayed';
          
          if (s.status === 'Delayed') {
            newAlerts.push({
              id: `delay-${s.id}`,
              reference: s.referenceNumber,
              shipmentId: s.id,
              type: 'delay',
              severity: 'high',
              title: 'Major Shipment Delay',
              message: `Active shipment ${s.referenceNumber} is officially delayed in transit.`,
              timestamp: s.updatedAt || s.createdAt || new Date().toISOString()
            });
          } else if (s.delayRisk === 'High') {
            newAlerts.push({
              id: `delay-${s.id}`,
              reference: s.referenceNumber,
              shipmentId: s.id,
              type: 'delay',
              severity: 'high',
              title: 'High Delay Risk Warning',
              message: `Shipment ${s.referenceNumber} in-transit has a high probability of delay.`,
              timestamp: s.updatedAt || s.createdAt || new Date().toISOString()
            });
          } else if (s.delayRisk === 'Medium') {
            newAlerts.push({
              id: `delay-${s.id}`,
              reference: s.referenceNumber,
              shipmentId: s.id,
              type: 'delay',
              severity: 'medium',
              title: 'Medium Delay Risk Warning',
              message: `Shipment ${s.referenceNumber} has moderate indicators of potential delay.`,
              timestamp: s.updatedAt || s.createdAt || new Date().toISOString()
            });
          }
          // Check route deviation
          if (s.originPort && s.destinationPort && s.eta && s.etd) {
            const key = `${s.originPort}-${s.destinationPort}-${s.type}`;
            const hist = historicalTransitTimes.get(key);
            if (hist && hist.count > 0) {
              const avgHistoricalMs = hist.totalTime / hist.count;
              const currentEstimateMs = new Date(s.eta).getTime() - new Date(s.etd).getTime();
              
              if (currentEstimateMs > avgHistoricalMs * 1.10) {
                const deviationPercent = Math.round(((currentEstimateMs - avgHistoricalMs) / avgHistoricalMs) * 100);
                newAlerts.push({
                  id: `deviation-${s.id}`,
                  reference: s.referenceNumber,
                  shipmentId: s.id,
                  type: 'delay', // use 'delay' type to show up in the delay tab
                  severity: 'high',
                  title: 'Route Deviation Alert',
                  message: `Active shipment ${s.referenceNumber} transit time deviates by ${deviationPercent}% from the historical benchmark for this route (${s.originPort} to ${s.destinationPort}).`,
                  timestamp: s.updatedAt || s.createdAt || new Date().toISOString()
                });
              }
            }
          }

          if (s.eta) {
            const etaDate = new Date(s.eta);
            if (etaDate < now) {
              newAlerts.push({
                id: `delay-${s.id}`,
                reference: s.referenceNumber,
                shipmentId: s.id,
                type: 'delay',
                severity: 'high',
                title: 'Overdue Shipment',
                message: `Delayed: ${s.referenceNumber} (ETA was ${etaDate.toLocaleDateString()})`,
                timestamp: s.updatedAt || s.createdAt || new Date().toISOString()
              });
            } else if (etaDate <= next48Hours) {
              newAlerts.push({
                id: `approaching-${s.id}`,
                reference: s.referenceNumber,
                shipmentId: s.id,
                type: 'approaching',
                severity: 'info',
                title: 'Approaching Arrival',
                message: `Approaching: ${s.referenceNumber} (ETA is ${etaDate.toLocaleDateString()})`,
                timestamp: s.updatedAt || s.createdAt || new Date().toISOString()
              });
            }
          }
        }
      });

      // 2. Process customs rejections for in-transit shipments
      if (customsData && Array.isArray(customsData)) {
        customsData.forEach((d: any) => {
          if (d.status === 'Action Required') {
            const relatedShipment = shipmentsData.find(s => s.referenceNumber === d.shipmentRef);
            const isInTransit = relatedShipment && 
              (relatedShipment.status === 'InTransit' || relatedShipment.status === 'In Transit' || relatedShipment.status === 'Delayed');
            
            if (isInTransit) {
              newAlerts.push({
                id: `customs-${d.id}`,
                declarationId: d.declarationId,
                reference: d.shipmentRef,
                shipmentId: relatedShipment.id,
                type: 'customs',
                severity: 'critical',
                title: 'Customs Document Rejected',
                message: `Customs declaration ${d.declarationId} was rejected with Action Required status for active shipment ${d.shipmentRef}.`,
                timestamp: d.createdAt || new Date().toISOString()
              });
            }
          }
        });
      }

      
      // 3. Process missing documents for in-transit shipments
      if (docsData && Array.isArray(docsData)) {
        shipmentsData.forEach((s: any) => {
          if (s.status === 'InTransit' || s.status === 'In Transit' || s.status === 'Delayed') {
            const shipmentDocs = docsData.filter(d => d.shipmentId === s.id);
            const hasBillOfLading = shipmentDocs.some(d => d.documentType === 'BillOfLading' || d.documentType === 'Bill of Lading');
            const hasCommercialInvoice = shipmentDocs.some(d => d.documentType === 'CommercialInvoice' || d.documentType === 'Commercial Invoice');
            
            if (!hasBillOfLading) {
              newAlerts.push({
                id: `missing-bol-${s.id}`,
                reference: s.referenceNumber,
                shipmentId: s.id,
                type: 'document',
                severity: 'warning',
                title: 'Missing Bill of Lading',
                message: `Active shipment ${s.referenceNumber} is missing the Bill of Lading document.`,
                timestamp: new Date().toISOString()
              });
            }
            if (!hasCommercialInvoice) {
              newAlerts.push({
                id: `missing-ci-${s.id}`,
                reference: s.referenceNumber,
                shipmentId: s.id,
                type: 'document',
                severity: 'warning',
                title: 'Missing Commercial Invoice',
                message: `Active shipment ${s.referenceNumber} is missing the Commercial Invoice.`,
                timestamp: new Date().toISOString()
              });
            }
          }
        });
      }

      // Sort by timestamp descending
      newAlerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setAlerts(newAlerts);

    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadShipmentsAndLogs();
  }, [token]);

  // Periodic polling when Live Refresh is toggled on
  useEffect(() => {
    if (!isLiveRefresh || !token) return;

    const intervalId = setInterval(() => {
      loadShipmentsAndLogs(true);
    }, 15000); // Poll every 15 seconds

    return () => clearInterval(intervalId);
  }, [isLiveRefresh, token]);

  // Keep a ref to allShipments to prevent stale closures in real-time listeners
  const shipmentsRef = React.useRef(allShipments);
  useEffect(() => {
    shipmentsRef.current = allShipments;
  }, [allShipments]);

  // Real-time Event Listener for instant Control Tower updates
  useEffect(() => {
    // We import eventBus dynamically or use a top-level import
    // Since it's clean code, we use EventBus
    
    // Fallback for DOM Custom Events
    const handleWsMessageDOM = (e: any) => {
      handleWsMessage(e.detail);
    };

    const handleWsMessage = (detail: any) => {
      const { type, payload } = detail;
      
      if (type === 'SHIPMENT_UPDATED') {
        const updatedShip = payload.shipment || payload;
        if (!updatedShip) return;

        // Update main shipments list in state
        setAllShipments(prev => {
          const exists = prev.find(s => s.id === updatedShip.id);
          if (exists) {
            return prev.map(s => s.id === updatedShip.id ? { ...s, ...updatedShip } : s);
          }
          return [...prev, updatedShip];
        });

        // Determine if shipment is in active transit phase
        const isInTransit = updatedShip.status === 'InTransit' || updatedShip.status === 'In Transit' || updatedShip.status === 'Delayed';
        
        if (isInTransit) {
          if (updatedShip.status === 'Delayed' || updatedShip.delayRisk === 'High') {
            setAlerts(prev => {
              const alertId = `delay-${updatedShip.id}`;
              const exists = prev.some(a => a.id === alertId);
              if (exists) return prev;

              const newAlert = {
                id: alertId,
                reference: updatedShip.referenceNumber,
                shipmentId: updatedShip.id,
                type: 'delay',
                severity: 'high',
                title: 'Major Shipment Delay',
                message: `Active shipment ${updatedShip.referenceNumber} is officially delayed in transit.`,
                timestamp: new Date().toISOString()
              };

              toast.warning(`[Alert] ${newAlert.title}: ${newAlert.reference}`, {
                description: newAlert.message,
                duration: 5000,
              });

              return [newAlert, ...prev];
            });
          } else {
            // If it is no longer delayed, remove the alert
            setAlerts(prev => prev.filter(a => a.id !== `delay-${updatedShip.id}`));
          }
        } else if (updatedShip.status === 'Delivered') {
          // If delivered, clean up all alerts associated with this shipment
          setAlerts(prev => prev.filter(a => a.shipmentId !== updatedShip.id));
        }
      }

      if (type === 'CUSTOMS_UPDATED' || type === 'CUSTOMS_CREATED') {
        const dec = payload;
        if (!dec) return;

        const currentShipments = shipmentsRef.current;
        const relatedShipment = currentShipments.find(s => s.referenceNumber === dec.shipmentRef);
        const isShipmentInTransit = relatedShipment && 
          (relatedShipment.status === 'InTransit' || relatedShipment.status === 'In Transit' || relatedShipment.status === 'Delayed');

        if (isShipmentInTransit && dec.status === 'Action Required') {
          setAlerts(prev => {
            const alertId = `customs-${dec.id}`;
            const exists = prev.some(a => a.id === alertId);
            if (exists) return prev;

            const newAlert = {
              id: alertId,
              declarationId: dec.declarationId,
              reference: dec.shipmentRef,
              shipmentId: relatedShipment.id,
              type: 'customs',
              severity: 'critical',
              title: 'Customs Document Rejected',
              message: `Customs declaration ${dec.declarationId} was rejected with Action Required status for active shipment ${dec.shipmentRef}.`,
              timestamp: new Date().toISOString()
            };

            toast.error(`[Alert] ${newAlert.title}: ${newAlert.reference}`, {
              description: newAlert.message,
              duration: 6000,
            });

            return [newAlert, ...prev];
          });
        } else if (dec.status === 'Cleared' || dec.status === 'Pending') {
          // Resolve previous alert if customs is cleared or pending review
          setAlerts(prev => {
            const alertId = `customs-${dec.id}`;
            const exists = prev.some(a => a.id === alertId);
            if (!exists) return prev;
            toast.success(`Customs cleared for shipment ${dec.shipmentRef}! Alert resolved.`);
            return prev.filter(a => a.id !== alertId);
          });
        }
      }
    };

    document.addEventListener('ws-message', handleWsMessageDOM);
    
    // Import dynamically to avoid top-level issues if eventBus is not imported
    import('../../lib/eventBus.ts').then(({ eventBus, EventTypes }) => {
      eventBus.on(EventTypes.SHIPMENT_UPDATED, handleWsMessage);
    }).catch(e => console.error("Could not load eventBus", e));

    return () => {
      document.removeEventListener('ws-message', handleWsMessageDOM);
      import('../../lib/eventBus.ts').then(({ eventBus, EventTypes }) => {
        eventBus.off(EventTypes.SHIPMENT_UPDATED, handleWsMessage);
      });
    };
  }, []);

  const enrichedShipments = React.useMemo(() => {
    return allShipments.map((s: any) => {
      // Find matching predicted risk
      const pred = predictiveRisks.find((r: any) => r.shipmentId === s.id);
      
      // Calculate transit times if dates are valid
      let isDeviating = false;
      let deviationPercent = 0;
      let avgHistoricalDays = 14; // Default baseline fallback

      if (s.originPort && s.destinationPort && s.eta && s.etd) {
        const matches = allShipments.filter(
          (x: any) => x.status === 'Delivered' && 
          x.originPort === s.originPort && 
          x.destinationPort === s.destinationPort && 
          x.type === s.type
        );
        
        let sumMs = 0;
        let count = 0;
        matches.forEach((x: any) => {
          const start = x.atd ? new Date(x.atd) : (x.etd ? new Date(x.etd) : null);
          const end = x.ata ? new Date(x.ata) : (x.eta ? new Date(x.eta) : null);
          if (start && end) {
            const diff = end.getTime() - start.getTime();
            if (diff > 0) {
              sumMs += diff;
              count++;
            }
          }
        });

        if (count > 0) {
          avgHistoricalDays = sumMs / count / (1000 * 60 * 60 * 24);
          const currentEstDays = (new Date(s.eta).getTime() - new Date(s.etd).getTime()) / (1000 * 60 * 60 * 24);
          if (currentEstDays > avgHistoricalDays * 1.10) {
            isDeviating = true;
            deviationPercent = Math.round(((currentEstDays - avgHistoricalDays) / avgHistoricalDays) * 100);
          }
        }
      }

      // Merge hazard simulation triggers
      let simulationRiskLevel: 'High' | 'Medium' | 'Low' | null = null;
      let simulationReason: string | null = null;
      let simulationDelay = 0;

      if (simulationHazard === 'shanghai-typhoon' && s.originPort?.toLowerCase().includes('shanghai')) {
        simulationRiskLevel = 'High';
        simulationReason = 'Simulated Typhoon warning at Shanghai Port region. Port terminal closed.';
        simulationDelay = 5;
      } else if (simulationHazard === 'rotterdam-strike' && s.destinationPort?.toLowerCase().includes('rotterdam')) {
        simulationRiskLevel = 'High';
        simulationReason = 'Simulated Rail & Port Union Strike at Rotterdam. Inland container transfers halted.';
        simulationDelay = 3;
      } else if (simulationHazard === 'suez-slowdown' && s.type === 'Sea' && (s.originPort?.toLowerCase().includes('shanghai') || s.destinationPort?.toLowerCase().includes('rotterdam'))) {
        simulationRiskLevel = 'Medium';
        simulationReason = 'Simulated canal bottleneck / detour. Vessels rerouted around Cape of Good Hope.';
        simulationDelay = 6;
      }

      const riskLevel = simulationRiskLevel || pred?.riskLevel || (s.status === 'Delayed' || isDeviating ? 'High' : s.delayRisk || 'Low');
      const isPredictiveAtRisk = riskLevel === 'High' || riskLevel === 'Medium' || s.status === 'Delayed';
      const reasoning = simulationReason || pred?.reasoning || (isDeviating ? `Historical transit deviation of +${deviationPercent}% compared to route benchmark (${avgHistoricalDays.toFixed(1)} days).` : s.status === 'Delayed' ? 'Officially delayed in transit.' : undefined);
      const delayDays = simulationDelay || pred?.estimatedDelayDays || (isDeviating ? Math.max(1, Math.round((new Date(s.eta).getTime() - new Date(s.etd).getTime() - (avgHistoricalDays * 24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000))) : undefined);

      return {
        ...s,
        delayRisk: riskLevel,
        isPredictiveAtRisk,
        deviationPercent,
        avgHistoricalDays,
        predictiveReason: reasoning,
        predictedDelayDays: delayDays,
        predictedWeather: simulationHazard !== 'none' ? (simulationHazard === 'shanghai-typhoon' ? 'Typhoon Warning' : undefined) : pred?.weatherCondition,
        predictedRouteStatus: simulationHazard !== 'none' ? (simulationHazard === 'rotterdam-strike' ? 'Strike Action' : simulationHazard === 'suez-slowdown' ? 'Canal Bottleneck' : undefined) : pred?.routeStatus,
      };
    });
  }, [allShipments, predictiveRisks, simulationHazard]);

  const filteredShipments = enrichedShipments.filter((s: any) => {
    const query = searchQuery.toLowerCase();
    const refMatch = s.referenceNumber?.toLowerCase().includes(query);
    const trackingMatch = s.trackingNumber?.toLowerCase().includes(query);
    const originMatch = s.originPort?.toLowerCase().includes(query);
    const destMatch = s.destinationPort?.toLowerCase().includes(query);
    const modeMatch = transportModeFilter === 'All' || s.type === transportModeFilter;
    return (refMatch || trackingMatch || originMatch || destMatch) && modeMatch;
  });

  const stats = {
    activeShipments: filteredShipments.filter((s: any) => s.status !== 'Delivered').length,
    exceptions: alerts.length,
    delivered: filteredShipments.filter((s: any) => s.status === 'Delivered').length
  };

  const statusCounts: Record<string, number> = {};
  filteredShipments.forEach((s: any) => {
    const st = s.status || 'Unknown';
    statusCounts[st] = (statusCounts[st] || 0) + 1;
  });
  const statusData = Object.keys(statusCounts).map(key => ({
    name: key,
    count: statusCounts[key]
  }));

  // Generate deterministic volume trends by created date (grouped by day)
  const volumeByDate: Record<string, number> = {};
  const perfByMode: Record<string, { name: string, onTime: number, delayed: number, total: number }> = {};
  
  filteredShipments.forEach((s: any) => {
    // Volume
    const d = new Date(s.createdAt);
    const dateStr = d.toLocaleDateString('default', { month: 'short', day: 'numeric' });
    volumeByDate[dateStr] = (volumeByDate[dateStr] || 0) + 1;
    
    // Performance
    const mode = s.type || 'Unknown';
    if (!perfByMode[mode]) perfByMode[mode] = { name: mode, onTime: 0, delayed: 0, total: 0 };
    perfByMode[mode].total += 1;
    const isDelayed = s.delayRisk === 'High' || s.delayRisk === 'Medium' || (s.eta && new Date(s.eta) < new Date() && s.status !== 'Delivered');
    if (isDelayed) {
      perfByMode[mode].delayed += 1;
    } else {
      perfByMode[mode].onTime += 1;
    }
  });

  const deterministicVolumeTrends = Object.keys(volumeByDate).map(key => ({
    period: key,
    volume: volumeByDate[key]
  }));
  
  const performanceData = Object.values(perfByMode);

  const isDark = profile?.theme === 'dark' || document.documentElement.classList.contains('dark');
  const axisColor = isDark ? '#a1a1aa' : '#71717a';
  const gridColor = isDark ? '#27272a' : '#e4e4e7';
  const tooltipCursor = isDark ? '#27272a' : '#f4f4f5';
  const tooltipBg = isDark ? '#18181b' : '#ffffff';
  const tooltipBorder = isDark ? '#27272a' : '#e4e4e7';
  const tooltipText = isDark ? '#f4f4f5' : '#18181b';
  const barColor = isDark ? '#60a5fa' : '#3b82f6';

  const renderWidget = (id: string) => {
    if (id === 'manifest-summary-generator') {
      return <ManifestSummaryWidget shipments={enrichedShipments} />;
    }

    if (id === 'operations-overview') {
      return <OperationsOverviewWidget />;
    }

    if (id === 'fleet-utilization') {
      return <FleetUtilizationWidget shipments={enrichedShipments} />;
    }

    if (id === 'route-optimization') {
      return <RouteOptimizationWidget shipments={enrichedShipments} />;
    }

    if (id === 'ml-eta-predictions') {
      return <MLEtaPredictionWidget shipments={enrichedShipments} onUpdateEta={() => loadShipmentsAndLogs(true)} />;
    }

    if (id === 'vessel-telemetry') {
      return <VesselTelemetryWidget />;
    }

    if (id === 'congestion-alerts') {
      return <CongestionAlertsWidget shipments={enrichedShipments} />;
    }

    if (id === 'port-congestion') {
      return <PortCongestionWidget shipments={enrichedShipments} onRerouteComplete={() => loadShipmentsAndLogs(true)} />;
    }

    if (id === 'shipment-data-grid') {
      return <ShipmentDataGridWidget shipments={enrichedShipments} />;
    }

    if (id === 'system-status') {
      return <SystemStatusWidget />;
    }

    if (id === 'volume-trends') {
      return (
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" /> Shipment Volumes
            </CardTitle>
            <CardDescription>Daily active shipment volumes</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {deterministicVolumeTrends.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <p>No volume data available.</p>
              </div>
            ) : (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <AreaChart data={deterministicVolumeTrends}>
                    <defs>
                      <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={barColor} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={barColor} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                    <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill: axisColor, fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: axisColor, fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText, borderRadius: '6px' }}
                      itemStyle={{ color: tooltipText }}
                    />
                    <Area type="monotone" dataKey="volume" stroke={barColor} fillOpacity={1} fill="url(#colorVolume)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }
    
    if (id === 'kpi-summary') {
      return <KPICardsWidget />;
    }

    if (id === 'kpi-overview') {
      return <KPIOverviewWidget />;
    }

    if (id === 'active-shipments-table') {
      return <ActiveShipmentsTableWidget shipments={enrichedShipments} activityLogs={activityLogs} />;
    }

    if (id === 'on-time-delivery-trend') {
      return <OnTimeDeliveryTrendWidget shipments={enrichedShipments} />;
    }

    if (id === 'performance-trends') {
      return <PerformanceTrendsWidget shipments={enrichedShipments} />;
    }

    if (id === 'performance-metrics') {
      return (
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" /> Performance Metrics
            </CardTitle>
            <CardDescription>On-time vs Delayed by transport mode</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {performanceData.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <p>No performance data available.</p>
              </div>
            ) : (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: axisColor, fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: axisColor, fontSize: 12 }} />
                    <Tooltip 
                      cursor={{ fill: tooltipCursor }} 
                      contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText, borderRadius: '6px' }}
                      itemStyle={{ color: tooltipText }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="onTime" name="On Time" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="delayed" name="Delayed" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }
    if (id === 'status-chart') {
      return (
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Shipments by Status</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: axisColor, fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: axisColor, fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: tooltipCursor }} 
                    contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, color: tooltipText, borderRadius: '6px' }}
                    itemStyle={{ color: tooltipText }}
                  />
                  <Bar dataKey="count" fill={barColor} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      );
    }
    if (id === 'global-shipment-map') {
      return <GlobalShipmentMapWidget filterMode={transportModeFilter} />;
    }

    if (id === 'tracking-map') {
      return <ShipmentTrackingMap globalModeFilter={transportModeFilter} />;
    }
    if (id === 'tracking-simulator') {
      return (
        <TrackingSimulatorWidget 
          shipments={allShipments} 
          onSimulationSuccess={() => loadShipmentsAndLogs(true)} 
        />
      );
    }
    if (id === 'notifications') {
      const activeAlerts = alerts.filter(a => !dismissedAlertIds.includes(a.id));
      
      const counts = {
        all: activeAlerts.length,
        delay: activeAlerts.filter(a => a.type === 'delay').length,
        customs: activeAlerts.filter(a => a.type === 'customs').length,
      };

      const filteredAlerts = activeAlerts.filter(alert => {
        // 1. Filter by type tab
        if (alertFilter === 'delay' && alert.type !== 'delay') return false;
        if (alertFilter === 'customs' && alert.type !== 'customs') return false;
        
        // 2. Filter by search input
        if (alertSearch.trim()) {
          const q = alertSearch.toLowerCase();
          const refMatch = alert.reference?.toLowerCase().includes(q);
          const decMatch = alert.declarationId?.toLowerCase().includes(q);
          const titleMatch = alert.title?.toLowerCase().includes(q);
          const msgMatch = alert.message?.toLowerCase().includes(q);
          return refMatch || decMatch || titleMatch || msgMatch;
        }
        return true;
      });

      return (
        <Card className="h-full flex flex-col max-h-[500px]">
          <CardHeader className="pb-3 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Bell className="w-4 h-4 text-primary animate-pulse" /> Live Feed Notifications
                </CardTitle>
                <CardDescription>Real-time delays & customs alerts</CardDescription>
              </div>
              <div className="flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] text-emerald-500 font-mono font-medium tracking-wider uppercase">Live SSE Feed</span>
              </div>
            </div>

            {/* Actions: Search & Tabs */}
            <div className="mt-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search active alerts..."
                  value={alertSearch}
                  onChange={(e) => setAlertSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              {/* Tabs */}
              <div className="flex gap-1 p-0.5 bg-muted rounded-lg text-xs font-medium">
                <button
                  onClick={() => setAlertFilter('all')}
                  className={`flex-1 py-1 px-2 rounded-md transition-all text-center flex items-center justify-center gap-1.5 ${
                    alertFilter === 'all'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${alertFilter === 'all' ? 'bg-primary/10 text-primary' : 'bg-muted-foreground/10 text-muted-foreground'}`}>
                    {counts.all}
                  </span>
                </button>
                <button
                  onClick={() => setAlertFilter('delay')}
                  className={`flex-1 py-1 px-2 rounded-md transition-all text-center flex items-center justify-center gap-1.5 ${
                    alertFilter === 'delay'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Delays
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${alertFilter === 'delay' ? 'bg-amber-100 text-amber-700' : 'bg-muted-foreground/10 text-muted-foreground'}`}>
                    {counts.delay}
                  </span>
                </button>
                <button
                  onClick={() => setAlertFilter('customs')}
                  className={`flex-1 py-1 px-2 rounded-md transition-all text-center flex items-center justify-center gap-1.5 ${
                    alertFilter === 'customs'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Customs
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${alertFilter === 'customs' ? 'bg-red-100 text-red-700' : 'bg-muted-foreground/10 text-muted-foreground'}`}>
                    {counts.customs}
                  </span>
                </button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="overflow-y-auto flex-1 pb-4 pt-0">
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground h-full flex flex-col items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-3" />
                <p className="font-medium text-foreground text-sm">No active alerts found</p>
                <p className="text-xs text-muted-foreground mt-1 px-4">All active in-transit shipments are executing without delay or customs rejections.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredAlerts.map((alert) => {
                  const relatedShipment = allShipments.find(s => s.id === alert.shipmentId || s.referenceNumber === alert.reference);
                  const isCritical = alert.severity === 'critical' || alert.type === 'customs';
                  
                  return (
                    <div
                      key={alert.id}
                      className={`group relative flex items-start p-3 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-sm ${
                        isCritical
                          ? 'bg-red-50/40 border-red-100 hover:bg-red-50/70 dark:bg-red-950/10 dark:border-red-900/40 dark:hover:bg-red-950/20'
                          : alert.type === 'delay'
                          ? 'bg-amber-50/40 border-amber-100 hover:bg-amber-50/70 dark:bg-amber-950/10 dark:border-amber-900/40 dark:hover:bg-amber-950/20'
                          : 'bg-blue-50/40 border-blue-100 hover:bg-blue-50/70 dark:bg-blue-950/10 dark:border-blue-900/40 dark:hover:bg-blue-950/20'
                      }`}
                      onClick={() => {
                        if (relatedShipment) {
                          setSelectedShipment(relatedShipment);
                          setIsDetailsOpen(true);
                        } else {
                          toast.error(`Shipment details not found for ${alert.reference}`);
                        }
                      }}
                    >
                      {/* Icon */}
                      <div className="shrink-0 mr-3 mt-0.5">
                        {isCritical ? (
                          <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-md">
                            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                          </div>
                        ) : alert.type === 'delay' ? (
                          <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-md">
                            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          </div>
                        ) : (
                          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-md">
                            <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold font-mono tracking-tight text-foreground truncate">
                            {alert.reference}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isCritical
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                              : alert.type === 'delay'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                          }`}>
                            {alert.type}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-foreground mt-1">
                          {alert.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed truncate-3-lines">
                          {alert.message}
                        </p>
                        <span className="block text-[10px] text-muted-foreground/80 mt-1.5 font-mono">
                          {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>

                      {/* Dismiss */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDismissedAlertIds(prev => [...prev, alert.id]);
                          toast.info('Alert dismissed locally.');
                        }}
                        className="absolute right-2 top-2 p-1 rounded-md opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150"
                        title="Dismiss alert"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      );
    }
    if (id === 'recent-shipments') {
      return (
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Recent Shipments</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShipments.slice(0, 5).map((s: any) => (
                  <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { setSelectedShipment(s); setIsDetailsOpen(true); }}>
                    <TableCell className="font-medium text-sm" data-testid={`shipment-ref-${s.referenceNumber}`}>{s.referenceNumber}</TableCell>
                    <TableCell className="text-sm">{s.originPort} - {s.destinationPort}</TableCell>
                    <TableCell className="text-sm">
                      <Badge variant={s.status === 'Delivered' ? 'outline' : 'secondary'} className="font-normal">
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {s.delayRisk === 'High' ? (
                        <Badge variant="destructive" className="font-normal bg-red-100 text-red-700 hover:bg-red-100/80 border-none">High</Badge>
                      ) : s.delayRisk === 'Medium' ? (
                        <Badge variant="secondary" className="font-normal bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-100/80 border-none">Medium</Badge>
                      ) : (
                        <Badge variant="outline" className="font-normal text-muted-foreground border-border">Low</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredShipments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4 text-sm text-muted-foreground">
                      No shipments found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      );
    }
    if (id === 'activity-log') {
      return <ActivityFeedWidget logs={activityLogs} shipments={allShipments} />;
    }

    if (id === 'ai-anomalies') {
      return (
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" /> AI Anomaly Analysis
            </CardTitle>
            <CardDescription>Automated risk detection via Gemini AI</CardDescription>
          </CardHeader>
          <CardContent>
            {isAnalyzingAnomalies ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : aiAnomalies.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p>No high-risk anomalies detected.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {aiAnomalies.map((anomaly, index) => (
                  <div key={index} className="flex gap-3 items-start p-3 rounded-md bg-purple-50/50 border border-purple-100 dark:bg-purple-950/20 dark:border-purple-900/50">
                    <div className="mt-0.5 rounded-full p-1.5 bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 dark:bg-purple-900 dark:text-purple-300 shrink-0">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground dark:text-zinc-100">{anomaly.referenceNumber} - {anomaly.anomalyType}</p>
                      <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">{anomaly.explanation}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      );
    }
    if (id === 'predictive-risks') {
      const atRiskShipments = enrichedShipments.filter((s: any) => s.status !== 'Delivered' && s.isPredictiveAtRisk);
      const totalActive = enrichedShipments.filter((s: any) => s.status !== 'Delivered').length;
      const avgForecastedDelay = atRiskShipments.length > 0 
        ? (atRiskShipments.reduce((sum: number, s: any) => sum + (s.predictedDelayDays || 0), 0) / atRiskShipments.length).toFixed(1) 
        : '0.0';

      const chartData = atRiskShipments.slice(0, 6).map((s: any) => ({
        name: s.referenceNumber,
        delay: s.predictedDelayDays || 1,
        benchmark: Math.round(s.avgHistoricalDays || 12),
        predicted: Math.round((s.avgHistoricalDays || 12) + (s.predictedDelayDays || 1))
      }));

      return (
        <Card className="h-full flex flex-col shadow-sm border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <BrainCircuit className="w-5 h-5 text-indigo-500 animate-pulse" />
                  Predictive Analytics Cockpit
                </CardTitle>
                <CardDescription>
                  Forecasts active delays using AI models combined with historical transit deviations
                </CardDescription>
              </div>

              {/* Interactive Scenario Sandbox Slider */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full md:w-auto">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Simulate Anomaly:
                </span>
                <Select value={simulationHazard} onValueChange={(val) => setSimulationHazard(val)}>
                  <SelectTrigger className="w-full sm:w-[220px] h-9 text-xs">
                    <SelectValue placeholder="Standard Analysis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Standard Analysis (No Simulation)</SelectItem>
                    <SelectItem value="shanghai-typhoon">Shanghai Typhoon Anomaly (+5d)</SelectItem>
                    <SelectItem value="rotterdam-strike">Rotterdam Rail Union Strike (+3d)</SelectItem>
                    <SelectItem value="suez-slowdown">Suez Canal Bottleneck (+6d)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-6 flex-1 overflow-y-auto">
            {/* Real-time KPI Metric Widgets */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-lg border bg-zinc-50/40 dark:bg-zinc-900/10 flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-md">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">At Risk Active</p>
                  <h4 className="text-lg font-bold">{atRiskShipments.length} <span className="text-xs font-normal text-muted-foreground">/ {totalActive}</span></h4>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border bg-zinc-50/40 dark:bg-zinc-900/10 flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-md">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Avg Expected Delay</p>
                  <h4 className="text-lg font-bold">+{avgForecastedDelay} <span className="text-xs font-normal text-muted-foreground">days</span></h4>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border bg-zinc-50/40 dark:bg-zinc-900/10 flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-md">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Forecast Model</p>
                  <h4 className="text-lg font-bold text-indigo-600 dark:text-indigo-400">94.2% <span className="text-xs font-normal text-muted-foreground">Confidence</span></h4>
                </div>
              </div>
            </div>

            {/* Delay Forecast Comparison Chart */}
            {atRiskShipments.length > 0 && (
              <div className="p-4 rounded-lg border">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-zinc-500" /> Projected Transit vs Benchmark (Days)
                </h4>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                      <XAxis dataKey="name" stroke={axisColor} fontSize={11} tickLine={false} />
                      <YAxis stroke={axisColor} fontSize={11} tickLine={false} domain={[0, 'auto']} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px' }}
                        itemStyle={{ color: tooltipText }}
                        labelStyle={{ fontWeight: 'bold', color: tooltipText, fontSize: '11px' }}
                      />
                      <Legend verticalAlign="top" height={36} iconSize={10} style={{ fontSize: '11px' }} />
                      <Bar name="Historical Average" dataKey="benchmark" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={16} />
                      <Line name="Projected Duration" type="monotone" dataKey="predicted" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 4, fill: '#f43f5e' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* List of Active At-Risk Predictions */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500 animate-pulse" /> Highlighted Risk Details
              </h4>

              {isPredictingRisks ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : atRiskShipments.length === 0 ? (
                <div className="text-center py-8 rounded-lg border border-dashed flex flex-col items-center justify-center gap-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500/80" />
                  <p className="font-semibold text-sm">All Active Shipments on Track</p>
                  <p className="text-xs text-muted-foreground px-4">There are currently no route deviations, weather anomalies, or simulated issues flagged.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {atRiskShipments.map((s: any, idx: number) => (
                    <div 
                      key={idx} 
                      className="p-3.5 rounded-lg border bg-rose-50/20 border-rose-100 dark:bg-rose-950/10 dark:border-rose-950 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-sm transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground">{s.referenceNumber}</span>
                          <Badge variant="outline" className="bg-white dark:bg-zinc-900 border-rose-200 dark:border-rose-950 text-rose-600 dark:text-rose-400 text-[10px] font-semibold">
                            {s.type} Lane
                          </Badge>
                          <Badge className="bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold border-none">
                            {s.delayRisk} Risk
                          </Badge>
                        </div>
                        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          {s.originPort || 'N/A'} → {s.destinationPort || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                          {s.predictiveReason}
                        </p>
                      </div>

                      <div className="text-left md:text-right shrink-0 space-y-1">
                        <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center md:justify-end gap-1">
                          <Clock className="w-3.5 h-3.5" /> Delay Forecast
                        </p>
                        <p className="text-lg font-black text-rose-600 dark:text-rose-400">
                          +{s.predictedDelayDays || 3} days
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          ETA {s.eta ? new Date(s.eta).toLocaleDateString() : '-'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }
    if (id === 'geopolitical-risks') {
      return <GeopoliticalRiskWidget />;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <DashboardKPIs />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t('control_tower')}</h2>
          <p className="text-muted-foreground text-sm">Operational Dashboard & KPI Metrics</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Transport Mode Filter */}
          <div className="flex items-center bg-muted/60 border border-zinc-200 dark:border-zinc-800/80 rounded-lg p-1 text-xs">
            {(['All', 'Air', 'Sea', 'Road'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setTransportModeFilter(mode)}
                className={`px-3 py-1 rounded-md transition-colors ${transportModeFilter === mode ? 'bg-background shadow-sm text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Live Refresh and Status Sync Bar */}
          <div className="flex items-center gap-3 bg-muted/60 border border-zinc-200 dark:border-zinc-800/80 rounded-lg px-3 py-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const nextState = !isLiveRefresh;
                  setIsLiveRefresh(nextState);
                  if (nextState) {
                    loadShipmentsAndLogs(true);
                    toast.info("Live Refresh enabled");
                  } else {
                    toast.info("Live Refresh disabled");
                  }
                }}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-2 ${
                  isLiveRefresh ? 'bg-emerald-500' : 'bg-input'
                }`}
                role="switch"
                aria-checked={isLiveRefresh}
                title="Toggle Live Refresh (Auto-poll every 15 seconds)"
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isLiveRefresh ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="font-medium text-foreground dark:text-zinc-200 select-none">Live Refresh</span>
            </div>

            <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700" />

            {/* Sync Indicators & Manual Sync Trigger */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => loadShipmentsAndLogs(true)}
                disabled={isRefreshing}
                className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-850 rounded-md transition-colors text-zinc-500 hover:text-foreground disabled:opacity-50"
                title="Force manual synchronization"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
              </button>
              
              <div className="flex items-center gap-1.5">
                {isLiveRefresh && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
                <span className="font-mono text-[10px] tabular-nums">
                  {isRefreshing
                    ? 'Syncing...'
                    : lastSyncTime
                    ? `Synced: ${lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                    : 'Not synced'}
                </span>
              </div>
            </div>
          </div>

          <Button variant="outline" onClick={handleDownloadPDF} className="shrink-0">
            <Download className="w-4 h-4 mr-2" />
            Generate PDF Summary
          </Button>

          <Button 
            variant={isCustomizing ? "default" : "outline"} 
            onClick={() => setIsCustomizing(!isCustomizing)} 
            className="shrink-0 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {isCustomizing ? "Exit Customization" : "Customize Grid"}
          </Button>

          <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search reference, tracking, origin, destination..."
            className="pl-9 bg-card"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-[200px] w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
            <div className="col-span-1 md:col-span-2 lg:col-span-8 space-y-6">
              <Skeleton className="h-[400px] w-full rounded-xl" />
              <Skeleton className="h-[350px] w-full rounded-xl" />
            </div>
            <div className="col-span-1 md:col-span-1 lg:col-span-4 space-y-6">
              <Skeleton className="h-[250px] w-full rounded-xl" />
              <Skeleton className="h-[500px] w-full rounded-xl" />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sub-navigation Tab Bar */}
          <div className="flex flex-wrap border-b border-zinc-200 dark:border-zinc-800 gap-y-2">
            <button
              onClick={() => {
                setActiveDashboardTab('operations');
                setIsCustomizing(false);
              }}
              className={`pb-3 pt-1 px-4 text-sm font-semibold transition-all border-b-2 -mb-[2px] flex items-center gap-1.5 ${
                activeDashboardTab === 'operations' 
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-extrabold' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Activity className="w-4 h-4" />
              Operations Control Center
            </button>
            <button
              onClick={() => {
                setActiveDashboardTab('risk-analytics');
                setIsCustomizing(false);
              }}
              className={`pb-3 pt-1 px-4 text-sm font-semibold transition-all border-b-2 -mb-[2px] flex items-center gap-1.5 ${
                activeDashboardTab === 'risk-analytics' 
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-extrabold' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              Intermodal Risk Analytics
              <Badge className="bg-rose-500 hover:bg-rose-600 text-white text-[9px] font-black h-4 px-1.5 flex items-center border-none">
                Live
              </Badge>
            </button>
            <button
              onClick={() => {
                setActiveDashboardTab('carrier-matcher');
                setIsCustomizing(false);
              }}
              className={`pb-3 pt-1 px-4 text-sm font-semibold transition-all border-b-2 -mb-[2px] flex items-center gap-1.5 ${
                activeDashboardTab === 'carrier-matcher' 
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-extrabold' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
              Smart Carrier Matcher
              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-black h-4 px-1.5 flex items-center border-none">
                AI Match
              </Badge>
            </button>
            <button
              onClick={() => {
                setActiveDashboardTab('demurrage');
                setIsCustomizing(false);
              }}
              className={`pb-3 pt-1 px-4 text-sm font-semibold transition-all border-b-2 -mb-[2px] flex items-center gap-1.5 ${
                activeDashboardTab === 'demurrage' 
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-extrabold' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Scale className="w-4 h-4 text-indigo-500" />
              Predictive Demurrage Alarm
              <Badge className="bg-indigo-600 text-white text-[9px] font-black h-4 px-1.5 flex items-center border-none">
                Alerting
              </Badge>
            </button>
            <button
              onClick={() => {
                setActiveDashboardTab('zkp-audit');
                setIsCustomizing(false);
              }}
              className={`pb-3 pt-1 px-4 text-sm font-semibold transition-all border-b-2 -mb-[2px] flex items-center gap-1.5 ${
                activeDashboardTab === 'zkp-audit' 
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-extrabold' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Lock className="w-4 h-4 text-purple-500" />
              ZKP Carrier SLA Audits
              <Badge className="bg-purple-600 text-white text-[9px] font-black h-4 px-1.5 flex items-center border-none">
                Security
              </Badge>
            </button>
            <button
              onClick={() => {
                setActiveDashboardTab('biometric-pod');
                setIsCustomizing(false);
              }}
              className={`pb-3 pt-1 px-4 text-sm font-semibold transition-all border-b-2 -mb-[2px] flex items-center gap-1.5 ${
                activeDashboardTab === 'biometric-pod' 
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-extrabold' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Smartphone className="w-4 h-4 text-cyan-500" />
              Biometric Signature PoD
              <Badge className="bg-cyan-500 text-white text-[9px] font-black h-4 px-1.5 flex items-center border-none">
                Driver Web
              </Badge>
            </button>
          </div>

          {activeDashboardTab === 'carrier-matcher' ? (
            <SmartCarrierMatcher shipments={enrichedShipments} onAllocationComplete={() => loadShipmentsAndLogs(true)} />
          ) : activeDashboardTab === 'risk-analytics' ? (
            <RiskAnalyticsTab shipments={enrichedShipments} />
          ) : activeDashboardTab === 'demurrage' ? (
            <DemurrageDetentionAlarm shipments={enrichedShipments} />
          ) : activeDashboardTab === 'zkp-audit' ? (
            <ZkpSlaAudit />
          ) : activeDashboardTab === 'biometric-pod' ? (
            <BiometricPodApplet shipments={enrichedShipments} onDeliveryRecorded={(shipmentId, deliveryDetails) => {
              // Locally update shipment in allShipments state
              setAllShipments(prev => prev.map(s => s.id === shipmentId || s.shipmentId === shipmentId ? { ...s, status: 'Delivered', delayRisk: 'Low' } : s));
            }} />
          ) : (
            <>
              {isCustomizing && (
            <div className="p-5 border border-primary/30 rounded-xl bg-accent/40 dark:bg-zinc-900/30 space-y-4 animate-fade-in mb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-primary animate-pulse" /> Control Tower Grid Customizer
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Toggle visibility, resize panels, and drag cards to configure your bespoke SCM command center.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleResetLayout}
                    className="text-xs flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reset Defaults
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => setIsCustomizing(false)}
                    className="text-xs font-semibold"
                  >
                    Done Editing
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Visible Widget Modules</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Object.entries(WIDGET_METADATA).map(([id, meta]) => {
                    const isVisible = !hiddenWidgets.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleToggleVisibility(id)}
                        className={`p-3 text-left rounded-xl border text-xs flex flex-col justify-between h-20 transition-all ${
                          isVisible
                            ? 'bg-background border-primary/20 hover:border-primary/40 ring-1 ring-primary/5'
                            : 'bg-muted/40 border-dashed border-border text-muted-foreground opacity-60 hover:opacity-80'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-semibold">{meta.title}</span>
                          <span className={`w-2 h-2 rounded-full ${isVisible ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                        </div>
                        <p className="text-[10px] text-muted-foreground/95 mt-1 line-clamp-2 leading-tight">{meta.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <SummaryDashboard />

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 p-1 transition-all rounded-xl ${
              isCustomizing 
                ? 'bg-[radial-gradient(#e5e7eb_1.5px,transparent_1.5px)] dark:bg-[radial-gradient(#27272a_1.5px,transparent_1.5px)] [background-size:20px_20px] ring-2 ring-dashed ring-primary/20 p-4 bg-muted/20' 
                : ''
            }`}>
              <SortableContext
                items={widgetOrder}
                strategy={rectSortingStrategy}
              >
                {widgetOrder.filter(id => !hiddenWidgets.includes(id)).map(id => (
                  <SortableWidget 
                    key={id} 
                    id={id}
                    className={getWidgetGridClasses(id, widgetWidths)}
                    isCustomizing={isCustomizing}
                    currentWidth={widgetWidths[id] || getWidgetGridClasses(id)}
                    onWidthChange={(w) => handleWidthChange(id, w)}
                    onHide={() => handleToggleVisibility(id)}
                  >
                    {renderWidget(id)}
                  </SortableWidget>
                ))}
              </SortableContext>
            </div>
          </DndContext>
        </>
      )}
    </div>
  )}

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Shipment Tracking Details
              {selectedShipment && <Badge variant="outline">{selectedShipment.referenceNumber}</Badge>}
            </DialogTitle>
            <DialogDescription>Planned vs. Actual Milestone Tracking</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedShipment && <MilestoneTimeline shipment={selectedShipment} />}
          </div>
        </DialogContent>
      </Dialog>
      {/* Quick Actions FAB */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button 
          size="icon" 
          className="h-14 w-14 rounded-full shadow-xl bg-blue-600 hover:bg-blue-700 text-white animate-bounce-subtle"
          onClick={() => setIsQuickActionOpen(true)}
          title="Create New Records"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      <Dialog open={isQuickActionOpen} onOpenChange={setIsQuickActionOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Quick Action</DialogTitle>
            <DialogDescription>
              Create a new booking or ad-hoc shipment record.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex gap-2 mb-4">
            <Button 
              variant={quickActionType === 'booking' ? 'default' : 'outline'} 
              className="flex-1"
              onClick={() => setQuickActionType('booking')}
            >
              <FileText className="w-4 h-4 mr-2" /> New Booking
            </Button>
            <Button 
              variant={quickActionType === 'shipment' ? 'default' : 'outline'} 
              className="flex-1"
              onClick={() => setQuickActionType('shipment')}
            >
              <Rocket className="w-4 h-4 mr-2" /> Ad-hoc Shipment
            </Button>
          </div>

          <form onSubmit={handleQuickSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reference">Reference Number</Label>
              <Input id="reference" name="reference" placeholder="e.g. BKG-2026-X" required />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="origin">Origin</Label>
                <Input id="origin" name="origin" placeholder="e.g. Shanghai" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destination">Destination</Label>
                <Input id="destination" name="destination" placeholder="e.g. Los Angeles" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Transport Mode</Label>
              <Select name="type" value="Ocean">
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ocean">Ocean</SelectItem>
                  <SelectItem value="Air">Air</SelectItem>
                  <SelectItem value="Rail">Rail</SelectItem>
                  <SelectItem value="Road">Road</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsQuickActionOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmittingQuickAction}>
                {isSubmittingQuickAction ? 'Saving...' : `Create ${quickActionType === 'booking' ? 'Booking' : 'Shipment'}`}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
