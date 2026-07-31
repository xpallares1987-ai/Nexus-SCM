export interface RoutingRequest {
  origin: string;
  destination: string;
  weightKg: number;
  mode?: string;
  isHazardous?: boolean;
}

export interface Rate {
  id: string;
  carrierId: string;
  origin: string;
  destination: string;
  mode: string;
  currency: string;
  amount: number | string;
  status: string;
}

export interface Routing {
  id: string;
  rateId: string | null;
  origin: string;
  destination: string;
  mode: string;
  transitTimeDays: number | string | null;
}

export interface RoutingResult {
  rateId: string | null;
  routingId: string;
  carrierId: string | null;
  mode: string;
  baseRate: number;
  surcharges: number;
  totalCost: number;
  currency: string;
  estimatedDays: number;
}

/**
 * Basic engine to evaluate routings and rates.
 * Designed to be easily replaced/integrated with a real DMN engine (like Camunda/Kogito).
 */
export function evaluateRoutings(
  request: RoutingRequest,
  availableRates: Rate[],
  availableRoutings: Routing[]
): RoutingResult[] {
  const results: RoutingResult[] = [];

  // Filter routings by O&D and mode
  const matchingRoutings = availableRoutings.filter(r => 
    r.origin.toLowerCase() === request.origin.toLowerCase() &&
    r.destination.toLowerCase() === request.destination.toLowerCase() &&
    (request.mode ? r.mode === request.mode : true)
  );

  for (const routing of matchingRoutings) {
    // Find associated rate
    const rate = availableRates.find(rt => rt.id === routing.rateId && rt.status === 'Approved');
    if (!rate) continue;

    const baseAmount = typeof rate.amount === 'string' ? parseFloat(rate.amount) : rate.amount;
    
    // Simple rules logic (simulate DMN)
    let surcharges = 0;
    
    // Rule 1: Heavy weight surcharge
    if (request.weightKg > 1000) {
      surcharges += baseAmount * 0.1; // 10% surcharge
    }

    // Rule 2: Hazardous materials surcharge
    if (request.isHazardous) {
      surcharges += 500; // Flat fee
    }

    // Rule 3: Air freight premium if applicable
    if (routing.mode === 'Air') {
      surcharges += baseAmount * 0.2; // 20% premium
    }

    results.push({
      rateId: rate.id,
      routingId: routing.id,
      carrierId: rate.carrierId,
      mode: routing.mode,
      baseRate: baseAmount,
      surcharges,
      totalCost: baseAmount + surcharges,
      currency: rate.currency || 'USD',
      estimatedDays: routing.transitTimeDays ? (typeof routing.transitTimeDays === 'string' ? parseFloat(routing.transitTimeDays) : routing.transitTimeDays) : 0
    });
  }

  // Sort by total cost asc
  return results.sort((a, b) => a.totalCost - b.totalCost);
}
