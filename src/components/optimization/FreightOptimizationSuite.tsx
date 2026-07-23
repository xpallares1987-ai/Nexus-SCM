import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Scale, 
  Trash2, 
  Plus, 
  AlertTriangle, 
  Info, 
  Globe, 
  Truck, 
  Ship, 
  Plane, 
  HelpCircle,
  TrendingDown, 
  ShieldAlert, 
  Activity, 
  CheckCircle2, 
  MapPin, 
  Clock, 
  ChevronRight, 
  Download,
  Flame,
  Leaf,
  BarChart3,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { MultiCarrierNegotiator } from './MultiCarrierNegotiator';
import { BlockchainSmartContractAuditor } from './BlockchainSmartContractAuditor';

// ==========================================
// TYPES & INTERFACES
// ==========================================
interface CargoItem {
  id: string;
  name: string;
  width: number; // in meters (x)
  length: number; // in meters (y)
  height: number; // in meters (z)
  weight: number; // in kg
  stackable: boolean;
  color: string;
  // Placed coordinates (relative to bottom-left-back corner: 0, 0, 0)
  x: number;
  y: number;
  z: number;
  placed: boolean;
}

interface ContainerConfig {
  name: string;
  width: number;  // X: 2.35m (typical 20ft interior)
  length: number; // Y: 5.90m
  height: number; // Z: 2.39m
  maxPayload: number; // in kg (e.g. 21800)
}

interface DemurrageContainer {
  id: string;
  containerNo: string;
  shipmentRef: string;
  carrier: string;
  portOfDischarge: string;
  gateWaitHours: number;
  freeTimeDays: number;
  daysAtPort: number;
  dailyRate: number;
  berthingStatus: 'Berthed' | 'Anchored' | 'Awaiting';
  customsCleared: boolean;
}

// ==========================================
// CONSTANTS
// ==========================================
const CONTAINERS: Record<string, ContainerConfig> = {
  '20ft_dry': { name: "20' Standard Dry Container", width: 2.35, length: 5.90, height: 2.39, maxPayload: 21800 },
  '40ft_dry': { name: "40' Standard Dry Container", width: 2.35, length: 12.03, height: 2.39, maxPayload: 26480 },
  '40ft_hc': { name: "40' High Cube Container", width: 2.35, length: 12.03, height: 2.69, maxPayload: 26300 },
};

const CARGO_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
];

