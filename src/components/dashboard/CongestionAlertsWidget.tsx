import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/data-display/card';
import { Badge } from '@/components/ui/data-display/badge';
import { Button } from '@/components/ui/forms/button';
import { 
  AlertTriangle, 
  TrendingUp, 
  Ship, 
  MapPin, 
  Clock, 
  Calendar,
  CheckCircle2, 
  Anchor, 
  Info,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  BellRing
} from 'lucide-react';
import { toast } from 'sonner';

interface CongestionDataPoint {
  date: Date;
  dateStr: string;
  dwellHours: number;
  isForecast: boolean;
  confidenceLower?: number;
  confidenceUpper?: number;
}

interface PortProfile {
  id: string;
  name: string;
  code: string;
  currentStatus: 'Optimal' | 'Moderate' | 'Critical';
  avgCurrentDwell: number;
  activeIncomingCount: number;
  volatilityIndex: number; // 0-100%
  underlyingRiskReason: string;
}

const PORT_PROFILES: PortProfile[] = [
  {
    id: "SHA",
    name: "Shanghai Port",
    code: "CNSHA",
    currentStatus: "Moderate",
    avgCurrentDwell: 46,
    activeIncomingCount: 5,
    volatilityIndex: 35,
    underlyingRiskReason: "Slight typhoon backlog and bulk carrier lane maintenance near Yangshan deep-water docks."
  },
  {
    id: "LAX",
    name: "Los Angeles Port",
    code: "USLAX",
    currentStatus: "Critical",
    avgCurrentDwell: 76,
    activeIncomingCount: 4,
    volatilityIndex: 82,
    underlyingRiskReason: "Upcoming terminal union contract expirations and regional rail car shortages creating inland transfer choke points."
  },
  {
    id: "RTM",
    name: "Rotterdam Port",
    code: "NLRTM",
    currentStatus: "Moderate",
    avgCurrentDwell: 48,
    activeIncomingCount: 3,
    volatilityIndex: 64,
    underlyingRiskReason: "Pre-planned 24-hour labor union warning stoppages scheduled for early August."
  },
  {
    id: "SIN",
    name: "Singapore Port",
    code: "SGSIN",
    currentStatus: "Optimal",
    avgCurrentDwell: 18,
    activeIncomingCount: 2,
    volatilityIndex: 15,
    underlyingRiskReason: "Excellent container terminal automation levels. Highly fluid with minimal yard stack bottlenecks."
  }
];

// Generate synthetic historical + forecasted dwell times
const generatePortData = (portId: string): CongestionDataPoint[] => {
  const points: CongestionDataPoint[] = [];
  const baseDate = new Date(2026, 0, 1); // Jan 1st, 2026
  
  // 10 monthly points: Jan to Oct 2026 (July 19 is "Today", so Jul is transitional)
  let baseHours = 35;
  let trendDirection = 1;
  let noiseMultiplier = 5;

  if (portId === 'LAX') {
    baseHours = 60;
    trendDirection = 2.5;
    noiseMultiplier = 8;
  } else if (portId === 'SHA') {
    baseHours = 40;
    trendDirection = 1.2;
    noiseMultiplier = 6;
  } else if (portId === 'RTM') {
    baseHours = 38;
    trendDirection = 0.8;
    noiseMultiplier = 5;
  } else {
    baseHours = 17;
    trendDirection = 0.1;
    noiseMultiplier = 2;
  }

  for (let i = 0; i < 10; i++) {
    const d = new Date(2026, i, 15);
    const isForecast = i >= 6; // July (index 6) onwards are forecast

    let val = baseHours + (i * trendDirection) + Math.sin(i * 1.5) * noiseMultiplier;
    
    // Add specific spikes for critical conditions
    if (portId === 'LAX' && i === 7) { // August forecast spike
      val += 18; 
    }
    if (portId === 'SHA' && i === 6) { // July transitional typhoon spike
      val += 10;
    }
    if (portId === 'RTM' && i === 7) { // August strike spike
      val += 12;
    }

    val = Math.max(10, Math.round(val));

    // Confidence intervals for forecasted data
    let confidenceLower = undefined;
    let confidenceUpper = undefined;
    if (isForecast) {
      const spread = (i - 5) * (portId === 'LAX' ? 8 : 4);
      confidenceLower = Math.max(8, Math.round(val - spread));
      confidenceUpper = Math.round(val + spread + 2);
    }

    points.push({
      date: d,
      dateStr: d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
      dwellHours: val,
      isForecast,
      confidenceLower,
      confidenceUpper
    });
  }

  return points;
};

