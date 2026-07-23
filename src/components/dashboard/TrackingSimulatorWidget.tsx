import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/data-display/card';
import { Badge } from '@/components/ui/data-display/badge';
import { Button } from '@/components/ui/forms/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/forms/select';
import { 
  Play, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  FileWarning, 
  ShieldAlert, 
  Navigation, 
  Anchor, 
  CheckCircle, 
  Plane,
  Truck,
  Ship,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

interface TrackingSimulatorWidgetProps {
  shipments: any[];
  onSimulationSuccess?: () => void;
}

export function TrackingSimulatorWidget({ shipments, onSimulationSuccess }: TrackingSimulatorWidgetProps) {
  const [selectedId, setSelectedId] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState<string | null>(null);

  const activeShipments = shipments.filter(s => s.status !== 'Delivered' && s.status !== 'Draft');
  const selectedShipment = shipments.find(s => s.id === selectedId);

  // Auto-select first active shipment if none selected
  React.useEffect(() => {
    if (!selectedId && activeShipments.length > 0) {
      setSelectedId(activeShipments[0].id);
    }
  }, [activeShipments, selectedId]);

  const handleSimulate = async (action: string, description: string) => {
    if (!selectedId) {
      toast.error('Please select a shipment to simulate updates.');
      return;
    }
    
    setIsSimulating(action);
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`/api/shipments/${selectedId}/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action, description })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`[Simulator] Broadcasted event: ${action}`, {
          description: result.event?.description || 'Real-time telemetry updated.'
        });
        if (onSimulationSuccess) {
          onSimulationSuccess();
        }
      } else {
        const err = await response.json();
        toast.error(`Simulation failed: ${err.error || 'Server error'}`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to trigger live shipment simulation.');
    } finally {
      setIsSimulating(null);
    }
  };

  const getCarrierIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'air':
        return <Plane className="w-4 h-4 text-blue-500" />;
      case 'road':
      case 'land':
        return <Truck className="w-4 h-4 text-orange-500" />;
      default:
        return <Ship className="w-4 h-4 text-emerald-500" />;
    }
  };

  return (
    <Card id="tracking-simulator-widget-card" className="col-span-12 border border-border shadow-sm overflow-hidden bg-gradient-to-br from-zinc-50/20 via-background to-zinc-50/10 dark:from-zinc-950/20 dark:via-zinc-900/40 dark:to-zinc-950/10">
      <CardHeader className="pb-4 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border bg-muted/20">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" /> Real-Time Telemetry & Alert Simulator
          </CardTitle>
          <CardDescription>
            Interactively dispatch WebSocket & Server-Sent Events to simulate real-time route progress, milestones, delay risks, and compliance alerts.
          </CardDescription>
        </div>
        
        {activeShipments.length > 0 && (
          <div className="flex items-center gap-2 min-w-[240px]">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Target Voyage:</span>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="w-full bg-background border-border h-9">
                <SelectValue placeholder="Select active shipment" />
              </SelectTrigger>
              <SelectContent>
                {activeShipments.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.referenceNumber} ({s.originPort} → {s.destinationPort})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {activeShipments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-xl bg-muted/10">
            <Navigation className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50 animate-bounce" />
            <p className="text-sm font-medium">No active, in-transit shipments found in the workspace.</p>
            <p className="text-xs mt-1 text-muted-foreground/80">Create a new draft or operational shipment in Shipment Management to simulate.</p>
          </div>
        ) : selectedShipment ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Shipment Status Panel */}
            <div className="lg:col-span-5 space-y-4 bg-muted/30 dark:bg-zinc-900/30 p-4 rounded-xl border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {getCarrierIcon(selectedShipment.type)}
                  <span className="text-sm font-bold font-mono tracking-tight text-foreground">
                    {selectedShipment.referenceNumber}
                  </span>
                </div>
                <Badge variant={
                  selectedShipment.status === 'Delayed' ? 'destructive' :
                  selectedShipment.status === 'Arrived' ? 'secondary' : 'default'
                } className="font-semibold text-[10px] tracking-wider uppercase">
                  {selectedShipment.status}
                </Badge>
              </div>

              <div className="h-px bg-border" />

              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="block text-[10px] text-muted-foreground uppercase font-sans mb-0.5">Origin Port</span>
                  <div className="flex items-center gap-1 text-foreground font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    <span>{selectedShipment.originPort}</span>
                  </div>
                </div>
                
                <div>
                  <span className="block text-[10px] text-muted-foreground uppercase font-sans mb-0.5">Destination Port</span>
                  <div className="flex items-center gap-1 text-foreground font-semibold">
                    <Anchor className="w-3.5 h-3.5 text-blue-500" />
                    <span>{selectedShipment.destinationPort}</span>
                  </div>
                </div>

                <div>
                  <span className="block text-[10px] text-muted-foreground uppercase font-sans mb-0.5">Departed (ATD)</span>
                  <span className="text-foreground">
                    {selectedShipment.atd ? new Date(selectedShipment.atd).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'}) : 'Not Departed'}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] text-muted-foreground uppercase font-sans mb-0.5">Estimated Arrival (ETA)</span>
                  <span className="text-foreground flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>{selectedShipment.eta ? new Date(selectedShipment.eta).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'}) : 'TBD'}</span>
                  </span>
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                  <span>Transit Progress</span>
                  <span>
                    {selectedShipment.status === 'Delivered' ? '100%' : 
                     selectedShipment.status === 'Arrived' ? '95%' : 
                     selectedShipment.status === 'In Transit' || selectedShipment.status === 'Delayed' ? '55%' : '0%'}
                  </span>
                </div>
                <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                    style={{
                      width: selectedShipment.status === 'Delivered' ? '100%' : 
                             selectedShipment.status === 'Arrived' ? '95%' : 
                             selectedShipment.status === 'In Transit' || selectedShipment.status === 'Delayed' ? '55%' : '5%'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Simulation Controller Board */}
            <div className="lg:col-span-7 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dispatch Live Events & Telemetry Updates</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* Milestone Updates Section */}
                <div className="space-y-2 border border-border p-3 rounded-lg bg-zinc-50/40 dark:bg-zinc-950/10">
                  <h5 className="text-[11px] font-bold uppercase text-indigo-500 tracking-wider">Milestones (Live Status updates)</h5>
                  <div className="flex flex-col gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="justify-start h-8 text-xs font-medium"
                      onClick={() => handleSimulate('DEPARTURE', `Vessel ${selectedShipment.referenceNumber} has departed origin port under standard clearing conditions.`)}
                      disabled={isSimulating !== null || selectedShipment.status === 'In Transit' || selectedShipment.status === 'Delayed'}
                    >
                      <Navigation className="w-3.5 h-3.5 mr-2 text-indigo-500 animate-pulse" />
                      Depart Voyage (ATD)
                    </Button>

                    <Button 
                      size="sm" 
                      variant="outline"
                      className="justify-start h-8 text-xs font-medium"
                      onClick={() => handleSimulate('PROGRESS', `Telemetry received: Vessel ${selectedShipment.referenceNumber} waypoint updated at sea. Cruising speed 18 knots.`)}
                      disabled={isSimulating !== null || (selectedShipment.status !== 'In Transit' && selectedShipment.status !== 'Delayed')}
                    >
                      <Play className="w-3.5 h-3.5 mr-2 text-indigo-500 animate-spin" />
                      In-Transit Progress Update
                    </Button>

                    <Button 
                      size="sm" 
                      variant="outline"
                      className="justify-start h-8 text-xs font-medium"
                      onClick={() => handleSimulate('ARRIVAL', `Vessel ${selectedShipment.referenceNumber} has arrived at outer harbor. Preparing for berth assignment.`)}
                      disabled={isSimulating !== null || selectedShipment.status === 'Arrived'}
                    >
                      <Anchor className="w-3.5 h-3.5 mr-2 text-blue-500" />
                      Arrive at Gateway (ATA)
                    </Button>

                    <Button 
                      size="sm" 
                      variant="outline"
                      className="justify-start h-8 text-xs font-medium"
                      onClick={() => handleSimulate('DELIVERY', `Consignee final delivery confirmed. Proof of Delivery (POD) signed by receiving officer.`)}
                      disabled={isSimulating !== null}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-2 text-emerald-500" />
                      Complete Final Delivery
                    </Button>
                  </div>
                </div>

                {/* Critical Alerts & Exceptions Section */}
                <div className="space-y-2 border border-border p-3 rounded-lg bg-zinc-50/40 dark:bg-zinc-950/10">
                  <h5 className="text-[11px] font-bold uppercase text-red-500 tracking-wider">Exception & Alert Triggers</h5>
                  <div className="flex flex-col gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="justify-start h-8 text-xs font-medium border-amber-200 hover:bg-amber-50 dark:border-amber-900/40 dark:hover:bg-amber-950/20"
                      onClick={() => handleSimulate('DELAY', `Heavy typhoon and high seas reported in East Pacific. Vessel rerouting south. ETA delayed by 24 hours.`)}
                      disabled={isSimulating !== null || selectedShipment.status === 'Draft'}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 mr-2 text-amber-500 animate-pulse" />
                      Simulate Weather Delay
                    </Button>

                    <Button 
                      size="sm" 
                      variant="outline"
                      className="justify-start h-8 text-xs font-medium border-red-200 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/20"
                      onClick={() => handleSimulate('CUSTOMS_HOLD', `Customs Border Force Hold: Random validation inspection requested for Manifest entries.`)}
                      disabled={isSimulating !== null}
                    >
                      <ShieldAlert className="w-3.5 h-3.5 mr-2 text-red-500" />
                      Trigger Customs Hold
                    </Button>

                    <Button 
                      size="sm" 
                      variant="outline"
                      className="justify-start h-8 text-xs font-medium border-red-200 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/20"
                      onClick={() => handleSimulate('DOCUMENT_EXPIRED', `Compliance check failed: Safety declaration (AEO Certificate) expired in transit.`)}
                      disabled={isSimulating !== null}
                    >
                      <FileWarning className="w-3.5 h-3.5 mr-2 text-red-600 animate-bounce" />
                      Document Expiration Warning
                    </Button>
                  </div>
                </div>

              </div>
            </div>

          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
