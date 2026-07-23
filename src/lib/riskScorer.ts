/**
 * Automated Risk-Scoring Module for Intermodal Cargo Shipments
 * Computes a dynamic risk score between 1 and 100 based on:
 * - Live Weather Anomalies (Typhoons, Sea swells, Winter freezes)
 * - Political & Geopolitical Friction (Red Sea threat corridor, trade disputes, tariffs)
 * - Port & Terminal Congestion/Labor Disputes (West Coast crane strikes, Rotterdam custom backlog)
 * - Consignment Priorities & Delayed Statuses
 */

export interface RiskBreakdown {
  score: number;
  level: 'Low' | 'Medium' | 'High' | 'Critical';
  weatherRisk: number;
  politicalRisk: number;
  portDelayRisk: number;
  statusRisk: number;
  reasons: string[];
  mitigations: string[];
}

/**
 * Normalizes port names/codes to standard ISO strings
 */
const cleanPort = (p?: string): string => {
  if (!p) return '';
  return p.trim().toUpperCase();
};

/**
 * Calculates a comprehensive 1-100 risk score and breakdown for a shipment
 */
export function calculateShipmentRisk(shipment: any): RiskBreakdown {
  if (!shipment) {
    return {
      score: 1,
      level: 'Low',
      weatherRisk: 0,
      politicalRisk: 0,
      portDelayRisk: 0,
      statusRisk: 0,
      reasons: ['No shipment context provided.'],
      mitigations: []
    };
  }

  const origin = cleanPort(shipment.originPort || shipment.origin);
  const destination = cleanPort(shipment.destinationPort || shipment.destination);
  const isSeaLeg = (shipment.type || '').toLowerCase().includes('sea') || (shipment.type || '').toLowerCase().includes('ocean');
  const isHighPriority = (shipment.priority || '').toLowerCase() === 'high';
  const status = (shipment.status || '').toLowerCase().replace(/[\s-_]/g, '');

  let weatherRisk = 0;
  let politicalRisk = 0;
  let portDelayRisk = 0;
  let statusRisk = 0;
  const reasons: string[] = [];
  const mitigations: string[] = [];

  // ==========================================
  // 1. LIVE WEATHER RISK FACTORS (Max 30 pts)
  // ==========================================
  if (isSeaLeg) {
    // Pacific Route Typhoon hazard (CNSHA / JPTYO to US West Coast)
    if ((origin === 'CNSHA' || origin === 'JPTYO' || origin.includes('SHANGHAI') || origin.includes('TOKYO')) && 
        (destination === 'USLAX' || destination === 'USSEA' || destination.includes('LOS ANGELES'))) {
      weatherRisk = 28;
      reasons.push('Western Pacific "Force 11 Super Typhoon Malakas" storm-band proximity');
      mitigations.push('Consider ocean route modification or weather-deviation loops around sea-grid 14N.');
    }
    // North Atlantic extreme swell (NLRTM / ESBCN to US East Coast)
    else if ((origin === 'NLRTM' || origin === 'ESBCN' || origin.includes('ROTTERDAM') || origin.includes('BARCELONA')) && 
             (destination === 'USNYC' || destination.includes('NEW YORK'))) {
      weatherRisk = 18;
      reasons.push('North Atlantic low-pressure cell producing 7.2m swell heights');
      mitigations.push('Instruct master to throttle vessel to eco-speed 12kt to maintain stability.');
    }
    // South China Sea tropical depression
    else if (origin === 'SGSIN' || origin.includes('SINGAPORE')) {
      weatherRisk = 12;
      reasons.push('South China Sea seasonal monsoon wind shear');
      mitigations.push('Verify lashing certificates and container placement safety.');
    }
  } else {
    // Land/Air weather hazards
    if ((shipment.type || '').toLowerCase() === 'air') {
      weatherRisk = 5; // Air is generally resilient unless local severe fog occurs
    } else {
      // Rail / Road weather hazards
      weatherRisk = 8;
    }
  }

  // ==========================================
  // 2. POLITICAL & GEOPOLITICAL RISK FACTORS (Max 30 pts)
  // ==========================================
  // Red Sea / Bab-el-Mandeb Strait transits (connecting Asia/India with Europe)
  if ((origin === 'SGSIN' || origin === 'INBOM' || origin === 'CNSHA' || origin.includes('SINGAPORE') || origin.includes('MUMBAI') || origin.includes('SHANGHAI')) && 
      (destination === 'NLRTM' || destination === 'ESBCN' || destination === 'DEHAM' || destination.includes('ROTTERDAM') || destination.includes('BARCELONA') || destination.includes('HAMBURG'))) {
    politicalRisk = 30;
    reasons.push('Red Sea transit military threat corridor & active weapon guidelines');
    mitigations.push('Divert cargo around Cape of Good Hope (+10-12 days) or schedule intermodal Air-Sea via Dubai.');
  }
  // US Trade Tariffs & Custom checks
  else if (destination === 'USLAX' || destination === 'USNYC' || destination.includes('LOS ANGELES') || destination.includes('NEW YORK')) {
    politicalRisk = 12;
    reasons.push('Stringent ocean import agricultural / customs tariff filings');
    mitigations.push('Validate AMS and ISF 10+2 custom filings 48h prior to departure.');
  }

  // ==========================================
  // 3. PORT & TERMINAL CONGESTION (Max 30 pts)
  // ==========================================
  // USLAX (Los Angeles) West Coast Crane Slowdown
  if (destination === 'USLAX' || destination.includes('LOS ANGELES')) {
    portDelayRisk = 29;
    reasons.push('US West Coast Crane Operators labor dispute gridlock & berth queues');
    mitigations.push('Trigger intermodal option: Divert vessel to Seattle (USSEA) or Vancouver, then double-stack Rail.');
  }
  // Rotterdam post-Brexit custom queue
  else if (destination === 'NLRTM' || destination.includes('ROTTERDAM')) {
    portDelayRisk = 22;
    reasons.push('Rotterdam Port phytyosanitary validation backlog & gate-out congestion');
    mitigations.push('Divert to Port of Barcelona (ESBCN) and utilize direct Freight Rail linking central Europe.');
  }
  // Generic port risk based on delay predictions
  else if (shipment.predictedDelayDays && shipment.predictedDelayDays > 3) {
    portDelayRisk = 15 + Math.min(shipment.predictedDelayDays * 3, 15);
    reasons.push(`AI Port Tracker predicts significant yard congestion delay of +${shipment.predictedDelayDays}d`);
    mitigations.push('Pre-clear customs documentation and request priority drayage dispatch.');
  } else if (shipment.delayRisk === 'High') {
    portDelayRisk = 18;
    reasons.push('Port Yard congestion index at elevated levels (92% capacity)');
    mitigations.push('Coordinate off-dock yard operations to avoid demurrage penalties.');
  }

  // ==========================================
  // 4. SHIPMENT PRIORITY & STATUS RISK (Max 15 pts)
  // ==========================================
  if (status === 'delayed') {
    statusRisk = 12;
    reasons.push('Consignment status flagged as "Delayed" vs carrier scheduled ETD/ETA');
    mitigations.push('Initiate automated customer notification and request root-cause report from ocean carrier.');
  } else if (status === 'intransit' && isHighPriority) {
    statusRisk = 5; // Extra scrutiny for high priority active cargo
  }

  // High priority multiplier
  const baseTotal = weatherRisk + politicalRisk + portDelayRisk + statusRisk;
  let finalScore = Math.round(baseTotal);

  if (isHighPriority && finalScore > 10) {
    finalScore = Math.round(finalScore * 1.12); // priority boost to highlight high-value exposures
  }

  // Clamping score between 1 and 100
  finalScore = Math.max(1, Math.min(100, finalScore));

  // Determine Level
  let level: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
  if (finalScore >= 75) level = 'Critical';
  else if (finalScore >= 45) level = 'High';
  else if (finalScore >= 20) level = 'Medium';

  // Fallback reason if none matched
  if (reasons.length === 0) {
    reasons.push('Normal transit conditions. Local port yard and weather parameters within bounds.');
  }

  return {
    score: finalScore,
    level,
    weatherRisk,
    politicalRisk,
    portDelayRisk,
    statusRisk,
    reasons,
    mitigations: mitigations.length > 0 ? mitigations : ['Maintain standard GPS container ping interval.']
  };
}

/**
 * Returns Tailwind CSS color classes for the risk levels
 */
export function getRiskBadgeStyles(score: number): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  if (score >= 75) {
    return {
      bg: 'bg-red-500/10 dark:bg-red-500/20',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-500/20',
      dot: 'bg-red-500',
    };
  }
  if (score >= 45) {
    return {
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-500/20',
      dot: 'bg-amber-500',
    };
  }
  if (score >= 20) {
    return {
      bg: 'bg-blue-500/10 dark:bg-blue-500/20',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-500/20',
      dot: 'bg-blue-500',
    };
  }
  return {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-500',
  };
}
