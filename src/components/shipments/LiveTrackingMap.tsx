import React, { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/data-display/badge';

export const LiveTrackingMap = ({ shipment }: { shipment: any }) => {
  const [position, setPosition] = useState({ lat: 40, lng: -40 }); // Mock mid-Atlantic
  const [isTracking, setIsTracking] = useState(true);

  useEffect(() => {
    // Generate a deterministically random start based on shipment id
    const seed = shipment.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    setPosition({
      lat: 20 + (seed % 40) - 20,
      lng: -60 + (seed % 100) - 50
    });
  }, [shipment.id]);

  useEffect(() => {
    if (!isTracking) return;

    const interval = setInterval(() => {
      setPosition(prev => ({
        lat: prev.lat + (Math.random() - 0.5) * 0.5,
        lng: prev.lng + (Math.random() - 0.2) * 0.5,
       }));
    }, 2000);

    return () => clearInterval(interval);
  }, [isTracking]);

  useEffect(() => {
    if (shipment.status === 'Delivered' || shipment.status === 'Draft' || shipment.status === 'Booked') {
      setIsTracking(false);
    } else {
      setIsTracking(true);
    }
  }, [shipment.status]);

  return (
    <div className="relative w-full h-48 bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden border mt-4">
      <div 
        className="absolute inset-0 opacity-40 dark:opacity-20"
        style={{
          backgroundImage: 'url("https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      {/* Route Line Mock */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
        <path d={`M 20 100 Q ${50 + position.lng * 2} ${50 - position.lat * 2} ${80 + position.lng * 3} 40`} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-primary" />
      </svg>
      
      <div 
        className="absolute transition-all duration-1000 ease-linear flex flex-col items-center z-10"
        style={{ 
          top: `${Math.max(10, Math.min(90, 50 - position.lat))}%`, 
          left: `${Math.max(10, Math.min(90, 50 + position.lng))}%` 
        }}
      >
        <div className="relative">
          {isTracking && <div className="absolute -inset-2 bg-blue-500/40 rounded-full animate-ping" />}
          <div className={`relative w-3.5 h-3.5 ${isTracking ? 'bg-blue-600' : 'bg-muted-foreground'} rounded-full border-2 border-white dark:border-zinc-900 shadow-md`} />
        </div>
        <div className="mt-1.5 bg-background/95 backdrop-blur-sm text-[10px] font-medium px-2 py-0.5 rounded shadow-sm whitespace-nowrap border flex items-center gap-1">
          <MapPin className="w-3 h-3 text-muted-foreground" />
          {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
        </div>
      </div>

      <div className="absolute top-2 right-2 flex items-center gap-2 z-20">
        <Badge variant={isTracking ? 'default' : 'secondary'} className={isTracking ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' : ''}>
          {isTracking ? <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live GPS</span> : 'Last Known Location'}
        </Badge>
      </div>
    </div>
  );
};