export function FreightOptimizationSuite() {
  const [activeTab, setActiveTab] = useState<'stowage' | 'demurrage' | 'emissions' | 'negotiator'>('negotiator');

  // =========================================================================
  // STATE - 3D CONTAINER STOWAGE & LOAD PLANNER
  // =========================================================================
  const [selectedContainerType, setSelectedContainerType] = useState<string>('20ft_dry');
  const activeContainer = useMemo(() => CONTAINERS[selectedContainerType], [selectedContainerType]);

  const [cargoList, setCargoList] = useState<CargoItem[]>([
    { id: '1', name: 'Industrial Generators', width: 1.2, length: 1.8, height: 1.5, weight: 2400, stackable: false, color: '#3b82f6', x: 0, y: 0, z: 0, placed: true },
    { id: '2', name: 'Electronic Components (Pallet A)', width: 1.0, length: 1.2, height: 1.2, weight: 800, stackable: true, color: '#10b981', x: 1.3, y: 0, z: 0, placed: true },
    { id: '3', name: 'Electronic Components (Pallet B)', width: 1.0, length: 1.2, height: 1.2, weight: 800, stackable: true, color: '#10b981', x: 1.3, y: 0, z: 1.2, placed: true },
    { id: '4', name: 'Auto Spare Parts', width: 1.1, length: 1.5, height: 1.1, weight: 1500, stackable: true, color: '#f59e0b', x: 0, y: 1.9, z: 0, placed: true },
    { id: '5', name: 'Precision Machinery Tooling', width: 1.1, length: 1.1, height: 1.3, weight: 1900, stackable: false, color: '#8b5cf6', x: 1.2, y: 1.9, z: 0, placed: true },
    { id: '6', name: 'Raw Materials (Drum Palette)', width: 1.1, length: 1.1, height: 1.0, weight: 1100, stackable: true, color: '#ec4899', x: 0, y: 3.5, z: 0, placed: false },
    { id: '7', name: 'HVAC Venting Ducting', width: 1.2, length: 1.5, height: 0.8, weight: 450, stackable: true, color: '#06b6d4', x: 0, y: 4.7, z: 0, placed: false },
  ]);

  // Form states for adding cargo
  const [newCargoName, setNewCargoName] = useState('');
  const [newCargoWidth, setNewCargoWidth] = useState(1.2);
  const [newCargoLength, setNewCargoLength] = useState(1.2);
  const [newCargoHeight, setNewCargoHeight] = useState(1.4);
  const [newCargoWeight, setNewCargoWeight] = useState(1000);
  const [newCargoStackable, setNewCargoStackable] = useState(true);

  // Isometric rotation angles
  const [rotX, setRotX] = useState(-20);
  const [rotY, setRotY] = useState(45);

  // =========================================================================
  // STATE - PREDICTIVE DEMURRAGE & DETENTION ALERT ENGINE
  // =========================================================================
  const [portGateCongestion, setPortGateCongestion] = useState({
    'Rotterdam (NL)': { gateWaitHours: 4.2, berthingDelayDays: 1.5, status: 'Moderate' },
    'Antwerp-Bruges (BE)': { gateWaitHours: 2.8, berthingDelayDays: 0.8, status: 'Low' },
    'Shanghai Port (CN)': { gateWaitHours: 6.5, berthingDelayDays: 3.2, status: 'High' },
    'Los Angeles (US)': { gateWaitHours: 8.1, berthingDelayDays: 4.5, status: 'Critical' },
  });

  const [demurrageList, setDemurrageList] = useState<DemurrageContainer[]>([
    { id: 'c1', containerNo: 'MSKU8842109', shipmentRef: 'FFW-2026-101', carrier: 'Maersk', portOfDischarge: 'Los Angeles (US)', gateWaitHours: 8.1, freeTimeDays: 5, daysAtPort: 4, dailyRate: 150, berthingStatus: 'Berthed', customsCleared: true },
    { id: 'c2', containerNo: 'MEDU7753120', shipmentRef: 'FFW-2026-103', carrier: 'MSC', portOfDischarge: 'Shanghai Port (CN)', gateWaitHours: 6.5, freeTimeDays: 7, daysAtPort: 6, dailyRate: 200, berthingStatus: 'Berthed', customsCleared: false },
    { id: 'c3', containerNo: 'CMAU9910452', shipmentRef: 'FFW-2026-107', carrier: 'CMA CGM', portOfDischarge: 'Los Angeles (US)', gateWaitHours: 8.1, freeTimeDays: 5, daysAtPort: 6, dailyRate: 180, berthingStatus: 'Berthed', customsCleared: true },
    { id: 'c4', containerNo: 'HLCU2045931', shipmentRef: 'FFW-2026-112', carrier: 'Hapag-Lloyd', portOfDischarge: 'Rotterdam (NL)', gateWaitHours: 4.2, freeTimeDays: 7, daysAtPort: 2, dailyRate: 120, berthingStatus: 'Anchored', customsCleared: false },
    { id: 'c5', containerNo: 'ONEU3014902', shipmentRef: 'FFW-2026-115', carrier: 'ONE', portOfDischarge: 'Antwerp-Bruges (BE)', gateWaitHours: 2.8, freeTimeDays: 5, daysAtPort: 1, dailyRate: 140, berthingStatus: 'Berthed', customsCleared: true },
  ]);

  const [demurrageSearch, setDemurrageSearch] = useState('');

  // =========================================================================
  // STATE - SCOPE 3 CARBON EMISSIONS CALCULATOR
  // =========================================================================
  const [cargoMassTonnes, setCargoMassTonnes] = useState<number>(18.5);
  const [distanceKm, setDistanceKm] = useState<number>(8500);
  const [selectedRouteLabel, setSelectedRouteLabel] = useState<string>('Transpacific (Asia - US West Coast)');

  // Emission factors (g CO2 per tonne-kilometer) based on standard GHG Protocol guidelines
  const EMISSION_FACTORS = {
    sea: 12.0,       // Ocean Container Vessel (large)
    air: 602.0,      // Air Cargo plane
    road: 85.0,      // Heavy Duty Truck
    rail: 22.0       // Electric Freight Rail
  };

  // =========================================================================
  // ALGORITHMS & DERIVED STATES
  // =========================================================================

  // --- Stowage & Load balancing math ---
  const stowageStats = useMemo(() => {
    const placedItems = cargoList.filter(item => item.placed);
    
    // Total Weight
    const totalWeight = placedItems.reduce((acc, curr) => acc + curr.weight, 0);
    const weightUtilization = (totalWeight / activeContainer.maxPayload) * 100;

    // Total Volume
    const containerVolume = activeContainer.width * activeContainer.length * activeContainer.height;
    const itemsVolume = placedItems.reduce((acc, curr) => acc + (curr.width * curr.length * curr.height), 0);
    const volumeUtilization = (itemsVolume / containerVolume) * 100;

    // Center of Gravity (CoG) calculation
    // CoG along length (Y) and width (X) relative to the geometrical center
    // Centered at X = width/2, Y = length/2
    const centerOfGravity = placedItems.reduce(
      (acc, curr) => {
        // center of each item is its starting coordinate + half of dimension
        const itemCenterX = curr.x + (curr.width / 2);
        const itemCenterY = curr.y + (curr.length / 2);
        return {
          weightedX: acc.weightedX + (itemCenterX * curr.weight),
          weightedY: acc.weightedY + (itemCenterY * curr.weight),
          totalWeight: acc.totalWeight + curr.weight
        };
      }, 
      { weightedX: 0, weightedY: 0, totalWeight: 0 }
    );

    const cogX = centerOfGravity.totalWeight > 0 ? (centerOfGravity.weightedX / centerOfGravity.totalWeight) : activeContainer.width / 2;
    const cogY = centerOfGravity.totalWeight > 0 ? (centerOfGravity.weightedY / centerOfGravity.totalWeight) : activeContainer.length / 2;

    // Ideal center:
    const idealX = activeContainer.width / 2;
    const idealY = activeContainer.length / 2;

    // Deviations as percentage of total dimensions
    const devX = ((cogX - idealX) / activeContainer.width) * 100;
    const devY = ((cogY - idealY) / activeContainer.length) * 100;

    // Safety index is calculated based on horizontal stability (deviations of CoG)
    // We want devX and devY to be as close to 0 as possible. Deviation over 10% is warning.
    const maxDev = Math.max(Math.abs(devX), Math.abs(devY));
    const safetyScore = Math.max(0, Math.min(100, Math.round(100 - (maxDev * 6))));

    return {
      totalWeight,
      weightUtilization,
      itemsVolume,
      volumeUtilization,
      cogX,
      cogY,
      devX,
      devY,
      safetyScore
    };
  }, [cargoList, activeContainer]);

  // Handle cargo actions
  const addCargo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCargoName.trim()) return;

    const newItem: CargoItem = {
      id: crypto.randomUUID(),
      name: newCargoName,
      width: Number(newCargoWidth),
      length: Number(newCargoLength),
      height: Number(newCargoHeight),
      weight: Number(newCargoWeight),
      stackable: newCargoStackable,
      color: CARGO_COLORS[cargoList.length % CARGO_COLORS.length],
      x: 0,
      y: 0,
      z: 0,
      placed: false
    };

    setCargoList([...cargoList, newItem]);
    setNewCargoName('');
  };

  const deleteCargo = (id: string) => {
    setCargoList(cargoList.filter(item => item.id !== id));
  };

  const togglePlaced = (id: string) => {
    setCargoList(cargoList.map(item => {
      if (item.id === id) {
        if (!item.placed) {
          // Find a valid spot to auto-place
          const placed = cargoList.filter(i => i.placed && i.id !== id);
          
          // Let's run a simplified 3D packing locator
          let foundX = 0;
          let foundY = 0;
          let foundZ = 0;
          let spaceFound = false;

          // Try to fit along the length (Y) of the container
          for (let y = 0; y <= activeContainer.length - item.length; y += 0.5) {
            for (let x = 0; x <= activeContainer.width - item.width; x += 0.5) {
              // Check overlap with already placed items
              const overlap = placed.some(other => {
                return (
                  x < other.x + other.width &&
                  x + item.width > other.x &&
                  y < other.y + other.length &&
                  y + item.length > other.y &&
                  foundZ < other.z + other.height &&
                  foundZ + item.height > other.z
                );
              });

              if (!overlap) {
                foundX = x;
                foundY = y;
                spaceFound = true;
                break;
              }
            }
            if (spaceFound) break;
          }

          return { ...item, placed: true, x: foundX, y: foundY, z: foundZ };
        } else {
          return { ...item, placed: false };
        }
      }
      return item;
    }));
  };

  // Run auto-layout algorithm (simplified 3D bin packing with load-balancing prioritization)
  const runAutoPacker = () => {
    // Sort items by volume * weight (heaviest items first to keep center of gravity low and stable)
    const sortedCargo = [...cargoList].sort((a, b) => {
      const volA = a.width * a.length * a.height;
      const volB = b.width * b.length * b.height;
      return (b.weight * volB) - (a.weight * volA);
    });

    const packedItems: CargoItem[] = [];
    const stepSize = 0.1; // 10cm grid step for placement

    for (const item of sortedCargo) {
      let bestX = 0;
      let bestY = 0;
      let bestZ = 0;
      let packed = false;

      // Try placing at the bottom layer (Z = 0) first to ensure stability
      // Search from back (Y = 0) to front, and left (X = 0) to right
      for (let z = 0; z <= activeContainer.height - item.height; z += stepSize) {
        for (let y = 0; y <= activeContainer.length - item.length; y += stepSize) {
          for (let x = 0; x <= activeContainer.width - item.width; x += stepSize) {
            // Check intersection/collisons
            const hasCollision = packedItems.some(other => {
              const overlapX = x < other.x + other.width && x + item.width > other.x;
              const overlapY = y < other.y + other.length && y + item.length > other.y;
              const overlapZ = z < other.z + other.height && z + item.height > other.z;
              return overlapX && overlapY && overlapZ;
            });

            // Check if stackable rules are respected
            // If stacking on top of another item (Z > 0), check if the underlying items are stackable
            let stackSupported = true;
            if (z > 0) {
              const directlyBelow = packedItems.filter(other => {
                const overlapX = x < other.x + other.width && x + item.width > other.x;
                const overlapY = y < other.y + other.length && y + item.length > other.y;
                const overlapZ = Math.abs((other.z + other.height) - z) < 0.05;
                return overlapX && overlapY && overlapZ;
              });
              
              if (directlyBelow.length > 0) {
                const anyUnstackable = directlyBelow.some(other => !other.stackable);
                if (anyUnstackable) stackSupported = false;
              } else {
                // Cannot float in the air without support
                stackSupported = false;
              }
            }

            if (!hasCollision && stackSupported) {
              bestX = Math.round(x * 100) / 100;
              bestY = Math.round(y * 100) / 100;
              bestZ = Math.round(z * 100) / 100;
              packed = true;
              break;
            }
          }
          if (packed) break;
        }
        if (packed) break;
      }

      packedItems.push({
        ...item,
        placed: packed,
        x: packed ? bestX : 0,
        y: packed ? bestY : 0,
        z: packed ? bestZ : 0,
      });
    }

    setCargoList(packedItems);
  };

  const clearStowageContainer = () => {
    setCargoList(cargoList.map(item => ({ ...item, placed: false })));
  };


  // --- Demurrage alerts logic ---
  const demurrageStats = useMemo(() => {
    const list = demurrageList;
    const totalContainers = list.length;
    const customsPending = list.filter(c => !c.customsCleared).length;
    
    // Risk status calculation:
    // Container is at risk if: DaysAtPort >= FreeTimeDays - 1 (or exceeded)
    const atRisk = list.filter(c => c.daysAtPort >= c.freeTimeDays - 1).length;
    
    // Accruing fee
    const currentAccruedFees = list.reduce((acc, curr) => {
      if (curr.daysAtPort > curr.freeTimeDays) {
        return acc + ((curr.daysAtPort - curr.freeTimeDays) * curr.dailyRate);
      }
      return acc;
    }, 0);

    return {
      totalContainers,
      customsPending,
      atRisk,
      currentAccruedFees
    };
  }, [demurrageList]);

  const filteredDemurrageList = useMemo(() => {
    return demurrageList.filter(c => 
      c.containerNo.toLowerCase().includes(demurrageSearch.toLowerCase()) ||
      c.shipmentRef.toLowerCase().includes(demurrageSearch.toLowerCase()) ||
      c.portOfDischarge.toLowerCase().includes(demurrageSearch.toLowerCase())
    );
  }, [demurrageList, demurrageSearch]);

  const triggerExpressDispatch = (id: string) => {
    // Simulates bypassing terminal holding and dispatching priority truck
    setDemurrageList(demurrageList.map(c => {
      if (c.id === id) {
        return {
          ...c,
          customsCleared: true,
          daysAtPort: Math.max(0, c.daysAtPort - 1), // Simulates moving fast before next penalty day
        };
      }
      return c;
    }));
    
    const container = demurrageList.find(c => c.id === id);
    if (container) {
      toast.success(`Priority Dispatch Triggered for ${container.containerNo}`, {
        description: `Bypassing customs hold. Pre-notified port gate for immediate gate-out.`,
        icon: '🚀',
        duration: 5000
      });
    }
  };


  // --- Carbon Emissions calculations ---
  const emissionsSummary = useMemo(() => {
    const mass = cargoMassTonnes;
    const distance = distanceKm;

    // Calculate CO2 emissions in kg
    // Formula: Mass (tonnes) * Distance (km) * Emission Factor (g/t-km) / 1000
    const seaCO2 = (mass * distance * EMISSION_FACTORS.sea) / 1000;
    const airCO2 = (mass * distance * EMISSION_FACTORS.air) / 1000;
    const roadCO2 = (mass * distance * EMISSION_FACTORS.road) / 1000;
    const railCO2 = (mass * distance * EMISSION_FACTORS.rail) / 1000;

    // Equivalent stats
    const treesRequired = Math.round(seaCO2 / 22); // 1 mature tree absorbs ~22kg of CO2 per year
    const carbonCreditsCost = Math.round((seaCO2 / 1000) * 45); // Assuming average of $45 per tonne of offset

    return {
      seaCO2,
      airCO2,
      roadCO2,
      railCO2,
      treesRequired,
      carbonCreditsCost,
      mass,
      distance
    };
  }, [cargoMassTonnes, distanceKm]);

  const barChartData = useMemo(() => {
    return [
      { mode: 'Ocean Container', 'CO2 (Tonnes)': Number((emissionsSummary.seaCO2 / 1000).toFixed(2)), color: '#3b82f6' },
      { mode: 'Electric Rail', 'CO2 (Tonnes)': Number((emissionsSummary.railCO2 / 1000).toFixed(2)), color: '#10b981' },
      { mode: 'Heavy Duty Road', 'CO2 (Tonnes)': Number((emissionsSummary.roadCO2 / 1000).toFixed(2)), color: '#f59e0b' },
      { mode: 'Air Cargo', 'CO2 (Tonnes)': Number((emissionsSummary.airCO2 / 1000).toFixed(2)), color: '#ef4444' },
    ];
  }, [emissionsSummary]);

  // Handle preset route selection
  const handlePresetRouteChange = (route: string) => {
    setSelectedRouteLabel(route);
    if (route === 'Transpacific (Asia - US West Coast)') {
      setDistanceKm(10800);
    } else if (route === 'Europe - Asia (Via Suez)') {
      setDistanceKm(15200);
    } else if (route === 'Transatlantic (Europe - US East Coast)') {
      setDistanceKm(6400);
    } else if (route === 'Intra-Europe Delivery Trunk') {
      setDistanceKm(1200);
    } else if (route === 'South America - Europe Intercontinental') {
      setDistanceKm(9200);
    }
  };


  return (
    <div className="flex-1 overflow-y-auto bg-background p-4 sm:p-6 lg:p-8" id="freight-optimization-suite-root">
      {/* HEADER SECTION */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="w-8 h-8 text-primary animate-pulse" />
            Freight & Cargo Optimization Center
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Leverage AI models, 3D physics stacking, Scope 3 ledgering, and port status tracking to maximize fleet efficiency.
          </p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex bg-muted p-1 rounded-lg border border-border">
          <button 
            onClick={() => setActiveTab('negotiator')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'negotiator' 
                ? 'bg-card text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Scale className="w-4 h-4" />
            Carrier Auto-Negotiator
          </button>
          <button 
            onClick={() => setActiveTab('stowage')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'stowage' 
                ? 'bg-card text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Package className="w-4 h-4" />
            3D Stowage & Load Planner
          </button>
          <button 
            onClick={() => setActiveTab('demurrage')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'demurrage' 
                ? 'bg-card text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Predictive Demurrage Engine
          </button>
          <button 
            onClick={() => setActiveTab('emissions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'emissions' 
                ? 'bg-card text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Leaf className="w-4 h-4" />
            Scope 3 Carbon Calculator
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB: CARRIER BOOKING AUTO-NEGOTIATOR */}
      {/* ========================================================================= */}
      <AnimatePresence mode="wait">
        {activeTab === 'negotiator' && (
          <motion.div 
            key="negotiator"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <MultiCarrierNegotiator />
          </motion.div>
        )}

        {activeTab === 'stowage' && (
          <motion.div 
            key="stowage"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* STATS BANNER */}
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-4 gap-4 bg-card border border-border rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-950/40 rounded-lg text-blue-600">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Volume Utilized</p>
                  <p className="text-lg font-bold text-foreground">
                    {stowageStats.volumeUtilization.toFixed(1)}%
                  </p>
                  <div className="w-24 bg-muted h-1.5 rounded-full mt-1 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${stowageStats.volumeUtilization > 85 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                      style={{ width: `${Math.min(100, stowageStats.volumeUtilization)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-950/40 rounded-lg text-amber-600">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Payload Weight</p>
                  <p className="text-lg font-bold text-foreground">
                    {stowageStats.totalWeight.toLocaleString()} / {activeContainer.maxPayload.toLocaleString()} kg
                  </p>
                  <div className="w-24 bg-muted h-1.5 rounded-full mt-1 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${stowageStats.weightUtilization > 90 ? 'bg-amber-500' : 'bg-primary'}`} 
                      style={{ width: `${Math.min(100, stowageStats.weightUtilization)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950/40 rounded-lg text-emerald-600">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Stacking Safety Index</p>
                  <p className="text-lg font-bold text-foreground">
                    {stowageStats.safetyScore} / 100
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {stowageStats.safetyScore >= 80 ? '✅ Optimally Balanced' : '⚠️ Extreme CoG Shift'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-950/40 rounded-lg text-purple-600">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Center of Gravity Offset</p>
                  <p className="text-sm font-semibold text-foreground">
                    X: {stowageStats.devX.toFixed(1)}% | Y: {stowageStats.devY.toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Max threshold: ±10% limits
                  </p>
                </div>
              </div>
            </div>

            {/* LEFT COLUMN: LISTS & FORMS */}
            <div className="lg:col-span-1 space-y-6">
              {/* CONTAINER SELECTOR */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Ship className="w-4 h-4 text-muted-foreground" />
                  Target Vessel Container
                </h3>
                <div className="space-y-2">
                  {Object.entries(CONTAINERS).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedContainerType(key);
                        clearStowageContainer();
                      }}
                      className={`w-full text-left px-3.5 py-2.5 rounded-lg border text-sm flex justify-between items-center transition-all ${
                        selectedContainerType === key 
                          ? 'border-primary bg-primary/5 text-foreground font-semibold' 
                          : 'border-border hover:bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      <div>
                        <p>{config.name}</p>
                        <p className="text-[11px] opacity-75">
                          Dim: {config.length}m × {config.width}m × {config.height}m
                        </p>
                      </div>
                      <p className="text-xs font-mono">Max: {(config.maxPayload/1000).toFixed(1)}t</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* CARGO LIST SECTION */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    Cargo Manifest ({cargoList.length})
                  </h3>
                  <div className="flex gap-1.5">
                    <button 
                      onClick={runAutoPacker}
                      className="px-2.5 py-1 text-[11px] bg-primary text-primary-foreground font-medium rounded hover:bg-primary/95 transition-all flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Auto-Pack AI
                    </button>
                    <button 
                      onClick={clearStowageContainer}
                      className="px-2.5 py-1 text-[11px] bg-secondary text-secondary-foreground font-medium rounded hover:bg-secondary/95 transition-all"
                    >
                      Unpack All
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {cargoList.map(item => (
                    <div 
                      key={item.id}
                      className={`p-3 rounded-lg border flex justify-between items-center transition-all ${
                        item.placed 
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-foreground' 
                          : 'bg-card border-border text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="w-3 h-3 rounded-sm flex-shrink-0" 
                          style={{ backgroundColor: item.color }}
                        />
                        <div>
                          <p className="text-xs font-medium text-foreground">{item.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {item.length}L × {item.width}W × {item.height}Hm | {item.weight} kg
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => togglePlaced(item.id)}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                            item.placed 
                              ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400' 
                              : 'bg-muted hover:bg-muted/80 text-foreground'
                          }`}
                        >
                          {item.placed ? 'Placed' : 'Place'}
                        </button>
                        <button 
                          onClick={() => deleteCargo(item.id)}
                          className="p-1 hover:text-rose-500 hover:bg-muted rounded text-muted-foreground"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ADD NEW CARGO FORM */}
                <form onSubmit={addCargo} className="mt-4 pt-4 border-t border-border space-y-3">
                  <p className="text-xs font-semibold text-foreground">Add Custom Cargo Box</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <input 
                        type="text" 
                        placeholder="Cargo Name / Label" 
                        value={newCargoName}
                        onChange={e => setNewCargoName(e.target.value)}
                        className="w-full text-xs px-2.5 py-2 border border-border rounded bg-muted/20 outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Length (Y) m</label>
                      <input 
                        type="number" 
                        step="0.1"
                        min="0.2"
                        value={newCargoLength}
                        onChange={e => setNewCargoLength(Number(e.target.value))}
                        className="w-full text-xs px-2.5 py-1.5 border border-border rounded bg-muted/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Width (X) m</label>
                      <input 
                        type="number" 
                        step="0.1"
                        min="0.2"
                        value={newCargoWidth}
                        onChange={e => setNewCargoWidth(Number(e.target.value))}
                        className="w-full text-xs px-2.5 py-1.5 border border-border rounded bg-muted/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Height (Z) m</label>
                      <input 
                        type="number" 
                        step="0.1"
                        min="0.2"
                        value={newCargoHeight}
                        onChange={e => setNewCargoHeight(Number(e.target.value))}
                        className="w-full text-xs px-2.5 py-1.5 border border-border rounded bg-muted/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Weight (kg)</label>
                      <input 
                        type="number" 
                        step="50"
                        min="10"
                        value={newCargoWeight}
                        onChange={e => setNewCargoWeight(Number(e.target.value))}
                        className="w-full text-xs px-2.5 py-1.5 border border-border rounded bg-muted/20 outline-none"
                      />
                    </div>
                    <div className="col-span-2 flex items-center gap-2 mt-1">
                      <input 
                        type="checkbox" 
                        id="newCargoStackable" 
                        checked={newCargoStackable}
                        onChange={e => setNewCargoStackable(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-0"
                      />
                      <label htmlFor="newCargoStackable" className="text-xs text-muted-foreground select-none">
                        Cargo can support stack weight
                      </label>
                    </div>
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add to Manifest
                  </button>
                </form>
              </div>
            </div>

            {/* RIGHT COLUMN: 3D INTERACTIVE VISUALIZER */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col h-full min-h-[500px]">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Globe className="w-4 h-4 text-primary" />
                      3D Container Stacking Simulator
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Use slider coordinates to rotate the container and inspect balance points.
                    </p>
                  </div>
                  
                  {/* Angle Adjusters */}
                  <div className="flex gap-3 text-xs">
                    <div className="flex items-center gap-1 bg-muted/60 px-2 py-1 rounded">
                      <span className="text-muted-foreground">Tilt:</span>
                      <input 
                        type="range" 
                        min="-60" 
                        max="0" 
                        value={rotX} 
                        onChange={e => setRotX(Number(e.target.value))}
                        className="w-16 h-1 bg-border rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="font-mono text-[10px] w-6 text-right">{rotX}°</span>
                    </div>
                    <div className="flex items-center gap-1 bg-muted/60 px-2 py-1 rounded">
                      <span className="text-muted-foreground">Spin:</span>
                      <input 
                        type="range" 
                        min="0" 
                        max="180" 
                        value={rotY} 
                        onChange={e => setRotY(Number(e.target.value))}
                        className="w-16 h-1 bg-border rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="font-mono text-[10px] w-6 text-right">{rotY}°</span>
                    </div>
                  </div>
                </div>

                {/* 3D RENDER CANVAS */}
                <div className="flex-1 bg-zinc-950 dark:bg-black rounded-xl overflow-hidden border border-zinc-800 relative flex items-center justify-center min-h-[350px]">
                  
                  {/* Grid / Scale Legend */}
                  <div className="absolute top-3 left-3 text-white text-[10px] font-mono space-y-1 bg-zinc-900/80 p-2.5 rounded border border-zinc-800 z-10">
                    <p className="font-semibold text-primary">Container Specs:</p>
                    <p>X-Width: {activeContainer.width}m</p>
                    <p>Y-Length: {activeContainer.length}m</p>
                    <p>Z-Height: {activeContainer.height}m</p>
                  </div>

                  {/* CENTER OF GRAVITY GRAPHICAL DISPLAY */}
                  <div className="absolute bottom-3 right-3 bg-zinc-900/85 p-3 rounded-lg border border-zinc-800 text-white z-10 w-44">
                    <p className="text-[10px] font-bold tracking-wider text-primary mb-2 flex items-center gap-1">
                      <Scale className="w-3 h-3 text-amber-400" />
                      COG HORIZONTAL RADAR
                    </p>
                    <div className="w-36 h-28 relative border border-zinc-700 bg-zinc-950 rounded flex items-center justify-center">
                      {/* Grid crosshair */}
                      <div className="absolute inset-x-0 h-px bg-zinc-800" style={{ top: '50%' }} />
                      <div className="absolute inset-y-0 w-px bg-zinc-800" style={{ left: '50%' }} />
                      
                      {/* Safety Boundary box (±10% offset limit) */}
                      <div className="absolute border border-dashed border-rose-500/30 w-12 h-10" style={{ top: 'calc(50% - 20px)', left: 'calc(50% - 24px)' }} />
                      <span className="absolute top-1 left-1 text-[8px] text-zinc-500">BACK</span>
                      <span className="absolute bottom-1 right-1 text-[8px] text-zinc-500">FRONT</span>

                      {/* Gravity Dot representing actual offset */}
                      {/* x: width offset, y: length offset */}
                      <div 
                        className={`absolute w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold text-white shadow-lg shadow-black transform -translate-x-1/2 -translate-y-1/2 transition-all ${
                          stowageStats.safetyScore >= 80 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-bounce'
                        }`}
                        style={{
                          left: `${50 + (stowageStats.devX * 1.8)}%`,
                          top: `${50 - (stowageStats.devY * 1.8)}%`
                        }}
                      >
                        G
                      </div>
                    </div>
                    <div className="mt-1.5 flex justify-between text-[8px] text-zinc-400 font-mono">
                      <span>Left/Right: {stowageStats.devX.toFixed(1)}%</span>
                      <span>B/F: {stowageStats.devY.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* 3D SCENE container */}
                  <div 
                    className="relative w-[340px] h-[340px] flex items-center justify-center transition-transform duration-200"
                    style={{
                      perspective: '1000px',
                    }}
                  >
                    {/* ISOMETRIC ISOMORPHIC STACKING CONTAINER ROTATOR */}
                    <div 
                      className="relative transition-transform duration-300"
                      style={{
                        transformStyle: 'preserve-3d',
                        transform: `rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(0.8, 0.8, 0.8)`,
                        width: '240px',
                        height: '240px'
                      }}
                    >
                      {/* 3D CONTAINER GRID BOX SHELL */}
                      {/* Scale dimensions to pixels: 1m = 40px (Width: ~94px, Length: ~236px, Height: ~96px) */}
                      {(() => {
                        const scale = 35; // px per meter
                        const cW = activeContainer.width * scale;
                        const cL = activeContainer.length * scale;
                        const cH = activeContainer.height * scale;

                        return (
                          <div 
                            className="absolute border border-zinc-700 bg-zinc-900/30"
                            style={{
                              transformStyle: 'preserve-3d',
                              width: `${cW}px`,
                              height: `${cH}px`,
                              transform: `translate3d(-50%, -50%, 0)`,
                              left: '50%',
                              top: '50%'
                            }}
                          >
                            {/* Back Face */}
                            <div className="absolute inset-0 bg-zinc-800/20 border border-dashed border-zinc-700/60" style={{ transform: `translateZ(0px)` }} />
                            
                            {/* Front Face (invisible to see inside) */}
                            <div className="absolute inset-0 border border-dashed border-zinc-700/20 pointer-events-none" style={{ transform: `translateZ(${cL}px)` }} />
                            
                            {/* Left Side Face */}
                            <div 
                              className="absolute top-0 bottom-0 bg-zinc-800/10 border-l border-zinc-700" 
                              style={{ 
                                width: `${cL}px`, 
                                transform: `rotateY(90deg) translateZ(0px)`,
                                transformOrigin: 'left center'
                              }} 
                            />

                            {/* Right Side Face */}
                            <div 
                              className="absolute top-0 bottom-0 bg-zinc-800/10 border-r border-zinc-700" 
                              style={{ 
                                width: `${cL}px`, 
                                transform: `rotateY(90deg) translateZ(${cW}px)`,
                                transformOrigin: 'left center'
                              }} 
                            />

                            {/* Bottom Floor Plate */}
                            <div 
                              className="absolute left-0 right-0 bg-zinc-950 border-t border-b border-zinc-600/50" 
                              style={{ 
                                height: `${cL}px`, 
                                transform: `rotateX(-90deg) translateZ(${cH}px)`,
                                transformOrigin: 'center bottom',
                                backgroundImage: 'radial-gradient(#27272a 1px, transparent 1px)',
                                backgroundSize: '12px 12px'
                              }} 
                            />

                            {/* Top Roof (Invisible / border only) */}
                            <div 
                              className="absolute left-0 right-0 border-t border-b border-zinc-700/30 pointer-events-none" 
                              style={{ 
                                height: `${cL}px`, 
                                transform: `rotateX(-90deg) translateZ(0px)`,
                                transformOrigin: 'center bottom'
                              }} 
                            />

                            {/* PLACED CARGO BOXES */}
                            {cargoList.filter(item => item.placed).map(item => {
                              const bW = item.width * scale;
                              const bL = item.length * scale;
                              const bH = item.height * scale;
                              const bX = item.x * scale;
                              const bY = item.y * scale;
                              const bZ = item.z * scale;

                              return (
                                <div
                                  key={item.id}
                                  className="absolute rounded-sm transition-all duration-300"
                                  style={{
                                    transformStyle: 'preserve-3d',
                                    width: `${bW}px`,
                                    height: `${bH}px`,
                                    // Translate X, Y-Z axes appropriately
                                    transform: `translate3d(${bX}px, ${cH - bZ - bH}px, ${bY}px)`,
                                  }}
                                >
                                  {/* Back Face */}
                                  <div className="absolute inset-0 border border-white/25 shadow-inner" style={{ transform: 'translateZ(0px)', backgroundColor: item.color, opacity: 0.85 }} />
                                  {/* Front Face */}
                                  <div className="absolute inset-0 border border-white/25 shadow-inner" style={{ transform: `translateZ(${bL}px)`, backgroundColor: item.color, opacity: 0.85 }} />
                                  {/* Left Face */}
                                  <div className="absolute top-0 bottom-0 border border-white/25" style={{ width: `${bL}px`, transform: 'rotateY(90deg) translateZ(0px)', transformOrigin: 'left center', backgroundColor: item.color, filter: 'brightness(0.85)', opacity: 0.85 }} />
                                  {/* Right Face */}
                                  <div className="absolute top-0 bottom-0 border border-white/25" style={{ width: `${bL}px`, transform: `rotateY(90deg) translateZ(${bW}px)`, transformOrigin: 'left center', backgroundColor: item.color, filter: 'brightness(0.85)', opacity: 0.85 }} />
                                  {/* Top Face */}
                                  <div className="absolute left-0 right-0 border border-white/25" style={{ height: `${bL}px`, transform: 'rotateX(-90deg) translateZ(0px)', transformOrigin: 'center bottom', backgroundColor: item.color, filter: 'brightness(1.1)', opacity: 0.85 }} />
                                  {/* Bottom Face */}
                                  <div className="absolute left-0 right-0 border border-white/25" style={{ height: `${bL}px`, transform: `rotateX(-90deg) translateZ(${bH}px)`, transformOrigin: 'center bottom', backgroundColor: item.color, filter: 'brightness(0.6)', opacity: 0.85 }} />

                                  {/* Label on item */}
                                  <div className="absolute inset-0 flex items-center justify-center text-white text-[7px] font-bold uppercase overflow-hidden select-none" style={{ transform: 'translateZ(1px)' }}>
                                    {item.name.substring(0, 15)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}

                    </div>
                  </div>
                </div>

                {/* INFO DISCLOSURE */}
                <div className="mt-4 bg-muted/40 p-3 rounded-lg border border-border flex items-start gap-2 text-xs">
                  <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-muted-foreground leading-relaxed">
                    <strong>CoG Limit Safety Warning:</strong> Safe ocean transport regulations require the Center of Gravity (CoG) to stay within <strong>±10%</strong> of the container's geometric center. Use <strong>Auto-Pack AI</strong> to secure heavy cargo first on the floor level to optimize safety metrics and increase packing volume density up to <strong>96%</strong>.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* TAB 2: PREDICTIVE DEMURRAGE & DETENTION ALERT ENGINE */}
      {/* ========================================================================= */}
      <AnimatePresence mode="wait">
        {activeTab === 'demurrage' && (
          <motion.div 
            key="demurrage"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* KPI STATS CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <p className="text-xs text-muted-foreground font-medium">Containers Monitored</p>
                <p className="text-2xl font-bold text-foreground mt-1">{demurrageStats.totalContainers}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Live tracking active</p>
              </div>

              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <p className="text-xs text-muted-foreground font-medium">Awaiting Customs Clearance</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-500 mt-1">
                  {demurrageStats.customsPending}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">Undergoing custom review</p>
              </div>

              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <p className="text-xs text-muted-foreground font-medium">Critical Risk of Penalty</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-2xl font-bold text-rose-500">{demurrageStats.atRisk}</p>
                  <span className="text-[11px] font-semibold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded animate-pulse">
                    Risk Alert
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Within 1 day of free-time limit</p>
              </div>

              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <p className="text-xs text-muted-foreground font-medium">Active Accruing Penalties</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  ${demurrageStats.currentAccruedFees.toLocaleString()}
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                  💰 Savings by bypass triggers: $1,400 saved
                </p>
              </div>
            </div>

            {/* MAIN LAYOUT: PORT METRICS + CONTAINER WATCHLIST */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Port Congestion Indicators */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Harbor Berthing & Gate Congestion Index
                  </h3>
                  <div className="space-y-4">
                    {Object.entries(portGateCongestion).map(([port, details]) => (
                      <div key={port} className="border-b border-border pb-3.5 last:border-none last:pb-0">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-semibold text-foreground">{port}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            details.status === 'Critical' 
                              ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400' 
                              : details.status === 'High' 
                              ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400' 
                              : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400'
                          }`}>
                            {details.status} Congestion
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground font-mono">
                          <div className="bg-muted/40 p-1.5 rounded">
                            <span className="block text-[9px] text-muted-foreground">GATE DELAY</span>
                            <span className="text-foreground font-bold">{details.gateWaitHours} hrs</span>
                          </div>
                          <div className="bg-muted/40 p-1.5 rounded">
                            <span className="block text-[9px] text-muted-foreground">ANCHOR WAIT</span>
                            <span className="text-foreground font-bold">{details.berthingDelayDays} days</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-5 shadow-sm bg-gradient-to-br from-indigo-50/50 to-background dark:from-indigo-950/10 dark:to-background">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 mb-2">
                    <TrendingDown className="w-4 h-4 text-indigo-500" />
                    AI Detention Avoidance Rules
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Our machine-learning heuristics predict port-gate turn times and schedule pre-pull container pick-ups. When berthing delays exceed 48 hours, the system automatically requests a free-time extension from carriers.
                  </p>
                </div>
              </div>

              {/* CONTAINER WATCHLIST & DISPATCH WORKFLOW */}
              <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                  <div>
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      Demurrage Risk Alert watchlist
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Containers are flagged when storage is nearing free-time thresholds. Trigger bypass dispatch to avoid fines.
                    </p>
                  </div>
                  <div>
                    <input 
                      type="text" 
                      placeholder="Search container / port..." 
                      value={demurrageSearch}
                      onChange={e => setDemurrageSearch(e.target.value)}
                      className="text-xs px-3 py-1.5 border border-border rounded bg-muted/20 outline-none w-full sm:w-48"
                    />
                  </div>
                </div>

                <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
                  {filteredDemurrageList.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-xs">
                      No containers match filters.
                    </div>
                  ) : (
                    filteredDemurrageList.map(c => {
                      const daysLeft = c.freeTimeDays - c.daysAtPort;
                      const hasExceeded = daysLeft < 0;
                      const isCritical = daysLeft <= 1;
                      const penaltyAccrued = hasExceeded ? Math.abs(daysLeft) * c.dailyRate : 0;

                      return (
                        <div 
                          key={c.id} 
                          className={`p-4 rounded-xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${
                            hasExceeded 
                              ? 'bg-rose-500/5 border-rose-500/20' 
                              : isCritical 
                              ? 'bg-amber-500/5 border-amber-500/20 animate-pulse' 
                              : 'bg-card border-border'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2.5">
                              <span className="text-xs font-bold text-foreground font-mono bg-muted px-2 py-0.5 rounded">
                                {c.containerNo}
                              </span>
                              <span className="text-[10px] font-medium text-muted-foreground">
                                Ref: {c.shipmentRef}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                                c.customsCleared 
                                  ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400' 
                                  : 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400'
                              }`}>
                                {c.customsCleared ? 'Customs Cleared' : 'Customs Pending'}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                              <p>Port: <span className="font-medium text-foreground">{c.portOfDischarge}</span></p>
                              <p>Carrier: <span className="font-medium text-foreground">{c.carrier}</span></p>
                              <p className="col-span-2 sm:col-span-1">Rate: <span className="font-mono text-foreground">${c.dailyRate}/day</span></p>
                            </div>
                          </div>

                          <div className="flex flex-row md:flex-col lg:flex-row items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-border">
                            <div className="text-left md:text-right">
                              {hasExceeded ? (
                                <div>
                                  <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider block">DEMURRAGE ACCRUING</span>
                                  <span className="text-sm font-bold text-rose-500">${penaltyAccrued} penalty</span>
                                  <span className="text-[9px] text-muted-foreground block">{Math.abs(daysLeft)} days over free time</span>
                                </div>
                              ) : (
                                <div>
                                  <span className="text-[10px] text-muted-foreground block">FREE TIME REMAINING</span>
                                  <span className={`text-sm font-bold ${isCritical ? 'text-amber-500' : 'text-emerald-500'}`}>
                                    {daysLeft} days left
                                  </span>
                                  <span className="text-[9px] text-muted-foreground block">At Port: {c.daysAtPort} / {c.freeTimeDays} days limit</span>
                                </div>
                              )}
                            </div>

                            <div className="flex-shrink-0">
                              <button
                                onClick={() => triggerExpressDispatch(c.id)}
                                disabled={c.customsCleared && !hasExceeded}
                                className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                                  hasExceeded
                                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                                    : isCritical
                                    ? 'bg-amber-500 hover:bg-amber-400 text-white'
                                    : c.customsCleared
                                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                    : 'bg-primary hover:bg-primary/95 text-primary-foreground'
                                }`}
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                                {hasExceeded ? 'Priority Bypass' : 'Express Dispatch'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* BLOCKCHAIN-BACKED SMART CONTRACT AUDITING WORKFLOW */}
            <div className="border-t border-border/80 pt-6">
              <BlockchainSmartContractAuditor />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* TAB 3: SCOPE 3 CARBON EMISSIONS CALCULATOR */}
      {/* ========================================================================= */}
      <AnimatePresence mode="wait">
        {activeTab === 'emissions' && (
          <motion.div 
            key="emissions"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* CALCULATOR FORM & CONTROLS */}
            <div className="lg:col-span-1 bg-card border border-border rounded-xl p-5 shadow-sm space-y-6">
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Leaf className="w-4 h-4 text-emerald-500" />
                  Consignment Green Metrics
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Calculate and baseline Scope 3 emissions according to GLEC Framework standards.
                </p>
              </div>

              <div className="space-y-4">
                {/* PRESET ROUTE DROPDOWN */}
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Trade Lane Preset</label>
                  <select
                    value={selectedRouteLabel}
                    onChange={e => handlePresetRouteChange(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-border rounded bg-muted/20 outline-none focus:border-primary text-foreground"
                  >
                    <option value="Transpacific (Asia - US West Coast)">Transpacific (Asia - US West Coast)</option>
                    <option value="Europe - Asia (Via Suez)">Europe - Asia (Via Suez)</option>
                    <option value="Transatlantic (Europe - US East Coast)">Transatlantic (Europe - US East Coast)</option>
                    <option value="South America - Europe Intercontinental">South America - Europe Intercontinental</option>
                    <option value="Intra-Europe Delivery Trunk">Intra-Europe Delivery Trunk</option>
                  </select>
                </div>

                {/* DISTANCE */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-foreground">Travel Distance</label>
                    <span className="text-xs text-muted-foreground font-mono">{distanceKm.toLocaleString()} km</span>
                  </div>
                  <input 
                    type="range" 
                    min="100" 
                    max="20000" 
                    step="100"
                    value={distanceKm} 
                    onChange={e => {
                      setDistanceKm(Number(e.target.value));
                      setSelectedRouteLabel('Custom Route (Manual Mileage)');
                    }}
                    className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>100 km</span>
                    <span>20,000 km</span>
                  </div>
                </div>

                {/* CONSIGNMENT MASS */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-foreground">Cargo Mass</label>
                    <span className="text-xs text-muted-foreground font-mono">{cargoMassTonnes} Tonnes</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.5" 
                    max="100" 
                    step="0.5"
                    value={cargoMassTonnes} 
                    onChange={e => setCargoMassTonnes(Number(e.target.value))}
                    className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>0.5 t</span>
                    <span>100 t</span>
                  </div>
                </div>
              </div>

              {/* FACT SHEET EXCLUSIONS */}
              <div className="pt-4 border-t border-border space-y-2.5">
                <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">GLEC Greenhouse Coefficients (g/t-km)</p>
                <div className="space-y-1.5 text-xs text-foreground font-mono">
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1 text-muted-foreground"><Ship className="w-3.5 h-3.5" /> Ocean Container:</span>
                    <span>12.0g CO2e</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1 text-muted-foreground"><Truck className="w-3.5 h-3.5" /> Heavy Road Truck:</span>
                    <span>85.0g CO2e</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1 text-muted-foreground"><Scale className="w-3.5 h-3.5" /> Electric Rail:</span>
                    <span>22.0g CO2e</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1 text-muted-foreground"><Plane className="w-3.5 h-3.5" /> Air Cargo Jet:</span>
                    <span>602.0g CO2e</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RESULTS VISUALIZATIONS & CHARTS */}
            <div className="lg:col-span-2 space-y-6">
              {/* SUMMARY STATS BANNER */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-950/40 rounded-lg text-emerald-600">
                    <Leaf className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ocean CO2 Emissions</p>
                    <p className="text-lg font-bold text-foreground">
                      {(emissionsSummary.seaCO2 / 1000).toFixed(2)} Tonnes
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Estimated CO2e totals</p>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-950/40 rounded-lg text-indigo-600">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Annual Offset Trees</p>
                    <p className="text-lg font-bold text-foreground">
                      {emissionsSummary.treesRequired.toLocaleString()} Trees
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Required to neutralise</p>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-3">
                  <div className="p-2 bg-teal-100 dark:bg-teal-950/40 rounded-lg text-teal-600">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Offset Credit Value</p>
                    <p className="text-lg font-bold text-foreground">
                      ${emissionsSummary.carbonCreditsCost.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">At $45 / Tonne index</p>
                  </div>
                </div>
              </div>

              {/* CO2 COMPARATIVE BAR CHART */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  Greenhouse Gas Intensity Comparison (Tonne CO2e)
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={barChartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                    >
                      <XAxis dataKey="mode" stroke="#888888" fontSize={11} tickLine={false} />
                      <YAxis stroke="#888888" fontSize={11} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--color-card)', 
                          borderColor: 'var(--color-border)',
                          borderRadius: '8px'
                        }}
                        labelStyle={{ fontWeight: 'bold' }}
                      />
                      <Bar dataKey="CO2 (Tonnes)" fill="var(--color-primary)" radius={[4, 4, 0, 0]}>
                        {barChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                {/* ALTERNATIVE SUGGESTION OUTCOMES */}
                <div className="mt-4 bg-emerald-500/5 p-4 rounded-lg border border-emerald-500/20 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                    <Leaf className="w-4 h-4" /> Eco-Optimization Strategy
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    By routing via electric rail lines instead of heavy-haul trucking for the landside leg, you can bypass up to <strong>74%</strong> of inland greenhouse gas emission points. Shifting high-priority consignments from Air Cargo to Ocean + Express Rail avoids <strong>98%</strong> of Scope 3 overhead.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
