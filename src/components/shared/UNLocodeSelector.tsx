import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchApi } from '../../lib/api';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/forms/input';

interface UNLocodeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function UNLocodeSelector({ value, onChange, placeholder = "Search UN/LOCODE...", className = "" }: UNLocodeSelectorProps) {
  const { token } = useAuth();
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Only fetch if query is different from exact selected value, and at least 2 chars
    if (query.length < 2) {
      setResults([]);
      return;
    }
    
    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await fetchApi(`/unlocode/search?q=${encodeURIComponent(query)}`, token);
        if (Array.isArray(data)) {
          setResults(data);
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Failed to fetch UNLOCODES", err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query, token]);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div className="relative">
        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input 
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value === '') onChange('');
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="pl-9"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-60 overflow-y-auto">
          {results.map((loc, idx) => (
            <div 
              key={`${loc.country}${loc.location}-${idx}`}
              className="flex items-center justify-between p-2 hover:bg-muted cursor-pointer text-sm"
              onClick={() => {
                const code = `${loc.country}${loc.location}`;
                onChange(code);
                setQuery(code);
                setIsOpen(false);
              }}
            >
              <div>
                <span className="font-semibold text-foreground">{loc.country}{loc.location}</span>
                <span className="ml-2 text-muted-foreground">{loc.nameWoDiacritics || loc.name}</span>
              </div>
              <span className="text-xs text-muted-foreground bg-muted-foreground/10 px-1.5 py-0.5 rounded">
                {loc.function?.includes(1) ? 'Port' : loc.function?.includes(4) ? 'Airport' : 'Location'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
