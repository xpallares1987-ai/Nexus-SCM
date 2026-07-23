import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { Button } from '@/components/ui/forms/button';
import { Input } from '@/components/ui/forms/input';
import { Label } from '@/components/ui/forms/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/forms/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/overlays/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/navigation/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/data-display/table';
import { Calendar, Save, Plus, FileText, CheckCircle2, Search, Play, ShieldAlert, ShieldCheck, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/data-display/badge';

interface ShipmentTemplate {
  id: string;
  name: string;
  carrier: string;
  originPort: string;
  destinationPort: string;
  type: string;
}

export function BookingManagement() {
  const { token, profile } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [templates, setTemplates] = useState<ShipmentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);

  const [templateForm, setTemplateForm] = useState<Partial<ShipmentTemplate>>({});
  const [bookingForm, setBookingForm] = useState<any>(() => {
    const saved = localStorage.getItem('scm_booking_form_draft');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return { type: 'Sea-FCL' };
  });

  useEffect(() => {
    if (Object.keys(bookingForm).length > 1 || bookingForm.type !== 'Sea-FCL') {
      localStorage.setItem('scm_booking_form_draft', JSON.stringify(bookingForm));
    }
  }, [bookingForm]);

  // Sanction Compliance states
  const [screeningLoading, setScreeningLoading] = useState(false);
  const [screeningResult, setScreeningResult] = useState<any>(null);
  const [waiverApplied, setWaiverApplied] = useState(false);

  useEffect(() => {
    loadBookings();
    loadTemplates();
  }, [token]);

  const loadBookings = async () => {
    if (!token) return;
    try {
      const data = await fetchApi('/shipments', token);
      if (Array.isArray(data)) {
        setBookings(data.filter(s => s.status === 'Booked' || s.status === 'Draft'));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplates = () => {
    try {
      const saved = localStorage.getItem('shipment_templates');
      if (saved) {
        setTemplates(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveTemplate = () => {
    if (!templateForm.name || !templateForm.originPort || !templateForm.destinationPort) {
      toast.error('Please fill required fields (Name, Origin, Destination)');
      return;
    }

    const newTemplate: ShipmentTemplate = {
      id: Date.now().toString(),
      name: templateForm.name,
      carrier: templateForm.carrier || '',
      originPort: templateForm.originPort,
      destinationPort: templateForm.destinationPort,
      type: templateForm.type || 'Sea-FCL'
    };

    const newTemplates = [...templates, newTemplate];
    setTemplates(newTemplates);
    localStorage.setItem('shipment_templates', JSON.stringify(newTemplates));
    
    setIsTemplateDialogOpen(false);
    setTemplateForm({});
    toast.success('Template saved successfully');
  };

  const deleteTemplate = (id: string) => {
    const newTemplates = templates.filter(t => t.id !== id);
    setTemplates(newTemplates);
    localStorage.setItem('shipment_templates', JSON.stringify(newTemplates));
    toast.success('Template deleted');
  };

  const openBookingFromTemplate = (template: ShipmentTemplate) => {
    setBookingForm({
      referenceNumber: `BKG-${Math.floor(1000 + Math.random() * 9000)}`,
      type: template.type,
      originPort: template.originPort,
      destinationPort: template.destinationPort,
      carrierId: template.carrier,
      priority: 'Normal',
      status: 'Booked',
      consigneeName: '',
      destinationCountry: '',
      commodity: ''
    });
    setScreeningResult(null);
    setWaiverApplied(false);
    setIsBookingDialogOpen(true);
  };

  const openNewBooking = () => {
    setBookingForm({
      referenceNumber: `BKG-${Math.floor(1000 + Math.random() * 9000)}`,
      type: 'Sea-FCL',
      originPort: '',
      destinationPort: '',
      status: 'Booked',
      priority: 'Normal',
      consigneeName: '',
      destinationCountry: '',
      commodity: ''
    });
    setScreeningResult(null);
    setWaiverApplied(false);
    setIsBookingDialogOpen(true);
  };

  const handleBookingScreening = async () => {
    if (!bookingForm.consigneeName || !bookingForm.destinationCountry || !bookingForm.commodity) {
      toast.error('Please enter Consignee, Destination Country, and Commodity to screen.');
      return;
    }
    setScreeningLoading(true);
    setScreeningResult(null);
    try {
      const data = await fetchApi('/compliance/sanction-screening', token, {
        method: 'POST',
        body: JSON.stringify({
          consigneeName: bookingForm.consigneeName,
          destinationCountry: bookingForm.destinationCountry,
          commodity: bookingForm.commodity
        })
      });
      if (data && data.success && data.report) {
        setScreeningResult(data.report);
        if (data.report.isApproved) {
          toast.success('Sanction screening cleared: Approved');
        } else {
          toast.warning(`Sanction screening flagged: ${data.report.riskRating} risk`);
        }
      } else {
        toast.error('Screening failed.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Compliance service error.');
    } finally {
      setScreeningLoading(false);
    }
  };

  const saveBooking = async () => {
    if (!bookingForm.referenceNumber || !bookingForm.originPort || !bookingForm.destinationPort) {
      toast.error('Please fill required fields (Reference, Origin, Destination)');
      return;
    }

    if (screeningResult && !screeningResult.isApproved && !waiverApplied) {
      toast.error('Cannot save booking. Compliance Screening blocked this transaction due to High/Critical risk. Apply a waiver or choose a different consignee/commodity.');
      return;
    }

    try {
      await fetchApi('/shipments', token, {
        method: 'POST',
        body: JSON.stringify(bookingForm)
      });
      toast.success('Booking created successfully');
      localStorage.removeItem('scm_booking_form_draft');
      setBookingForm({ type: 'Sea-FCL' });
      setIsBookingDialogOpen(false);
      loadBookings();
    } catch (err) {
      console.error(err);
      toast.error('Failed to create booking');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Booking Management</h2>
          <p className="text-muted-foreground text-sm">Manage shipment bookings and reusable templates</p>
        </div>
      </div>

      <Tabs defaultValue="bookings" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="bookings" className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Active Bookings</TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2"><FileText className="w-4 h-4" /> Shipment Templates</TabsTrigger>
          </TabsList>
          
          <div className="hidden sm:flex items-center gap-2">
             <Button onClick={openNewBooking} className="bg-blue-600 hover:bg-blue-700">
               <Plus className="w-4 h-4 mr-2" /> New Booking
             </Button>
          </div>
        </div>

        <TabsContent value="bookings" className="mt-0">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle>Current Bookings</CardTitle>
              <CardDescription>Shipments in Draft or Booked status</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
              ) : bookings.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="text-foreground font-medium">No active bookings</div>
                    <p className="text-muted-foreground text-sm max-w-sm">Create a new booking manually or from a template.</p>
                    <Button onClick={openNewBooking} variant="outline" className="mt-4">
                      Create Booking
                    </Button>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map(b => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.referenceNumber}</TableCell>
                        <TableCell>
                          <Badge variant={b.status === 'Booked' ? 'default' : 'secondary'}>{b.status}</Badge>
                        </TableCell>
                        <TableCell>{b.originPort || 'TBD'} &rarr; {b.destinationPort || 'TBD'}</TableCell>
                        <TableCell>{b.type}</TableCell>
                        <TableCell>{new Date(b.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-0">
          <Card>
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle>Saved Templates</CardTitle>
                <CardDescription>Reusable configurations for frequent routes</CardDescription>
              </div>
              <Button onClick={() => setIsTemplateDialogOpen(true)} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" /> Save New Template
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {templates.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <Save className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="text-foreground font-medium">No templates saved</div>
                    <p className="text-muted-foreground text-sm max-w-sm">Save a template to quickly create repeat bookings.</p>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template Name</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Carrier / Agent</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map(t => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell>{t.originPort} &rarr; {t.destinationPort}</TableCell>
                        <TableCell>{t.carrier || 'Any'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{t.type}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                           <Button variant="ghost" size="sm" onClick={() => openBookingFromTemplate(t)} className="text-blue-600 hover:text-blue-700 mr-2">
                             <Play className="w-4 h-4 mr-1" /> Use
                           </Button>
                           <Button variant="ghost" size="sm" onClick={() => deleteTemplate(t.id)} className="text-red-500 hover:text-red-600">
                             Delete
                           </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Save Shipment Template</DialogTitle>
            <DialogDescription>
              Create a reusable template for frequent routes.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Template Name</Label>
              <Input 
                placeholder="e.g. Weekly Shenzhen to LA" 
                value={templateForm.name || ''} 
                onChange={e => setTemplateForm({...templateForm, name: e.target.value})} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Origin Port</Label>
                <Input 
                  placeholder="e.g. Shenzhen"
                  value={templateForm.originPort || ''} 
                  onChange={e => setTemplateForm({...templateForm, originPort: e.target.value})} 
                />
              </div>
              <div className="grid gap-2">
                <Label>Destination Port</Label>
                <Input 
                  placeholder="e.g. Los Angeles"
                  value={templateForm.destinationPort || ''} 
                  onChange={e => setTemplateForm({...templateForm, destinationPort: e.target.value})} 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="grid gap-2">
                <Label>Transport Type</Label>
                <Select value={templateForm.type || 'Sea-FCL'} onValueChange={v => setTemplateForm({...templateForm, type: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sea-FCL">Sea-FCL</SelectItem>
                    <SelectItem value="Sea-LCL">Sea-LCL</SelectItem>
                    <SelectItem value="Air">Air</SelectItem>
                    <SelectItem value="Road">Road</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Preferred Carrier</Label>
                <Input 
                  placeholder="e.g. Maersk"
                  value={templateForm.carrier || ''} 
                  onChange={e => setTemplateForm({...templateForm, carrier: e.target.value})} 
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveTemplate} className="bg-blue-600 hover:bg-blue-700">Save Template</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Dialog */}
      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Booking</DialogTitle>
            <DialogDescription>
              Confirm details to create a new shipment booking.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[450px] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-xs">Reference Number</Label>
                <Input 
                  value={bookingForm.referenceNumber || ''} 
                  onChange={e => setBookingForm({...bookingForm, referenceNumber: e.target.value})} 
                  className="text-xs"
                />
              </div>
               <div className="grid gap-2">
                <Label className="text-xs">Status</Label>
                <Select value={bookingForm.status || 'Draft'} onValueChange={v => setBookingForm({...bookingForm, status: v})}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Booked">Booked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-xs">Origin Port</Label>
                <Input 
                  placeholder="Origin"
                  value={bookingForm.originPort || ''} 
                  onChange={e => setBookingForm({...bookingForm, originPort: e.target.value})} 
                  className="text-xs"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs">Destination Port</Label>
                <Input 
                  placeholder="Destination"
                  value={bookingForm.destinationPort || ''} 
                  onChange={e => setBookingForm({...bookingForm, destinationPort: e.target.value})} 
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="grid gap-2">
                <Label className="text-xs">Transport Type</Label>
                <Select value={bookingForm.type || 'Sea-FCL'} onValueChange={v => setBookingForm({...bookingForm, type: v})}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sea-FCL">Sea-FCL</SelectItem>
                    <SelectItem value="Sea-LCL">Sea-LCL</SelectItem>
                    <SelectItem value="Air">Air</SelectItem>
                    <SelectItem value="Road">Road</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-xs">Carrier (Optional)</Label>
                <Input 
                  placeholder="Carrier ID or Name"
                  value={bookingForm.carrierId || ''} 
                  onChange={e => setBookingForm({...bookingForm, carrierId: e.target.value})} 
                  className="text-xs"
                />
              </div>
            </div>

            <div className="border-t pt-3 mt-1 space-y-3">
              <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400">OFAC & Export Compliance screening</h4>
              
              <div className="grid gap-2">
                <Label className="text-[11px]">Consignee Entity Name</Label>
                <Input 
                  placeholder="e.g. Al-Fayeed Industrial Equipment" 
                  value={bookingForm.consigneeName || ''}
                  onChange={e => setBookingForm({...bookingForm, consigneeName: e.target.value})}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-[11px]">Destination Country</Label>
                  <Input 
                    placeholder="e.g. China" 
                    value={bookingForm.destinationCountry || ''}
                    onChange={e => setBookingForm({...bookingForm, destinationCountry: e.target.value})}
                    className="text-xs"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[11px]">Commodity / Goods</Label>
                  <Input 
                    placeholder="e.g. Carbon valves" 
                    value={bookingForm.commodity || ''}
                    onChange={e => setBookingForm({...bookingForm, commodity: e.target.value})}
                    className="text-xs"
                  />
                </div>
              </div>

              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={handleBookingScreening}
                disabled={screeningLoading}
                className="w-full text-xs font-semibold border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
              >
                {screeningLoading ? (
                  <>
                    <Clock className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Screening Consignee against SDN/OFAC lists...
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5 mr-1.5" />
                    Verify Trade Compliance & Embargos
                  </>
                )}
              </Button>

              {screeningResult && (
                <div className={`p-2.5 rounded text-xs border ${
                  screeningResult.isApproved 
                    ? 'bg-emerald-50 dark:bg-emerald-950/10 border-emerald-200 text-emerald-800 dark:text-emerald-300' 
                    : 'bg-red-50 dark:bg-red-950/10 border-red-200 text-red-800 dark:text-red-300'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold flex items-center gap-1">
                      {screeningResult.isApproved ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ShieldAlert className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                      )}
                      {screeningResult.isApproved ? 'Compliance Approved' : 'COMPLIANCE BLOCKED'}
                    </span>
                    <Badge variant="outline" className={`text-[9px] px-1 py-0 ${
                      screeningResult.riskRating === 'CRITICAL' || screeningResult.riskRating === 'HIGH' ? 'bg-red-200 text-red-800 border-red-300' : 'bg-emerald-200 text-emerald-800 border-emerald-300'
                    }`}>
                      {screeningResult.riskRating} RISK
                    </Badge>
                  </div>
                  <p className="text-[10px] leading-tight text-zinc-600 dark:text-zinc-400">
                    <strong>OFAC SDN match:</strong> {screeningResult.ofacMatchPercentage}% — {screeningResult.ofacDetails}
                  </p>
                  <p className="text-[10px] leading-tight text-zinc-600 dark:text-zinc-400 mt-1">
                    <strong>Dual-use check:</strong> {screeningResult.dualUseCheck}
                  </p>
                  
                  {!screeningResult.isApproved && (
                    <div className="mt-2 pt-2 border-t border-red-200/50 flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="waiver" 
                        checked={waiverApplied} 
                        onChange={(e) => setWaiverApplied(e.target.checked)}
                        className="rounded text-red-600"
                      />
                      <label htmlFor="waiver" className="text-[10px] font-bold text-red-700 dark:text-red-400 cursor-pointer">
                        Apply Board-Approved Waiver / Exception Certificate
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsBookingDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveBooking} className="bg-blue-600 hover:bg-blue-700">Confirm Booking</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
