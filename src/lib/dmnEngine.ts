export interface DMNInputs {
  origin: string;
  destination: string;
  weight: number;
  volume: number;
  serviceType: string;
}

export interface CostBreakdownItem {
  description: string;
  amount: number;
}

export interface DMNResult {
  recommendedCarrier: string;
  estimatedCost: number;
  currency: string;
  transitDays: number;
  routeMatched: boolean;
  costBreakdown?: CostBreakdownItem[];
}

// Representing rules as a Decision Table (Rule Engine)
export interface DecisionRule {
  conditions: Partial<DMNInputs>;
  result: Omit<DMNResult, 'routeMatched'> | ((inputs: DMNInputs) => Omit<DMNResult, 'routeMatched'>);
}

// Helper to calculate chargeable weight based on mode
// Air: 1 CBM = 167 kg
// Sea LCL: 1 CBM = 1000 kg
const calculateChargeableWeight = (inputs: DMNInputs): number => {
  if (inputs.serviceType === 'Air') {
    const volumetricWeight = inputs.volume * 167;
    return Math.max(inputs.weight, volumetricWeight);
  }
  if (inputs.serviceType === 'Sea-LCL') {
    const volumetricWeight = inputs.volume * 1000;
    return Math.max(inputs.weight, volumetricWeight);
  }
  return inputs.weight; // FCL or Road usually rely on flat rate or actual weight
};

const routingRules: DecisionRule[] = [
  {
    conditions: { origin: 'CNSHA', destination: 'ESBCN', serviceType: 'Sea-FCL' },
    result: { 
      recommendedCarrier: 'Maersk', 
      estimatedCost: 2500, 
      currency: 'USD', 
      transitDays: 35,
      costBreakdown: [
        { description: 'Base Ocean Freight (FCL)', amount: 2000 },
        { description: 'Bunker Adjustment Factor (BAF)', amount: 300 },
        { description: 'Terminal Handling Charge (THC)', amount: 200 }
      ]
    }
  },
  {
    conditions: { origin: 'CNSHA', destination: 'ESBCN', serviceType: 'Air' },
    result: (inputs) => {
      const cw = calculateChargeableWeight(inputs);
      const baseCost = cw * 4.5;
      const fuelSurcharge = cw * 0.8;
      const securitySurcharge = cw * 0.2;
      return {
        recommendedCarrier: 'DHL Aviation', 
        estimatedCost: baseCost + fuelSurcharge + securitySurcharge, 
        currency: 'USD', 
        transitDays: 3,
        costBreakdown: [
          { description: `Base Air Freight (${cw} kg @ $4.50)`, amount: parseFloat(baseCost.toFixed(2)) },
          { description: `Fuel Surcharge (${cw} kg @ $0.80)`, amount: parseFloat(fuelSurcharge.toFixed(2)) },
          { description: `Security Surcharge (${cw} kg @ $0.20)`, amount: parseFloat(securitySurcharge.toFixed(2)) }
        ]
      }
    }
  },
  {
    conditions: { origin: 'CNSHA', destination: 'ESBCN', serviceType: 'Sea-LCL' },
    result: (inputs) => {
      const cw = calculateChargeableWeight(inputs);
      const wM = cw / 1000;
      const baseCost = wM * 60;
      const terminalHandling = Math.max(wM * 15, 50); // min 50
      const documentation = 35;
      return { 
        recommendedCarrier: 'Celine Logistics', 
        // Sea LCL typically charges per w/m (weight/measure)
        estimatedCost: baseCost + terminalHandling + documentation, 
        currency: 'USD', 
        transitDays: 40,
        costBreakdown: [
          { description: `Base LCL Freight (${wM.toFixed(2)} w/m @ $60)`, amount: parseFloat(baseCost.toFixed(2)) },
          { description: 'Terminal Handling (Origin/Dest)', amount: parseFloat(terminalHandling.toFixed(2)) },
          { description: 'Documentation Fee', amount: documentation }
        ]
      }
    }
  },
  {
    conditions: { origin: 'DEHAM', destination: 'USNYC', serviceType: 'Sea-FCL' },
    result: { 
      recommendedCarrier: 'Hapag-Lloyd', 
      estimatedCost: 1800, 
      currency: 'USD', 
      transitDays: 14,
      costBreakdown: [
        { description: 'Base Ocean Freight (FCL)', amount: 1400 },
        { description: 'Bunker Adjustment Factor (BAF)', amount: 250 },
        { description: 'Terminal Handling Charge (THC)', amount: 150 }
      ]
    }
  },
  {
    conditions: { origin: 'DEHAM', destination: 'USNYC', serviceType: 'Air' },
    result: (inputs) => {
      const cw = calculateChargeableWeight(inputs);
      const baseCost = cw * 3.5;
      const fuelSurcharge = cw * 0.5;
      const securitySurcharge = cw * 0.2;
      return { 
        recommendedCarrier: 'Lufthansa Cargo', 
        estimatedCost: baseCost + fuelSurcharge + securitySurcharge, 
        currency: 'USD', 
        transitDays: 2,
        costBreakdown: [
          { description: `Base Air Freight (${cw} kg @ $3.50)`, amount: parseFloat(baseCost.toFixed(2)) },
          { description: `Fuel Surcharge (${cw} kg @ $0.50)`, amount: parseFloat(fuelSurcharge.toFixed(2)) },
          { description: `Security Surcharge (${cw} kg @ $0.20)`, amount: parseFloat(securitySurcharge.toFixed(2)) }
        ]
      }
    }
  }
];

