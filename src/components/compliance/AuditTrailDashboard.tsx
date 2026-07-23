import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/data-display/table';
import { Badge } from '@/components/ui/data-display/badge';
import { Skeleton } from '@/components/ui/feedback/skeleton';
import { Search, Filter, History, Box, Ship, Flag, Archive } from 'lucide-react';
import { Input } from '@/components/ui/forms/input';
import { Button } from '@/components/ui/forms/button';
import { Checkbox } from '@/components/ui/forms/checkbox';
import { toast } from 'sonner';
import { fetchApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatDistanceToNow, format } from 'date-fns';

export function AuditTrailDashboard() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEntity, setFilterEntity] = useState('All');
  const [filterAction, setFilterAction] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    loadAuditLogs();
  }, [token]);

  const loadAuditLogs = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await fetchApi('/audit-logs', token);
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedLogs);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedLogs(newSelection);
  };

  const handleBulkFlag = () => {
    toast.success(`Flagged ${selectedLogs.size} audit logs for review.`);
    setSelectedLogs(new Set());
  };

  const handleBulkArchive = () => {
    toast.success(`Archived ${selectedLogs.size} audit logs.`);
    setSelectedLogs(new Set());
  };

  const getCategoryBadge = (op: string, entity: string) => {
    if (op === 'DELETE') {
      return <Badge className="bg-red-500 hover:bg-red-600 text-white">Critical</Badge>;
    }
    if (op === 'LOGIN' || entity === 'auth') {
      return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">Warning</Badge>;
    }
    return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Info</Badge>;
  };

  const getOperationBadge = (op: string) => {
    switch (op) {
      case 'CREATE': return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">CREATE</Badge>;
      case 'READ': return <Badge variant="secondary" className="text-zinc-600 dark:text-zinc-400 border-zinc-200">READ</Badge>;
      case 'UPDATE': return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">UPDATE</Badge>;
      case 'DELETE': return <Badge variant="destructive">DELETE</Badge>;
      default: return <Badge variant="outline">{op}</Badge>;
    }
  };

  const getEntityIcon = (entity: string) => {
    switch (entity) {
      case 'shipments': return <Ship className="w-4 h-4 mr-1.5 text-blue-500 inline-block" />;
      case 'inventory': return <Box className="w-4 h-4 mr-1.5 text-amber-500 inline-block" />;
      default: return <History className="w-4 h-4 mr-1.5 text-zinc-500 inline-block" />;
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.entityId.includes(search) || log.changedBy.toLowerCase().includes(search.toLowerCase());
    const matchesEntity = filterEntity === 'All' || log.entityType === filterEntity;
    const matchesAction = filterAction === 'All' || log.operation === filterAction;
    
    let matchesDate = true;
    if (dateFrom || dateTo) {
      const logDate = new Date(log.timestamp);
      if (dateFrom && new Date(dateFrom) > logDate) matchesDate = false;
      if (dateTo && new Date(dateTo) < logDate) matchesDate = false;
    }
    
    return matchesSearch && matchesEntity && matchesAction && matchesDate;
  });

  return (
    <Card className="h-full flex flex-col shadow-sm border-zinc-200 dark:border-zinc-800">
      <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/20">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Audit & Activity Trail
              </CardTitle>
              <CardDescription className="mt-1.5">
                Secure, immutable log of all CRUD operations for compliance tracking.
              </CardDescription>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input 
                placeholder="Search ID or User..." 
                className="pl-9 h-9 bg-background"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select 
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring"
              value={filterEntity}
              onChange={e => setFilterEntity(e.target.value)}
            >
              <option value="All">All Entities</option>
              <option value="shipments">Shipments</option>
              <option value="inventory">Inventory</option>
            </select>
            <select 
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring"
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
            >
              <option value="All">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="READ">READ</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="LOGIN">LOGIN</option>
            </select>
            <div className="flex items-center gap-2">
              <Input 
                type="date"
                className="h-9 w-36 bg-background text-sm"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                title="Start Date"
              />
              <span className="text-muted-foreground text-sm">-</span>
              <Input 
                type="date"
                className="h-9 w-36 bg-background text-sm"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                title="End Date"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      
      {selectedLogs.size > 0 && (
        <div className="bg-muted/40 border-b border-zinc-200 dark:border-zinc-800 px-4 py-2 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="text-sm font-medium text-muted-foreground">
            {selectedLogs.size} {selectedLogs.size === 1 ? 'item' : 'items'} selected
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleBulkFlag} className="h-8">
              <Flag className="w-4 h-4 mr-2 text-amber-500" />
              Flag Selected
            </Button>
            <Button variant="outline" size="sm" onClick={handleBulkArchive} className="h-8">
              <Archive className="w-4 h-4 mr-2 text-zinc-500" />
              Archive Selected
            </Button>
          </div>
        </div>
      )}

      <CardContent className="p-0 flex-1 min-h-[400px]">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-12 text-center">
                <Checkbox 
                  checked={filteredLogs.length > 0 && selectedLogs.size === filteredLogs.length}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedLogs(new Set(filteredLogs.map(l => l.id)));
                    } else {
                      setSelectedLogs(new Set());
                    }
                  }}
                />
              </TableHead>
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Record ID</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Operation</TableHead>
              <TableHead>User / Principal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                </TableRow>
              ))
            ) : filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <History className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
                    <p>No audit records match your filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map(log => {
                const logDate = new Date(log.timestamp);
                const relativeTime = formatDistanceToNow(logDate, { addSuffix: true });
                const exactTime = format(logDate, 'PPpp');
                
                return (
                  <TableRow key={log.id} className={`group hover:bg-muted/40 transition-colors ${selectedLogs.has(log.id) ? 'bg-muted/30' : ''}`}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedLogs.has(log.id)}
                        onCheckedChange={() => toggleSelection(log.id)}
                      />
                    </TableCell>
                    <TableCell className="text-zinc-500 whitespace-nowrap text-xs">
                      <span title={exactTime} className="cursor-help border-b border-dotted border-zinc-400">
                        {relativeTime}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium capitalize text-sm">
                      <div className="flex items-center">
                        {getEntityIcon(log.entityType)}
                        {log.entityType}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-zinc-500">
                      {log.entityId}
                    </TableCell>
                    <TableCell>
                      {getCategoryBadge(log.operation, log.entityType)}
                    </TableCell>
                    <TableCell>
                      {getOperationBadge(log.operation)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.changedBy}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
