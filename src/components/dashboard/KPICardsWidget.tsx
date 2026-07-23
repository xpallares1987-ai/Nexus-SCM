import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/data-display/card';
import { 
  TrendingUp, 
  TrendingDown, 
  Package,
  Clock,
  DollarSign,
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/data-display/badge';

const BASELINES = {
  mom: {
    activeShipments: 1184,
    avgLeadTime: 14.7,
    totalCost: 278600,
    onTimeDelivery: 84.8,
  },
  yoy: {
    activeShipments: 1040,
    avgLeadTime: 16.2,
    totalCost: 242000,
    onTimeDelivery: 79.1,
  }
};

export function KPICardsWidget() {
  const [comparePeriod, setComparePeriod] = useState<'none' | 'mom' | 'yoy'>('none');
  const [metrics, setMetrics] = useState({
    activeShipments: 1248,
    avgLeadTime: 14.5,
    totalCost: 284500,
    onTimeDelivery: 82.5,
  });

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        activeShipments: Math.max(0, prev.activeShipments + Math.floor(Math.random() * 5) - 2),
        avgLeadTime: Math.max(1, prev.avgLeadTime + (Math.random() > 0.5 ? 0.1 : -0.1)),
        totalCost: Math.max(0, prev.totalCost + Math.floor(Math.random() * 1000) - 400),
        onTimeDelivery: Math.max(0, Math.min(100, prev.onTimeDelivery + (Math.random() > 0.5 ? 0.5 : -0.5)))
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getKPIComparison = (key: 'activeShipments' | 'avgLeadTime' | 'totalCost' | 'onTimeDelivery') => {
    if (comparePeriod === 'none') return null;

    const currentVal = metrics[key];
    const baselineVal = BASELINES[comparePeriod][key];
    const diff = currentVal - baselineVal;
    const pctDiff = (diff / baselineVal) * 100;

    let isFavorable = true;
    let formattedBaseline = '';
    let formattedDiff = '';

    if (key === 'activeShipments') {
      isFavorable = diff >= 0; // Higher volume is generally positive
      formattedBaseline = baselineVal.toLocaleString();
      formattedDiff = `${diff >= 0 ? '+' : ''}${diff.toLocaleString()}`;
    } else if (key === 'avgLeadTime') {
      isFavorable = diff <= 0; // Lower lead time is better
      formattedBaseline = `${baselineVal.toFixed(1)}d`;
      formattedDiff = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}d`;
    } else if (key === 'totalCost') {
      isFavorable = diff <= 0; // Lower cost is better
      formattedBaseline = `$${(baselineVal / 1000).toFixed(1)}k`;
      formattedDiff = `${diff >= 0 ? '+' : '-'}$${Math.abs(diff / 1000).toFixed(1)}k`;
    } else if (key === 'onTimeDelivery') {
      isFavorable = diff >= 0; // Higher reliability is better
      formattedBaseline = `${baselineVal.toFixed(1)}%`;
      formattedDiff = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
    }

    return {
      baseline: formattedBaseline,
      diff: formattedDiff,
      pctDiff: `${diff >= 0 ? '+' : ''}${pctDiff.toFixed(1)}%`,
      isFavorable,
    };
  };

  const kpis = [
    {
      key: 'activeShipments' as const,
      title: "Active Shipments",
      value: metrics.activeShipments.toLocaleString(),
      defaultTrend: "+5.4%",
      defaultTrendUp: true,
      icon: <Package className="w-5 h-5" />,
      color: "text-emerald-500",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    },
    {
      key: 'avgLeadTime' as const,
      title: "Average Lead Time",
      value: `${metrics.avgLeadTime.toFixed(1)} days`,
      defaultTrend: "-1.2%",
      defaultTrendUp: true,
      icon: <Clock className="w-5 h-5" />,
      color: "text-blue-500",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      alert: metrics.avgLeadTime > 16.0,
      alertMessage: "High Lead Time"
    },
    {
      key: 'totalCost' as const,
      title: "Total Cost (MTD)",
      value: `$${(metrics.totalCost / 1000).toFixed(1)}k`,
      defaultTrend: "+2.1%",
      defaultTrendUp: false,
      icon: <DollarSign className="w-5 h-5" />,
      color: "text-amber-500",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
    },
    {
      key: 'onTimeDelivery' as const,
      title: "On-Time Delivery",
      value: `${metrics.onTimeDelivery.toFixed(1)}%`,
      defaultTrend: "-2.3%",
      defaultTrendUp: false,
      icon: <Activity className="w-5 h-5" />,
      color: "text-indigo-500",
      bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
      alert: metrics.onTimeDelivery < 85.0,
      alertMessage: "Below 85% SLA"
    }
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Historical Performance Comparison Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/40 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/60 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-blue-500" />
          <div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Operational KPI Comparison Engine
            </span>
            <p className="text-[10px] text-slate-400">
              Toggle reference baselines to calculate real-time variance and performance thresholds.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200/40 dark:border-slate-700/30 shrink-0">
          <button
            id="kpi-compare-none"
            onClick={() => setComparePeriod('none')}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
              comparePeriod === 'none'
                ? 'bg-white dark:bg-slate-900 shadow-sm text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            None
          </button>
          <button
            id="kpi-compare-mom"
            onClick={() => setComparePeriod('mom')}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
              comparePeriod === 'mom'
                ? 'bg-white dark:bg-slate-900 shadow-sm text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Month-over-Month (MoM)
          </button>
          <button
            id="kpi-compare-yoy"
            onClick={() => setComparePeriod('yoy')}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
              comparePeriod === 'yoy'
                ? 'bg-white dark:bg-slate-900 shadow-sm text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Year-over-Year (YoY)
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => {
          const comp = getKPIComparison(kpi.key);

          return (
            <Card key={index} className={`flex flex-col justify-center shadow-sm backdrop-blur-xl transition-all duration-300 ${kpi.alert ? 'border-red-500/50 dark:border-red-500/50 bg-red-50/50 dark:bg-red-950/20' : 'border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50'}`}>
              <CardContent className="p-5">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {kpi.title}
                    </p>
                    <div className={`p-2 rounded-xl ${kpi.bgColor} ${kpi.color}`}>
                      {kpi.icon}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <motion.h3 
                      key={kpi.value}
                      initial={{ opacity: 0.5, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 font-sans"
                    >
                      {kpi.value}
                    </motion.h3>
                    
                    <div className="flex items-center justify-between min-h-[22px]">
                      {comp ? (
                        <span className={`flex items-center text-xs font-bold ${comp.isFavorable ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {comp.isFavorable ? <TrendingUp className="w-3.5 h-3.5 mr-1" /> : <TrendingDown className="w-3.5 h-3.5 mr-1" />}
                          {comp.pctDiff}
                        </span>
                      ) : (
                        <span className={`flex items-center text-xs font-medium ${kpi.defaultTrendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {kpi.defaultTrendUp ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                          {kpi.defaultTrend}
                        </span>
                      )}
                      
                      {kpi.alert && (
                        <Badge variant="destructive" className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0 shrink-0">
                          <AlertTriangle className="w-3 h-3" />
                          {kpi.alertMessage}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Detailed Comparison Panel */}
                  <AnimatePresence initial={false}>
                    {comp && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="pt-2 border-t border-slate-150 dark:border-slate-800/60 mt-1 space-y-1.5 overflow-hidden"
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-450 dark:text-slate-500">
                          <span className="flex items-center gap-1 font-medium">
                            <ChevronRight className="w-2.5 h-2.5 text-blue-500" />
                            Baseline ({comparePeriod === 'mom' ? 'MoM' : 'YoY'}):
                          </span>
                          <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                            {comp.baseline}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-450 dark:text-slate-500">
                          <span className="flex items-center gap-1 font-medium">
                            <ChevronRight className="w-2.5 h-2.5 text-blue-500" />
                            Variance delta:
                          </span>
                          <span className={`font-black font-mono ${comp.isFavorable ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {comp.diff}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

