import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { Button } from '@/components/ui/forms/button';
import { fetchApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Download, Filter, Table as TableIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/forms/select';
import { Label } from '@/components/ui/forms/label';
import { Input } from '@/components/ui/forms/input';
import { toast } from 'sonner';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Skeleton } from '@/components/ui/feedback/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export function ShipmentReports() {
  const { token } = useAuth();
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!token) return;
      try {
        setLoading(true);
        const data = await fetchApi('/shipments', token);
        setShipments(data || []);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load shipments for reporting');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [token]);

  const filteredShipments = useMemo(() => {
    let result = shipments;
    if (statusFilter !== 'all') {
      result = result.filter(s => s.status === statusFilter);
    }
    if (typeFilter !== 'all') {
      result = result.filter(s => s.type === typeFilter);
    }
    if (startDate) {
      result = result.filter(s => new Date(s.createdAt) >= new Date(startDate));
    }
    if (endDate) {
      // Set to end of day
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(s => new Date(s.createdAt) <= end);
    }
    return result;
  }, [shipments, statusFilter, typeFilter, startDate, endDate]);

  const monthlyThroughputData = useMemo(() => {
    // Generate the last 6 months
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleString('default', { month: 'short' }) + ' ' + d.getFullYear(),
        month: d.getMonth(),
        year: d.getFullYear(),
        count: 0
      });
    }

    filteredShipments.forEach(s => {
      if (s.createdAt) {
        const d = new Date(s.createdAt);
        const monthMatch = months.find(m => m.month === d.getMonth() && m.year === d.getFullYear());
        if (monthMatch) {
          monthMatch.count++;
        }
      }
    });

    return months;
  }, [filteredShipments]);

  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      if (!filteredShipments.length) {
        toast.error('No data to export');
        return;
      }
      
      const csvData = filteredShipments.map(s => ({
        'Reference': s.referenceNumber,
        'Tracking': s.trackingNumber || '',
        'Type': s.type,
        'Status': s.status,
        'Priority': s.priority || 'Normal',
        'Origin': s.originPort || '',
        'Destination': s.destinationPort || '',
        'ETA': s.eta ? new Date(s.eta).toLocaleDateString() : '',
        'ETD': s.etd ? new Date(s.etd).toLocaleDateString() : '',
        'Created At': s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '',
      }));

      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `shipment_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Exported to CSV');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      if (!filteredShipments.length) {
        toast.error('No data to export');
        return;
      }

      const doc = new jsPDF('landscape');
      
      doc.setFontSize(18);
      doc.text('Shipment Report', 14, 22);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
      doc.text(`Total Shipments: ${filteredShipments.length}`, 14, 36);

      const tableColumn = ["Reference", "Type", "Status", "Priority", "Origin", "Destination", "ETA", "Created At"];
      const tableRows = filteredShipments.map(s => [
        s.referenceNumber,
        s.type,
        s.status,
        s.priority || 'Normal',
        s.originPort || 'N/A',
        s.destinationPort || 'N/A',
        s.eta ? new Date(s.eta).toLocaleDateString() : 'N/A',
        s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'N/A'
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 45,
        theme: 'striped',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 }
      });

      doc.save(`shipment_report_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Exported to PDF');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Shipment Reports
          </h2>
          <p className="text-sm text-muted-foreground">Filter and export shipment data</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Report Configuration</CardTitle>
          <CardDescription>Select filters for the report</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Booked">Booked</SelectItem>
                  <SelectItem value="InTransit">In Transit</SelectItem>
                  <SelectItem value="Arrived">Arrived</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Transport Mode</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Modes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  <SelectItem value="Sea-FCL">Sea (FCL)</SelectItem>
                  <SelectItem value="Sea-LCL">Sea (LCL)</SelectItem>
                  <SelectItem value="Air">Air</SelectItem>
                  <SelectItem value="Road">Road</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
              />
            </div>
            
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center p-4 bg-muted/30 rounded-lg border border-border">
            <div className="flex-1">
              <h3 className="font-medium text-sm flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-muted-foreground" />
                Preview: {filteredShipments.length} records selected
              </h3>
              <p className="text-xs text-muted-foreground mt-1">Export this dataset as CSV or PDF</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button onClick={handleExportCSV} disabled={isExporting || filteredShipments.length === 0} variant="outline" className="flex-1 sm:flex-none">
                <TableIcon className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={handleExportPDF} disabled={isExporting || filteredShipments.length === 0} className="flex-1 sm:flex-none">
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Monthly Shipment Throughput</CardTitle>
          <CardDescription>Operational volume trends over the last 6 months based on current filters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyThroughputData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <RechartsTooltip 
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      {filteredShipments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Sample Data Preview (First 5 records)</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-muted/50 uppercase">
                  <tr>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Origin</th>
                    <th className="px-4 py-3">Destination</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShipments.slice(0, 5).map((s, i) => (
                    <tr key={s.id || i} className="border-b border-border/50">
                      <td className="px-4 py-3 font-medium">{s.referenceNumber}</td>
                      <td className="px-4 py-3">{s.type}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{s.originPort || '-'}</td>
                      <td className="px-4 py-3">{s.destinationPort || '-'}</td>
                      <td className="px-4 py-3">{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
