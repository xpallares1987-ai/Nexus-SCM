import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Loader2, X, Ship, Building2, Users, FileText, Package, 
  CornerDownLeft, Mic, MicOff, Star, Trash2, Command, ShieldCheck, 
  CreditCard, Sparkles, AlertCircle, History, Landmark, Settings,
  HelpCircle, Volume2, WifiOff, Keyboard, Play, Info, TrendingUp, ArrowRight
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';
import { useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { fetchApi } from '../../lib/api';
import { AnimatePresence, motion } from 'motion/react';
import Fuse from 'fuse.js';

// Default static carriers for fallback and instant pinning display
const DEFAULT_CARRIERS = [
  { id: 'def-maersk', name: 'Maersk Line', category: 'Carrier', code: 'MAEU', country: 'Denmark' },
  { id: 'def-dhl', name: 'DHL Global Forwarding', category: 'Carrier', code: 'DHLA', country: 'Germany' },
  { id: 'def-hapag', name: 'Hapag-Lloyd', category: 'Carrier', code: 'HLCU', country: 'Germany' },
  { id: 'def-one', name: 'ONE Network Express', category: 'Carrier', code: 'ONEY', country: 'Japan' },
  { id: 'def-cosco', name: 'COSCO Shipping', category: 'Carrier', code: 'COSU', country: 'China' }
];

// Available SCM slash commands
const SCM_COMMANDS = [
  {
    id: 'cmd-create-shipment',
    prefix: '/create',
    title: 'Create New Shipment',
    subtitle: 'Register new shipment & container manifest',
    url: '/shipments?action=create-shipment',
    iconName: 'Ship'
  },
  {
    id: 'cmd-create-entity',
    prefix: '/create-entity',
    title: 'Register Cargo Entity',
    subtitle: 'Add new carrier, shipper, or consignee',
    url: '/directory?action=create-entity',
    iconName: 'Users'
  },
  {
    id: 'cmd-billing',
    prefix: '/bill',
    title: 'Freight Billing & Carrier Audits',
    subtitle: 'Verify invoice registers and discrepancies',
    url: '/billing',
    iconName: 'CreditCard'
  },
  {
    id: 'cmd-rates',
    prefix: '/rates',
    title: 'Routing & Rates Engine',
    subtitle: 'Run route cost simulations and DMN routing',
    url: '/rates',
    iconName: 'Landmark'
  },
  {
    id: 'cmd-opt',
    prefix: '/opt',
    title: 'Freight Optimization Suite',
    subtitle: 'Predictive risk forecasts and volume trends',
    url: '/optimization',
    iconName: 'Sparkles'
  },
  {
    id: 'cmd-docs',
    prefix: '/docs',
    title: 'Document SCM Hub',
    subtitle: 'OCR metadata extraction & document archive',
    url: '/documents',
    iconName: 'FileText'
  },
  {
    id: 'cmd-profile',
    prefix: '/profile',
    title: 'UserProfile & Biometrics',
    subtitle: 'FIDO2 Passkeys and settings export',
    url: '/profile',
    iconName: 'Settings'
  }
];

// IndexedDB configuration for Offline-First Index Cache
const DB_NAME = 'SCMOfflineSearchCache';
const DB_VERSION = 1;
const STORE_NAME = 'shipmentsIndex';

function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = (event: any) => resolve(event.target.result);
    request.onerror = (event: any) => reject(event.target.error);
  });
}

async function saveShipmentsToIndexedDB(shipments: any[]) {
  try {
    const db = await openIndexedDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // Clear old data first to keep it compressed and fresh
    store.clear();
    
    shipments.forEach(item => {
      store.put({
        id: item.id,
        title: item.referenceNumber || item.id,
        subtitle: item.status || 'Active',
        hbl: item.hbl || '',
        mbl: item.mbl || '',
        awb: item.awb || '',
        savedAt: new Date().toISOString()
      });
    });
  } catch (err) {
    console.error('IndexedDB write error:', err);
  }
}

async function getShipmentsFromIndexedDB(): Promise<any[]> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('IndexedDB read error:', err);
    return [];
  }
}

