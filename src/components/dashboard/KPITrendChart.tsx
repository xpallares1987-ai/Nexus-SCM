import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { TrendingUp, Package, Zap } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

type DateRange = 'last7' | 'last30' | 'custom';

const generateMockData = (range: DateRange) => {
  if (range === 'last7') {
    return [
      { date: 'Lun', throughput: 120, efficiency: 91 },
      { date: 'Mar', throughput: 135, efficiency: 94 },
      { date: 'Mie', throughput: 140, efficiency: 95 },
      { date: 'Jue', throughput: 110, efficiency: 90 },
      { date: 'Vie', throughput: 160, efficiency: 97 },
      { date: 'Sab', throughput: 90, efficiency: 92 },
      { date: 'Dom', throughput: 70, efficiency: 88 },
    ];
  } else if (range === 'last30') {
    return Array.from({ length: 30 }).map((_, i) => ({
      date: `Día ${i + 1}`,
      throughput: Math.floor(Math.random() * 100) + 100,
      efficiency: Math.floor(Math.random() * 15) + 85
    }));
  } else {
    // custom - returning a simulated custom range
    return [
      { date: '15 Sep', throughput: 105, efficiency: 90 },
      { date: '22 Sep', throughput: 220, efficiency: 95 },
      { date: '29 Sep', throughput: 180, efficiency: 93 },
      { date: '06 Oct', throughput: 195, efficiency: 96 },
      { date: '13 Oct', throughput: 210, efficiency: 97 },
    ];
  }
};

export function KPITrendChart() {
  const [dateRange, setDateRange] = useState<DateRange>('last7');

  const data = useMemo(() => generateMockData(dateRange), [dateRange]);

  const totalVolume = data.reduce((acc, curr) => acc + curr.throughput, 0);
  const avgEfficiency = (data.reduce((acc, curr) => acc + curr.efficiency, 0) / data.length).toFixed(1);

  return (
    <Card className="shadow-sm border-slate-200 bg-white">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-xl font-bold text-slate-900">
                Tendencias de Rendimiento (KPIs)
              </CardTitle>
            </div>
            <CardDescription className="text-slate-500 mt-1">
              Rendimiento de envíos y eficiencia operativa del almacén
            </CardDescription>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-md bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            >
              <option value="last7">Últimos 7 Días</option>
              <option value="last30">Últimos 30 Días</option>
              <option value="custom">Rango Personalizado</option>
            </select>

            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-indigo-50 border border-indigo-100">
                  <Package className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Volumen Total</div>
                  <div className="text-sm font-bold text-slate-900">{totalVolume.toLocaleString()}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-emerald-50 border border-emerald-100">
                  <Zap className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Eficiencia Promedio</div>
                  <div className="text-sm font-bold text-slate-900">{avgEfficiency}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorEfficiency" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} domain={[80, 100]} />
              <Tooltip 
                cursor={{ stroke: '#cbd5e1', strokeWidth: 2, strokeDasharray: '4 4' }}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
                labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="throughput" 
                name="Volumen de Envíos" 
                stroke="#6366f1" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorThroughput)"
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2, fill: '#6366f1' }}
              />
              <Area 
                yAxisId="right"
                type="monotone" 
                dataKey="efficiency" 
                name="Eficiencia Operativa (%)" 
                stroke="#10b981" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorEfficiency)"
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2, fill: '#10b981' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
