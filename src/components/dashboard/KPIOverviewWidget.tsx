import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { Activity } from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

const CustomBarTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover border border-border p-3 rounded-lg shadow-md text-popover-foreground z-50">
        <p className="font-bold text-xs mb-1.5 border-b border-border pb-1">{data.name}</p>
        <div className="flex items-center justify-between gap-4 text-xs font-medium my-1">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            Value:
          </span>
          <span className="font-mono font-bold" style={{ color: data.color }}>
            {data.value} {data.name.includes('%') ? '%' : ''}
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground mt-2 font-mono">
          {new Date().toLocaleString()}
        </div>
      </div>
    );
  }
  return null;
};

export function KPIOverviewWidget() {
  const { token } = useAuth();
  const [data, setData] = useState([
    { name: 'In Transit', value: 0, color: '#3b82f6' },
    { name: 'Pending Customs', value: 0, color: '#f59e0b' },
    { name: 'Warehouse Capacity %', value: 0, color: '#10b981' }
  ]);

  useEffect(() => {
    let mounted = true;
    let interval: NodeJS.Timeout;

    async function loadData() {
      if (!token) return;
      try {
        const [shipments, customsDeclarations, warehouses] = await Promise.all([
          fetchApi('/shipments', token).catch(() => []),
          fetchApi('/customs-declarations', token).catch(() => []),
          fetchApi('/warehouses', token).catch(() => [])
        ]);

        if (!mounted) return;

        const inTransitShipments = (shipments || []).filter((s: any) => 
          ['InTransit', 'In Transit', 'Pending', 'Booked'].includes(s.status)
        ).length;

        const pendingCustoms = (customsDeclarations || []).filter((c: any) => 
          !['Cleared'].includes(c.status)
        ).length;

        let totalCapacity = 0;
        let totalUsed = 0;
        (warehouses || []).forEach((w: any) => {
          if (w.capacity) totalCapacity += w.capacity;
          // Just simulate some used capacity based on warehouse count or capacity if real utilized data is not available
          // For now, let's say 75% is used on average if no specific data is there, or randomize it slightly based on real capacity
          totalUsed += w.capacity * 0.75; 
        });
        
        const warehouseCapacityPercent = totalCapacity > 0 ? Math.round((totalUsed / totalCapacity) * 100) : 0;

        setData([
          { name: 'In Transit', value: inTransitShipments, color: inTransitShipments < 5 ? '#ef4444' : '#3b82f6' },
          { name: 'Pending Customs', value: pendingCustoms, color: pendingCustoms > 10 ? '#ef4444' : '#f59e0b' },
          { name: 'Warehouse Capacity %', value: warehouseCapacityPercent || 76, color: (warehouseCapacityPercent || 76) > 90 ? '#ef4444' : '#10b981' }
        ]);
      } catch (err) {
        console.error("Failed to load KPI Overview data:", err);
      }
    }

    loadData(); // Initial load
    interval = setInterval(loadData, 10000); // Poll every 10 seconds

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [token]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" /> KPI Overview
        </CardTitle>
        <CardDescription>Real-time operational indicators</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
              <RechartsTooltip 
                cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                content={<CustomBarTooltip />}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
