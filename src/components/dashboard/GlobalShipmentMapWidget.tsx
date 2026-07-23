import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { MapIcon } from 'lucide-react';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const allMarkers = [
  { markerOffset: -15, name: "Shanghai Port", coordinates: [121.4737, 31.2304], status: "Active", mode: "Sea" },
  { markerOffset: -15, name: "Rotterdam", coordinates: [4.47917, 51.9225], status: "Active", mode: "Sea" },
  { markerOffset: -15, name: "Los Angeles", coordinates: [-118.2437, 34.0522], status: "Delayed", mode: "Road" },
  { markerOffset: 25, name: "Singapore", coordinates: [103.8198, 1.3521], status: "Active", mode: "Sea" },
  { markerOffset: 25, name: "Dubai", coordinates: [55.2708, 25.2048], status: "Active", mode: "Air" },
  { markerOffset: -15, name: "New York", coordinates: [-74.006, 40.7128], status: "Active", mode: "Air" },
  { markerOffset: 25, name: "Hamburg", coordinates: [9.9937, 53.5511], status: "Active", mode: "Road" },
];

export function GlobalShipmentMapWidget({ filterMode = 'All' }: { filterMode?: string }) {
  const markers = filterMode === 'All' ? allMarkers : allMarkers.filter(m => m.mode === filterMode);

  return (
    <Card className="h-full shadow-sm border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl flex flex-col">
      <CardHeader className="flex-none">
        <CardTitle className="flex items-center gap-2">
          <MapIcon className="w-4 h-4 text-blue-500" /> Global Shipment Map
        </CardTitle>
        <CardDescription>Live locations of active shipments {filterMode !== 'All' && `(${filterMode})`}</CardDescription>
      </CardHeader>
      <CardContent className="p-0 overflow-hidden relative flex-1 min-h-[300px]">
        <div className="absolute inset-0 bg-[#e0f2fe] dark:bg-[#0f172a]/80" />
        <ComposableMap projection="geoMercator" projectionConfig={{ scale: 120 }}>
          <ZoomableGroup center={[0, 20]} zoom={1} minZoom={1} maxZoom={5}>
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="currentColor"
                    className="text-slate-300 dark:text-slate-700 outline-none hover:text-slate-400 dark:hover:text-slate-600 transition-colors"
                    stroke="rgba(0,0,0,0.05)"
                  />
                ))
              }
            </Geographies>
            {markers.map(({ name, coordinates, markerOffset, status }) => (
              <Marker key={name} coordinates={coordinates as [number, number]}>
                <g className="cursor-pointer outline-none hover:opacity-80 transition-opacity">
                  <title>{name} - Status: {status}</title>
                  <circle r={5} fill={status === 'Delayed' ? '#ef4444' : '#10b981'} stroke="#fff" strokeWidth={1.5} />
                </g>
                <text
                  textAnchor="middle"
                  y={markerOffset}
                  style={{ fontFamily: "system-ui", fill: "currentColor", fontSize: "10px", fontWeight: "600", pointerEvents: "none" }}
                  className="text-slate-700 dark:text-slate-300"
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
