import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { Truck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';


export function FleetUtilizationWidget({ shipments }: { shipments: any[] }) {
  const { profile } = useAuth();
  const isDark = profile?.theme === 'dark';
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 300 });

  useEffect(() => {
    const observeTarget = containerRef.current;
    if (!observeTarget) return;

    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) {
        setDimensions({
          width: entries[0].contentRect.width,
          height: 300
        });
      }
    });

    resizeObserver.observe(observeTarget);
    return () => resizeObserver.unobserve(observeTarget);
  }, []);

  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const activeShipments = shipments.filter(s => s.status !== 'Delivered' && s.status !== 'Draft');
    
    // Group by carrier (simulated if carrierId is missing)
    const carrierLoad: Record<string, number> = {};
    activeShipments.forEach(s => {
      const carrier = s.carrierId ? s.carrierId.substring(0, 8) : 'Unknown';
      const weight = parseFloat(s.weight) || 1000;
      carrierLoad[carrier] = (carrierLoad[carrier] || 0) + weight;
    });

    // Simulated capacity data
    const data = Object.entries(carrierLoad).map(([carrier, load], index) => {
      // Simulate capacity as slightly more or less than load
      const baseCapacity = 15000 + (index * 5000);
      const capacity = Math.max(load * 1.2, baseCapacity);
      return {
        carrier,
        load,
        capacity,
        utilization: (load / capacity) * 100
      };
    }).sort((a, b) => b.utilization - a.utilization).slice(0, 5);

    if (data.length === 0) {
       svg.append("text")
         .attr("x", dimensions.width / 2)
         .attr("y", dimensions.height / 2)
         .attr("text-anchor", "middle")
         .attr("fill", isDark ? "#9ca3af" : "#6b7280")
         .text("No active fleet data available.");
       return;
    }

    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .rangeRound([0, width])
      .padding(0.3)
      .domain(data.map(d => d.carrier));

    const maxVal = d3.max(data, d => d.capacity) || 100;
    const y = d3.scaleLinear()
      .rangeRound([height, 0])
      .domain([0, maxVal * 1.1]);

    const textColor = isDark ? "#e5e7eb" : "#374151";
    const gridColor = isDark ? "#374151" : "#e5e7eb";

    // Add X axis
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickSizeOuter(0))
      .selectAll("text")
      .attr("fill", textColor)
      .style("font-size", "12px");
      
    g.selectAll(".domain").attr("stroke", gridColor);
    g.selectAll(".tick line").attr("stroke", gridColor);

    // Add Y axis
    g.append("g")
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${(d as number) / 1000}k`))
      .selectAll("text")
      .attr("fill", textColor)
      .style("font-size", "12px");

    // Add grid lines
    g.append("g")
      .attr("class", "grid")
      .attr("opacity", 0.2)
      .call(d3.axisLeft(y).tickSize(-width).tickFormat(() => ""))
      .selectAll("line")
      .attr("stroke", gridColor);

    // Capacity bars (Background)
    g.selectAll(".bar-capacity")
      .data(data)
      .enter().append("rect")
      .attr("class", "bar-capacity")
      .attr("x", d => x(d.carrier)!)
      .attr("y", d => y(d.capacity))
      .attr("width", x.bandwidth())
      .attr("height", d => height - y(d.capacity))
      .attr("fill", isDark ? "#374151" : "#e5e7eb")
      .attr("rx", 4);

    // Load bars (Foreground)
    g.selectAll(".bar-load")
      .data(data)
      .enter().append("rect")
      .attr("class", "bar-load")
      .attr("x", d => x(d.carrier)!)
      .attr("y", d => y(d.load))
      .attr("width", x.bandwidth())
      .attr("height", d => height - y(d.load))
      .attr("fill", d => d.utilization > 85 ? "#ef4444" : (d.utilization > 60 ? "#f59e0b" : "#3b82f6"))
      .attr("rx", 4);

    // Add utilization labels
    g.selectAll(".label")
      .data(data)
      .enter().append("text")
      .attr("class", "label")
      .attr("x", d => x(d.carrier)! + x.bandwidth() / 2)
      .attr("y", d => y(d.load) - 5)
      .attr("text-anchor", "middle")
      .attr("fill", textColor)
      .style("font-size", "11px")
      .style("font-weight", "500")
      .text(d => `${d.utilization.toFixed(1)}%`);

    // Add Legend
    const legend = svg.append("g")
      .attr("transform", `translate(${dimensions.width - 150}, 10)`);

    legend.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", isDark ? "#374151" : "#e5e7eb")
      .attr("rx", 2);
    
    legend.append("text")
      .attr("x", 20)
      .attr("y", 10)
      .attr("fill", textColor)
      .style("font-size", "12px")
      .text("Capacity (kg)");

    legend.append("rect")
      .attr("x", 0)
      .attr("y", 20)
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", "#3b82f6")
      .attr("rx", 2);
    
    legend.append("text")
      .attr("x", 20)
      .attr("y", 30)
      .attr("fill", textColor)
      .style("font-size", "12px")
      .text("Active Load (kg)");

  }, [shipments, dimensions, isDark]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Truck className="w-5 h-5 text-blue-500" /> Fleet Utilization
        </CardTitle>
        <CardDescription>
          Real-time carrier capacity vs active load allocation
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-[300px]">
        <div ref={containerRef} className="w-full h-full relative">
          <svg 
            ref={svgRef} 
            width={dimensions.width} 
            height={dimensions.height}
            className="absolute top-0 left-0"
          />
        </div>
      </CardContent>
    </Card>
  );
}