// Helper to construct time series data for Recharts LineChart with categories
const getSearchTimeSeries = (timesDataV2: Record<string, any> = {}, timeRange: string = '24h') => {
  const current = new Date();
  const series = [];
  
  let hoursToGenerate = 24;
  let interval = 1; // 1 hour step

  if (timeRange === '12h') {
    hoursToGenerate = 12;
  } else if (timeRange === '24h') {
    hoursToGenerate = 24;
  } else if (timeRange === '7d') {
    hoursToGenerate = 24 * 7;
    interval = 6; // group by 6 hours for 7d view to not overload chart
  } else if (timeRange === 'shift') {
    hoursToGenerate = 8; // 8 hour operational shift
  }
  
  // Baseline simulated distribution
  const baseLineTotal = [12, 5, 2, 1, 3, 8, 15, 25, 30, 42, 35, 22, 18, 20, 28, 32, 25, 15, 12, 8, 5, 3, 2, 5];
  
  const hasRealData = Object.keys(timesDataV2).length > 0;

  for (let i = hoursToGenerate - 1; i >= 0; i -= interval) {
    let total = 0, shipment = 0, party = 0, warehouse = 0, document = 0;
    let label = '';
    let isSpike = false;
    let fullTime = '';

    for(let j = 0; j < interval; j++) {
      const targetTime = new Date(current.getTime() - (i - j) * 60 * 60 * 1000);
      const dateStr = targetTime.toISOString().slice(0, 10);
      const hourStr = targetTime.getHours().toString().padStart(2, '0') + ':00';
      const hourKey = `${dateStr}T${hourStr}`;
      
      if(j === 0) {
        label = timeRange === '7d' ? `${targetTime.getMonth()+1}/${targetTime.getDate()} ${hourStr}` : hourStr;
        fullTime = hourKey;
      }

      const realData = timesDataV2[hourKey];
      if (realData) {
        total += realData.total || 0;
        shipment += realData.shipment || 0;
        party += realData.party || 0;
        warehouse += realData.warehouse || 0;
        document += realData.document || 0;
      } else if (!hasRealData) {
        const baseIndex = targetTime.getHours();
        const base = baseLineTotal[baseIndex] || 5;
        total += base;
        shipment += Math.floor(base * 0.5);
        party += Math.floor(base * 0.3);
        warehouse += Math.floor(base * 0.1);
        document += base - Math.floor(base * 0.5) - Math.floor(base * 0.3) - Math.floor(base * 0.1);
      }
    }
    
    // Check if total spikes above threshold (e.g. baseline average ~ 15 per hour)
    if (total > (40 * interval)) isSpike = true;

    series.push({
      time: label,
      fullTime,
      total,
      shipment,
      party,
      warehouse,
      document,
      isSpike
    });
  }

  return series;
};