export function CongestionAlertsWidget({ shipments }: { shipments: any[] }) {
  const [selectedPortId, setSelectedPortId] = useState<string>("LAX");
  const [forecastHorizon, setForecastHorizon] = useState<number>(90); // 30, 60, 90 Days
  const [acknowledgedShipments, setAcknowledgedShipments] = useState<Record<string, boolean>>({});
  const [hoveredData, setHoveredData] = useState<CongestionDataPoint | null>(null);
  
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const activePort = PORT_PROFILES.find(p => p.id === selectedPortId) || PORT_PROFILES[0];
  const chartData = generatePortData(selectedPortId).filter(d => {
    if (!d.isForecast) return true;
    const monthDiff = d.date.getMonth() - 6; // July is 6
    if (forecastHorizon === 30 && monthDiff > 0) return false; // August is 1 month ahead
    if (forecastHorizon === 60 && monthDiff > 1) return false;
    if (forecastHorizon === 90 && monthDiff > 3) return false;
    return true;
  });

  // Correlate with active sea shipments headed to the selected port code
  const correlatedShipments = shipments.filter(s => {
    const isSea = s.type && s.type.toLowerCase().startsWith('sea');
    const matchesPort = (s.destinationPort || '').toUpperCase().includes(activePort.code);
    const isActive = ['InTransit', 'In Transit', 'Delayed', 'Booked'].includes(s.status);
    return isSea && matchesPort && isActive;
  });

  // Re-draw D3 Chart when data, horizon, or width changes
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    // Clean out previous contents
    d3.select(svgRef.current).selectAll("*").remove();

    const containerWidth = containerRef.current.clientWidth || 500;
    const height = 240;
    const margin = { top: 15, right: 25, bottom: 35, left: 40 };
    const width = containerWidth - margin.left - margin.right;

    const svg = d3.select(svgRef.current)
      .attr("width", containerWidth)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Scales
    const x = d3.scaleTime()
      .domain(d3.extent(chartData, d => d.date) as [Date, Date])
      .range([0, width]);

    const yMax = d3.max(chartData, d => d.confidenceUpper || d.dwellHours) || 100;
    const y = d3.scaleLinear()
      .domain([0, Math.ceil(yMax / 10) * 10])
      .range([height - margin.top - margin.bottom, 0]);

    // Gridlines (Horizontal)
    svg.append("g")
      .attr("class", "grid-lines opacity-20 dark:opacity-10")
      .call(d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat(() => "")
      )
      .style("stroke-dasharray", "3,3")
      .style("color", "var(--color-muted-foreground, #a1a1aa)");

    // Confidence interval shading area (Forecast)
    const forecastPoints = chartData.filter(d => d.isForecast || d.date.getMonth() === 6);
    if (forecastPoints.length > 0) {
      const areaGenerator = d3.area<CongestionDataPoint>()
        .x(d => x(d.date))
        .y0(d => y(d.confidenceLower || d.dwellHours))
        .y1(d => y(d.confidenceUpper || d.dwellHours))
        .curve(d3.curveMonotoneX);

      svg.append("path")
        .datum(forecastPoints)
        .attr("fill", activePort.currentStatus === 'Critical' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)')
        .attr("stroke", "none")
        .attr("d", areaGenerator);
    }

    // Historical Line
    const historicalPoints = chartData.filter(d => !d.isForecast || d.date.getMonth() === 6);
    const lineGenHistorical = d3.line<CongestionDataPoint>()
      .x(d => x(d.date))
      .y(d => y(d.dwellHours))
      .curve(d3.curveMonotoneX);

    svg.append("path")
      .datum(historicalPoints)
      .attr("fill", "none")
      .attr("stroke", "var(--color-primary, #6366f1)")
      .attr("stroke-width", 2.5)
      .attr("d", lineGenHistorical);

    // Forecast Line (Dashed)
    if (forecastPoints.length > 0) {
      const lineGenForecast = d3.line<CongestionDataPoint>()
        .x(d => x(d.date))
        .y(d => y(d.dwellHours))
        .curve(d3.curveMonotoneX);

      svg.append("path")
        .datum(forecastPoints)
        .attr("fill", "none")
        .attr("stroke", activePort.currentStatus === 'Critical' ? '#ef4444' : '#f59e0b')
        .attr("stroke-width", 2.5)
        .attr("stroke-dasharray", "4,4")
        .attr("d", lineGenForecast);
    }

    // "Today" Marker Line (July 15/19 approximation)
    const todayDate = new Date(2026, 6, 15); // index 6
    const todayX = x(todayDate);
    
    // Vertical transition line
    svg.append("line")
      .attr("x1", todayX)
      .attr("y1", 0)
      .attr("x2", todayX)
      .attr("y2", height - margin.top - margin.bottom)
      .attr("stroke", "var(--color-muted-foreground, #a1a1aa)")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "2,2");

    // "Today" Label Text
    svg.append("text")
      .attr("x", todayX + 5)
      .attr("y", 12)
      .attr("fill", "#6b7280")
      .style("font-size", "9px")
      .style("font-family", "monospace")
      .style("font-weight", "bold")
      .text("TODAY");

    // X Axis
    svg.append("g")
      .attr("transform", `translate(0, ${height - margin.top - margin.bottom})`)
      .call(d3.axisBottom(x)
        .ticks(d3.timeMonth.every(1))
        .tickFormat(d3.timeFormat("%b") as any)
      )
      .style("font-size", "10px")
      .style("font-family", "monospace")
      .selectAll("text")
      .attr("fill", "#71717a");

    // Y Axis
    svg.append("g")
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${d}h`))
      .style("font-size", "10px")
      .style("font-family", "monospace")
      .selectAll("text")
      .attr("fill", "#71717a");

    // Remove axis domain outer ticks for cleaner look
    svg.selectAll(".domain").remove();
    svg.selectAll(".tick line").attr("stroke", "#e4e4e7").style("stroke-opacity", 0.5);

    // Interactive overlays for hovered tooltips
    const overlay = svg.append("rect")
      .attr("width", width)
      .attr("height", height - margin.top - margin.bottom)
      .attr("fill", "transparent")
      .style("cursor", "crosshair");

    const focusLine = svg.append("line")
      .attr("y1", 0)
      .attr("y2", height - margin.top - margin.bottom)
      .attr("stroke", "var(--color-primary, #6366f1)")
      .attr("stroke-width", 1)
      .style("stroke-dasharray", "3,3")
      .style("display", "none");

    const focusCircle = svg.append("circle")
      .attr("r", 5)
      .attr("fill", "var(--color-primary, #6366f1)")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .style("display", "none");

    overlay.on("mousemove", (event) => {
      const mouseX = d3.pointer(event)[0];
      const hoveredDate = x.invert(mouseX);
      
      // Find nearest data point
      const bisect = d3.bisector((d: CongestionDataPoint) => d.date).center;
      const index = bisect(chartData, hoveredDate);
      const point = chartData[index];

      if (point) {
        focusLine
          .attr("x1", x(point.date))
          .attr("x2", x(point.date))
          .style("display", null);

        focusCircle
          .attr("cx", x(point.date))
          .attr("cy", y(point.dwellHours))
          .attr("fill", point.isForecast ? (activePort.currentStatus === 'Critical' ? '#ef4444' : '#f59e0b') : 'var(--color-primary, #6366f1)')
          .style("display", null);

        setHoveredData(point);
      }
    });

    overlay.on("mouseleave", () => {
      focusLine.style("display", "none");
      focusCircle.style("display", "none");
      setHoveredData(null);
    });

  }, [selectedPortId, forecastHorizon, chartData]);

  const handleAcknowledgeAlert = (ref: string) => {
    setAcknowledgedShipments(prev => ({ ...prev, [ref]: true }));
    toast.success(`Congestion pre-emptive mitigation accepted for ${ref}! Digital dockets have been adjusted.`);
  };

  const handleRerouteAlternative = (ref: string, alternative: string) => {
    toast.info(`Triggered alternative port bypass: routing ${ref} to ${alternative} to shave off congestion delays.`);
    setAcknowledgedShipments(prev => ({ ...prev, [ref]: true }));
  };

  return (
    <Card className="h-full flex flex-col border border-indigo-100 dark:border-indigo-950/20">
      <CardHeader className="pb-3 shrink-0 bg-gradient-to-r from-indigo-50/10 via-card to-amber-50/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Anchor className="w-5 h-5 text-indigo-500 animate-pulse" />
              Predictive Port Congestion Trends Analyzer
            </CardTitle>
            <CardDescription>
              Fusing orbital container flows with seasonal berthing metrics to forecast multi-month dock dwell spikes.
            </CardDescription>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Port Select */}
            <select 
              value={selectedPortId}
              onChange={(e) => {
                setSelectedPortId(e.target.value);
                setHoveredData(null);
              }}
              className="border rounded-xl p-1.5 bg-background text-foreground text-xs font-bold border-zinc-200 dark:border-zinc-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="LAX">Los Angeles (USLAX)</option>
              <option value="SHA">Shanghai (CNSHA)</option>
              <option value="RTM">Rotterdam (NLRTM)</option>
              <option value="SIN">Singapore (SGSIN)</option>
            </select>

            {/* Horizon Select */}
            <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-800 p-0.5 bg-zinc-50 dark:bg-zinc-900 text-xs">
              {[30, 60, 90].map((h) => (
                <button
                  key={h}
                  onClick={() => setForecastHorizon(h)}
                  className={`px-2 py-1 rounded-md font-mono text-[10px] font-bold transition-all ${
                    forecastHorizon === h 
                      ? 'bg-white dark:bg-zinc-800 text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {h}d Forecast
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-6 flex-1 overflow-y-auto">
        <div className="grid gap-6 md:grid-cols-5">
          
          {/* Chart visualizers - Left 3 columns */}
          <div className="md:col-span-3 space-y-4">
            
            {/* Stats Header bar */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 border rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/20">
                <span className="text-[9px] uppercase font-bold text-muted-foreground block">Predicted Avg Dwell</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <strong className="text-lg font-bold font-mono text-foreground">
                    {activePort.avgCurrentDwell} hrs
                  </strong>
                  <Badge className={`text-[8.5px] font-extrabold ${
                    activePort.currentStatus === 'Critical' ? 'bg-red-100 text-red-700' :
                    activePort.currentStatus === 'Moderate' ? 'bg-amber-100 text-amber-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {activePort.currentStatus}
                  </Badge>
                </div>
              </div>

              <div className="p-3 border rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/20">
                <span className="text-[9px] uppercase font-bold text-muted-foreground block">Incoming Sea Routes</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <strong className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">
                    {correlatedShipments.length} vessels
                  </strong>
                  <span className="text-[9px] text-muted-foreground font-mono">tracked</span>
                </div>
              </div>

              <div className="p-3 border rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/20">
                <span className="text-[9px] uppercase font-bold text-muted-foreground block">Volatility Index</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <strong className="text-lg font-bold font-mono text-foreground">
                    {activePort.volatilityIndex}%
                  </strong>
                  <Badge variant="outline" className="text-[8px] uppercase py-0">
                    {activePort.volatilityIndex > 60 ? 'Unstable' : 'Highly Stable'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* D3 Line Chart container */}
            <div className="relative border rounded-3xl p-4 bg-background shadow-inner" ref={containerRef}>
              
              {/* Floating detail info tooltip on hovered data */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5 p-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-[10px] font-mono shadow-md z-10 min-w-[140px] transition-all duration-150">
                {hoveredData ? (
                  <div className="space-y-0.5 w-full">
                    <div className="flex justify-between font-bold border-b border-zinc-700 dark:border-zinc-200 pb-0.5 mb-1 text-[9px] uppercase">
                      <span>{hoveredData.dateStr}</span>
                      <span className={hoveredData.isForecast ? "text-amber-400 dark:text-amber-600" : "text-blue-400 dark:text-blue-600"}>
                        {hoveredData.isForecast ? "Forecast" : "Actual"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400 dark:text-zinc-500">Dwell:</span>
                      <strong className="text-white dark:text-zinc-950">{hoveredData.dwellHours} hrs</strong>
                    </div>
                    {hoveredData.isForecast && (
                      <div className="flex justify-between text-[9px]">
                        <span className="text-zinc-400 dark:text-zinc-500">Spread:</span>
                        <span className="text-zinc-300 dark:text-zinc-600">{hoveredData.confidenceLower}h - {hoveredData.confidenceUpper}h</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-zinc-400 dark:text-zinc-500 w-full justify-center">
                    <Info className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span>Hover chart to inspect</span>
                  </div>
                )}
              </div>

              {/* SVG Canvas */}
              <svg ref={svgRef} className="w-full h-auto overflow-visible" />

              {/* Legend Indicators */}
              <div className="flex justify-center gap-5 pt-1 text-[10px] font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 bg-indigo-500 block"></span>
                  <span className="text-muted-foreground">Historical Dwell Time</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 border-t-2 border-dashed border-amber-500 block"></span>
                  <span className="text-muted-foreground">Predictive Forecast</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-2 bg-indigo-500/10 block rounded-sm"></span>
                  <span className="text-muted-foreground">Uncertainty Envelope</span>
                </div>
              </div>
            </div>

            {/* Pre-emptive Intelligence commentary */}
            <div className="p-3.5 border border-amber-100 bg-amber-500/5 rounded-2xl flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-bounce" />
              <div className="space-y-1">
                <strong className="text-xs font-bold text-foreground block">
                  AI Risk Modeling: {activePort.name} ({activePort.code})
                </strong>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {activePort.underlyingRiskReason} Predicted dwell peaks may delay discharging operations by up to **{Math.max(12, activePort.avgCurrentDwell - 30)} hours**. Recommend requesting alternative berthing dockets.
                </p>
              </div>
            </div>

          </div>

          {/* Active correlated Shipment list - Right 2 columns */}
          <div className="md:col-span-2 space-y-4">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Active Shipments headed to {activePort.code}
            </span>

            {correlatedShipments.length > 0 ? (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {correlatedShipments.map((ship) => {
                  const isAck = acknowledgedShipments[ship.id];
                  const arrivalDate = ship.estimatedArrival ? new Date(ship.estimatedArrival) : new Date(2026, 7, 24);
                  const isCriticalPeriod = arrivalDate.getMonth() === 7; // August arrivals hit maximum congestion peak
                  
                  return (
                    <div 
                      key={ship.id}
                      className={`p-4 border rounded-2xl transition-all ${
                        isCriticalPeriod && !isAck
                          ? 'border-red-200 bg-red-500/5 dark:border-red-950/20' 
                          : 'border-zinc-200 dark:border-zinc-800 bg-card hover:shadow-sm'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <strong className="text-xs font-mono text-foreground font-bold">{ship.referenceNumber || `SHP-${ship.id}`}</strong>
                            <Badge variant="outline" className="text-[8px] uppercase py-0 font-bold">
                              {ship.carrier || 'Ocean Fleet'}
                            </Badge>
                          </div>
                          
                          <p className="text-[10.5px] text-muted-foreground pt-0.5">
                            {ship.originPort || 'CNYPT'} <ArrowRight className="inline-block w-3 h-3 mx-0.5 text-zinc-400" /> {ship.destinationPort || activePort.code}
                          </p>

                          <div className="text-[10px] text-muted-foreground flex items-center gap-1 pt-1.5">
                            <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span>ETA: <strong>{arrivalDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</strong></span>
                          </div>
                        </div>

                        <Badge className={
                          ship.status === 'Delayed' ? 'bg-amber-100 text-amber-700 font-bold text-[9px]' :
                          'bg-indigo-100 text-indigo-700 font-bold text-[9px]'
                        }>
                          {ship.status}
                        </Badge>
                      </div>

                      {/* Flag risk */}
                      {isCriticalPeriod && !isAck && (
                        <div className="mt-3 p-2 rounded-xl bg-red-500/5 border border-red-200/50 text-[10px] text-red-600 dark:text-red-400 font-semibold flex items-center gap-1.5 leading-snug">
                          <BellRing className="w-4 h-4 text-red-500 shrink-0 animate-pulse" />
                          <span>August peak dwell risk ({activePort.avgCurrentDwell}h)! Estimated discharge delays may breach SLA.</span>
                        </div>
                      )}

                      {isAck && (
                        <div className="mt-3 p-2 rounded-xl bg-emerald-500/5 border border-emerald-200/50 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Bypass / Mitigation protocol active</span>
                        </div>
                      )}

                      {/* Trigger Actions */}
                      {!isAck && (
                        <div className="mt-3.5 pt-3 border-t flex flex-wrap gap-2 justify-end">
                          {PORT_PROFILES.find(p => p.id === selectedPortId)?.name === "Los Angeles Port" && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-[9.5px] h-7 px-2.5 font-bold hover:border-amber-400"
                              onClick={() => handleRerouteAlternative(ship.referenceNumber || `SHP-${ship.id}`, "Long Beach (USLGB)")}
                            >
                              Bypass to Long Beach
                            </Button>
                          )}
                          {PORT_PROFILES.find(p => p.id === selectedPortId)?.name === "Rotterdam Port" && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-[9.5px] h-7 px-2.5 font-bold hover:border-amber-400"
                              onClick={() => handleRerouteAlternative(ship.referenceNumber || `SHP-${ship.id}`, "Wilhelmshaven (DEWVN)")}
                            >
                              Bypass to Wilhelmshaven
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            className="text-[9.5px] h-7 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold"
                            onClick={() => handleAcknowledgeAlert(ship.id)}
                          >
                            Acknowledge SLA Alert
                          </Button>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="border border-dashed rounded-3xl p-6 text-center text-zinc-500 bg-zinc-50/20 dark:bg-zinc-950/5 flex flex-col items-center justify-center min-h-[180px]">
                <Ship className="w-8 h-8 text-zinc-400/40 mb-1.5" />
                <p className="text-xs font-semibold text-foreground">No active incoming shipments</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">There are no active sea shipments heading to {activePort.code} right now.</p>
              </div>
            )}

            {/* Custom SCM Certifications */}
            <Card className="border border-indigo-100 dark:border-indigo-950/20 bg-gradient-to-br from-indigo-500/5 to-transparent">
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <strong className="text-xs font-bold text-foreground block">Active Risk-Mitigation Guard</strong>
                </div>
                <p className="text-[10.5px] text-muted-foreground leading-relaxed">
                  Historical models are updated daily using AIS vessel telemetry, ocean-current forecasts, and local harbor union feeds.
                </p>
              </CardContent>
            </Card>

          </div>
        </div>
      </CardContent>
    </Card>
  );
}
