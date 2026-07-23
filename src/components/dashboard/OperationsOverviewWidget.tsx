import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/data-display/card';
import { 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Line,
  ComposedChart,
  Area
} from 'recharts';
import { Activity, Package, Warehouse, TrendingUp } from 'lucide-react';

export function OperationsOverviewWidget() {
  const [data, setData] = useState<any[]>([]);

  // Generate initial data
  useEffect(() => {
    const initialData = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setHours(date.getHours() - (11 - i));
      return {
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        shipments: Math.floor(Math.random() * 50) + 10,
        warehouseActivity: Math.floor(Math.random() * 100) + 50,
        utilization: Math.floor(Math.random() * 30) + 60,
      };
    });
    setData(initialData);

    // Real-time updates
    const interval = setInterval(() => {
      setData((currentData) => {
        const newData = [...currentData];
        newData.shift(); // Remove oldest
        
        const now = new Date();
        newData.push({
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          shipments: Math.floor(Math.random() * 50) + 10,
          warehouseActivity: Math.floor(Math.random() * 100) + 50,
          utilization: Math.floor(Math.random() * 30) + 60,
        });
        
        return newData;
      });
    }, 5000); // Update every 5 seconds for visual activity

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="h-full flex flex-col shadow-sm border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
      <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-md font-semibold text-slate-800 dark:text-slate-200">
                Operations Overview
              </CardTitle>
              <CardDescription className="text-xs">Real-time volume & activity</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400">Live</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-1 flex flex-col min-h-[300px]">
        <div className="flex-1 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 10 }} 
                tickLine={false}
                axisLine={false}
                stroke="currentColor" 
                className="text-slate-500" 
              />
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 10 }} 
                tickLine={false}
                axisLine={false}
                stroke="currentColor" 
                className="text-slate-500" 
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                tick={{ fontSize: 10 }} 
                tickLine={false}
                axisLine={false}
                stroke="currentColor" 
                className="text-slate-500" 
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Area 
                yAxisId="right"
                type="monotone" 
                dataKey="warehouseActivity" 
                name="Warehouse Activity" 
                fill="url(#colorActivity)" 
                stroke="#8b5cf6" 
                strokeWidth={2} 
              />
              <Bar 
                yAxisId="left"
                dataKey="shipments" 
                name="Shipments Processed" 
                fill="#3b82f6" 
                radius={[4, 4, 0, 0]} 
                barSize={20}
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="utilization" 
                name="Capacity Utilization (%)" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ r: 3, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Package className="h-3 w-3" /> Shipments
            </span>
            <span className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {data.length > 0 ? data[data.length - 1].shipments : 0}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Activity className="h-3 w-3" /> Activity
            </span>
            <span className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {data.length > 0 ? data[data.length - 1].warehouseActivity : 0}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Warehouse className="h-3 w-3" /> Cap %
            </span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {data.length > 0 ? data[data.length - 1].utilization : 0}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
