import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/data-display/card';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, ResponsiveContainer, YAxis, XAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { fetchApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { DollarSign, TrendingUp, TrendingDown, PieChart, BarChart2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/feedback/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/forms/select';
import { RouteCostMap } from './RouteCostMap';

export function CostAnalysisDashboard() {
  const { token, profile } = useAuth();
  const isDark = profile?.theme === 'dark' || document.documentElement.classList.contains('dark');
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    async function loadData() {
      if (!token) return;
      try {
        setLoading(true);
        const data = await fetchApi('/shipments', token);
        setShipments(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [token]);

  // Aggregate cost logic
  const aggregatedData = useMemo(() => {
    if (!shipments.length) return null;

    let totalFreight = 0;
    let totalCustoms = 0;
    let totalInsurance = 0;

    const costsByCarrier: Record<string, number> = {};
    const weightByCarrier: Record<string, number> = {};
    const costsByRoute: Record<string, number> = {};
    const costsByMode: Record<string, number> = {};
    
    // For time-series
    const timeSeriesMap: Record<string, any> = {};
    
    // For last 12 months
    const last12MonthsMap: Record<string, any> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = d.toISOString().substring(0, 7);
      const formattedMonth = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      last12MonthsMap[monthKey] = { monthKey, monthLabel: formattedMonth, freight: 0 };
    }

    // For last quarter (last 3 months)
    const lastQuarterMap: Record<string, any> = {};
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = d.toISOString().substring(0, 7);
      const formattedMonth = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      lastQuarterMap[monthKey] = { monthKey, monthLabel: formattedMonth, freight: 0 };
    }

    shipments.forEach(s => {
      const freight = parseFloat(s.freightCost) || 0;
      const customs = parseFloat(s.customsCost) || 0;
      const insurance = parseFloat(s.insuranceCost) || 0;
      const total = freight + customs + insurance;
      
      const weight = parseFloat(s.weight) || 0; // Use actual weight or default if 0

      totalFreight += freight;
      totalCustoms += customs;
      totalInsurance += insurance;

      const carrierName = s.carrierId ? s.carrierId.substring(0,8) : 'Unknown'; // simplified since we don't fetch carrier name
      costsByCarrier[carrierName] = (costsByCarrier[carrierName] || 0) + total;
      if (weight > 0) {
        weightByCarrier[carrierName] = (weightByCarrier[carrierName] || 0) + weight;
      }

      const route = `${s.originPort || 'Unknown'} -> ${s.destinationPort || 'Unknown'}`;
      costsByRoute[route] = (costsByRoute[route] || 0) + total;

      const mode = s.type || 'Unknown';
      costsByMode[mode] = (costsByMode[mode] || 0) + total;

      const dateStr = s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : 'Unknown';
      if (!timeSeriesMap[dateStr]) {
        timeSeriesMap[dateStr] = { date: dateStr, freight: 0, customs: 0, insurance: 0, total: 0 };
      }
      timeSeriesMap[dateStr].freight += freight;
      timeSeriesMap[dateStr].customs += customs;
      timeSeriesMap[dateStr].insurance += insurance;
      timeSeriesMap[dateStr].total += total;

      const monthKey = s.createdAt ? new Date(s.createdAt).toISOString().substring(0, 7) : null;
      if (monthKey && last12MonthsMap[monthKey]) {
        last12MonthsMap[monthKey].freight += freight;
      }
      if (monthKey && lastQuarterMap[monthKey]) {
        lastQuarterMap[monthKey].freight += freight;
      }
    });

    // Format for charts
    const timeSeries = Object.values(timeSeriesMap).sort((a: any, b: any) => a.date.localeCompare(b.date));
    const monthlyFreightSeries = Object.values(last12MonthsMap);
    const lastQuarterSeries = Object.values(lastQuarterMap);
    
    const carrierData = Object.entries(costsByCarrier).map(([name, cost]) => ({ name, cost })).sort((a,b) => b.cost - a.cost).slice(0, 5);
    
    let bestCarrierCostPerKg = null;
    Object.keys(costsByCarrier).forEach(name => {
      const w = weightByCarrier[name] || 0;
      const c = costsByCarrier[name] || 0;
      if (w > 0) {
        const costPerKg = c / w;
        if (!bestCarrierCostPerKg || costPerKg < bestCarrierCostPerKg.costPerKg) {
          bestCarrierCostPerKg = { name, costPerKg };
        }
      }
    });

    const routeData = Object.entries(costsByRoute).map(([name, cost]) => ({ name, cost })).sort((a,b) => b.cost - a.cost).slice(0, 5);
    const modeData = Object.entries(costsByMode).map(([name, cost]) => ({ name, cost })).sort((a,b) => b.cost - a.cost);

    return {
      totals: {
        freight: totalFreight,
        customs: totalCustoms,
        insurance: totalInsurance,
        total: totalFreight + totalCustoms + totalInsurance
      },
      timeSeries,
      monthlyFreightSeries,
      lastQuarterSeries,
      carrierData,
      bestCarrierCostPerKg,
      routeData,
      modeData
    };

  }, [shipments, timeRange]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!aggregatedData) {
    return <div>No cost data available.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Cost Analysis</h2>
          <p className="text-sm text-muted-foreground">Breakdown of shipment expenses across the network</p>
        </div>
        <div className="w-48">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger>
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spend</CardTitle>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${aggregatedData.totals.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Freight Costs</CardTitle>
            <DollarSign className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${aggregatedData.totals.freight.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            <p className="text-xs text-muted-foreground mt-1">{((aggregatedData.totals.freight / aggregatedData.totals.total) * 100).toFixed(1)}% of total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Customs Costs</CardTitle>
            <DollarSign className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${aggregatedData.totals.customs.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            <p className="text-xs text-muted-foreground mt-1">{((aggregatedData.totals.customs / aggregatedData.totals.total) * 100).toFixed(1)}% of total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Insurance Costs</CardTitle>
            <DollarSign className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${aggregatedData.totals.insurance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            <p className="text-xs text-muted-foreground mt-1">{((aggregatedData.totals.insurance / aggregatedData.totals.total) * 100).toFixed(1)}% of total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Best Rate / kg</CardTitle>
            <TrendingDown className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {aggregatedData.bestCarrierCostPerKg ? (
              <>
                <div className="text-2xl font-bold">${aggregatedData.bestCarrierCostPerKg.costPerKg.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Carrier: <span className="font-semibold text-foreground">{aggregatedData.bestCarrierCostPerKg.name}</span>
                </p>
              </>
            ) : (
              <div className="text-lg font-medium text-muted-foreground">N/A</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Trends Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={aggregatedData.timeSeries} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFreight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCustoms" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`]}
                />
                <Legend />
                <Area type="monotone" dataKey="freight" stackId="1" stroke="#3b82f6" fillOpacity={1} fill="url(#colorFreight)" name="Freight" />
                <Area type="monotone" dataKey="customs" stackId="1" stroke="#a855f7" fillOpacity={1} fill="url(#colorCustoms)" name="Customs" />
                <Area type="monotone" dataKey="insurance" stackId="1" stroke="#f97316" fillOpacity={0.3} fill="#f97316" name="Insurance" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      
      {/* Monthly Trend Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>12-Month Freight Spend Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={aggregatedData.monthlyFreightSeries} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="monthLabel" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => [`$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 'Freight Spend']}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="freight" stroke="#10b981" strokeWidth={3} name="Freight Spend" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Last Quarter Freight Spend Trend</CardTitle>
            <span className="text-xs font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">Last 3 Months</span>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={aggregatedData.lastQuarterSeries} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="monthLabel" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => [`$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 'Freight Spend']}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="freight" stroke="#3b82f6" strokeWidth={3} name="Freight Spend" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Geospatial Cost & Inefficiency Route Map */}
      <RouteCostMap shipments={shipments} />

      {/* Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Costs by Service Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aggregatedData.modeData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={80} />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(value: number) => [`$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 'Cost']}
                  />
                  <Bar dataKey="cost" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 5 Routes by Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aggregatedData.routeData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={120} />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(value: number) => [`$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 'Cost']}
                  />
                  <Bar dataKey="cost" fill="#a855f7" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Carriers by Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aggregatedData.carrierData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={80} />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(value: number) => [`$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 'Cost']}
                  />
                  <Bar dataKey="cost" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
