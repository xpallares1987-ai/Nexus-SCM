import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/data-display/card';
import { Badge } from '@/components/ui/data-display/badge';
import { Button } from '@/components/ui/forms/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/forms/select';
import { 
  ShieldAlert, 
  TrendingUp, 
  Flame, 
  CloudLightning, 
  Anchor, 
  Train, 
  Plane, 
  MapPin, 
  AlertTriangle, 
  RefreshCw,
  Compass,
  FileText,
  Sliders,
  Sparkles,
  Info,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

interface RiskTrendPoint {
  date: Date;
  indexValue: number;
  laborRisk: number;
  weatherRisk: number;
  geopoliticalRisk: number;
  infrastructureRisk: number;
  customsRisk: number;
  activeIncidents: string[];
}

interface RiskAnalyticsTabProps {
  shipments: any[];
}

export function RiskAnalyticsTab({ shipments }: RiskAnalyticsTabProps) {
  // Filters & State
  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [selectedHorizon, setSelectedHorizon] = useState<'30' | '60' | '90'>('30');
  const [riskWeightLabor, setRiskWeightLabor] = useState<number>(30);
  const [riskWeightWeather, setRiskWeightWeather] = useState<number>(20);
  const [riskWeightGeopolitical, setRiskWeightGeopolitical] = useState<number>(30);
  const [riskWeightInfras, setRiskWeightInfras] = useState<number>(20);

  // Active Disruptions Toggles (Simulated)
  const [laxStrikeSim, setLaxStrikeSim] = useState<boolean>(true);
  const [suezCanalDetourSim, setSuezCanalDetourSim] = useState<boolean>(true);
  const [panamaDraftSim, setPanamaDraftSim] = useState<boolean>(false);
  const [rotterdamCustomsQueueSim, setRotterdamCustomsQueueSim] = useState<boolean>(false);

  // Hovered data point for interactive tooltips
  const [hoveredPoint, setHoveredPoint] = useState<RiskTrendPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Calculate unique routes based on shipments
  const routeOptions = React.useMemo(() => {
    const routes = new Set<string>();
    shipments.forEach(s => {
      if (s.originPort && s.destinationPort) {
        routes.add(`${s.originPort} ──> ${s.destinationPort}`);
      }
    });
    return Array.from(routes);
  }, [shipments]);

  // Generate trend data based on sliders, selected route, and active simulations
  const trendData = React.useMemo(() => {
    const data: RiskTrendPoint[] = [];
    const now = new Date();
    const daysCount = parseInt(selectedHorizon);
    
    // Determine route specific baselines
    let baseLabor = 15;
    let baseWeather = 18;
    let baseGeopolitical = 10;
    let baseInfrastructure = 20;
    let baseCustoms = 12;

    if (selectedRoute !== 'all') {
      const parts = selectedRoute.split(' ──> ');
      const origin = parts[0];
      const dest = parts[1];
      
      if (origin.includes('SHA') || origin.includes('SHANGHAI')) {
        baseWeather += 8; // Typhoons corridor
      }
      if (dest.includes('LAX') || dest.includes('LOS ANGELES')) {
        baseLabor += 12; // US West Coast unions
      }
      if (dest.includes('RTM') || dest.includes('ROTTERDAM')) {
        baseCustoms += 5; // Phytosanitary and Brexit spillover queues
      }
    }

    for (let i = daysCount - 1; i >= -10; i--) { // Forecast -10 days to the future
      const d = new Date();
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const daySeed = d.getDate();
      const isForecast = i < 0;

      // Deterministic waves representing daily noise
      const waveLabor = Math.sin(daySeed * 0.3) * 6;
      const waveWeather = Math.cos(daySeed * 0.4) * 8;
      const waveGeopolitical = Math.sin(daySeed * 0.1) * 4;
      const waveInfras = Math.cos(daySeed * 0.2) * 5;
      const waveCustoms = Math.sin(daySeed * 0.5) * 6;

      let labor = Math.max(5, baseLabor + waveLabor);
      let weather = Math.max(5, baseWeather + waveWeather);
      let geopolitical = Math.max(5, baseGeopolitical + waveGeopolitical);
      let infrastructure = Math.max(5, baseInfrastructure + waveInfras);
      let customs = Math.max(5, baseCustoms + waveCustoms);

      const incidents: string[] = [];

      // Add simulated disasters
      if (laxStrikeSim) {
        labor += 32;
        infrastructure += 15;
        incidents.push("USLAX Crane Strike Threat");
      }
      if (suezCanalDetourSim) {
        geopolitical += 40;
        infrastructure += 20;
        incidents.push("Red Sea Corridor Bypass Redirection");
      }
      if (panamaDraftSim) {
        weather += 25;
        infrastructure += 18;
        incidents.push("Panama Canal Low Draft Restriction");
      }
      if (rotterdamCustomsQueueSim) {
        customs += 28;
        incidents.push("Rotterdam Phytosanitary Backlog");
      }

      // Add future predictive hazards for visual flair
      if (isForecast) {
        if (selectedRoute.includes('RTM') || selectedRoute === 'all') {
          weather += Math.max(0, (10 + i) * 2); // Approaching storm front
          incidents.push("Incoming North Sea Storm Front (Predicted)");
        }
      }

      // Ensure risk values are clamped to 100
      labor = Math.min(100, labor);
      weather = Math.min(100, weather);
      geopolitical = Math.min(100, geopolitical);
      infrastructure = Math.min(100, infrastructure);
      customs = Math.min(100, customs);

      // Weighted Calculation
      const totalWeight = riskWeightLabor + riskWeightWeather + riskWeightGeopolitical + riskWeightInfras;
      const indexValue = Math.round(
        (labor * (riskWeightLabor / totalWeight)) +
        (weather * (riskWeightWeather / totalWeight)) +
        (geopolitical * (riskWeightGeopolitical / totalWeight)) +
        (infrastructure * (riskWeightInfras / totalWeight))
      );

      data.push({
        date: d,
        indexValue: Math.min(100, indexValue),
        laborRisk: Math.round(labor),
        weatherRisk: Math.round(weather),
        geopoliticalRisk: Math.round(geopolitical),
        infrastructureRisk: Math.round(infrastructure),
        customsRisk: Math.round(customs),
        activeIncidents: Array.from(new Set(incidents))
      });
    }

    return data;
  }, [
    selectedRoute, 
    selectedHorizon, 
    riskWeightLabor, 
    riskWeightWeather, 
    riskWeightGeopolitical, 
    riskWeightInfras,
    laxStrikeSim,
    suezCanalDetourSim,
    panamaDraftSim,
    rotterdamCustomsQueueSim
  ]);

  // Draw D3 Chart over trendData
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    // Clear previous elements
    d3.select(svgRef.current).selectAll('*').remove();

    const containerWidth = containerRef.current.clientWidth || 600;
    const height = 320;
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = containerWidth - margin.left - margin.right;

    const svg = d3.select(svgRef.current)
      .attr('width', containerWidth)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Split historical vs forecast points based on today
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Scales
    const x = d3.scaleTime()
      .domain(d3.extent(trendData, d => d.date) as [Date, Date])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, 100])
      .range([height - margin.top - margin.bottom, 0]);

    // Color Gradients
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'risk-area-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', 'rgb(239, 68, 68)') // red
      .attr('stop-opacity', 0.2);

    gradient.append('stop')
      .attr('offset', '50%')
      .attr('stop-color', 'rgb(245, 158, 11)') // amber
      .attr('stop-opacity', 0.1);

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', 'rgb(16, 185, 129)') // emerald
      .attr('stop-opacity', 0.0);

    // Gridlines
    svg.append('g')
      .attr('class', 'grid opacity-10 dark:opacity-5')
      .call(d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat(() => '')
      )
      .style('stroke-dasharray', '3,3')
      .style('stroke', 'currentColor');

    // Horizontal Threshold Indicators
    const thresholds = [
      { value: 70, color: 'rgb(239, 68, 68)', label: 'Critical Threshold', strokeDash: '4,4' },
      { value: 40, color: 'rgb(245, 158, 11)', label: 'Moderate Risk Threshold', strokeDash: '4,4' }
    ];

    thresholds.forEach(t => {
      svg.append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', y(t.value))
        .attr('y2', y(t.value))
        .attr('stroke', t.color)
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', t.strokeDash)
        .attr('opacity', 0.45);

      svg.append('text')
        .attr('x', width - 8)
        .attr('y', y(t.value) - 6)
        .attr('text-anchor', 'end')
        .attr('fill', t.color)
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .attr('opacity', 0.8)
        .text(t.label);
    });

    // Draw Shaded Area (Historical + Forecast combined with opacity transition)
    const areaGenerator = d3.area<RiskTrendPoint>()
      .x(d => x(d.date))
      .y0(height - margin.top - margin.bottom)
      .y1(d => y(d.indexValue))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(trendData)
      .attr('fill', 'url(#risk-area-gradient)')
      .attr('d', areaGenerator);

    // Draw Line representing Trend
    const lineGenerator = d3.line<RiskTrendPoint>()
      .x(d => x(d.date))
      .y(d => y(d.indexValue))
      .curve(d3.curveMonotoneX);

    // Historical Line Segment
    const historicalData = trendData.filter(d => d.date <= now);
    svg.append('path')
      .datum(historicalData)
      .attr('fill', 'none')
      .attr('stroke', 'rgb(79, 70, 229)') // Indigo
      .attr('stroke-width', 3)
      .attr('d', lineGenerator);

    // Forecast Dotted Line Segment
    const forecastData = trendData.filter(d => d.date >= now);
    if (forecastData.length > 0) {
      svg.append('path')
        .datum(forecastData)
        .attr('fill', 'none')
        .attr('stroke', 'rgb(147, 51, 234)') // Purple
        .attr('stroke-width', 3)
        .attr('stroke-dasharray', '5,5')
        .attr('d', lineGenerator);
    }

    // Anchor vertical Today divider
    svg.append('line')
      .attr('x1', x(now))
      .attr('x2', x(now))
      .attr('y1', 0)
      .attr('y2', height - margin.top - margin.bottom)
      .attr('stroke', 'currentColor')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '2,2')
      .attr('opacity', 0.5);

    svg.append('text')
      .attr('x', x(now) + 5)
      .attr('y', 15)
      .attr('fill', 'currentColor')
      .attr('font-size', '10px')
      .attr('font-weight', 'extrabold')
      .attr('opacity', 0.6)
      .text('TODAY (FORECAST BOUND)');

    // Axes
    svg.append('g')
      .attr('transform', `translate(0, ${height - margin.top - margin.bottom})`)
      .attr('class', 'text-muted-foreground opacity-80')
      .call(d3.axisBottom(x)
        .ticks(6)
        .tickFormat(d3.timeFormat('%b %d') as any)
      )
      .attr('font-size', '11px')
      .call(g => g.select('.domain').remove());

    svg.append('g')
      .attr('class', 'text-muted-foreground opacity-80')
      .call(d3.axisLeft(y).ticks(5).tickFormat(v => `${v}%`))
      .attr('font-size', '11px')
      .call(g => g.select('.domain').remove());

    // Interactive Hover Elements
    const hoverLine = svg.append('line')
      .attr('y1', 0)
      .attr('y2', height - margin.top - margin.bottom)
      .attr('stroke', 'rgb(99, 102, 241)')
      .attr('stroke-width', 1.5)
      .style('opacity', 0);

    const hoverCircle = svg.append('circle')
      .attr('r', 6)
      .attr('fill', 'rgb(99, 102, 241)')
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .style('opacity', 0);

    // Listen to mouse actions on transparent overlay
    svg.append('rect')
      .attr('width', width)
      .attr('height', height - margin.top - margin.bottom)
      .attr('fill', 'transparent')
      .on('mousemove', function (event) {
        const [mouseX] = d3.pointer(event);
        const xDate = x.invert(mouseX);
        
        // Find closest point
        const bisect = d3.bisector((d: RiskTrendPoint) => d.date).center;
        const index = bisect(trendData, xDate);
        const point = trendData[index];

        if (point) {
          hoverLine
            .attr('x1', x(point.date))
            .attr('x2', x(point.date))
            .style('opacity', 0.8);

          hoverCircle
            .attr('cx', x(point.date))
            .attr('cy', y(point.indexValue))
            .style('opacity', 1);

          setHoveredPoint(point);

          // Absolute position relative to container
          const bounds = containerRef.current?.getBoundingClientRect();
          if (bounds) {
            setTooltipPos({
              x: x(point.date) + margin.left + bounds.left + window.scrollX,
              y: y(point.indexValue) + margin.top + bounds.top + window.scrollY - 150
            });
          }
        }
      })
      .on('mouseleave', function () {
        hoverLine.style('opacity', 0);
        hoverCircle.style('opacity', 0);
        setHoveredPoint(null);
        setTooltipPos(null);
      });

  }, [trendData]);

  // Force assess / Refresh analytics
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRecalculate = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("AI Routing Risk Index assessed successfully! Port congestion weights reconciled.");
    }, 800);
  };

  // Determine current stats based on today's values
  const todayPoint = React.useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return trendData.find(d => d.date.getTime() === today.getTime()) || trendData[trendData.length - 11] || trendData[0];
  }, [trendData]);

  return (
    <div className="space-y-6 animate-fade-in" id="risk-analytics-dashboard">
      
      {/* Risk Level Header KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-rose-100 dark:border-rose-950 bg-rose-50/5 dark:bg-rose-950/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-rose-500 uppercase tracking-wider">Overall Route Risk Index</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black ${
                todayPoint.indexValue >= 70 ? 'text-red-500' :
                todayPoint.indexValue >= 40 ? 'text-amber-500' :
                'text-emerald-500'
              }`}>{todayPoint.indexValue}</span>
              <span className="text-xs text-muted-foreground font-semibold">/ 100</span>
              <Badge className={`ml-auto text-[10px] uppercase font-extrabold ${
                todayPoint.indexValue >= 70 ? 'bg-red-500 hover:bg-red-600' :
                todayPoint.indexValue >= 40 ? 'bg-amber-500 hover:bg-amber-600' :
                'bg-emerald-500 hover:bg-emerald-600'
              } text-white border-none`}>
                {todayPoint.indexValue >= 70 ? 'Critical' :
                 todayPoint.indexValue >= 40 ? 'Moderate' : 'Low Risk'}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 font-medium">Weighted intermodal security & weather composite</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Threat Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-foreground">{todayPoint.activeIncidents.length}</span>
              <span className="text-xs text-muted-foreground">Severe Overlays</span>
              {todayPoint.activeIncidents.length > 0 ? (
                <div className="ml-auto w-2 h-2 rounded-full bg-red-500 animate-ping" />
              ) : (
                <div className="ml-auto w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 font-medium truncate">
              {todayPoint.activeIncidents.length > 0 ? todayPoint.activeIncidents.join(', ') : 'No global alerts triggered'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Met-Ocean Hazard Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-blue-500">{todayPoint.weatherRisk}</span>
              <span className="text-xs text-muted-foreground">/ 100</span>
              <CloudLightning className="ml-auto w-4.5 h-4.5 text-blue-500 animate-pulse" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 font-medium">Pacific Typhoon and North Sea Storm threats</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Labor / Port Strike Exposure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-indigo-500">{todayPoint.laborRisk}</span>
              <span className="text-xs text-muted-foreground">/ 100</span>
              <Flame className="ml-auto w-4.5 h-4.5 text-indigo-500 animate-pulse" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 font-medium font-mono">West Coast labor mediation status</p>
          </CardContent>
        </Card>
      </div>

      {/* Main D3 Analytics Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Interactive Filters & D3 Chart */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <Card className="flex-1 flex flex-col shadow-sm border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3 border-b border-zinc-150 dark:border-zinc-800">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base font-extrabold text-foreground">
                    <ShieldAlert className="w-5 h-5 text-indigo-500 animate-pulse" /> Intermodal Route Risk Trend (D3 SVG Engine)
                  </CardTitle>
                  <CardDescription>
                    Real-time risk telemetry based on weighted priorities and active disruption scenarios
                  </CardDescription>
                </div>
                
                {/* Horizontal & Route Controls */}
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <Select value={selectedRoute} onValueChange={(val) => setSelectedRoute(val)}>
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue placeholder="All Lanes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Lanes Composite</SelectItem>
                      {routeOptions.map((opt, idx) => (
                        <SelectItem key={idx} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedHorizon} onValueChange={(val: any) => setSelectedHorizon(val)}>
                    <SelectTrigger className="w-[100px] h-8 text-xs">
                      <SelectValue placeholder="30 Days" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 Days</SelectItem>
                      <SelectItem value="60">60 Days</SelectItem>
                      <SelectItem value="90">90 Days</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button variant="outline" size="sm" onClick={handleRecalculate} className="h-8 w-8 p-0">
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-4 flex-1 flex flex-col">
              
              {/* D3 Render Area */}
              <div ref={containerRef} className="relative w-full h-[320px] bg-slate-50/30 dark:bg-zinc-950/20 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800/80 p-2 overflow-hidden">
                <svg ref={svgRef} className="w-full h-full text-foreground" />
                
                {/* Custom absolute hover tooltip based on absolute coordinate positions */}
                {hoveredPoint && tooltipPos && (
                  <div 
                    style={{ 
                      position: 'absolute', 
                      left: hoveredPoint.date <= new Date() ? hoveredPoint.date.getDate() > 15 ? tooltipPos.x - 220 : tooltipPos.x - 220 : tooltipPos.x - 220, 
                      top: 40,
                      zIndex: 30 
                    }}
                    className="p-3.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-xl w-60 text-xs space-y-2 pointer-events-none transition-all duration-100 ease-out"
                  >
                    <div className="flex justify-between items-center border-b pb-1.5 border-zinc-100 dark:border-zinc-800">
                      <span className="font-extrabold flex items-center gap-1 text-zinc-950 dark:text-zinc-50">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                        {hoveredPoint.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      {hoveredPoint.date > new Date() && (
                        <Badge className="bg-purple-600/10 text-purple-600 dark:text-purple-400 border-none font-bold py-0 px-1.5 text-[9px]">
                          Predictive
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-semibold">Composite Index:</span>
                      <span className={`font-black ${
                        hoveredPoint.indexValue >= 70 ? 'text-red-500' :
                        hoveredPoint.indexValue >= 40 ? 'text-amber-500' :
                        'text-emerald-500'
                      }`}>{hoveredPoint.indexValue}%</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 pt-1.5 text-[10px] border-t border-zinc-150 dark:border-zinc-800">
                      <div className="flex justify-between pr-2 border-r border-zinc-150 dark:border-zinc-800">
                        <span className="text-muted-foreground">Labor:</span>
                        <span className="font-bold text-foreground">{hoveredPoint.laborRisk}%</span>
                      </div>
                      <div className="flex justify-between pl-2">
                        <span className="text-muted-foreground">Weather:</span>
                        <span className="font-bold text-foreground">{hoveredPoint.weatherRisk}%</span>
                      </div>
                      <div className="flex justify-between pr-2 border-r border-zinc-150 dark:border-zinc-800">
                        <span className="text-muted-foreground">Geopol:</span>
                        <span className="font-bold text-foreground">{hoveredPoint.geopoliticalRisk}%</span>
                      </div>
                      <div className="flex justify-between pl-2">
                        <span className="text-muted-foreground">Infras:</span>
                        <span className="font-bold text-foreground">{hoveredPoint.infrastructureRisk}%</span>
                      </div>
                    </div>

                    {hoveredPoint.activeIncidents.length > 0 && (
                      <div className="pt-1.5 border-t border-zinc-100 dark:border-zinc-800">
                        <span className="text-[9px] uppercase font-extrabold text-red-500 block mb-1">Triggered threats</span>
                        <div className="space-y-1">
                          {hoveredPoint.activeIncidents.map((inc, index) => (
                            <div key={index} className="flex items-center gap-1 text-[9px] text-foreground font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block shrink-0" />
                              <span className="truncate">{inc}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 bg-slate-50 dark:bg-zinc-900/40 p-2.5 rounded-lg border">
                <span className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-indigo-500" />
                  Hover over the chart to inspect daily variable breakdowns. Dotted segment denotes AI predictive routing indices.
                </span>
                <span className="font-mono text-[10px] uppercase font-bold text-emerald-500">Live Simulation Sync</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dynamic Controls Side-Panel */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          
          {/* Sourcing Slider Priorities */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Sliders className="w-4 h-4 text-indigo-500" /> Component Risk Weightings
              </CardTitle>
              <CardDescription>Adjust influence percentages of different risk streams</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-foreground">
                  <span className="flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-indigo-500" /> Labor Disputes</span>
                  <span className="text-indigo-500 font-mono">{riskWeightLabor}%</span>
                </div>
                <input 
                  type="range" min="10" max="60" value={riskWeightLabor}
                  onChange={(e) => setRiskWeightLabor(Number(e.target.value))}
                  className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-foreground">
                  <span className="flex items-center gap-1"><CloudLightning className="w-3.5 h-3.5 text-blue-500" /> Weather Severity</span>
                  <span className="text-blue-500 font-mono">{riskWeightWeather}%</span>
                </div>
                <input 
                  type="range" min="10" max="60" value={riskWeightWeather}
                  onChange={(e) => setRiskWeightWeather(Number(e.target.value))}
                  className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-foreground">
                  <span className="flex items-center gap-1"><Compass className="w-3.5 h-3.5 text-purple-500" /> Geopolitical Threats</span>
                  <span className="text-purple-500 font-mono">{riskWeightGeopolitical}%</span>
                </div>
                <input 
                  type="range" min="10" max="60" value={riskWeightGeopolitical}
                  onChange={(e) => setRiskWeightGeopolitical(Number(e.target.value))}
                  className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-foreground">
                  <span className="flex items-center gap-1"><Anchor className="w-3.5 h-3.5 text-emerald-500" /> Infrastructure Bottlenecks</span>
                  <span className="text-emerald-500 font-mono">{riskWeightInfras}%</span>
                </div>
                <input 
                  type="range" min="10" max="60" value={riskWeightInfras}
                  onChange={(e) => setRiskWeightInfras(Number(e.target.value))}
                  className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Real-time Incident Overlays */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
                <AlertTriangle className="w-4 h-4 text-rose-500" /> Live Threat Overlay Simulations
              </CardTitle>
              <CardDescription>Inject real-time hazards to evaluate bypass mitigations</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <label className="flex items-center justify-between p-2 rounded-lg border bg-slate-50/50 dark:bg-zinc-900/30 hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer transition-colors">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-foreground block">US West Coast Union Dispute</span>
                  <span className="text-[9px] text-muted-foreground block">Triggers port labor & gate delay overlays</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={laxStrikeSim} 
                  onChange={(e) => setLaxStrikeSim(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg border bg-slate-50/50 dark:bg-zinc-900/30 hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer transition-colors">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-foreground block">Red Sea Corridor Closure</span>
                  <span className="text-[9px] text-muted-foreground block">Forces route detour around Cape (+12d)</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={suezCanalDetourSim} 
                  onChange={(e) => setSuezCanalDetourSim(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg border bg-slate-50/50 dark:bg-zinc-900/30 hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer transition-colors">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-foreground block">Panama Draft Restrictions</span>
                  <span className="text-[9px] text-muted-foreground block">Locks daily transits, delays US East Coast</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={panamaDraftSim} 
                  onChange={(e) => setPanamaDraftSim(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg border bg-slate-50/50 dark:bg-zinc-900/30 hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer transition-colors">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-foreground block">Rotterdam Customs Backlog</span>
                  <span className="text-[9px] text-muted-foreground block">Delays phytosanitary document releases</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={rotterdamCustomsQueueSim} 
                  onChange={(e) => setRotterdamCustomsQueueSim(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
              </label>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reconciled Mitigation Routing Sourcing Recommendation */}
      <Card className="border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/10 dark:bg-indigo-950/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-extrabold text-indigo-950 dark:text-indigo-200">
            <Sparkles className="w-4 h-4 text-indigo-500 animate-spin-slow" /> AI Smart-Sourcing Mitigation Plan
          </CardTitle>
          <CardDescription className="text-indigo-700/80 dark:text-indigo-400/80 font-medium">
            Active routing recommendations to reconcile severe risk overlays
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-150 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">USLAX Bypass</span>
              <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[9px] py-0 font-bold uppercase">Ready</Badge>
            </div>
            <h4 className="text-xs font-extrabold text-foreground">Pacific Northwest Rail Landbridge</h4>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Route shipments to Port of Seattle, discharging directly to Class-1 Rail. Reduces West Coast port risk by 45%.
            </p>
          </div>

          <div className="p-3 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-150 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">Suez Bypass</span>
              <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[9px] py-0 font-bold uppercase">Ready</Badge>
            </div>
            <h4 className="text-xs font-extrabold text-foreground">Sino-Europe Railway Corridor</h4>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Shift high-priority European shipments to overland express block trains. Guarantees 15-day delivery, avoiding Red Sea corridor risk.
            </p>
          </div>

          <div className="p-3 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-150 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">Rotterdam Bypass</span>
              <Badge className="bg-amber-500/10 text-amber-600 border-none text-[9px] py-0 font-bold uppercase">Active Evaluation</Badge>
            </div>
            <h4 className="text-xs font-extrabold text-foreground">Antwerp-Zeebrugge Truck Shuttle</h4>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Divert to Antwerp, using express priority trucking lanes to reach terminal warehouse hubs. Bypasses customs bottlenecks.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
