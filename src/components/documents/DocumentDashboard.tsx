import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { Badge } from '@/components/ui/data-display/badge';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { FileText, Clock, AlertTriangle, PenTool, Calendar, ShieldAlert } from 'lucide-react';
import { format, differenceInDays, addDays, parseISO, isAfter, isBefore } from 'date-fns';
import { Document } from './DocumentHub';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function DocumentDashboard({ documents }: { documents: Document[] }) {
  const { recentUploads, pendingSignatures, upcomingExpirations, stats, typeData, timelineData } = useMemo(() => {
    const sortedDocs = [...documents].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const recent = sortedDocs.slice(0, 5);
    const pending = sortedDocs.filter(d => d.status === 'Pending' || d.status === 'Awaiting Signature');
    
    // For demonstration, let's assume some documents expire 30 days after creation if no explicit expirationDate exists in metadata, 
    // just to show the feature if there isn't one, but we check metadata first.
    const today = new Date();
    const expirations = sortedDocs.map(d => {
      let expDate = d.extractedMetadata?.expirationDate ? new Date(d.extractedMetadata.expirationDate) : addDays(new Date(d.createdAt), 90);
      return { ...d, expDate };
    }).filter(d => isAfter(d.expDate, today) && differenceInDays(d.expDate, today) <= 30)
      .sort((a, b) => a.expDate.getTime() - b.expDate.getTime())
      .slice(0, 5);

    // Stats
    const total = documents.length;
    const verifiedCount = documents.filter(d => d.status === 'Approved' || d.extractedMetadata?.validationStatus === 'Verified').length;
    
    // Type Distribution Data
    const typeCount: Record<string, number> = {};
    documents.forEach(d => {
      typeCount[d.documentType] = (typeCount[d.documentType] || 0) + 1;
    });
    const typeData = Object.entries(typeCount).map(([name, value]) => ({ name, value }));

    // Timeline Data (Uploads over last 7 days)
    const timelineMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      timelineMap[format(addDays(today, -i), 'MMM dd')] = 0;
    }
    documents.forEach(d => {
      const dateStr = format(new Date(d.createdAt), 'MMM dd');
      if (timelineMap[dateStr] !== undefined) {
        timelineMap[dateStr]++;
      }
    });
    const timelineData = Object.entries(timelineMap).map(([date, count]) => ({ date, count }));

    return { 
      recentUploads: recent, 
      pendingSignatures: pending, 
      upcomingExpirations: expirations,
      stats: { total, pending: pending.length, verified: verifiedCount },
      typeData,
      timelineData
    };
  }, [documents]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-indigo-100 dark:border-indigo-900/50 shadow-sm bg-indigo-50/30 dark:bg-indigo-900/10">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">Total Documents</span>
              <p className="text-3xl font-extrabold text-foreground">{stats.total}</p>
            </div>
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl">
              <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-amber-100 dark:border-amber-900/50 shadow-sm bg-amber-50/30 dark:bg-amber-900/10">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">Pending Action</span>
              <p className="text-3xl font-extrabold text-foreground">{stats.pending}</p>
            </div>
            <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-xl">
              <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-emerald-100 dark:border-emerald-900/50 shadow-sm bg-emerald-50/30 dark:bg-emerald-900/10">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Verified / Approved</span>
              <p className="text-3xl font-extrabold text-foreground">{stats.verified}</p>
            </div>
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl">
              <ShieldAlert className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Charts */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BarChart className="w-4 h-4 text-indigo-500" /> Document Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {typeData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-muted-foreground truncate max-w-[100px]" title={entry.name}>{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <LineChart className="w-4 h-4 text-indigo-500" /> Upload Activity (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.1)" />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-border shadow-sm flex flex-col">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" /> Recent Uploads
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto max-h-[300px]">
            {recentUploads.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">No recent uploads.</div>
            ) : (
              <div className="divide-y divide-border/50">
                {recentUploads.map(doc => (
                  <div key={doc.id} className="p-3 hover:bg-muted/30 transition-colors flex flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground truncate">{doc.fileName}</span>
                      <Badge variant="outline" className="text-[9px] bg-background">{doc.documentType}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{doc.uploadedBy}</span>
                      <span>{format(new Date(doc.createdAt), 'MMM dd, HH:mm')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm flex flex-col">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <PenTool className="w-4 h-4 text-amber-500" /> Pending Signatures & Approvals
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto max-h-[300px]">
            {pendingSignatures.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">All caught up! No pending documents.</div>
            ) : (
              <div className="divide-y divide-border/50">
                {pendingSignatures.map(doc => (
                  <div key={doc.id} className="p-3 hover:bg-muted/30 transition-colors flex flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground truncate">{doc.fileName}</span>
                      <Badge variant="outline" className="text-[9px] border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-900/20">{doc.status}</Badge>
                    </div>
                    <div className="flex items-center text-[10px] text-muted-foreground">
                      <span className="truncate">Ref: {doc.shipmentId.substring(0, 8)}...</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm flex flex-col bg-rose-50/30 dark:bg-rose-900/5">
          <CardHeader className="pb-3 border-b border-rose-100 dark:border-rose-900/30">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-rose-700 dark:text-rose-400">
              <Calendar className="w-4 h-4" /> Upcoming Expirations
            </CardTitle>
            <CardDescription className="text-[10px]">Expiring within 30 days</CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto max-h-[300px]">
            {upcomingExpirations.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">No documents expiring soon.</div>
            ) : (
              <div className="divide-y divide-rose-100 dark:divide-rose-900/30">
                {upcomingExpirations.map(doc => {
                  const daysLeft = differenceInDays(doc.expDate, new Date());
                  const isUrgent = daysLeft <= 7;
                  return (
                    <div key={doc.id} className="p-3 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors flex flex-col gap-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground truncate">{doc.fileName}</span>
                        <Badge variant="outline" className={`text-[9px] ${isUrgent ? 'border-rose-500 text-rose-700 bg-rose-100 dark:bg-rose-900/40' : 'border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-900/20'}`}>
                          {daysLeft} days left
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="truncate">{doc.documentType}</span>
                        <span>{format(doc.expDate, 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