export function evaluateRoutingDecision(inputs: DMNInputs): DMNResult {
  // Find the first rule that matches all specified conditions
  for (const rule of routingRules) {
    const isMatch = Object.entries(rule.conditions).every(
      ([key, value]) => inputs[key as keyof DMNInputs] === value
    );
    
    if (isMatch) {
      const resultData = typeof rule.result === 'function' ? rule.result(inputs) : rule.result;
      return { 
        ...resultData, 
        estimatedCost: parseFloat(resultData.estimatedCost.toFixed(2)),
        routeMatched: true 
      };
    }
  }

  // Default fallback if no rules match
  return {
    recommendedCarrier: 'Default Carrier',
    estimatedCost: 0,
    currency: 'USD',
    transitDays: 0,
    routeMatched: false
  };
}

export function getAlternativeRoutes(inputs: DMNInputs): (DMNResult & { serviceType?: string })[] {
  const alternatives: (DMNResult & { serviceType?: string })[] = [];
  const modes = ['Sea-FCL', 'Sea-LCL', 'Air', 'Road'];
  
  modes.forEach(m => {
    if (m !== inputs.serviceType) {
      const result = evaluateRoutingDecision({ ...inputs, serviceType: m });
      if (result.routeMatched) {
         alternatives.push({ ...result, serviceType: m });
      } else if (m === 'Air') {
         // Default fallback for Air
         const cw = Math.max(inputs.weight, inputs.volume * 167);
         const baseCost = cw * 5.0;
         const surcharges = cw * 1.5;
         alternatives.push({
            recommendedCarrier: 'Express Air Freight',
            estimatedCost: parseFloat((baseCost + surcharges).toFixed(2)),
            currency: 'USD',
            transitDays: 4,
            routeMatched: true,
            serviceType: 'Air',
            costBreakdown: [
              { description: `Base Air Freight`, amount: parseFloat(baseCost.toFixed(2)) },
              { description: `Surcharges (Fuel, Security)`, amount: parseFloat(surcharges.toFixed(2)) }
            ]
          });
      } else if (m === 'Road') {
          // Default fallback for Road
         const baseCost = inputs.weight * 0.6;
         const tolls = inputs.weight * 0.2;
         alternatives.push({
            recommendedCarrier: 'Trans-Eurasia Logistics',
            estimatedCost: parseFloat((baseCost + tolls).toFixed(2)),
            currency: 'USD',
            transitDays: 18,
            routeMatched: true,
            serviceType: 'Road',
            costBreakdown: [
              { description: `Base Road Freight`, amount: parseFloat(baseCost.toFixed(2)) },
              { description: `Tolls and Border Fees`, amount: parseFloat(tolls.toFixed(2)) }
            ]
          });
      } else if (m === 'Sea-LCL') {
         const cw = Math.max(inputs.weight, inputs.volume * 1000);
         const wM = cw / 1000;
         const baseCost = wM * 80;
         const handling = 40;
         alternatives.push({
            recommendedCarrier: 'Global LCL Network',
            estimatedCost: parseFloat((baseCost + handling).toFixed(2)),
            currency: 'USD',
            transitDays: 45,
            routeMatched: true,
            serviceType: 'Sea-LCL',
            costBreakdown: [
              { description: `Base LCL Freight`, amount: parseFloat(baseCost.toFixed(2)) },
              { description: `Handling & Doc Fees`, amount: handling }
            ]
         });
      }
    }
  });
  
  return alternatives;
}
