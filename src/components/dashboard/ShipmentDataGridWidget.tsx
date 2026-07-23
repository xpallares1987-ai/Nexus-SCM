import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/data-display/table';
import { Button } from '@/components/ui/forms/button';
import { Input } from '@/components/ui/forms/input';
import { Badge } from '@/components/ui/data-display/badge';
import { Download, Search, FileSpreadsheet } from 'lucide-react';
import Papa from 'papaparse';
import { toast } from 'sonner';

interface ShipmentDataGridWidgetProps {
  shipments: any[];
}


const getStatusColor = (status: string) => {
  switch(status) {
    case 'Delivered': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'In Transit': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'Delayed': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default: return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300';
  }
};

const GridTableRow = React.memo(({ s, getStatusColor }: any) => {
  const isAtRisk = s.isPredictiveAtRisk || s.delayRisk === 'High' || s.delayRisk === 'Medium' || s.status === 'Delayed';
  return (
    <TableRow className="group hover:bg-muted/40 transition-colors">
      <TableCell className="font-medium py-3.5">
        <div>{s.referenceNumber}</div>
        {s.predictiveReason && (
          <div className="text-[10px] text-amber-600 dark:text-amber-500 font-normal mt-1 max-w-[200px] truncate" title={s.predictiveReason}>
            {s.predictiveReason}
          </div>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge className={getStatusColor(s.status)} variant="outline">
            {s.status}
          </Badge>
          {isAtRisk && s.status !== 'Delivered' && (
            <Badge className="bg-red-50 text-red-600 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900 animate-pulse text-[10px] h-5 py-0 px-1.5 font-medium flex items-center gap-0.5" variant="outline">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              At Risk
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">{s.type}</TableCell>
      <TableCell className="text-sm">{s.originPort || 'N/A'}</TableCell>
      <TableCell className="text-sm">{s.destinationPort || 'N/A'}</TableCell>
      <TableCell className="text-sm text-zinc-500">
        {s.eta ? new Date(s.eta).toLocaleDateString() : '-'}
      </TableCell>
    </TableRow>
  );
});
GridTableRow.displayName = 'GridTableRow';

export function ShipmentDataGridWidget({ shipments }: ShipmentDataGridWidgetProps) {
  const [search, setSearch] = useState('');

  const filteredShipments = shipments.filter(s => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      (s.referenceNumber && s.referenceNumber.toLowerCase().includes(term)) ||
      (s.originPort && s.originPort.toLowerCase().includes(term)) ||
      (s.destinationPort && s.destinationPort.toLowerCase().includes(term)) ||
      (s.status && s.status.toLowerCase().includes(term))
    );
  });

  const handleExportCSV = () => {
    try {
      if (!filteredShipments.length) {
        toast.error('No data to export');
        return;
      }

      const csvData = filteredShipments.map(s => ({
        'Reference Number': s.referenceNumber,
        'Status': s.status,
        'Type': s.type,
        'Origin Port': s.originPort || 'N/A',
        'Destination Port': s.destinationPort || 'N/A',
        'ETA': s.eta ? new Date(s.eta).toLocaleDateString() : 'N/A',
        'ETD': s.etd ? new Date(s.etd).toLocaleDateString() : 'N/A',
        'Created At': s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'N/A'
      }));

      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `shipment_analytics_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Successfully exported to CSV');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export to CSV');
    }
  };

  

  return (
    <Card className="h-full flex flex-col shadow-sm border-zinc-200 dark:border-zinc-800">
      <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Shipment Data Grid
            </CardTitle>
            <CardDescription className="mt-1.5">
              Review, filter, and export current shipment analytics data.
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input 
                placeholder="Search Reference, Port, Status..." 
                className="pl-9 h-9 bg-background"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Button onClick={handleExportCSV} disabled={filteredShipments.length === 0} className="h-9 gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 min-h-[300px] overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1 max-h-[400px]">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>ETA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredShipments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
                      <p>No shipments match your search.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredShipments.slice(0, 100).map((s, i) => (
                  <GridTableRow key={s.id || i} s={s} getStatusColor={getStatusColor} />
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {filteredShipments.length > 100 && (
          <div className="p-3 text-xs text-center text-muted-foreground bg-muted/30 border-t border-border">
            Showing first 100 results. Export to CSV to view all {filteredShipments.length} records.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
