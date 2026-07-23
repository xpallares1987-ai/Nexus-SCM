import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/forms/button';
import { 
  DollarSign, 
  TrendingDown, 
  CheckCircle2, 
  AlertTriangle, 
  Percent, 
  Clock, 
  Leaf, 
  Ship, 
  Plane, 
  Truck, 
  Sparkles, 
  Send, 
  ArrowRight, 
  FileText, 
  Copy, 
  Maximize2, 
  Scale, 
  BadgeAlert, 
  HelpCircle, 
  Briefcase,
  Play,
  RotateCw,
  Award,
  ArrowUpDown,
  TrendingUp,
  Coins
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

// ==========================================
// TYPES & INTERFACES
// ==========================================
interface RouteOption {
  id: string;
  label: string;
  origin: string;
  destination: string;
  baseDistanceKm: number;
}

interface CarrierOption {
  id: string;
  name: string;
  mode: 'Sea' | 'Air' | 'Road';
  rating: number;
  spotRatePerCbm: number;
  contractRatePerCbm: number;
  transitDays: number;
  co2PerTonKm: number; // in grams
  reliabilityRate: number; // percentage
}

interface CostComparison {
  carrierId: string;
  carrierName: string;
  mode: 'Sea' | 'Air' | 'Road';
  spotCost: number;
  contractCost: number;
  selectedCost: number;
  margin: number;
  marginPercent: number;
  retailQuote: number;
  transitDays: number;
  co2Tonne: number;
  isContractActive: boolean;
  isRecommended: boolean;
  recommendationType: 'margin' | 'speed' | 'eco' | 'none';
}

// ==========================================
// CONSTANTS & SEED DATA
// ==========================================
const ROT_PRESETS: RouteOption[] = [
  { id: 'R1', label: 'Shanghai (CN) ➔ Los Angeles (US)', origin: 'Shanghai (CN)', destination: 'Los Angeles (US)', baseDistanceKm: 10500 },
  { id: 'R2', label: 'Rotterdam (NL) ➔ New York (US)', origin: 'Rotterdam (NL)', destination: 'New York (US)', baseDistanceKm: 6200 },
  { id: 'R3', label: 'Singapore (SG) ➔ Rotterdam (NL)', origin: 'Singapore (SG)', destination: 'Rotterdam (NL)', baseDistanceKm: 15400 },
  { id: 'R4', label: 'Frankfurt (DE) ➔ London (GB)', origin: 'Frankfurt (DE)', destination: 'London (GB)', baseDistanceKm: 850 },
  { id: 'R5', label: 'Tokyo (JP) ➔ Hamburg (DE)', origin: 'Tokyo (JP)', destination: 'Hamburg (DE)', baseDistanceKm: 18200 },
];

const CARRIER_BASE_POOL: CarrierOption[] = [
  { id: 'C1', name: 'Maersk Ocean Express', mode: 'Sea', rating: 4.8, spotRatePerCbm: 165, contractRatePerCbm: 145, transitDays: 22, co2PerTonKm: 12, reliabilityRate: 94.2 },
  { id: 'C2', name: 'MSC Cargo Alliance', mode: 'Sea', rating: 4.6, spotRatePerCbm: 158, contractRatePerCbm: 150, transitDays: 24, co2PerTonKm: 13, reliabilityRate: 91.5 },
  { id: 'C3', name: 'CMA CGM Blue Wave', mode: 'Sea', rating: 4.7, spotRatePerCbm: 172, contractRatePerCbm: 140, transitDays: 21, co2PerTonKm: 11, reliabilityRate: 93.8 },
  { id: 'C4', name: 'DHL Air Logistics', mode: 'Air', rating: 4.9, spotRatePerCbm: 950, contractRatePerCbm: 880, transitDays: 3, co2PerTonKm: 602, reliabilityRate: 98.4 },
  { id: 'C5', name: 'FedEx Global Trade', mode: 'Air', rating: 4.8, spotRatePerCbm: 980, contractRatePerCbm: 910, transitDays: 2, co2PerTonKm: 615, reliabilityRate: 97.9 },
  { id: 'C6', name: 'DB Schenker Interland', mode: 'Road', rating: 4.5, spotRatePerCbm: 340, contractRatePerCbm: 310, transitDays: 8, co2PerTonKm: 85, reliabilityRate: 92.1 },
  { id: 'C7', name: 'Kuehne+Nagel Overroad', mode: 'Road', rating: 4.7, spotRatePerCbm: 360, contractRatePerCbm: 295, transitDays: 7, co2PerTonKm: 80, reliabilityRate: 95.0 },
];

// Generate 12 months historical data for spot vs contract rate trend
const generateHistoricalTrendData = (selectedCarrierName: string, contractRate: number, spotRate: number) => {
  const months = ['Aug 25', 'Sep 25', 'Oct 25', 'Nov 25', 'Dec 25', 'Jan 26', 'Feb 26', 'Mar 26', 'Apr 26', 'May 26', 'Jun 26', 'Jul 26'];
  const devSeed = selectedCarrierName.charCodeAt(0) % 20 - 10; // stable deviation seed based on carrier name
  return months.map((month, idx) => {
    const cycleFactor = Math.sin((idx / 11) * Math.PI * 2) * 25;
    const trendFactor = (idx - 6) * 3;
    const spotVal = Math.max(80, Math.round(spotRate + cycleFactor + trendFactor + devSeed));
    return {
      month,
      'Spot Rate': spotVal,
      'Contract Rate': contractRate,
      'Industry Avg': Math.round(spotVal * 1.05),
    };
  });
};

export function MultiCarrierNegotiator() {
  // ==========================================
  // STATE DEFINITIONS
  // ==========================================
  const [selectedRouteId, setSelectedRouteId] = useState<string>('R1');
  const [cargoVolumeCbm, setCargoVolumeCbm] = useState<number>(45); // standard volume
  const [cargoWeightTons, setCargoWeightTons] = useState<number>(18.5); // standard weight
  const [targetMarginPercent, setTargetMarginPercent] = useState<number>(20); // target markup percentage
  const [priorityFilter, setPriorityFilter] = useState<'All' | 'Sea' | 'Air' | 'Road'>('All');
  
  // Custom spot rate override for negotiations
  const [customRates, setCustomRates] = useState<Record<string, number>>({});
  
  // Negotiation Modal / Console states
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [negotiatingCarrier, setNegotiatingCarrier] = useState<CostComparison | null>(null);
  const [negotiationStrategy, setNegotiationStrategy] = useState<'volume' | 'competitor' | 'loyalty' | 'market'>('volume');
  const [proposedCounterRate, setProposedCounterRate] = useState<number>(130);
  const [negotiationStep, setNegotiationStep] = useState<number>(0); // 0: Idle, 1: Submitting, 2: Analyzing, 3: Success, 4: Rejected
  const [negotiationLogs, setNegotiationLogs] = useState<string[]>([]);
  const [carrierCounterProposal, setCarrierCounterProposal] = useState<number | null>(null);
  const [generatedEmailDraft, setGeneratedEmailDraft] = useState<string>('');

  // Booking outcome simulator
  const [isBooked, setIsBooked] = useState(false);
  const [bookedReference, setBookedReference] = useState<string>('');
  const [bookedCarrier, setBookedCarrier] = useState<string>('');
  const [bookedPrice, setBookedPrice] = useState<number>(0);

  // Table sorting and filtering states
  const [tableSortBy, setTableSortBy] = useState<'carrier' | 'cost' | 'benchmark' | 'variance' | 'margin'>('margin');
  const [tableSortOrder, setTableSortOrder] = useState<'asc' | 'desc'>('desc');

  // Active route config
  const activeRoute = useMemo(() => {
    return ROT_PRESETS.find(r => r.id === selectedRouteId) || ROT_PRESETS[0];
  }, [selectedRouteId]);

  // Derived calculations for all carrier cost profiles
  const comparisonList = useMemo((): CostComparison[] => {
    // Determine scale multipliers based on distance
    const distanceRatio = activeRoute.baseDistanceKm / 10000; // normalized around 10k km
    
    const rawOptions = CARRIER_BASE_POOL.map((carrier): CostComparison => {
      // Scale spot rate and contract rate based on volume and distance
      // Higher volume gets slightly better pricing (volume discount)
      const volumeDiscountFactor = Math.max(0.85, 1 - (cargoVolumeCbm / 500) * 0.1);
      
      const ratePerCbm = customRates[carrier.id] || carrier.spotRatePerCbm;
      
      const spotBase = ratePerCbm * cargoVolumeCbm * distanceRatio * volumeDiscountFactor;
      const contractBase = carrier.contractRatePerCbm * cargoVolumeCbm * distanceRatio * volumeDiscountFactor;
      
      // Some carriers might not have active contracts on specific routes
      // E.g., Road transport is inactive on long transpacific/ocean routes except short routes
      const isRoad = carrier.mode === 'Road';
      const isOceanCrossing = activeRoute.baseDistanceKm > 3000;
      const isContractActive = !isRoad || !isOceanCrossing; // road not active for intercontinental
      
      // Standardize actual cost: if contract is active and cheaper, we evaluate it, 
      // but auto-negotiator seeks to optimize between the two.
      const selectedCost = Math.round(isContractActive ? Math.min(spotBase, contractBase) : spotBase);
      const retailQuote = Math.round(selectedCost / (1 - targetMarginPercent / 100));
      const margin = retailQuote - selectedCost;
      const marginPercent = Math.round((margin / retailQuote) * 100);
      
      // Carbon footprint calculation (Mass * Distance * co2Factor) / 1,000,000 to get Tonnes
      const co2Tonne = Number(((cargoWeightTons * activeRoute.baseDistanceKm * carrier.co2PerTonKm) / 1000000).toFixed(2));

      return {
        carrierId: carrier.id,
        carrierName: carrier.name,
        mode: carrier.mode,
        spotCost: Math.round(spotBase),
        contractCost: Math.round(contractBase),
        selectedCost,
        margin,
        marginPercent,
        retailQuote,
        transitDays: Math.round(carrier.transitDays * (activeRoute.baseDistanceKm / 10000)),
        co2Tonne,
        isContractActive,
        isRecommended: false,
        recommendationType: 'none'
      };
    });

    // Filter out logically impossible routes (e.g. road cargo on intercontinental crossings over 4,500km)
    const possibleOptions = rawOptions.filter(opt => {
      if (opt.mode === 'Road' && activeRoute.baseDistanceKm > 4500) {
        return false; // too long for pure trucking
      }
      return true;
    });

    if (possibleOptions.length === 0) return [];

    // Find optimal recommendations
    let highestMarginIdx = -1;
    let maxMarginVal = -1;
    let fastestIdx = -1;
    let minTransit = 999;
    let greenestIdx = -1;
    let minCo2 = 99999;

    possibleOptions.forEach((opt, idx) => {
      // Highest margin finder
      if (opt.marginPercent > maxMarginVal) {
        maxMarginVal = opt.marginPercent;
        highestMarginIdx = idx;
      }
      // Fastest finder
      if (opt.transitDays < minTransit) {
        minTransit = opt.transitDays;
        fastestIdx = idx;
      }
      // Greenest finder
      if (opt.co2Tonne < minCo2) {
        minCo2 = opt.co2Tonne;
        greenestIdx = idx;
      }
    });

    // Apply recommendation badges
    possibleOptions.forEach((opt, idx) => {
      if (idx === highestMarginIdx) {
        opt.isRecommended = true;
        opt.recommendationType = 'margin';
      } else if (idx === fastestIdx) {
        opt.isRecommended = true;
        opt.recommendationType = 'speed';
      } else if (idx === greenestIdx) {
        opt.isRecommended = true;
        opt.recommendationType = 'eco';
      }
    });

    // Sort by margin percent descending by default
    return possibleOptions.sort((a, b) => b.marginPercent - a.marginPercent);
  }, [activeRoute, cargoVolumeCbm, cargoWeightTons, targetMarginPercent, customRates]);

  // Filter list by selected priority mode
  const filteredComparisonList = useMemo(() => {
    if (priorityFilter === 'All') return comparisonList;
    return comparisonList.filter(item => item.mode === priorityFilter);
  }, [comparisonList, priorityFilter]);

  // Overall Statistics summary
  const summaryStats = useMemo(() => {
    if (comparisonList.length === 0) return { avgMargin: 0, bestOption: null, potentialSavings: 0 };
    
    const bestOption = comparisonList.find(c => c.recommendationType === 'margin') || comparisonList[0];
    const avgMargin = Math.round(comparisonList.reduce((acc, curr) => acc + curr.marginPercent, 0) / comparisonList.length);
    
    // Potential savings calculations comparing worst option cost vs recommended choice
    const worstOption = [...comparisonList].sort((a, b) => b.selectedCost - a.selectedCost)[0];
    const potentialSavings = Math.max(0, worstOption.selectedCost - bestOption.selectedCost);

    return {
      avgMargin,
      bestOption,
      potentialSavings
    };
  }, [comparisonList]);

  // Derived data with historical benchmark matching and sorting
  const tableData = useMemo(() => {
    const distanceRatio = activeRoute.baseDistanceKm / 10000;
    const volumeDiscountFactor = Math.max(0.85, 1 - (cargoVolumeCbm / 500) * 0.1);

    const data = comparisonList.map(item => {
      const baseCarrier = CARRIER_BASE_POOL.find(c => c.id === item.carrierId);
      
      // Calculate a realistic historical average rate based on standard contracts & distance
      const historicalBenchmarkRate = baseCarrier ? Math.round(baseCarrier.contractRatePerCbm * 1.08) : 160;
      const benchmarkCost = Math.round(historicalBenchmarkRate * cargoVolumeCbm * distanceRatio * volumeDiscountFactor);
      
      // SCM cost variance against historical benchmark: positive means current cost is cheaper (direct profit gain)
      const variance = benchmarkCost - item.selectedCost; 
      const variancePercent = benchmarkCost > 0 ? Math.round((variance / benchmarkCost) * 100) : 0;
      
      // Net profit impact represents how much profit we gain or lose relative to the benchmark
      const profitImpact = variance; 

      return {
        ...item,
        benchmarkCost,
        variance,
        variancePercent,
        profitImpact,
        rating: baseCarrier?.rating || 4.7,
        reliability: baseCarrier?.reliabilityRate || 95.0
      };
    });

    // Apply sorting
    return [...data].sort((a, b) => {
      let comparison = 0;
      if (tableSortBy === 'carrier') {
        comparison = a.carrierName.localeCompare(b.carrierName);
      } else if (tableSortBy === 'cost') {
        comparison = a.selectedCost - b.selectedCost;
      } else if (tableSortBy === 'benchmark') {
        comparison = a.benchmarkCost - b.benchmarkCost;
      } else if (tableSortBy === 'variance') {
        comparison = a.variance - b.variance;
      } else if (tableSortBy === 'margin') {
        comparison = a.marginPercent - b.marginPercent;
      }

      return tableSortOrder === 'desc' ? -comparison : comparison;
    });
  }, [comparisonList, tableSortBy, tableSortOrder, cargoVolumeCbm, activeRoute]);

  const handleSortClick = (field: 'carrier' | 'cost' | 'benchmark' | 'variance' | 'margin') => {
    if (tableSortBy === field) {
      setTableSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setTableSortBy(field);
      setTableSortOrder('desc');
    }
  };

  // Trigger simulated automated contract negotiation sequence
  const startNegotiation = (item: CostComparison) => {
    const originalRatePerCbm = CARRIER_BASE_POOL.find(c => c.id === item.carrierId)?.spotRatePerCbm || 150;
    setNegotiatingCarrier(item);
    // Suggest counter rate at approximately 15% discount
    setProposedCounterRate(Math.round(originalRatePerCbm * 0.85));
    setNegotiationStep(0);
    setNegotiationLogs([]);
    setCarrierCounterProposal(null);
    setGeneratedEmailDraft('');
    setIsNegotiating(true);
  };

  const handleSimulatedNegotiate = () => {
    if (!negotiatingCarrier) return;
    
    setNegotiationStep(1); // Submitting
    setNegotiationLogs([
      `[10:45:11] Initiating auto-negotiation protocol with ${negotiatingCarrier.carrierName}...`,
      `[10:45:12] Establishing secure electronic contract handshake...`,
      `[10:45:14] Strategy loaded: ${negotiationStrategy.toUpperCase()} OPTIMIZATION.`,
    ]);

    setTimeout(() => {
      setNegotiationStep(2); // Analyzing
      setNegotiationLogs(prev => [
        ...prev,
        `[10:45:16] Transmitting counter-offer of $${proposedCounterRate}/CBM (Targeting total shipment cost of $${Math.round(proposedCounterRate * cargoVolumeCbm * (activeRoute.baseDistanceKm / 10000))}).`,
        `[10:45:18] Querying carrier cargo yield pricing desks and capacity nodes...`,
        `[10:45:20] Reviewing partner contract volume fulfillment metrics (YTD: 142 TEU allocated).`,
      ]);

      setTimeout(() => {
        const originalCarrier = CARRIER_BASE_POOL.find(c => c.id === negotiatingCarrier.carrierId)!;
        const originalRate = originalCarrier.spotRatePerCbm;
        const discountPercent = ((originalRate - proposedCounterRate) / originalRate) * 100;

        let success = false;
        let counterRate = proposedCounterRate;

        // Auto Negotiation Logic Matrix based on Strategy and Discount Size
        if (discountPercent <= 5) {
          // Very minor discount, accepted instantly
          success = true;
          setNegotiationStep(3); // Success
        } else if (discountPercent <= 18) {
          // Reasonable negotiation: Accept, or counter slightly higher
          if (negotiationStrategy === 'volume' && cargoVolumeCbm >= 100) {
            success = true;
            setNegotiationStep(3);
          } else if (negotiationStrategy === 'loyalty' && originalCarrier.rating >= 4.7) {
            success = true;
            setNegotiationStep(3);
          } else {
            // Meet halfway
            success = false;
            counterRate = Math.round(proposedCounterRate + (originalRate - proposedCounterRate) * 0.4);
            setCarrierCounterProposal(counterRate);
            setNegotiationStep(5); // Carrier Counter proposed
          }
        } else {
          // Too aggressive discount (>18%)
          if (negotiationStrategy === 'volume' && cargoVolumeCbm >= 200) {
            // Volume saves it somewhat, but carrier counters
            counterRate = Math.round(originalRate * 0.88);
            setCarrierCounterProposal(counterRate);
            setNegotiationStep(5);
          } else {
            // Total reject
            setNegotiationStep(4); // Rejected
          }
        }

        const costSavings = success ? Math.round((originalRate - proposedCounterRate) * cargoVolumeCbm * (activeRoute.baseDistanceKm / 10000)) : 0;

        if (success) {
          setNegotiationLogs(prev => [
            ...prev,
            `[10:45:23] CARRIER RESPONSE: Counter-offer ACCEPTED.`,
            `[10:45:24] Locked-in rate of $${proposedCounterRate}/CBM registered into smart billing ledger.`,
            `[10:45:25] Automated audit complete. Estimated SCM savings: $${costSavings.toLocaleString()}.`,
          ]);
          toast.success(`Negotiation Successful with ${negotiatingCarrier.carrierName}!`, {
            description: `Rate reduced to $${proposedCounterRate}/CBM. Saved $${costSavings.toLocaleString()} on linehaul costs.`,
          });
          // Update custom rate state
          setCustomRates(prev => ({
            ...prev,
            [negotiatingCarrier.carrierId]: proposedCounterRate
          }));
        } else if (counterRate !== proposedCounterRate) {
          setNegotiationLogs(prev => [
            ...prev,
            `[10:45:23] CARRIER RESPONSE: Counter-offer flag raised (Target too aggressive).`,
            `[10:45:24] Carrier pricing desk generated automated counter-proposal: $${counterRate}/CBM.`,
            `[10:45:25] Awaiting coordinator approval or counter-action.`,
          ]);
        } else {
          setNegotiationLogs(prev => [
            ...prev,
            `[10:45:23] CARRIER RESPONSE: Counter-offer REJECTED.`,
            `[10:45:24] Request falls below marginal carrier yield floor for this route capacity.`,
            `[10:45:25] Negotiation terminated. Pre-negotiated spot rates remain locked.`,
          ]);
          toast.error(`Counter-offer Rejected by ${negotiatingCarrier.carrierName}`, {
            description: `The discount request of ${discountPercent.toFixed(1)}% exceeded capacity threshold limits.`,
          });
        }

        // Draft formal notification email using selected strategy context
        const templateEmail = `Dear Operations Team at ${negotiatingCarrier.carrierName},

Following up on our automated spot quotation request for route ${activeRoute.origin} to ${activeRoute.destination} (Est. ${cargoVolumeCbm} CBM, ${cargoWeightTons} Tons).

Based on our current ${negotiationStrategy === 'volume' ? 'quarterly cargo volume trajectory' : negotiationStrategy === 'loyalty' ? 'historical SLA compliance parameters' : 'competitive rate indices from OTI partners'}, we have submitted a target offer of $${proposedCounterRate}/CBM.

We seek to lock this in and dispatch the Booking Note immediately upon your digital clearance.

Sincerely,
SCM Freight Logistics Coordinator
Autonomous Auto-Negotiator Platform`;

        setGeneratedEmailDraft(templateEmail);

      }, 2000);
    }, 1500);
  };

  const acceptCarrierCounter = () => {
    if (!negotiatingCarrier || !carrierCounterProposal) return;
    const costSavings = Math.round(
      (negotiatingCarrier.spotCost / cargoVolumeCbm - carrierCounterProposal) * 
      cargoVolumeCbm * (activeRoute.baseDistanceKm / 10000)
    );

    setCustomRates(prev => ({
      ...prev,
      [negotiatingCarrier.carrierId]: carrierCounterProposal
    }));

    toast.success(`Counter-Proposal Accepted!`, {
      description: `Rate updated to $${carrierCounterProposal}/CBM. Saved $${costSavings.toLocaleString()}.`,
    });
    setIsNegotiating(false);
  };

  const triggerInstantBooking = (item: CostComparison) => {
    setIsBooked(false);
    setBookedCarrier(item.carrierName);
    setBookedPrice(item.retailQuote);
    const ref = `BKG-NAV-${Math.floor(100000 + Math.random() * 900000)}`;
    setBookedReference(ref);

    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1800)),
      {
        loading: `Securing allocation & dispatching EDI Booking Note to ${item.carrierName}...`,
        success: () => {
          setIsBooked(true);
          return `Booking confirmed! Reference: ${ref}`;
        },
        error: 'Booking transmission failed. Please try again.'
      }
    );
  };

  const copyEmailToClipboard = () => {
    navigator.clipboard.writeText(generatedEmailDraft);
    toast.success('Negotiation Email copy completed', { icon: '📋' });
  };

  return (
    <div className="space-y-6" id="multi-carrier-auto-negotiator-root">
      
      {/* KPI METRICS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Potential SCM Savings</p>
              <p className="text-3xl font-extrabold text-foreground mt-2">
                ${summaryStats.potentialSavings.toLocaleString()}
              </p>
              <p className="text-[10px] text-emerald-500 font-medium mt-1 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" /> Over worst carrier alternative
              </p>
            </div>
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/40 rounded-lg text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Avg Gross Profit Margin</p>
              <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">
                {summaryStats.avgMargin}%
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Target: {targetMarginPercent}% markup
              </p>
            </div>
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950/40 rounded-lg text-indigo-600">
              <Percent className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm bg-gradient-to-br from-indigo-50/20 to-card dark:from-indigo-950/5 dark:to-card">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Smart Carrier Choice</p>
              <p className="text-base font-bold text-foreground mt-2 truncate max-w-[160px]">
                {summaryStats.bestOption?.carrierName || 'Calculating...'}
              </p>
              <p className="text-[10px] text-primary font-medium mt-1">
                🌿 CO2: {summaryStats.bestOption?.co2Tonne} T | Transit: {summaryStats.bestOption?.transitDays} Days
              </p>
            </div>
            <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Digital SLA Health</p>
              <p className="text-3xl font-extrabold text-emerald-600 mt-2">
                98.4%
              </p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" /> Fully Compliant
              </p>
            </div>
            <div className="p-2.5 bg-amber-100 dark:bg-amber-950/40 rounded-lg text-amber-600">
              <Scale className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* CORE CONTROL GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COL 1: QUOTATION & CARGO PARAMETERS */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Scale className="w-5 h-5 text-indigo-500" />
              <h3 className="font-semibold text-foreground">Route & Cargo Configurator</h3>
            </div>

            {/* ROUTE PRESET SELECTOR */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Logistics Route Corridor</label>
              <select 
                value={selectedRouteId}
                onChange={(e) => setSelectedRouteId(e.target.value)}
                className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              >
                {ROT_PRESETS.map(preset => (
                  <option key={preset.id} value={preset.id}>{preset.label}</option>
                ))}
              </select>
            </div>

            {/* VOLUMETRIC INPUTS */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cargo Volume (CBM)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={cargoVolumeCbm} 
                    onChange={(e) => setCargoVolumeCbm(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">m³</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cargo Weight (Tons)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={cargoWeightTons} 
                    onChange={(e) => setCargoWeightTons(Math.max(0.1, Number(e.target.value)))}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">T</span>
                </div>
              </div>
            </div>

            {/* TARGET GROSS PROFIT MARGIN SLIDER */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target Markup Margin</label>
                <span className="text-sm font-bold text-primary">{targetMarginPercent}%</span>
              </div>
              <input 
                type="range" 
                min="5" 
                max="50" 
                value={targetMarginPercent} 
                onChange={(e) => setTargetMarginPercent(Number(e.target.value))}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>5% (Volume desk)</span>
                <span>25% (Standard)</span>
                <span>50% (High Premium)</span>
              </div>
            </div>

            {/* REGULATORY NOTICE */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3.5 text-xs text-muted-foreground leading-relaxed flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Spot vs. Contract Audit:</strong> Contract prices are hard-capped. However, spot rates fluctuate on weekly carrier indexes. When spot rates dip below historical contract prices, the Auto-Negotiator flags a contract bypass protocol.
              </p>
            </div>
          </div>

          {/* HISTORICAL CONTRACT INDEXING */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-primary" />
              12-Month Rate Trajectory Index
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Analyzing cost-spread variance against fixed contract ceilings.
            </p>
            
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={generateHistoricalTrendData(summaryStats.bestOption?.carrierName || 'Maersk', 145, 165)}
                  margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" stroke="#888888" fontSize={9} tickLine={false} />
                  <YAxis stroke="#888888" fontSize={9} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--color-card)', 
                      borderColor: 'var(--color-border)',
                      borderRadius: '8px',
                      fontSize: '11px'
                    }}
                  />
                  <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: 10 }} />
                  <Area type="monotone" dataKey="Spot Rate" stroke="#ef4444" fillOpacity={0.05} fill="#ef4444" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="Contract Rate" stroke="#10b981" strokeDasharray="4 4" fill="none" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* COL 2 & 3: COMPREHENSIVE CARRIER OFFERS */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            
            {/* OFFER HEADER & FILTER BAR */}
            <div className="p-5 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/20">
              <div>
                <h3 className="font-bold text-foreground">Multi-Carrier Live Comparative Ledger</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Automated comparison of weekly spot rates vs pre-negotiated volume prices.</p>
              </div>

              {/* MODE SELECTOR FILTERS */}
              <div className="flex bg-muted p-1 rounded-lg border border-border text-xs">
                {(['All', 'Sea', 'Air', 'Road'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setPriorityFilter(mode)}
                    className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                      priorityFilter === mode 
                        ? 'bg-card text-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {mode === 'All' ? 'All Modes' : mode}
                  </button>
                ))}
              </div>
            </div>

            {/* OFFERS CARDS LIST */}
            <div className="p-5 space-y-4">
              <AnimatePresence mode="popLayout">
                {filteredComparisonList.map((item) => {
                  const variancePercent = Math.round(((item.spotCost - item.contractCost) / item.contractCost) * 100);
                  const isSpotCheaper = item.spotCost < item.contractCost;

                  return (
                    <motion.div
                      key={item.carrierId}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`border rounded-xl p-5 transition-all duration-200 ${
                        item.recommendationType === 'margin' 
                          ? 'border-emerald-500 bg-emerald-500/[0.01]' 
                          : item.recommendationType === 'speed' 
                          ? 'border-indigo-500 bg-indigo-500/[0.01]'
                          : item.recommendationType === 'eco'
                          ? 'border-teal-500 bg-teal-500/[0.01]'
                          : 'border-border hover:border-muted-foreground/30'
                      }`}
                    >
                      {/* CARD ROW 1: HEADER & BADGES */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl ${
                            item.mode === 'Sea' ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' :
                            item.mode === 'Air' ? 'bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400' :
                            'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                          }`}>
                            {item.mode === 'Sea' && <Ship className="w-5 h-5" />}
                            {item.mode === 'Air' && <Plane className="w-5 h-5" />}
                            {item.mode === 'Road' && <Truck className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground text-sm sm:text-base">{item.carrierName}</span>
                              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded font-mono">
                                {item.mode}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                              <span className="text-amber-500 font-bold">★ 4.7</span>
                              <span>•</span>
                              <span>SLA On-Time Rate: 94.8%</span>
                            </div>
                          </div>
                        </div>

                        {/* RECOMMENDATION BADGE */}
                        <div className="flex flex-wrap gap-2">
                          {item.recommendationType === 'margin' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20 shadow-sm animate-pulse">
                              <Award className="w-3.5 h-3.5" /> High Margin Winner
                            </span>
                          )}
                          {item.recommendationType === 'speed' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-500/20 shadow-sm">
                              <Clock className="w-3.5 h-3.5" /> Expedited Speed
                            </span>
                          )}
                          {item.recommendationType === 'eco' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-100 dark:bg-teal-950/40 dark:text-teal-400 px-2.5 py-1 rounded-full border border-teal-500/20 shadow-sm">
                              <Leaf className="w-3.5 h-3.5" /> Low Carbon Route
                            </span>
                          )}
                          
                          {/* Spot vs Contract Indicator */}
                          {item.isContractActive ? (
                            <span className={`text-[10px] font-semibold px-2 py-1 rounded ${
                              isSpotCheaper 
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' 
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                            }`}>
                              {isSpotCheaper ? `Spot is ${Math.abs(variancePercent)}% cheaper` : `Contract active (-${Math.abs(variancePercent)}%)`}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 px-2 py-1 rounded">
                              Spot Only Route
                            </span>
                          )}
                        </div>
                      </div>

                      {/* CARD ROW 2: DETAILED STATS GRID */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-4 border-t border-dashed border-border text-xs">
                        <div>
                          <span className="block text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">Linehaul Base Cost</span>
                          <p className="text-sm font-bold text-foreground mt-1 font-mono">${item.selectedCost.toLocaleString()}</p>
                          <span className="text-[10px] text-muted-foreground">
                            {item.isContractActive && !isSpotCheaper ? 'Using Contract' : 'Using Spot Rate'}
                          </span>
                        </div>

                        <div>
                          <span className="block text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">Recommended Quote</span>
                          <p className="text-sm font-bold text-primary mt-1 font-mono">${item.retailQuote.toLocaleString()}</p>
                          <span className="text-[10px] text-muted-foreground">Retail markup pricing</span>
                        </div>

                        <div>
                          <span className="block text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">Est. Profit Margin</span>
                          <p className="text-sm font-bold text-emerald-600 mt-1 font-mono">${item.margin.toLocaleString()} ({item.marginPercent}%)</p>
                          <span className="text-[10px] text-muted-foreground">Net margin gain</span>
                        </div>

                        <div>
                          <span className="block text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">SCM Variables</span>
                          <p className="text-sm font-bold text-foreground mt-1">
                            {item.transitDays} Days Transit
                          </p>
                          <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold flex items-center gap-0.5 mt-0.5">
                            <Leaf className="w-3 h-3" /> {item.co2Tonne} Ton CO2
                          </span>
                        </div>
                      </div>

                      {/* CARD ROW 3: INTERACTIVE OPERATIONS BUTTONS */}
                      <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-border">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startNegotiation(item)}
                          className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                        >
                          <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Auto-Negotiate
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => triggerInstantBooking(item)}
                          className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Book Allocation
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}

                {filteredComparisonList.length === 0 && (
                  <div className="p-12 text-center text-muted-foreground">
                    No active carriers support this specific transit configuration currently.
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISUAL MARGIN ANALYSIS & BENCHMARKING LEDGER */}
      {/* ========================================================================= */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden" id="margin-analysis-ledger-container">
        {/* Header Section */}
        <div className="p-5 border-b border-border bg-muted/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-500" />
              <h3 className="font-bold text-foreground">Freight Margin & Profit Impact Ledger</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live audit comparing current quotes against standard 3-year historical benchmark indexes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground">Sort By:</span>
            <div className="flex bg-muted p-1 rounded-lg border border-border text-xs">
              {(['margin', 'variance', 'cost', 'carrier'] as const).map(field => (
                <button
                  key={field}
                  onClick={() => {
                    if (tableSortBy === field) {
                      setTableSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                    } else {
                      setTableSortBy(field);
                      setTableSortOrder('desc');
                    }
                  }}
                  className={`px-3 py-1 rounded-md font-semibold capitalize transition-all ${
                    tableSortBy === field 
                      ? 'bg-card text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {field === 'cost' ? 'Quote' : field}
                </button>
              ))}
            </div>
            <button
              onClick={() => setTableSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-all"
              title="Toggle Sort Direction"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="sr-only">Toggle Order</span>
            </button>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/10 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                <th className="p-4 cursor-pointer hover:text-foreground transition-all select-none" onClick={() => handleSortClick('carrier')}>
                  <div className="flex items-center gap-1">
                    Carrier & Mode
                    {tableSortBy === 'carrier' && (tableSortOrder === 'asc' ? ' ▴' : ' ▾')}
                  </div>
                </th>
                <th className="p-4 cursor-pointer hover:text-foreground transition-all select-none" onClick={() => handleSortClick('cost')}>
                  <div className="flex items-center gap-1">
                    Current Quote Cost
                    {tableSortBy === 'cost' && (tableSortOrder === 'asc' ? ' ▴' : ' ▾')}
                  </div>
                </th>
                <th className="p-4 cursor-pointer hover:text-foreground transition-all select-none" onClick={() => handleSortClick('benchmark')}>
                  <div className="flex items-center gap-1">
                    Historical Benchmark
                    {tableSortBy === 'benchmark' && (tableSortOrder === 'asc' ? ' ▴' : ' ▾')}
                  </div>
                </th>
                <th className="p-4 cursor-pointer hover:text-foreground transition-all select-none" onClick={() => handleSortClick('variance')}>
                  <div className="flex items-center gap-1">
                    SCM Variance
                    {tableSortBy === 'variance' && (tableSortOrder === 'asc' ? ' ▴' : ' ▾')}
                  </div>
                </th>
                <th className="p-4">Projected Selling Price</th>
                <th className="p-4 cursor-pointer hover:text-foreground transition-all select-none" onClick={() => handleSortClick('margin')}>
                  <div className="flex items-center gap-1">
                    Projected Profit Impact
                    {tableSortBy === 'margin' && (tableSortOrder === 'asc' ? ' ▴' : ' ▾')}
                  </div>
                </th>
                <th className="p-4 text-center">Profit Yield</th>
                <th className="p-4 text-right">Strategic Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {tableData.map((row) => {
                const isFavorable = row.variance >= 0;
                const marginPercent = row.marginPercent;
                
                // Determine profit tier style
                let tierLabel = 'Low Margin';
                let tierBadge = 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30';
                if (marginPercent >= 25) {
                  tierLabel = 'High Yield';
                  tierBadge = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30';
                } else if (marginPercent >= 15) {
                  tierLabel = 'Standard';
                  tierBadge = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/30';
                }

                return (
                  <tr key={row.carrierId} className="hover:bg-muted/10 transition-all">
                    {/* Carrier Info */}
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${
                          row.mode === 'Sea' ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' :
                          row.mode === 'Air' ? 'bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400' :
                          'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                        }`}>
                          {row.mode === 'Sea' && <Ship className="w-4 h-4" />}
                          {row.mode === 'Air' && <Plane className="w-4 h-4" />}
                          {row.mode === 'Road' && <Truck className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{row.carrierName}</p>
                          <span className="text-[10px] text-muted-foreground font-mono uppercase">{row.mode} Transport</span>
                        </div>
                      </div>
                    </td>

                    {/* Current Cost */}
                    <td className="p-4 font-mono text-sm font-semibold text-foreground">
                      ${row.selectedCost.toLocaleString()}
                      <span className="block text-[10px] font-normal text-muted-foreground mt-0.5">
                        {row.isContractActive && row.spotCost >= row.contractCost ? 'Contract Rate' : 'Spot Rate'}
                      </span>
                    </td>

                    {/* Historical Benchmark */}
                    <td className="p-4 font-mono text-sm text-muted-foreground">
                      ${row.benchmarkCost.toLocaleString()}
                      <span className="block text-[10px] text-muted-foreground font-normal mt-0.5">SCFI 3-Year Avg</span>
                    </td>

                    {/* SCM Variance */}
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        {isFavorable ? (
                          <TrendingDown className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <TrendingUp className="w-4 h-4 text-rose-500" />
                        )}
                        <span className={`font-mono font-semibold text-sm ${isFavorable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {isFavorable ? '-' : '+'}${Math.abs(row.variance).toLocaleString()}
                        </span>
                      </div>
                      <span className="block text-[10px] text-muted-foreground mt-0.5 font-mono">
                        {isFavorable ? 'Under' : 'Over'} Benchmark by {row.variancePercent}%
                      </span>
                    </td>

                    {/* Projected Selling Price */}
                    <td className="p-4 font-mono text-sm font-semibold text-primary">
                      ${row.retailQuote.toLocaleString()}
                      <span className="block text-[10px] text-muted-foreground font-normal mt-0.5">At {targetMarginPercent}% Markup</span>
                    </td>

                    {/* Projected Profit Impact */}
                    <td className="p-4">
                      <div className="font-mono text-sm font-bold text-foreground">
                        ${row.margin.toLocaleString()}
                      </div>
                      <span className="block text-[10px] text-emerald-600 font-medium mt-0.5">
                        +{row.marginPercent}% gross margin
                      </span>
                    </td>

                    {/* Profit Yield Badge */}
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full ${tierBadge}`}>
                        {tierLabel}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startNegotiation(row)}
                          className="h-8 text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 px-2"
                        >
                          <Sparkles className="w-3 h-3" /> Negotiate
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => triggerInstantBooking(row)}
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 px-2"
                        >
                          Book
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* DIALOG 1: INTERACTIVE AUTOMATED NEGOTIATION SANDBOX */}
      <AnimatePresence>
        {isNegotiating && negotiatingCarrier && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden"
            >
              {/* MODAL HEADER */}
              <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 p-6 text-white flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-400 animate-spin-slow" />
                    <h3 className="font-bold text-lg">AI-Powered Carrier Booking Auto-Negotiator</h3>
                  </div>
                  <p className="text-xs text-indigo-200 mt-1">
                    Simulating counter-offers based on contract volumes, slot allocations, and competitive benchmarks.
                  </p>
                </div>
                <button 
                  onClick={() => setIsNegotiating(false)}
                  className="text-indigo-300 hover:text-white font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              {/* MODAL BODY */}
              <div className="p-6 space-y-6">
                
                {/* ACTIVE TERMS OVERVIEW */}
                <div className="bg-muted/40 p-4 rounded-lg border border-border grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground block uppercase font-bold text-[9px]">Target Carrier</span>
                    <span className="font-bold text-foreground text-sm">{negotiatingCarrier.carrierName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block uppercase font-bold text-[9px]">Standard Spot Rate</span>
                    <span className="font-bold text-foreground text-sm font-mono">${CARRIER_BASE_POOL.find(c => c.id === negotiatingCarrier.carrierId)?.spotRatePerCbm}/CBM</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block uppercase font-bold text-[9px]">Pre-Negotiated Contract</span>
                    <span className="font-bold text-foreground text-sm font-mono">${CARRIER_BASE_POOL.find(c => c.id === negotiatingCarrier.carrierId)?.contractRatePerCbm}/CBM</span>
                  </div>
                </div>

                {/* STEP 0: SELECTION CONTROLS */}
                {negotiationStep === 0 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* STRATEGY CHOOSER */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Negotiation Leverage Strategy</label>
                        <select
                          value={negotiationStrategy}
                          onChange={(e: any) => setNegotiationStrategy(e.target.value)}
                          className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                        >
                          <option value="volume">Quarterly Volume Commitment (High Volume)</option>
                          <option value="competitor">Competitor Price Match Index</option>
                          <option value="loyalty">Historical SLA Partner Compliance</option>
                          <option value="market">Market Volatility Spot Spread</option>
                        </select>
                      </div>

                      {/* COUNTER-OFFER RATE INPUT */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Proposed Counter-Offer ($/CBM)</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={proposedCounterRate}
                            onChange={(e) => setProposedCounterRate(Math.max(10, Number(e.target.value)))}
                            className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none font-mono"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">/CBM</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-3">
                      <Button onClick={handleSimulatedNegotiate} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center gap-1.5">
                        <Play className="w-3.5 h-3.5" /> Start Auto-Negotiation Sequence
                      </Button>
                    </div>
                  </div>
                )}

                {/* RUNNING AND TERMINAL LOGS */}
                {negotiationStep > 0 && (
                  <div className="space-y-4">
                    <div className="bg-zinc-950 text-zinc-300 font-mono text-[11px] rounded-lg p-4 border border-zinc-800 space-y-2 h-44 overflow-y-auto">
                      {negotiationLogs.map((log, index) => (
                        <div key={index} className={log.includes('ACCEPTED') ? 'text-emerald-400 font-bold' : log.includes('flag') || log.includes('REJECTED') ? 'text-rose-400 font-bold' : ''}>
                          {log}
                        </div>
                      ))}
                      
                      {/* Active thinking indicator */}
                      {(negotiationStep === 1 || negotiationStep === 2) && (
                        <div className="text-zinc-500 animate-pulse flex items-center gap-1.5">
                          <RotateCw className="w-3 h-3 animate-spin" /> Auto-Negotiator AI thinking...
                        </div>
                      )}
                    </div>

                    {/* INTERACTIVE CARRIER COUNTER-PROPOSAL RESOLVER */}
                    {negotiationStep === 5 && carrierCounterProposal && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Carrier Partial Concession Match</span>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            Carrier declined your target but locked in a counter-offer rate of <strong className="text-foreground font-mono">${carrierCounterProposal}/CBM</strong>. Accept counter-proposal to finish SCM ledger routing.
                          </p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <Button onClick={() => setIsNegotiating(false)} variant="outline" className="text-xs whitespace-nowrap">
                            Decline Offer
                          </Button>
                          <Button onClick={acceptCarrierCounter} className="bg-amber-600 hover:bg-amber-700 text-white text-xs whitespace-nowrap">
                            Accept Rate
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* EMAIL DRAFT DRAWER */}
                    {negotiationStep >= 3 && generatedEmailDraft && (
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-indigo-500" />
                            Negotiation SLA Communication Record
                          </label>
                          <Button variant="ghost" size="sm" onClick={copyEmailToClipboard} className="text-[10px] h-7 gap-1">
                            <Copy className="w-3 h-3" /> Copy Log
                          </Button>
                        </div>
                        <textarea
                          readOnly
                          value={generatedEmailDraft}
                          rows={6}
                          className="w-full bg-muted/40 border border-border rounded-lg p-3 text-[11px] font-mono text-muted-foreground leading-relaxed resize-none focus:outline-none"
                        />
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <Button onClick={() => setIsNegotiating(false)} variant="outline" className="text-xs">
                        {negotiationStep >= 3 ? 'Close Console' : 'Terminate Exchange'}
                      </Button>
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DIALOG 2: BOOKING COMPLETED SUCCESS MODAL */}
      <AnimatePresence>
        {isBooked && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 text-center space-y-5"
            >
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/40 rounded-full flex items-center justify-center text-emerald-600 mx-auto border border-emerald-500/20">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              
              <div className="space-y-1">
                <h3 className="font-extrabold text-lg text-foreground">SCM Booking Confirmed</h3>
                <p className="text-xs text-muted-foreground">Allocation secured and dispatched to carrier API gateway.</p>
              </div>

              <div className="bg-muted p-4 rounded-xl space-y-2 text-xs font-mono text-left">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">BOOKING REF:</span>
                  <span className="font-bold text-foreground">{bookedReference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CARRIER:</span>
                  <span className="font-bold text-foreground">{bookedCarrier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ROUTE:</span>
                  <span className="font-bold text-foreground">{activeRoute.origin} &rarr; {activeRoute.destination}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 mt-1">
                  <span className="text-muted-foreground font-bold">RETAIL QUOTE:</span>
                  <span className="font-extrabold text-primary">${bookedPrice.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex justify-center pt-2">
                <Button onClick={() => setIsBooked(false)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs w-full py-2.5">
                  Finish & Refresh Operations
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
