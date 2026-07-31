import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup, Line } from 'react-simple-maps';
import { Map as MapIcon, Ship, Truck, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/data-display/badge';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Simulated live shipment tracking coordinates

const highRiskZones = [
  { name: 'Suez Canal Risk Zone', coordinates: [32.3, 27.2], radius: 15 },
  { name: 'Panama Canal Congestion', coordinates: [-79.9, 9.1], radius: 10 },
  { name: 'Strait of Malacca Delay', coordinates: [100.0, 4.0], radius: 12 },
];

const initialShipments = [
  { id: 'S1', type: 'vessel', name: 'Ever Given II', coordinates: [121.4737, 31.2304], destination: [4.47917, 51.9225], status: 'In Transit', progress: 0.1 },
  { id: 'S2', type: 'vessel', name: 'Maersk Alpha', coordinates: [-118.2437, 34.0522], destination: [103.8198, 1.3521], status: 'In Transit', progress: 0.3 },
  { id: 'S3', type: 'truck', name: 'Volvo FH16 (EU)', coordinates: [9.9937, 53.5511], destination: [4.47917, 51.9225], status: 'In Transit', progress: 0.5 },
  { id: 'S4', type: 'truck', name: 'Peterbilt 389 (US)', coordinates: [-74.006, 40.7128], destination: [-118.2437, 34.0522], status: 'Delayed', progress: 0.2 },
  { id: 'S5', type: 'vessel', name: 'CMA CGM Leo', coordinates: [55.2708, 25.2048], destination: [-74.006, 40.7128], status: 'In Transit', progress: 0.8 },
  { id: 'S6', type: 'truck', name: 'Freightliner M2', coordinates: [-87.6298, 41.8781], destination: [-87.6298, 41.8781], status: 'Delivered', progress: 1.0 },
  { id: 'S6', type: 'truck', name: 'Freightliner M2', coordinates: [-87.6298, 41.8781], destination: [-87.6298, 41.8781], status: 'Delivered', progress: 1.0 },
  { id: 'S6', type: 'truck', name: 'Freightliner M2', coordinates: [-87.6298, 41.8781], destination: [-87.6298, 41.8781], status: 'Delivered', progress: 1.0 },
];

export function ShipmentMap({ filterMode = 'All', statusFilter = 'All' }: { filterMode?: string, statusFilter?: string }) {
  const [shipments, setShipments] = useState(initialShipments);

  // Simulate movement
  useEffect(() => {
    const interval = setInterval(() => {
      setShipments(prev => prev.map(shipment => {
        if (shipment.status === 'Delayed') return shipment;
        
        // Simple linear interpolation for movement
        const [startX, startY] = shipment.coordinates;
        const [endX, endY] = shipment.destination;
        
        const dx = (endX - startX) * 0.005; // speed factor
        const dy = (endY - startY) * 0.005; // speed factor
        
        return {
          ...shipment,
          coordinates: [startX + dx, startY + dy],
          progress: Math.min(1, shipment.progress + 0.005)
        };
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const filteredShipments = shipments.filter(s => {
        if (filterMode === 'Sea' && s.type !== 'vessel') return false;
        if (filterMode === 'Road' && s.type !== 'truck') return false;
        if (statusFilter !== 'All' && s.status !== statusFilter) return false;
        return true;
      });

  return (
    <Card className="h-full shadow-sm border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl flex flex-col min-h-[400px]">
      <CardHeader className="flex-none pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapIcon className="w-5 h-5 text-indigo-500" /> Real-Time Shipment Map
            </CardTitle>
            <CardDescription>Live telemetry visualization of vessel and truck coordinates</CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
              <Ship className="w-3 h-3 mr-1" /> Vessels
            </Badge>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">
              <Truck className="w-3 h-3 mr-1" /> Trucks
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-hidden relative flex-1 min-h-[350px] bg-[#f0f9ff] dark:bg-[#0f172a]">
        <ComposableMap projection="geoMercator" projectionConfig={{ scale: 130 }}>
          <ZoomableGroup center={[0, 20]} zoom={1} minZoom={1} maxZoom={8}>
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="currentColor"
                    className="text-slate-200 dark:text-slate-800 outline-none hover:text-slate-300 dark:hover:text-slate-700 transition-colors"
                    stroke="rgba(0,0,0,0.05)"
                  />
                ))
              }
            </Geographies>
            
            
            {/* Draw High-Risk Zones */}
            {highRiskZones.map((zone, idx) => (
              <Marker key={`zone-${idx}`} coordinates={zone.coordinates as [number, number]}>
                <g className="cursor-pointer">
                  <title>High Risk Zone: {zone.name}</title>
                  <circle r={zone.radius} fill="#ef4444" fillOpacity={0.3} className="animate-pulse" />
                  <circle r={zone.radius} stroke="#ef4444" strokeWidth={1} fill="none" />
                  <AlertTriangle className="w-4 h-4 text-red-600 -ml-2 -mt-2 opacity-80" />
                </g>
              </Marker>
            ))}

            {/* Draw lines to destinations */}
            {filteredShipments.map(shipment => (
              <Line
                key={`line-${shipment.id}`}
                from={shipment.coordinates as [number, number]}
                to={shipment.destination as [number, number]}
                stroke={shipment.type === 'vessel' ? '#3b82f6' : '#f59e0b'}
                strokeWidth={1}
                strokeDasharray="4 4"
                className="opacity-40"
              />
            ))}

            {filteredShipments.map(({ id, name, coordinates, type, status }) => (
              <Marker key={id} coordinates={coordinates as [number, number]}>
                <g className="cursor-pointer outline-none hover:opacity-80 transition-opacity drop-shadow-md">
                  <title>{name} - {status}</title>
                  <circle r={12} fill={type === 'vessel' ? '#3b82f6' : '#f59e0b'} fillOpacity={0.2} />
                  <circle r={6} fill={status === 'Delayed' ? '#ef4444' : type === 'vessel' ? '#2563eb' : '#d97706'} stroke="#fff" strokeWidth={1.5} />
                  
                  {type === 'vessel' && (
                    <path d="M-3,-2 L3,-2 L4,1 L0,3 L-4,1 Z" fill="#fff" transform="scale(0.8)" />
                  )}
                  {type === 'truck' && (
                    <rect x="-3" y="-2" width="6" height="4" fill="#fff" />
                  )}
                  {status === 'Delayed' && (
                     <circle r={2} fill="#fff" />
                  )}
                </g>
                <text
                  textAnchor="middle"
                  y={20}
                  style={{ fontFamily: "system-ui", fill: "currentColor", fontSize: "10px", fontWeight: "600", pointerEvents: "none" }}
                  className="text-slate-700 dark:text-slate-300 drop-shadow-sm"
                >
                  {name}
                </text>
              </Marker>
            ))}
          </ZoomableGroup>
        </ComposableMap>
      </CardContent>
    </Card>
  );
}