export function GlobalSearch() {
  const { token } = useAuth();
  const navigate = useNavigate();
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [fuzzySuggestions, setFuzzySuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  // Analytics state
  const [emptyView, setEmptyView] = useState<'shortcuts' | 'analytics'>('shortcuts');
  const [analyticsData, setAnalyticsData] = useState<any>({ successful: {}, failed: {}, times: {}, timesV2: {} });
  const [timeRange, setTimeRange] = useState<'12h' | '24h' | '7d' | 'shift'>('24h');
  
  // Offline state tracking
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  // Shortcuts Help Overlay state
  const [showShortcutsCheatSheet, setShowShortcutsCheatSheet] = useState(false);

  // Recent searches cache
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  
  // Pinned/Favorite carriers
  const [pinnedCarrierIds, setPinnedCarrierIds] = useState<string[]>([]);
  const [allCarriers, setAllCarriers] = useState<any[]>([]);

  // Voice recognition
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Local SCM pool for Fuse.js fuzzy matching
  const [localPool, setLocalPool] = useState<any[]>([]);
  const fuseRef = useRef<any>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync network status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load cache and setup Speech Recognition
  useEffect(() => {
    // Recent searches load
    try {
      const savedAnalytics = localStorage.getItem('scm_search_analytics');
      if (savedAnalytics) {
        setAnalyticsData(JSON.parse(savedAnalytics));
      }

      const savedSearches = localStorage.getItem('scm_recent_searches');
      if (savedSearches) {
        setRecentSearches(JSON.parse(savedSearches));
      }
      const savedPinned = localStorage.getItem('scm_pinned_carriers');
      if (savedPinned) {
        setPinnedCarrierIds(JSON.parse(savedPinned));
      } else {
        // Pre-pin Maersk and DHL by default
        const defaultPins = ['def-maersk', 'def-dhl'];
        setPinnedCarrierIds(defaultPins);
        localStorage.setItem('scm_pinned_carriers', JSON.stringify(defaultPins));
      }
    } catch (e) {
      console.error('Failed to parse local storage cache:', e);
    }

    // Web Speech API initialization
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          const cleanedText = transcript.replace(/[.\-_]/g, '').trim();
          setQuery(cleanedText);
          setIsOpen(true);
          speakFeedback(`Searching for ${cleanedText}`);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    // Global Key Down Listener for '?' hotkey cheat sheet
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input/textarea
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        (activeEl as HTMLElement).isContentEditable
      );
      
      if (e.key === '?' && !isInput) {
        e.preventDefault();
        setShowShortcutsCheatSheet(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Fetch local pool for fuzzy matching and back up to IndexedDB
  useEffect(() => {
    async function loadFuzzyPool() {
      try {
        let pool: any[] = [];
        let shipmentsList: any[] = [];
        let warehousesList: any[] = [];
        let partiesList: any[] = [];

        if (navigator.onLine) {
          // Online: fetch live from servers
          const [shipmentsData, warehousesData, partiesData] = await Promise.all([
            fetchApi('/shipments', token).catch(() => []),
            fetchApi('/warehouses', token).catch(() => []),
            fetchApi('/parties', token).catch(() => [])
          ]);

          shipmentsList = Array.isArray(shipmentsData) ? shipmentsData : [];
          warehousesList = Array.isArray(warehousesData) ? warehousesData : [];
          partiesList = Array.isArray(partiesData) ? partiesData : [];

          // Save carriers state
          const dirCarriers = partiesList.filter((p: any) => p.category === 'Carrier' || p.type === 'Carrier');
          setAllCarriers(dirCarriers);

          // Build a robust flat pool
          pool = [
            ...shipmentsList.map((s: any) => ({
              type: 'shipment',
              id: s.id,
              title: s.referenceNumber || s.id,
              subtitle: s.status || 'Active',
              url: '/shipments',
              hbl: s.hbl || '',
              mbl: s.mbl || '',
              awb: s.awb || ''
            })),
            ...warehousesList.map((w: any) => ({
              type: 'warehouse',
              id: w.id,
              title: w.name || '',
              subtitle: w.code || '',
              url: '/warehouses'
            })),
            ...partiesList.map((p: any) => ({
              type: 'party',
              id: p.id,
              title: p.name || p.companyName || '',
              subtitle: p.type || p.category || 'Carrier',
              url: '/directory'
            }))
          ];

          // Save shipments cleanly to IndexedDB Offline cache
          if (shipmentsList.length > 0) {
            await saveShipmentsToIndexedDB(shipmentsList);
          }
        } else {
          // Offline Fallback: Read active shipments index back from IndexedDB
          const offlineShipments = await getShipmentsFromIndexedDB();
          pool = offlineShipments.map(s => ({
            type: 'shipment',
            id: s.id,
            title: s.title,
            subtitle: s.subtitle,
            url: '/shipments',
            hbl: s.hbl,
            mbl: s.mbl,
            awb: s.awb,
            isOfflineResult: true
          }));
        }

        setLocalPool(pool);
        fuseRef.current = new Fuse(pool, {
          keys: ['title', 'subtitle', 'hbl', 'mbl', 'awb'],
          threshold: 0.35, // light typo tolerance
        });
      } catch (err) {
        console.error('Failed to compile fuzzy lookup pool:', err);
      }
    }
    if (token) {
      loadFuzzyPool();
    }
  }, [token, isOffline]);

  const logSearchAnalytics = (searchQuery: string, success: boolean, category: string = 'unknown') => {
    if (!searchQuery || searchQuery.length < 3) return;
    
    setAnalyticsData((prev: any) => {
      const next = {
        successful: { ...prev.successful },
        failed: { ...prev.failed },
        times: { ...prev.times },
        timesV2: { ...(prev.timesV2 || {}) }
      };

      const dateObj = new Date();
      const hour = dateObj.getHours().toString().padStart(2, '0') + ':00';
      const dateStr = dateObj.toISOString().slice(0, 10);
      const hourKey = `${dateStr}T${hour}`;
      const cleanQ = searchQuery.toLowerCase().trim();
      
      if (success) {
        next.successful[cleanQ] = (next.successful[cleanQ] || 0) + 1;
      } else {
        next.failed[cleanQ] = (next.failed[cleanQ] || 0) + 1;
      }
      
      next.times[hour] = (next.times[hour] || 0) + 1;
      
      if (!next.timesV2[hourKey]) next.timesV2[hourKey] = { total: 0 };
      next.timesV2[hourKey][category] = (next.timesV2[hourKey][category] || 0) + 1;
      next.timesV2[hourKey].total += 1;
      
      localStorage.setItem('scm_search_analytics', JSON.stringify(next));
      return next;
    });
  };

  // Fetch results when query is typed
  useEffect(() => {
    const isCommand = query.startsWith('/');
    
    if (query.trim().length < 3 && !isCommand) {
      setResults([]);
      setFuzzySuggestions([]);
      setLoading(false);
      setSelectedIndex(-1);
      return;
    }

    setIsOpen(true);
    setSelectedIndex(-1);

    if (isCommand) {
      setResults([]);
      setFuzzySuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const delayDebounce = setTimeout(async () => {
      try {
        let dbResults = [];
        if (!isOffline) {
          // Fetch live from server
          const response = await fetchApi(`/search?q=${encodeURIComponent(query)}`, token);
          dbResults = response.results || [];
          setResults(dbResults);
        } else {
          // Offline fallback mode: query from local pool instantly
          if (fuseRef.current) {
            const hits = fuseRef.current.search(query).map((res: any) => res.item);
            dbResults = hits.slice(0, 5);
            setResults(dbResults);
          }
        }

        // Compute local fuzzy suggested fallback corrections
        let suggestions: any[] = [];
        if (fuseRef.current) {
          const directTitles = new Set(dbResults.map((r: any) => r.title.toLowerCase()));
          const fuzzyHits = fuseRef.current.search(query).map((res: any) => res.item);
          
          // Suggest close corrections not matched directly
          suggestions = fuzzyHits
            .filter((item: any) => !directTitles.has(item.title.toLowerCase()))
            .slice(0, 3);
          
          setFuzzySuggestions(suggestions);
        }
        
        if (dbResults.length === 0 && suggestions.length === 0) {
          logSearchAnalytics(query, false, 'unknown');
        }
      } catch (error) {
        console.error('Global search DB query error:', error);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(delayDebounce);
  }, [query, token, isOffline]);

  // Speech Synthesis hands-free feedback helper
  const speakFeedback = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel ongoing speeches to prevent stacking
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Voice-to-query dictation is not fully supported on this browser context. Please try Chrome or Edge.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSelect = (result: any) => {
    // Log successful search
    logSearchAnalytics(query || result.title, true, result.type || 'unknown');
    
    // Speak shipment references to warehouse crew hands-free
    if (result.type === 'shipment') {
      speakFeedback(`Opening shipment ${result.title.split('-').join(' ')}. Current status is ${result.subtitle}`);
    } else {
      speakFeedback(`Navigating to ${result.title}`);
    }

    // Add to recent cache
    const searchItem = {
      id: result.id,
      title: result.title,
      subtitle: result.subtitle,
      type: result.type,
      url: result.url
    };

    setRecentSearches(prev => {
      const filtered = prev.filter(p => p.title !== result.title || p.type !== result.type);
      const updated = [searchItem, ...filtered].slice(0, 5);
      localStorage.setItem('scm_recent_searches', JSON.stringify(updated));
      return updated;
    });

    // Reset state
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
    if (inputRef.current) inputRef.current.blur();

    let destination = result.url;
    if (result.type === 'party') {
      destination = '/directory';
    }

    navigate(`${destination}?search=${encodeURIComponent(result.title)}`);
  };

  const handleCommandSelect = (cmd: any) => {
    speakFeedback(`Executing command shortcut for ${cmd.title}`);
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
    if (inputRef.current) inputRef.current.blur();
    navigate(cmd.url);
  };

  // Pinned toggle
  const togglePin = (carrierId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedCarrierIds(prev => {
      const next = prev.includes(carrierId) 
        ? prev.filter(id => id !== carrierId) 
        : [...prev, carrierId];
      localStorage.setItem('scm_pinned_carriers', JSON.stringify(next));
      return next;
    });
  };

  // Remove recent search
  const removeRecent = (title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches(prev => {
      const next = prev.filter(r => r.title !== title);
      localStorage.setItem('scm_recent_searches', JSON.stringify(next));
      return next;
    });
  };

  // Clear all recents
  const clearAllRecents = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    localStorage.removeItem('scm_recent_searches');
  };

  // Command mode matching
  const isCommandMode = query.startsWith('/');
  const filteredCommands = SCM_COMMANDS.filter(cmd => 
    cmd.prefix.toLowerCase().includes(query.toLowerCase()) || 
    cmd.title.toLowerCase().includes(query.toLowerCase())
  );

  // Pinned/Favorite carriers compilation
  const mergedCarriersPool = [
    ...DEFAULT_CARRIERS,
    ...allCarriers.map(c => ({
      id: c.id,
      name: c.name || c.companyName,
      category: 'Carrier',
      code: c.referenceNumber || c.id.substring(0, 4).toUpperCase(),
      country: c.country || 'Global'
    }))
  ];
  const uniqueCarriers = Array.from(new Map(mergedCarriersPool.map(c => [c.name.toLowerCase(), c])).values());
  const favoriteCarriers = uniqueCarriers.filter(c => pinnedCarrierIds.includes(c.id));
  const otherCarriersToPin = uniqueCarriers.filter(c => !pinnedCarrierIds.includes(c.id)).slice(0, 3);

  // Flattened active results list for key navigation
  const getVisibleItems = () => {
    if (isCommandMode) {
      return filteredCommands;
    }
    if (query.trim().length === 0) {
      return [
        ...recentSearches.map(r => ({ ...r, listType: 'recent' })),
        ...favoriteCarriers.map(c => ({ ...c, title: c.name, subtitle: c.code, type: 'carrier', url: '/directory', listType: 'favorite' }))
      ];
    }
    return [...results, ...fuzzySuggestions];
  };

  // Keyboard controls
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const visibleItems = getVisibleItems();
    
    // Quick triggers check
    if (e.key === '?') {
      const isInputFocused = document.activeElement === inputRef.current;
      // If user typed '?' outside of search or at the start, toggle sheet
      if (!isInputFocused) {
        e.preventDefault();
        setShowShortcutsCheatSheet(true);
        return;
      }
    }

    if (!isOpen || visibleItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % visibleItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + visibleItems.length) % visibleItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = selectedIndex >= 0 && selectedIndex < visibleItems.length ? visibleItems[selectedIndex] : visibleItems[0];
      if (item) {
        if (item.prefix) {
          handleCommandSelect(item);
        } else if (item.listType === 'favorite' || item.type === 'carrier') {
          navigate(`/directory?search=${encodeURIComponent(item.name || item.title)}`);
          setQuery('');
          setIsOpen(false);
        } else {
          handleSelect(item);
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSelectedIndex(-1);
      if (inputRef.current) inputRef.current.blur();
    }
  };

  const getCommandIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'Ship': return <Ship className="w-4 h-4 text-sky-500" />;
      case 'Users': return <Users className="w-4 h-4 text-emerald-500" />;
      case 'CreditCard': return <CreditCard className="w-4 h-4 text-indigo-500" />;
      case 'Landmark': return <Landmark className="w-4 h-4 text-amber-500" />;
      case 'Sparkles': return <Sparkles className="w-4 h-4 text-fuchsia-500" />;
      case 'FileText': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'Settings': return <Settings className="w-4 h-4 text-zinc-500" />;
      default: return <Command className="w-4 h-4 text-zinc-500" />;
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md mx-4 z-40">
      {/* Search Input, Voice Dictation, Offline Indicator, and Cheat Sheet button */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={
            isListening 
              ? "Speak container/HBL now..." 
              : isOffline 
                ? "Offline Index Search..." 
                : "Type shipment HBL, warehouse or /command..."
          }
          className={`w-full h-9 pl-9 pr-24 text-sm border rounded-lg bg-muted/40 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-700 focus:bg-background transition-all duration-150 ${
            isListening ? 'ring-2 ring-red-500/50 bg-red-50/5 dark:bg-red-950/10' : ''
          }`}
        />
        
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {/* Offline status chip */}
          {isOffline && (
            <span 
              title="Remote Warehouse Offline Mode (IndexedDB-Backed Search active)" 
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-950/40 rounded border border-amber-200/30 animate-pulse"
            >
              <WifiOff className="w-2.5 h-2.5" />
              Offline
            </span>
          )}

          {/* Quick Shortcuts Help Trigger */}
          <button
            type="button"
            onClick={() => setShowShortcutsCheatSheet(true)}
            title="Interactive Keyboard Shortcuts Cheat Sheet [?]"
            className="p-1 rounded text-muted-foreground hover:bg-muted transition-colors"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>

          {/* Microphone dictation button */}
          <button
            type="button"
            onClick={toggleListening}
            title="Hands-free voice container search"
            className={`p-1 rounded hover:bg-muted transition-colors ${
              isListening ? 'text-red-500 animate-pulse bg-red-100/40 dark:bg-red-950/40' : 'text-muted-foreground'
            }`}
          >
            {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>

          {/* Clear search query button */}
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                setFuzzySuggestions([]);
                setSelectedIndex(-1);
                if (inputRef.current) inputRef.current.focus();
              }}
              className="p-1 hover:bg-muted text-muted-foreground rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* SCM Floating Dropdown Modals */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop overlay */}
            <div 
              className="fixed inset-0 z-30 bg-black/5 dark:bg-black/20 backdrop-blur-[1px]" 
              onClick={() => setIsOpen(false)} 
            />

            {/* Float Dropdown Menu */}
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.99 }}
              transition={{ duration: 0.12 }}
              className="absolute left-0 right-0 mt-2 z-40 max-h-[440px] overflow-y-auto bg-popover text-popover-foreground border border-border rounded-xl shadow-xl overflow-hidden focus:outline-none"
            >
              {/* Header Indicator */}
              <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b border-border/60 text-[11px] font-medium text-muted-foreground select-none">
                <span className="flex items-center gap-1.5 font-semibold text-zinc-500 dark:text-zinc-400">
                  {isCommandMode ? (
                    <>
                      <Command className="w-3 h-3 text-indigo-500" />
                      Executive Command Console
                    </>
                  ) : query.trim().length === 0 ? (
                    <>
                      <History className="w-3 h-3 text-indigo-500" />
                      Recent Searches & Carrier Cache
                    </>
                  ) : loading ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                      Querying SCM records...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      Search results ({results.length + fuzzySuggestions.length})
                    </>
                  )}
                </span>
                <span className="hidden sm:flex items-center gap-1 text-[10px] text-zinc-400">
                  Use <kbd className="px-1 bg-muted border border-border rounded font-mono">↓↑</kbd> <kbd className="px-1 bg-muted border border-border rounded font-mono">↵</kbd>
                </span>
              </div>

              {/* 1. Slash Command Mode Interface */}
              {isCommandMode && (
                <div className="p-2 space-y-1">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 select-none">
                    Command Shortcuts
                  </div>
                  {filteredCommands.length === 0 ? (
                    <div className="py-4 text-center text-xs text-muted-foreground">
                      No matching command prefixes. Type <code className="px-1 bg-muted rounded font-mono">/create</code> or <code className="px-1 bg-muted rounded font-mono">/bill</code>.
                    </div>
                  ) : (
                    filteredCommands.map((cmd, i) => {
                      const isSelected = selectedIndex === i;
                      return (
                        <div
                          key={cmd.id}
                          onClick={() => handleCommandSelect(cmd)}
                          className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all duration-150 ${
                            isSelected
                              ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-foreground shadow-sm'
                              : 'hover:bg-muted border border-transparent text-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-md">
                              {getCommandIconComponent(cmd.iconName)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-500 font-bold">
                                  {cmd.prefix}
                                </span>
                                {cmd.title}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{cmd.subtitle}</p>
                            </div>
                          </div>
                          {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* 2. Empty or Short Query: Recent Searches & Carrier Favorites */}
              {query.trim().length === 0 && !isCommandMode && (
                <div className="p-2 space-y-4">
                  {/* Tabs */}
                  <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-lg mx-2 border border-border/50">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEmptyView('shortcuts'); }}
                      className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors ${emptyView === 'shortcuts' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                    >
                      Shortcuts & Cache
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEmptyView('analytics'); }}
                      className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors ${emptyView === 'analytics' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                    >
                      Search Analytics
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate('/search'); setIsOpen(false); }}
                      className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted`}
                    >
                      Advanced Search
                    </button>
                  </div>

                  {emptyView === 'shortcuts' ? (
                    <>
                      {/* Recent Searches */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between px-2 py-1 select-none">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                            Recent Inquiries
                          </span>
                          {recentSearches.length > 0 && (
                            <button
                              onClick={clearAllRecents}
                              className="text-[10px] flex items-center gap-1 text-red-500 hover:text-red-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" /> Clear Cache
                            </button>
                          )}
                        </div>
                        {recentSearches.length === 0 ? (
                          <div className="py-3 px-2 text-xs text-muted-foreground italic">
                            No recent search history.
                          </div>
                        ) : (
                          recentSearches.map((res, i) => {
                            const isSelected = selectedIndex === i;
                            return (
                              <div
                                key={`recent-${res.id}-${i}`}
                                onClick={() => handleSelect(res)}
                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all duration-150 ${
                                  isSelected
                                    ? 'bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-200'
                                    : 'hover:bg-muted text-foreground'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <History className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold truncate">{res.title}</p>
                                    <p className="text-[10px] text-muted-foreground capitalize">{res.type}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => removeRecent(res.title, e)}
                                  className="p-1 hover:bg-muted text-zinc-400 hover:text-zinc-600 rounded"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>

                  {/* Carrier Favorites */}
                  <div className="space-y-1 border-t border-border/50 pt-3">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 select-none flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      Pinned SCM Carriers
                    </div>
                    {favoriteCarriers.length === 0 ? (
                      <div className="py-2 px-2 text-xs text-muted-foreground italic">
                        No carrier shortcuts pinned.
                      </div>
                    ) : (
                      favoriteCarriers.map((c, i) => {
                        const offsetIdx = recentSearches.length + i;
                        const isSelected = selectedIndex === offsetIdx;
                        return (
                          <div
                            key={`pinned-${c.id}`}
                            onClick={() => navigate(`/directory?search=${encodeURIComponent(c.name)}`)}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all duration-150 ${
                              isSelected
                                ? 'bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-200'
                                : 'hover:bg-muted text-foreground'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="p-1 bg-amber-50 dark:bg-amber-950/30 rounded">
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold truncate">{c.name}</p>
                                <p className="text-[10px] text-muted-foreground">Code: {c.code} · {c.country}</p>
                              </div>
                            </div>
                            <button
                              onClick={(e) => togglePin(c.id, e)}
                              className="p-1 hover:bg-muted text-amber-500 rounded"
                              title="Unpin carrier"
                            >
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            </button>
                          </div>
                        );
                      })
                    )}

                    {/* Unpinned suggestions */}
                    {otherCarriersToPin.length > 0 && (
                      <div className="pt-2">
                        <p className="px-2 pb-1 text-[9px] font-semibold text-zinc-400 uppercase select-none">
                          Quick pin carriers
                        </p>
                        <div className="flex flex-wrap gap-1.5 px-2">
                          {otherCarriersToPin.map(c => (
                            <button
                              key={`unpinned-btn-${c.id}`}
                              onClick={(e) => togglePin(c.id, e)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-muted hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-foreground text-left"
                            >
                              <Star className="w-3 h-3 text-zinc-400 hover:text-amber-400" />
                              {c.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                    </>
                  ) : (
                    <div className="space-y-4 px-2">
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Top Successful
                        </h4>
                        {Object.keys(analyticsData.successful || {}).length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">No data yet.</p>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(analyticsData.successful)
                              .sort(([, a]: any, [, b]: any) => b - a)
                              .slice(0, 4)
                              .map(([q, count]: any) => (
                                <div key={q} className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100 p-2 rounded-lg border border-emerald-200/50 flex items-center justify-between">
                                  <span className="text-xs font-semibold truncate" title={q}>{q}</span>
                                  <span className="text-[10px] bg-emerald-200/50 px-1.5 rounded">{count}x</span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Frequent Failures
                        </h4>
                        {Object.keys(analyticsData.failed || {}).length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">No data yet.</p>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(analyticsData.failed)
                              .sort(([, a]: any, [, b]: any) => b - a)
                              .slice(0, 4)
                              .map(([q, count]: any) => (
                                <div key={q} className="bg-red-50 dark:bg-red-950/20 text-red-900 dark:text-red-100 p-2 rounded-lg border border-red-200/50 flex items-center justify-between">
                                  <span className="text-xs font-semibold truncate" title={q}>{q}</span>
                                  <span className="text-[10px] bg-red-200/50 px-1.5 rounded">{count}x</span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5 text-indigo-500" /> Search Volume Analytics
                          </h4>
                          <div className="flex bg-muted rounded border border-border/50 p-0.5">
                            {['12h', '24h', '7d', 'shift'].map(range => (
                              <button
                                key={range}
                                onClick={(e) => { e.stopPropagation(); setTimeRange(range as any); }}
                                className={`text-[9px] font-medium px-2 py-0.5 rounded ${timeRange === range ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                              >
                                {range === 'shift' ? 'Shift' : range.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Recharts Line Chart with smooth entrance animation */}
                        <motion.div 
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, ease: 'easeOut' }}
                          className="h-36 w-full pt-2 pb-1 bg-gradient-to-b from-indigo-50/30 to-background dark:from-indigo-950/20 dark:to-background rounded-xl border border-indigo-100/60 dark:border-indigo-900/40 p-2 relative"
                        >
                          {/* Alert Badge for spikes */}
                          {getSearchTimeSeries(analyticsData.timesV2, timeRange).some(d => d.isSpike) && (
                            <div className="absolute top-2 right-2 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                              <AlertCircle className="w-3 h-3" /> Volume Spike Detected
                            </div>
                          )}
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={getSearchTimeSeries(analyticsData.timesV2, timeRange)} margin={{ top: 15, right: 10, left: -25, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(120, 120, 120, 0.15)" />
                              <XAxis 
                                dataKey="time" 
                                tick={{ fontSize: 9, fill: 'currentColor' }} 
                                interval="preserveStartEnd" 
                                tickLine={false} 
                                axisLine={false} 
                                className="text-muted-foreground" 
                              />
                              <YAxis 
                                tick={{ fontSize: 9, fill: 'currentColor' }} 
                                allowDecimals={false} 
                                tickLine={false} 
                                axisLine={false} 
                                className="text-muted-foreground" 
                              />
                              <Tooltip 
                                cursor={{ stroke: '#818cf8', strokeWidth: 1, strokeDasharray: '4 4' }}
                                content={({ active, payload, label }: any) => {
                                  if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                      <div className="bg-popover text-popover-foreground border border-border rounded-lg shadow-xl p-2.5 text-xs space-y-1.5 min-w-[140px]">
                                        <div className="flex items-center gap-1.5 font-bold border-b border-border/60 pb-1">
                                          <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                                          <span>Time: {label}</span>
                                        </div>
                                        <div className="space-y-1 pt-0.5">
                                          {data.isSpike && (
                                            <div className="text-[10px] text-red-500 font-bold mb-1 flex items-center gap-1">
                                              <AlertCircle className="w-3 h-3" /> Peak Anomaly Detected
                                            </div>
                                          )}
                                          <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-muted-foreground">Total:</span>
                                            <span className="font-bold text-foreground">{data.total}</span>
                                          </div>
                                          {data.shipment > 0 && (
                                            <div className="flex items-center justify-between text-[11px]">
                                              <span className="text-blue-500 flex items-center gap-1"><Ship className="w-3 h-3"/> Shipments:</span>
                                              <span className="font-bold text-foreground">{data.shipment}</span>
                                            </div>
                                          )}
                                          {data.party > 0 && (
                                            <div className="flex items-center justify-between text-[11px]">
                                              <span className="text-emerald-500 flex items-center gap-1"><Building2 className="w-3 h-3"/> Parties:</span>
                                              <span className="font-bold text-foreground">{data.party}</span>
                                            </div>
                                          )}
                                          {data.warehouse > 0 && (
                                            <div className="flex items-center justify-between text-[11px]">
                                              <span className="text-amber-500 flex items-center gap-1"><Package className="w-3 h-3"/> Warehouse:</span>
                                              <span className="font-bold text-foreground">{data.warehouse}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2.5} dot={false} activeDot={{ r: 4, stroke: '#818cf8', strokeWidth: 2, fill: '#4f46e5' }} isAnimationActive={true} animationDuration={800} />
                              <Line type="monotone" dataKey="shipment" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="3 3" dot={false} isAnimationActive={true} animationDuration={800} />
                              <Line type="monotone" dataKey="party" stroke="#10b981" strokeWidth={1.5} strokeDasharray="3 3" dot={false} isAnimationActive={true} animationDuration={800} />
                              <Line type="monotone" dataKey="warehouse" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3 3" dot={false} isAnimationActive={true} animationDuration={800} />
                            </LineChart>
                          </ResponsiveContainer>
                        </motion.div>
                        <div className="flex items-center justify-center gap-3 pt-1">
                          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#6366f1]" /> <span className="text-[9px] text-muted-foreground">Total</span></div>
                          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#3b82f6]" /> <span className="text-[9px] text-muted-foreground">Shipments</span></div>
                          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#10b981]" /> <span className="text-[9px] text-muted-foreground">Parties</span></div>
                          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#f59e0b]" /> <span className="text-[9px] text-muted-foreground">Warehouse</span></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Query Active Mode: Database & Fuzzy Fallback Results */}
              {query.trim().length >= 3 && !isCommandMode && (
                <div className="p-2 space-y-3">
                  {/* Database Direct Matches */}
                  {results.length > 0 ? (
                    <div className="space-y-1">
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 select-none flex items-center justify-between">
                        <span>Database Matches</span>
                        {isOffline && <span className="text-[9px] text-amber-500">Local Cache Pool Only</span>}
                      </div>
                      {results.map((res, i) => {
                        const isSelected = selectedIndex === i;
                        return (
                          <div
                            key={`db-${res.type}-${res.id}-${i}`}
                            onClick={() => handleSelect(res)}
                            className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all duration-150 ${
                              isSelected
                                ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-800/40 text-indigo-900 dark:text-indigo-200'
                                : 'hover:bg-muted border border-transparent text-foreground'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-foreground">
                                {res.type === 'shipment' && <Ship className="w-4 h-4 text-sky-500" />}
                                {res.type === 'warehouse' && <Building2 className="w-4 h-4 text-purple-500" />}
                                {res.type === 'party' && <Users className="w-4 h-4 text-emerald-500" />}
                                {res.type === 'inventory' && <Package className="w-4 h-4 text-amber-500" />}
                                {res.type === 'document' && <FileText className="w-4 h-4 text-blue-500" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate flex items-center gap-1">
                                  {res.title}
                                  {res.isOfflineResult && (
                                    <span className="text-[9px] px-1 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 rounded">IndexedDB</span>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">{res.subtitle}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-semibold">
                              <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-border capitalize">
                                {res.type}
                              </span>
                              {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-indigo-500" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  {/* Local Fuzzy Match Fallback (Suggestions) */}
                  {fuzzySuggestions.length > 0 ? (
                    <div className="space-y-1 border-t border-border/50 pt-2">
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1 select-none">
                        <AlertCircle className="w-3 h-3" />
                        Typo suggestions (Fuzzy Match)
                      </div>
                      {fuzzySuggestions.map((res, i) => {
                        const offsetIdx = results.length + i;
                        const isSelected = selectedIndex === offsetIdx;
                        return (
                          <div
                            key={`fuzzy-${res.type}-${res.id}-${i}`}
                            onClick={() => handleSelect(res)}
                            className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all duration-150 ${
                              isSelected
                                ? 'bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/40 text-amber-900 dark:text-amber-200'
                                : 'hover:bg-amber-50/10 dark:hover:bg-amber-950/10 border border-dashed border-amber-200/30 text-foreground'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-950/20 text-amber-500">
                                {res.type === 'shipment' && <Ship className="w-4 h-4" />}
                                {res.type === 'warehouse' && <Building2 className="w-4 h-4" />}
                                {res.type === 'party' && <Users className="w-4 h-4" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate flex items-center gap-1.5">
                                  {res.title}
                                  <span className="text-[9px] bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold px-1.5 rounded">
                                    Closest correction
                                  </span>
                                </p>
                                <p className="text-xs text-muted-foreground truncate">{res.subtitle}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-semibold">
                              <span className="px-2 py-0.5 rounded-full bg-amber-100/50 dark:bg-amber-950/10 text-amber-700 dark:text-amber-300 capitalize">
                                {res.type}
                              </span>
                              {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-amber-500" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  {/* Empty state of search results */}
                  {results.length === 0 && fuzzySuggestions.length === 0 && (
                    <div className="py-8 text-center">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">No matches found</p>
                        <p className="text-xs text-muted-foreground">Try spelling corrections, or try a different container ID.</p>
                      </div>
                    </div>
                  )}

                  <div className="mt-2 pt-2 border-t border-border">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate('/search'); setIsOpen(false); }}
                      className="w-full py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors flex items-center justify-center gap-1.5 rounded-md hover:bg-muted"
                    >
                      Open Advanced Search Engine <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Interactive Keyboard Shortcuts Cheat Sheet Modal */}
      <AnimatePresence>
        {showShortcutsCheatSheet && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => setShowShortcutsCheatSheet(false)} 
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-popover text-popover-foreground border border-border p-6 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-border/80 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <Keyboard className="w-5 h-5 text-indigo-500 animate-pulse" />
                  <h3 className="text-lg font-bold">Executive SCM Console Hotkeys</h3>
                </div>
                <button
                  onClick={() => setShowShortcutsCheatSheet(false)}
                  className="p-1.5 hover:bg-muted text-muted-foreground rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Boost your logistics dispatch operations with instant keyboard-bound shortcuts. Dictate hands-free or jump straight to forms with command prefixes.
                </p>

                {/* Hotkeys Section */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Navigation Hotkeys</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-2.5 bg-muted/40 rounded-xl border border-border/50">
                      <span className="text-xs font-medium">Toggle Cheat Sheet</span>
                      <kbd className="px-2 py-0.5 bg-background border border-border rounded text-xs font-mono">?</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-muted/40 rounded-xl border border-border/50">
                      <span className="text-xs font-medium">Focus Search Box</span>
                      <kbd className="px-2 py-0.5 bg-background border border-border rounded text-xs font-mono">⌘ K</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-muted/40 rounded-xl border border-border/50">
                      <span className="text-xs font-medium">Line List Navigation</span>
                      <kbd className="px-2 py-0.5 bg-background border border-border rounded text-xs font-mono">↓ ↑</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-muted/40 rounded-xl border border-border/50">
                      <span className="text-xs font-medium">Confirm / Navigate</span>
                      <kbd className="px-2 py-0.5 bg-background border border-border rounded text-xs font-mono">Enter</kbd>
                    </div>
                  </div>
                </div>

                {/* Console Commands Section */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Console Slash Commands</h4>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto">
                    {SCM_COMMANDS.map(cmd => (
                      <div key={cmd.id} className="flex items-center justify-between p-2 hover:bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-bold text-indigo-500 font-mono bg-indigo-500/10 px-2 py-0.5 rounded">
                            {cmd.prefix}
                          </code>
                          <span className="text-xs font-medium">{cmd.title}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{cmd.subtitle}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border/80 flex justify-end">
                <button
                  onClick={() => setShowShortcutsCheatSheet(false)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all"
                >
                  Dismiss Overlay
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
