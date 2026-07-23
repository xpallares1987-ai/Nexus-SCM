import { UNLocodeSelector } from "../shared/UNLocodeSelector";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { Map, Zap, AlertTriangle, ArrowRight, Check, X, Calendar, Clock, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/forms/button';
import { Input } from '@/components/ui/forms/input';
import { Label } from '@/components/ui/forms/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/forms/select';
import { Badge } from '@/components/ui/data-display/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/data-display/table';
import { useAuth } from '../../contexts/AuthContext';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import { SpotBourse } from './SpotBourse';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const generateHistoricalData = (basePrice: number) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  return months.map((month, index) => {
    const fluctuation = Math.sin(index) * (basePrice * 0.15) + (Math.random() * basePrice * 0.05);
    return {
      month,
      cost: Math.round(basePrice + fluctuation),
      marketAverage: Math.round(basePrice + fluctuation + (basePrice * 0.08)),
    };
  });
};

const getCarbonEmission = (serviceType: string, weight: number, distance: number = 1000) => {
  // Rough estimate: CO2 per ton-km
  // Air: 0.5 kg, Sea: 0.015 kg, Road: 0.1 kg
  let factor = 0.015;
  if (serviceType.includes('Air')) factor = 0.5;
  if (serviceType.includes('Road')) factor = 0.1;
  const emission = (weight / 1000) * distance * factor;
  return emission.toFixed(2);
};

const getCarrierRanking = (carrierName: string) => {
  if (!carrierName) return { rank: 'A', score: 85, punctuality: 80, costEfficiency: 90 };
  let hash = 0;
  for (let i = 0; i < carrierName.length; i++) {
    hash = carrierName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const score = 75 + (Math.abs(hash) % 25);
  const punctuality = 70 + (Math.abs(hash * 2) % 30);
  const costEfficiency = 65 + (Math.abs(hash * 3) % 35);
  
  let rank = 'C';
  let rankColor = 'bg-gray-100 text-gray-700 border-gray-200';
  if (score >= 93) {
    rank = 'S';
    rankColor = 'bg-purple-100 text-purple-700 border-purple-200';
  } else if (score >= 88) {
    rank = 'A';
    rankColor = 'bg-blue-100 text-blue-700 border-blue-200';
  } else if (score >= 80) {
    rank = 'B';
    rankColor = 'bg-green-100 text-green-700 border-green-200';
  } else {
    rankColor = 'bg-amber-100 text-amber-700 border-amber-200';
  }
  
  return { rank, rankColor, score, punctuality, costEfficiency };
};

const predictTransitTime = (serviceType: string, origin: string, destination: string) => {
  let baseDays = 15;
  if (serviceType.includes('Air')) baseDays = 3;
  else if (serviceType.includes('Road')) baseDays = 5;
  else if (serviceType.includes('Sea-LCL')) baseDays = 22;
  else if (serviceType.includes('Sea-FCL')) baseDays = 18;

  let routeHash = 0;
  const routeString = `${origin || 'CNSHA'}-${destination || 'ESBCN'}`;
  for (let i = 0; i < routeString.length; i++) {
    routeHash += routeString.charCodeAt(i);
  }
  
  const adjustment = (routeHash % 5) - 2; // -2 to +2 days
  const predictedDays = Math.max(1, baseDays + adjustment);
  
  const margin = Math.max(1, Math.round(predictedDays * 0.15));
  const minDays = Math.max(1, predictedDays - margin);
  const maxDays = predictedDays + margin;

  const today = new Date();
  
  const minArrival = new Date(today);
  minArrival.setDate(today.getDate() + minDays);
  
  const maxArrival = new Date(today);
  maxArrival.setDate(today.getDate() + maxDays);
  
  const formatArrival = (d: Date) => {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const confidence = 95 - (routeHash % 10);

  return {
    predictedDays,
    minDays,
    maxDays,
    minArrival: formatArrival(minArrival),
    maxArrival: formatArrival(maxArrival),
    confidence
  };
};

export function RoutingRates() {
  const { t } = useTranslation();
  const { token, profile } = useAuth();
  
  // High-Risk Shipments
  const [highRiskShipments, setHighRiskShipments] = useState<any[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<string>('');

  // DMN Inputs
  const [origin, setOrigin] = useState('CNSHA');
  const [destination, setDestination] = useState('ESBCN');
  const [weight, setWeight] = useState('2000');
  const [volume, setVolume] = useState('20');
  const [serviceType, setServiceType] = useState('Sea-FCL');
  
  // DMN Output
  const [decision, setDecision] = useState<any>(null);
  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [evaluating, setEvaluating] = useState(false);

  // Comparison
  const [scenarios, setScenarios] = useState<any[]>([
    { id: 1, origin: 'CNSHA', destination: 'ESBCN', weight: '2000', volume: '20', serviceType: 'Sea-FCL' },
    { id: 2, origin: 'CNSHA', destination: 'ESBCN', weight: '2000', volume: '20', serviceType: 'Air' },
    { id: 3, origin: 'CNSHA', destination: 'ESBCN', weight: '2000', volume: '20', serviceType: 'Sea-LCL' },
  ]);
  const [comparisonResults, setComparisonResults] = useState<any[]>([null, null, null]);
  const [evaluatingComparison, setEvaluatingComparison] = useState(false);

  // Rates
  const [rates, setRates] = useState<any[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);

  useEffect(() => {
    async function loadHighRiskShipments() {
      if (!token) return;
      try {
        const shipments = await fetchApi('/shipments', token);
        const highRisk = shipments.filter((s: any) => s.delayRisk === 'High' || s.delayRisk === 'Medium');
        setHighRiskShipments(highRisk);
      } catch (err) {
        console.error("Failed to load high risk shipments", err);
      }
    }
    loadHighRiskShipments();
    loadRates();
  }, [token]);

  const loadRates = async () => {
    if (!token) return;
    setLoadingRates(true);
    try {
      const data = await fetchApi('/rates', token);
      setRates(data || []);
    } catch (err) {
      console.error("Failed to load rates", err);
    } finally {
      setLoadingRates(false);
    }
  };

  const handleShipmentSelect = (shipmentId: string) => {
    setSelectedShipment(shipmentId);
    const shipment = highRiskShipments.find(s => s.id === shipmentId);
    if (shipment) {
      setOrigin(shipment.originPort || 'CNSHA');
      setDestination(shipment.destinationPort || 'ESBCN');
      setWeight(shipment.weight ? shipment.weight.toString() : '2000');
      setServiceType(shipment.type || 'Sea-FCL');
    }
  };

  const evaluateDMN = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    setEvaluating(true);
    try {
      const result = await fetchApi('/evaluate-routing', token, {
        method: 'POST',
        body: JSON.stringify({
          origin,
          destination,
          weight: parseFloat(weight),
          volume: parseFloat(volume),
          serviceType
        })
      });
      setDecision(result.decision);
      setAlternatives(result.alternatives || []);
      
      const baseCost = result.decision?.estimatedCost || 1000;
      setHistoricalData(generateHistoricalData(baseCost));
      
      if (!result.decision.routeMatched) {
        toast.warning('No specific DMN rule matched for these inputs.');
      } else {
        toast.success('DMN Evaluation complete.');
      }
    } catch (err) {
      toast.error('Failed to evaluate DMN rules');
    } finally {
      setEvaluating(false);
    }
  };

  const evaluateComparison = async () => {
    if (!token) return;
    setEvaluatingComparison(true);
    try {
      const results = await Promise.all(
        scenarios.map(async (scenario) => {
          const res = await fetchApi('/evaluate-routing', token, {
            method: 'POST',
            body: JSON.stringify({
              origin: scenario.origin,
              destination: scenario.destination,
              weight: parseFloat(scenario.weight) || 0,
              volume: parseFloat(scenario.volume) || 0,
              serviceType: scenario.serviceType,
            }),
          });
          return res.decision;
        })
      );
      setComparisonResults(results);
      toast.success('Comparison evaluated successfully.');
    } catch (err) {
      toast.error('Failed to evaluate comparison scenarios');
    } finally {
      setEvaluatingComparison(false);
    }
  };

  const updateScenario = (index: number, field: string, value: string) => {
    const newScenarios = [...scenarios];
    newScenarios[index] = { ...newScenarios[index], [field]: value };
    setScenarios(newScenarios);
  };

  const handleRateStatusChange = async (rateId: string, status: 'Approved' | 'Rejected') => {
    if (!token) return;
    try {
      await fetchApi(`/rates/${rateId}/status`, token, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      toast.success(`Rate successfully ${status.toLowerCase()}`);
      loadRates(); // reload
    } catch (err) {
      toast.error(`Failed to update rate status`);
    }
  };

  const isApprover = profile?.role === 'Admin' || profile?.role === 'Operador';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t('rates')}</h2>
          <p className="text-muted-foreground text-sm">Routing engine, rate lookup, and approval workflow</p>
        </div>
      </div>

      <Tabs defaultValue="routing" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="routing">Routing Engine</TabsTrigger>
          <TabsTrigger value="comparison">Rate Comparison</TabsTrigger>
          <TabsTrigger value="approvals">Rate Approvals</TabsTrigger>
          <TabsTrigger value="carbon">Sustainable Sourcing & CO₂</TabsTrigger>
          <TabsTrigger value="negotiator">Contract Negotiation Simulator</TabsTrigger>
          <TabsTrigger value="bourse">Spot Bourse</TabsTrigger>
        </TabsList>

        <TabsContent value="routing" className="space-y-6 mt-0">
          {highRiskShipments.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-amber-800 flex items-center gap-2 text-base">
                  <AlertTriangle className="w-4 h-4" /> 
                  Proactive Routing for High-Risk Shipments
                </CardTitle>
                <CardDescription className="text-amber-700/80">
                  Select a delayed or high-risk shipment to evaluate alternative routing paths.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedShipment} onValueChange={handleShipmentSelect}>
                  <SelectTrigger className="w-full md:w-[400px] bg-card">
                    <SelectValue placeholder="Select a high-risk shipment..." />
                  </SelectTrigger>
                  <SelectContent>
                    {highRiskShipments.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.referenceNumber} - {s.originPort} to {s.destinationPort} ({s.delayRisk} Risk)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Decision Table Inputs</CardTitle>
                <CardDescription>Simulate a DMN evaluation request to Zeebe/Camunda.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={evaluateDMN} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Origin Port</Label>
                      <UNLocodeSelector value={origin} onChange={setOrigin} placeholder="e.g. CNSHA" />
                    </div>
                    <div className="space-y-2">
                      <Label>Destination Port</Label>
                      <UNLocodeSelector value={destination} onChange={setDestination} placeholder="e.g. USLAX" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Weight (kg)</Label>
                      <Input type="number" value={weight} onChange={e => setWeight(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Volume (CBM)</Label>
                      <Input type="number" value={volume} onChange={e => setVolume(e.target.value)} required step="0.1" />
                    </div>
                    <div className="space-y-2">
                      <Label>Transport Mode</Label>
                      <select 
                        className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
                        value={serviceType} 
                        onChange={e => setServiceType(e.target.value)}
                      >
                        <option value="Sea-FCL">Sea-FCL</option>
                        <option value="Sea-FCL 20' DV">Sea-FCL 20' DV</option>
                        <option value="Sea-FCL 40' DV">Sea-FCL 40' DV</option>
                        <option value="Sea-FCL 40' HC">Sea-FCL 40' HC</option>
                        <option value="Sea-LCL">Sea-LCL</option>
                        <option value="Air">Air</option>
                        <option value="Road">Road</option>
                      </select>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={evaluating}>
                    {evaluating ? 'Evaluating...' : <><Zap className="w-4 h-4 mr-2" /> Evaluate DMN Rules</>}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className={decision?.routeMatched ? "border-green-200 bg-green-50/50" : ""}>
              <CardHeader>
                <CardTitle>Evaluation Results</CardTitle>
                <CardDescription>Primary output from the decision engine.</CardDescription>
              </CardHeader>
              <CardContent>
                {!decision ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Map className="w-8 h-8 mx-auto text-zinc-300 mb-2" />
                    <p>Submit inputs to see routing results.</p>
                    <p className="text-xs mt-2">Try CNSHA to ESBCN for a matched rule.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 border rounded-md p-4 bg-card shadow-sm">
                      <div>
                        <p className="text-sm text-muted-foreground">Recommended Carrier</p>
                        <p className="font-semibold text-foreground">{decision.recommendedCarrier}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Estimated Cost</p>
                        <p className="font-semibold text-foreground">
                          {decision.estimatedCost > 0 ? `${decision.estimatedCost} ${decision.currency}` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Transit Time</p>
                        <p className="font-semibold text-foreground">
                          {decision.transitDays > 0 ? `${decision.transitDays} Days` : 'Unknown'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">DMN Status</p>
                        <p className={`font-semibold ${decision.routeMatched ? 'text-green-600' : 'text-amber-600'}`}>
                          {decision.routeMatched ? 'Rule Matched' : 'Fallback / No Match'}
                        </p>
                      </div>
                    </div>
                    
                    {decision.costBreakdown && decision.costBreakdown.length > 0 && (
                      <div className="space-y-3 mt-6">
                        <h4 className="text-sm font-medium text-foreground border-b pb-2">Cost Breakdown</h4>
                        <div className="space-y-2">
                          {decision.costBreakdown.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">{item.description}</span>
                              <span className="font-medium">${item.amount.toFixed(2)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between items-center pt-2 border-t font-semibold">
                            <span>Total Estimated Cost</span>
                            <span>${decision.estimatedCost.toFixed(2)} {decision.currency}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {alternatives.length > 0 && (
                      <div className="space-y-3 mt-4">
                        <h4 className="text-sm font-medium text-foreground">Suggested Alternatives</h4>
                        <div className="space-y-2">
                          {alternatives.map((alt, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 border rounded-md bg-card hover:bg-background transition-colors">
                              <div className="flex flex-col">
                                <span className="font-medium text-sm flex items-center gap-2">
                                  {alt.serviceType} <ArrowRight className="w-3 h-3 text-muted-foreground" /> {alt.recommendedCarrier}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {alt.transitDays} Days Transit Time
                                </span>
                              </div>
                              <div className="text-right flex flex-col">
                                <span className="font-semibold text-sm">
                                  ${alt.estimatedCost}
                                </span>
                                {alt.transitDays < decision.transitDays && (
                                   <Badge className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100/80 border-none mt-1 h-4">
                                     Saves {decision.transitDays - alt.transitDays} days
                                   </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {historicalData.length > 0 && (
                      <div className="space-y-3 mt-6 pt-4 border-t">
                        <h4 className="text-sm font-medium text-foreground">Cost Fluctuation (6 Months)</h4>
                        <div className="h-[200px] w-full mt-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={historicalData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(val) => `$${val}`} />
                              <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: number) => [`$${value}`, undefined]}
                              />
                              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                              <Line type="monotone" name="Estimated Cost" dataKey="cost" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                              <Line type="monotone" name="Market Average" dataKey="marketAverage" stroke="#9ca3af" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="mt-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Side-by-Side Comparison</CardTitle>
              <CardDescription>Evaluate up to three different shipment scenarios simultaneously.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {scenarios.map((scenario, idx) => (
                  <div key={scenario.id} className="space-y-4 border rounded-md p-4">
                    <h3 className="font-semibold text-lg border-b pb-2">Scenario {idx + 1}</h3>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Origin</Label>
                        <Input value={scenario.origin} onChange={(e) => updateScenario(idx, 'origin', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Destination</Label>
                        <Input value={scenario.destination} onChange={(e) => updateScenario(idx, 'destination', e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Weight (kg)</Label>
                          <Input type="number" value={scenario.weight} onChange={(e) => updateScenario(idx, 'weight', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Volume (CBM)</Label>
                          <Input type="number" value={scenario.volume} onChange={(e) => updateScenario(idx, 'volume', e.target.value)} step="0.1" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Mode</Label>
                        <select 
                          className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
                          value={scenario.serviceType} 
                          onChange={(e) => updateScenario(idx, 'serviceType', e.target.value)}
                        >
                          <option value="Sea-FCL">Sea-FCL</option>
                          <option value="Sea-FCL 20' DV">Sea-FCL 20' DV</option>
                          <option value="Sea-FCL 40' DV">Sea-FCL 40' DV</option>
                          <option value="Sea-FCL 40' HC">Sea-FCL 40' HC</option>
                          <option value="Sea-LCL">Sea-LCL</option>
                          <option value="Air">Air</option>
                          <option value="Road">Road</option>
                        </select>
                      </div>
                    </div>
                    
                    {comparisonResults[idx] && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground block text-xs">Carrier</span>
                            <span className="font-medium">{comparisonResults[idx].recommendedCarrier}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-xs">Transit</span>
                            <span className="font-medium">{comparisonResults[idx].transitDays > 0 ? `${comparisonResults[idx].transitDays} Days` : 'Unknown'}</span>
                          </div>
                        </div>
                        <div className="bg-muted p-2 rounded text-center">
                          <span className="text-xs text-muted-foreground block">Estimated Cost</span>
                          <span className="font-bold text-lg">
                            ${comparisonResults[idx].estimatedCost.toFixed(2)} {comparisonResults[idx].currency}
                          </span>
                        </div>
                        
                        {comparisonResults[idx].costBreakdown && comparisonResults[idx].costBreakdown.length > 0 && (
                          <div className="space-y-1 mt-2">
                            <span className="text-xs font-semibold text-muted-foreground">Breakdown</span>
                            {comparisonResults[idx].costBreakdown.map((item: any, i: number) => (
                              <div key={i} className="flex justify-between text-xs">
                                <span className="text-muted-foreground truncate mr-2" title={item.description}>{item.description}</span>
                                <span>${item.amount.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="bg-muted/50 p-2 rounded text-center mt-3 border">
                          <span className="text-xs text-muted-foreground block">Est. CO2 Emissions</span>
                          <span className="font-semibold text-sm text-green-700 dark:text-green-400">
                            {getCarbonEmission(scenarios[idx].serviceType, parseFloat(scenarios[idx].weight))} kg CO2
                          </span>
                        </div>

                        {/* Transit Time Predictor */}
                        <div className="bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-lg mt-3 border border-blue-100 dark:border-blue-900/30 space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Transit Time Predictor</span>
                          </div>
                          
                          {(() => {
                            const pred = predictTransitTime(scenarios[idx].serviceType, scenarios[idx].origin, scenarios[idx].destination);
                            return (
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-baseline">
                                  <span className="text-xs text-muted-foreground">Est. Window</span>
                                  <span className="text-sm font-semibold text-foreground">
                                    {pred.minArrival} - {pred.maxArrival}
                                  </span>
                                </div>
                                <div className="flex justify-between text-[11px] text-muted-foreground">
                                  <span>{pred.minDays}-{pred.maxDays} days duration</span>
                                  <span className="text-blue-600 dark:text-blue-400 font-medium">{pred.confidence}% confidence interval</span>
                                </div>
                                <div className="relative pt-1">
                                  <div className="flex mb-1 items-center justify-between">
                                    <div className="w-full bg-blue-100 dark:bg-blue-900/40 h-1.5 rounded-full relative">
                                      {/* Confidence Interval range bar */}
                                      <div 
                                        className="absolute h-1.5 bg-blue-600 dark:bg-blue-500 rounded-full"
                                        style={{ left: '20%', right: '20%' }}
                                      />
                                      {/* Indicator bullet */}
                                      <div 
                                        className="absolute w-2.5 h-2.5 bg-blue-800 dark:bg-blue-300 rounded-full border border-white dark:border-slate-900 -top-0.5"
                                        style={{ left: '50%', transform: 'translateX(-50%)' }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        <div className="space-y-3 mt-4 border-t pt-3">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-sm text-foreground">Carrier Ranking</span>
                            <Badge variant="outline" className={getCarrierRanking(comparisonResults[idx].recommendedCarrier).rankColor + " font-bold px-2 py-0"}>
                              Tier {getCarrierRanking(comparisonResults[idx].recommendedCarrier).rank}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Overall Reliability</span>
                                <span className="font-medium text-foreground">{getCarrierRanking(comparisonResults[idx].recommendedCarrier).score}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-in-out" 
                                  style={{ width: `${getCarrierRanking(comparisonResults[idx].recommendedCarrier).score}%` }} 
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Punctuality</span>
                                <span className="font-medium text-foreground">{getCarrierRanking(comparisonResults[idx].recommendedCarrier).punctuality}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-in-out" 
                                  style={{ width: `${getCarrierRanking(comparisonResults[idx].recommendedCarrier).punctuality}%` }} 
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Cost-Efficiency</span>
                                <span className="font-medium text-foreground">{getCarrierRanking(comparisonResults[idx].recommendedCarrier).costEfficiency}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-purple-500 rounded-full transition-all duration-500 ease-in-out" 
                                  style={{ width: `${getCarrierRanking(comparisonResults[idx].recommendedCarrier).costEfficiency}%` }} 
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="pt-2 text-center">
                          <Badge variant="outline" className={comparisonResults[idx].routeMatched ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                            {comparisonResults[idx].routeMatched ? 'Rule Matched' : 'Fallback / No Match'}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <Button onClick={evaluateComparison} disabled={evaluatingComparison}>
                  {evaluatingComparison ? 'Evaluating...' : <><Zap className="w-4 h-4 mr-2" /> Evaluate Scenarios</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Rate Approvals</CardTitle>
              <CardDescription>Review and approve proposed rates before they become active.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Origin</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rates.length === 0 && !loadingRates ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No rates found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rates.map((rate: any) => (
                      <TableRow key={rate.id}>
                        <TableCell className="font-medium">{rate.origin}</TableCell>
                        <TableCell className="font-medium">{rate.destination}</TableCell>
                        <TableCell>{rate.serviceType}</TableCell>
                        <TableCell>{rate.amount} {rate.currency}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={
                              rate.status === 'Approved' ? 'bg-green-100 text-green-700 border-green-200' :
                              rate.status === 'Rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                              'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200'
                            }
                          >
                            {rate.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {rate.status === 'Proposed' && (
                            <div className="flex justify-end gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                                onClick={() => handleRateStatusChange(rate.id, 'Approved')}
                                disabled={!isApprover}
                              >
                                <Check className="w-4 h-4 mr-1" /> Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                onClick={() => handleRateStatusChange(rate.id, 'Rejected')}
                                disabled={!isApprover}
                              >
                                <X className="w-4 h-4 mr-1" /> Reject
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="carbon" className="space-y-6 mt-0">
          <CarbonCalculatorWidget />
        </TabsContent>

        <TabsContent value="negotiator" className="space-y-6 mt-0">
          <NegotiationSimulatorWidget />
        </TabsContent>

        <TabsContent value="bourse" className="space-y-6 mt-0">
          <SpotBourse />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Quarterly Carrier Bid & Contract Smart Negotiation Simulator Widget
function NegotiationSimulatorWidget() {
  const [lane, setLane] = useState('Shanghai-Rotterdam');
  const [volume, setVolume] = useState(2500);
  const [stance, setStance] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');
  const [simulated, setSimulated] = useState(true);
  const [volumeTrend, setVolumeTrend] = useState<'normal' | 'peak_surge' | 'slack_season'>('normal');
  const [marketIndexLevel, setMarketIndexLevel] = useState<'stable' | 'soaring' | 'dipping'>('stable');

  // Historic and Spot Rates configuration per trade lane
  const LANE_PROFILES: Record<string, { name: string, spotRate: number, benchmarkContract: number }> = {
    'Shanghai-Rotterdam': { name: "Shanghai (CNSHA) → Rotterdam (NLRTM)", spotRate: 3550, benchmarkContract: 3100 },
    'Shenzhen-Barcelona': { name: "Shenzhen (CNSZX) → Barcelona (ESBCN)", spotRate: 3250, benchmarkContract: 2850 },
    'Miami-Hamburg': { name: "Miami (USMIA) → Hamburg (DEHAM)", spotRate: 2450, benchmarkContract: 2100 }
  };

  const profile = LANE_PROFILES[lane] || LANE_PROFILES['Shanghai-Rotterdam'];

  // Calculations based on Stance and Volume
  const getSimResults = () => {
    let multiplier = 1.0;
    let riskScore = 30;
    let spotAlloc = 10;
    
    if (stance === 'conservative') {
      multiplier = 0.95; // modest discount, very high contract commitment
      riskScore = 15;
      spotAlloc = 5;
    } else if (stance === 'balanced') {
      multiplier = 0.91; // decent discount, optimal risk split
      riskScore = 45;
      spotAlloc = 15;
    } else {
      multiplier = 0.85; // aggressive price target, high spot reliance
      riskScore = 80;
      spotAlloc = 30;
    }

    // Apply Ocean Market Index impact (e.g. SCFI, Drewry Container Index)
    let spotMult = 1.0;
    let contractMult = 1.0;
    if (marketIndexLevel === 'soaring') {
      spotMult = 1.45;
      contractMult = 1.20;
      riskScore = Math.min(100, riskScore + 15);
    } else if (marketIndexLevel === 'dipping') {
      spotMult = 0.70;
      contractMult = 0.85;
      riskScore = Math.max(10, riskScore - 10);
    }

    // Apply Seasonal Volume Peak impact
    let peakVolMult = 1.0;
    if (volumeTrend === 'peak_surge') {
      peakVolMult = 1.25;
      riskScore = Math.min(100, riskScore + 10);
    } else if (volumeTrend === 'slack_season') {
      peakVolMult = 0.80;
    }

    const liveSpotRate = Math.round(profile.spotRate * spotMult);
    const liveBenchmarkContract = Math.round(profile.benchmarkContract * contractMult);
    const targetContractRate = Math.round(liveBenchmarkContract * multiplier);
    const contractAlloc = 100 - spotAlloc;

    const adjustedVolume = Math.round(volume * peakVolMult);

    const carrierShares = [
      {
        carrier: "Maersk Line",
        share: Math.round(contractAlloc * 0.45),
        targetRate: targetContractRate + 50,
        reliability: "96% - Tier 1",
        rankClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border-emerald-100"
      },
      {
        carrier: "COSCO Shipping",
        share: Math.round(contractAlloc * 0.35),
        targetRate: targetContractRate - 50,
        reliability: "89% - Tier 2",
        rankClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border-blue-100"
      },
      {
        carrier: "OOCL Ocean",
        share: Math.round(contractAlloc * 0.20),
        targetRate: targetContractRate,
        reliability: "94% - Tier 1",
        rankClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border-emerald-100"
      }
    ];

    // Savings compared to benchmark contract rate
    const totalBenchmarkCost = adjustedVolume * liveBenchmarkContract;
    const totalProposedCost = (adjustedVolume * (contractAlloc / 100) * targetContractRate) + (adjustedVolume * (spotAlloc / 100) * liveSpotRate);
    const totalSavings = Math.max(0, totalBenchmarkCost - totalProposedCost);

    const chartData = [
      { name: 'Live Spot', rate: liveSpotRate, fill: '#ef4444' },
      { name: 'Live Contract', rate: liveBenchmarkContract, fill: '#f59e0b' },
      { name: 'Target Contract', rate: targetContractRate, fill: '#10b981' }
    ];

    return {
      targetContractRate,
      riskScore,
      spotAlloc,
      contractAlloc,
      carrierShares,
      totalSavings,
      chartData,
      adjustedVolume,
      liveSpotRate,
      liveBenchmarkContract
    };
  };

  const { targetContractRate, riskScore, spotAlloc, contractAlloc, carrierShares, totalSavings, chartData, adjustedVolume, liveSpotRate, liveBenchmarkContract } = getSimResults();

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Control Card */}
        <Card className="md:col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Carrier Negotiation Controls</CardTitle>
            <CardDescription>Configure contract bid criteria and volume allocation strategy.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs">Target Trade Lane Corridor</Label>
              <select
                className="w-full text-xs border rounded-lg p-2 bg-background border-zinc-200 dark:border-zinc-800 outline-none"
                value={lane}
                onChange={(e) => setLane(e.target.value)}
              >
                <option value="Shanghai-Rotterdam">Shanghai → Rotterdam (Ocean)</option>
                <option value="Shenzhen-Barcelona">Shenzhen → Barcelona (Ocean)</option>
                <option value="Miami-Hamburg">Miami → Hamburg (Ocean)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-xs">Annual Committed Volume (FEU)</Label>
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{volume} FEUs</span>
              </div>
              <input
                type="range"
                min="500"
                max="10000"
                step="250"
                value={volume}
                onChange={(e) => setVolume(parseInt(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between text-[9px] text-muted-foreground font-semibold">
                <span>500 FEUs</span>
                <span>5,000 FEUs</span>
                <span>10,000 FEUs</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Seasonal Peaks & Volume Surcharges</Label>
              <select
                className="w-full text-xs border rounded-lg p-2 bg-background border-zinc-200 dark:border-zinc-800 outline-none"
                value={volumeTrend}
                onChange={(e) => setVolumeTrend(e.target.value as any)}
              >
                <option value="normal">Normal Slack Season (1.00x Base volume)</option>
                <option value="peak_surge">Q3 Peak Season Surge (+25% Volume & +15% Cost)</option>
                <option value="slack_season">Q1 Low Slack (-20% Volume & -10% Cost)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">SCFI / Drewry Ocean Market Index</Label>
              <select
                className="w-full text-xs border rounded-lg p-2 bg-background border-zinc-200 dark:border-zinc-800 outline-none"
                value={marketIndexLevel}
                onChange={(e) => setMarketIndexLevel(e.target.value as any)}
              >
                <option value="stable">Stable Market Index (1.0x baseline rates)</option>
                <option value="soaring">Bull Market / Soaring Rates (+45% Spot / +20% Contract)</option>
                <option value="dipping">Bear Market / Dipping Rates (-30% Spot / -15% Contract)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs block mb-1.5">Negotiation Stance / Posture</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'conservative', label: 'Concur', desc: 'Capacity Safe' },
                  { value: 'balanced', label: 'Balanced', desc: 'Default SCM' },
                  { value: 'aggressive', label: 'Aggressive', desc: 'Price Squeeze' }
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setStance(item.value as any)}
                    className={`p-2 border rounded-xl flex flex-col items-center justify-center text-center transition-all ${
                      stance === item.value 
                        ? 'border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 font-semibold' 
                        : 'border-zinc-200 dark:border-zinc-800 text-muted-foreground hover:bg-zinc-50'
                    }`}
                  >
                    <span className="text-xs">{item.label}</span>
                    <span className="text-[8px] uppercase tracking-wider block opacity-75 mt-0.5">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button 
              className="w-full text-xs gap-1.5"
              onClick={() => {
                setSimulated(true);
                toast.success("Carrier bid negotiation simulation updated successfully.");
              }}
            >
              <Sparkles className="w-4 h-4" />
              Re-Calculate SCM Allocation
            </Button>
          </CardContent>
        </Card>

        {/* Right Simulation Dashboard */}
        {simulated && (
          <Card className="md:col-span-2 shadow-sm border border-indigo-100 dark:border-indigo-950/40">
            <CardHeader className="bg-indigo-50/10 pb-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-indigo-800 dark:text-indigo-400">Quarterly Bid Strategy Report</CardTitle>
                  <CardDescription>{profile.name} — Adjusted Season Capacity: <strong className="text-indigo-600 dark:text-indigo-400">{adjustedVolume} FEUs</strong></CardDescription>
                </div>
                <Badge variant="outline" className="bg-indigo-100 dark:bg-indigo-950/30 border-indigo-200 text-indigo-800 dark:text-indigo-300 text-[9px] uppercase font-bold">
                  Bidding Model Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              <div className="grid gap-4 md:grid-cols-2">
                {/* Proposed vs Benchmark rate comparison */}
                <div className="h-52 border rounded-xl p-4 bg-zinc-50/20">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-3">Freight Rate comparison ($ / FEU)</span>
                  <ResponsiveContainer width="100%" height="90%">
                    <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip formatter={(value) => [`$${value}`, 'FEU Rate']} />
                      <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* KPI metrics */}
                <div className="grid grid-rows-2 gap-3">
                  <div className="p-4 border rounded-xl bg-emerald-50/30 dark:bg-emerald-950/15 border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">Annual Pro-Forma Savings</span>
                      <strong className="text-2xl font-mono text-emerald-600 dark:text-emerald-400 block mt-1">${totalSavings.toLocaleString()}</strong>
                      <span className="text-[9px] text-muted-foreground block mt-0.5">compared to current contract average</span>
                    </div>
                    <div className="text-3xl">💰</div>
                  </div>

                  <div className="p-4 border rounded-xl bg-amber-50/30 dark:bg-amber-950/15 border-amber-100 dark:border-amber-900/30 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">Spot Exposure Risk Index</span>
                      <strong className="text-2xl font-mono text-amber-600 dark:text-amber-400 block mt-1">{riskScore} / 100</strong>
                      <div className="w-24 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full mt-1 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            riskScore > 70 ? 'bg-red-500' : riskScore > 40 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} 
                          style={{ width: `${riskScore}%` }} 
                        />
                      </div>
                    </div>
                    <div className="text-3xl">⚠️</div>
                  </div>
                </div>
              </div>

              {/* Carrier Recommended Allocation Splits */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  Suggested Capacity Allocation splits ({contractAlloc}% Contract / {spotAlloc}% Spot)
                </h4>

                <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                  {carrierShares.map((item, idx) => (
                    <div key={idx} className="p-3 border rounded-xl space-y-2 bg-background shadow-sm">
                      <div className="flex items-center justify-between">
                        <strong className="text-xs text-foreground font-semibold">{item.carrier}</strong>
                        <Badge variant="outline" className={`text-[8.5px] uppercase font-bold ${item.rankClass}`}>
                          {item.share}% Volume
                        </Badge>
                      </div>
                      
                      <div className="flex items-baseline gap-1 pt-1">
                        <span className="text-lg font-bold font-mono text-foreground">${item.targetRate}</span>
                        <span className="text-[9px] text-muted-foreground font-semibold font-medium">/ FEU target</span>
                      </div>

                      <div className="text-[10px] text-muted-foreground border-t pt-1.5 mt-1">
                        Service reliability: <strong className="text-foreground">{item.reliability}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Negotiating SCM playbook advice */}
              <div className="bg-indigo-50/30 dark:bg-indigo-950/15 border border-indigo-100 dark:border-indigo-900/30 rounded-xl p-4">
                <span className="text-xs font-bold text-indigo-800 dark:text-indigo-400 block mb-1.5 uppercase tracking-wide">
                  Strategic Bidding advisory & play-book:
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Based on a committed quarterly volume of <strong>{volume} FEUs</strong>, {stance === 'aggressive' ? (
                    <span>your <strong>aggressive posture</strong> triggers a bidding target range of <strong>${targetContractRate} - ${targetContractRate + 100}</strong>. Maersk is likely to decline this level unless you offer multi-trade lane reciprocity. We advise routing <strong>{spotAlloc}%</strong> to spot markets to maintain leverage, but warning operators of potential blanked-sailing delays on spot slots.</span>
                  ) : stance === 'conservative' ? (
                    <span>your <strong>capacity-safe posture</strong> ensures premium service priority. Target contract rates are locked at <strong>${targetContractRate}</strong> with a total volume guarantee. Spot reliance is minimized to <strong>5%</strong>. Reliability index is maximum, fully mitigating seasonal rollover risks during Peak Season.</span>
                  ) : (
                    <span>your <strong>balanced posture</strong> optimizes rate discount and space availability. Target contract level is <strong>${targetContractRate}</strong>. We recommend allocating <strong>45% to Maersk</strong> as the primary carrier, <strong>35% to COSCO</strong>, and maintaining a <strong>15% spot allocation</strong> buffer to capture spot rate drops.</span>
                  )}
                </p>
              </div>

            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Comprehensive Carbon Footprint & Greener Sourcing Calculator Widget
function CarbonCalculatorWidget() {
  const [origin, setOrigin] = useState('Shanghai');
  const [destination, setDestination] = useState('Rotterdam');
  const [weight, setWeight] = useState('5000'); // kg
  const [showResults, setShowResults] = useState(true);

  const CORRIDOR_DISTANCES: Record<string, Record<string, { Ocean: number, Air: number, Rail: number, Road: number }>> = {
    Shanghai: {
      Rotterdam: { Ocean: 19600, Air: 9200, Rail: 10800, Road: 11500 },
      Barcelona: { Ocean: 18200, Air: 9900, Rail: 11200, Road: 12000 },
      Hamburg: { Ocean: 20100, Air: 9000, Rail: 10400, Road: 11200 }
    },
    Shenzhen: {
      Rotterdam: { Ocean: 18500, Air: 8900, Rail: 10100, Road: 11000 },
      Barcelona: { Ocean: 17100, Air: 9600, Rail: 10500, Road: 11400 },
      Hamburg: { Ocean: 19000, Air: 8700, Rail: 9700, Road: 10200 }
    },
    Miami: {
      Rotterdam: { Ocean: 7600, Air: 7800, Rail: 8500, Road: 9200 },
      Barcelona: { Ocean: 7100, Air: 7300, Rail: 8000, Road: 8700 },
      Hamburg: { Ocean: 8100, Air: 7600, Rail: 8800, Road: 9500 }
    }
  };

  const EMISSION_FACTORS = {
    Air: 0.500,  // kg CO2 per ton-km
    Road: 0.105, // kg CO2 per ton-km
    Rail: 0.028, // kg CO2 per ton-km
    Ocean: 0.012 // kg CO2 per ton-km
  };

  const weightNum = parseFloat(weight) || 0;
  const corridors = CORRIDOR_DISTANCES[origin] || CORRIDOR_DISTANCES['Shanghai'];
  const distances = corridors[destination] || corridors['Rotterdam'];

  // Calculate CO2 in Metric Tons
  const calcCO2 = (mode: keyof typeof EMISSION_FACTORS, dist: number) => {
    const factor = EMISSION_FACTORS[mode];
    // (weight in tons) * distance (km) * factor (kg CO2 / ton-km) / 1000 to convert kg to Metric Tons
    return parseFloat(((weightNum / 1000) * dist * factor / 1000).toFixed(3));
  };

  const results = [
    {
      mode: 'Air Freight',
      co2: calcCO2('Air', distances.Air),
      time: '3-4 Days',
      rating: 'Extreme Footprint',
      color: '#ef4444',
      bgClass: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'
    },
    {
      mode: 'Road Freight',
      co2: calcCO2('Road', distances.Road),
      time: '12-14 Days',
      rating: 'High Impact',
      color: '#f59e0b',
      bgClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
    },
    {
      mode: 'Rail Freight',
      co2: calcCO2('Rail', distances.Rail),
      time: '16-18 Days',
      rating: 'Eco-Efficient',
      color: '#3b82f6',
      bgClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300'
    },
    {
      mode: 'Ocean Freight',
      co2: calcCO2('Ocean', distances.Ocean),
      time: '28-32 Days',
      rating: 'Ultra-Sustainable',
      color: '#10b981',
      bgClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
    }
  ];

  // Savings calculation comparing Air vs Ocean
  const airCO2 = calcCO2('Air', distances.Air);
  const oceanCO2 = calcCO2('Ocean', distances.Ocean);
  const totalSavedTons = Math.max(0, airCO2 - oceanCO2);
  
  // Trees equivalent: 1 tree absorbs ~22kg of CO2 per year = 0.022 Metric Tons
  const treesEquivalent = Math.round(totalSavedTons / 0.022);
  // Cars equivalent: 1 passenger vehicle emits ~4.6 tons CO2 per year
  const carsEquivalent = parseFloat((totalSavedTons / 4.6).toFixed(1));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Input Configuration Card */}
        <Card className="md:col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Corridor Sourcing Parameters</CardTitle>
            <CardDescription>Configure transit parameters to assess real-time carbon outputs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Origin Port / City</Label>
              <select
                className="w-full text-xs border rounded-lg p-2 bg-background border-zinc-200 dark:border-zinc-800 outline-none"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
              >
                <option value="Shanghai">Shanghai (CNSHA)</option>
                <option value="Shenzhen">Shenzhen (CNSZX)</option>
                <option value="Miami">Miami (USMIA)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Destination Port / City</Label>
              <select
                className="w-full text-xs border rounded-lg p-2 bg-background border-zinc-200 dark:border-zinc-800 outline-none"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              >
                <option value="Rotterdam">Rotterdam (NLRTM)</option>
                <option value="Barcelona">Barcelona (ESBCN)</option>
                <option value="Hamburg">Hamburg (DEHAM)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Total Consignment Weight (kg)</Label>
              <Input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g. 5000"
                className="text-xs"
              />
            </div>

            <Button 
              className="w-full text-xs" 
              onClick={() => setShowResults(true)}
            >
              Analyze Sourcing Eco-Impact
            </Button>
          </CardContent>
        </Card>

        {/* Right Dynamic Carbon Sourcing Dash */}
        {showResults && (
          <Card className="md:col-span-2 shadow-sm border border-emerald-100 dark:border-emerald-950/40">
            <CardHeader className="bg-emerald-50/20 pb-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-emerald-800 dark:text-emerald-400">Carbon Corridor Modeling</CardTitle>
                  <CardDescription>Real-time emissions audit for transit corridor: {origin} → {destination}</CardDescription>
                </div>
                <Badge variant="outline" className="bg-emerald-100 dark:bg-emerald-950 border-emerald-200 text-emerald-800 dark:text-emerald-300 uppercase text-[9px] font-bold">
                  Sustainably Audited
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              {/* Recharts Bar Chart Visualizer */}
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={results} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="mode" tick={{ fontSize: 10 }} />
                    <YAxis label={{ value: 't CO₂e (Tons)', angle: -90, position: 'insideLeft', offset: 0, fontSize: 10 }} tick={{ fontSize: 10 }} />
                    <Tooltip cursor={{ fill: 'transparent' }} formatter={(value) => [`${value} Tons CO₂e`, 'Emissions']} />
                    <Bar dataKey="co2" radius={[4, 4, 0, 0]}>
                      {results.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Grid detail of modes */}
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {results.map((r, idx) => (
                  <div key={idx} className="p-3 border rounded-xl space-y-2 bg-card">
                    <span className="text-xs font-semibold text-foreground block">{r.mode}</span>
                    <div className="flex items-baseline gap-1">
                      <strong className="text-xl font-bold text-foreground font-mono">{r.co2}</strong>
                      <span className="text-[10px] text-muted-foreground font-medium">t CO₂e</span>
                    </div>
                    <Badge variant="outline" className={`text-[8.5px] uppercase font-semibold ${r.bgClass}`}>
                      {r.rating}
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Environmental Offset Equivalency Cards */}
              <div className="bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-4">
                <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  Green Sourcing Offset Impact
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  By routing your <strong className="text-foreground">{weight} kg</strong> cargo from {origin} to {destination} via <strong className="text-emerald-600 dark:text-emerald-400">Ocean Freight</strong> instead of Air Freight, you offset <strong className="font-mono text-emerald-700 dark:text-emerald-400">{totalSavedTons.toFixed(2)} tons of carbon</strong>.
                </p>

                <div className="grid gap-4 grid-cols-2">
                  <div className="p-3 border rounded-xl bg-background flex items-center gap-3">
                    <div className="text-2xl">🌳</div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-medium">Annual Tree Absorption Equivalent</span>
                      <strong className="text-lg font-bold text-foreground font-mono">{treesEquivalent}</strong>
                      <span className="text-xs text-muted-foreground ml-1">mature trees</span>
                    </div>
                  </div>

                  <div className="p-3 border rounded-xl bg-background flex items-center gap-3">
                    <div className="text-2xl">🚗</div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-medium">Cars Removed From Road</span>
                      <strong className="text-lg font-bold text-foreground font-mono">{carsEquivalent}</strong>
                      <span className="text-xs text-muted-foreground ml-1">vehicles / year</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 bg-background p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/30 text-[11px] text-muted-foreground">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 block mb-1">Sustainable Routing Sourcing Recommendation:</span>
                  To achieve net-zero targets, we recommend shifting at least <strong>45%</strong> of non-critical replenishment lanes to ocean-rail combinations. For time-sensitive cargo, prefer rail corridors through Central Asia which generate up to <strong>94% fewer emissions</strong> than transcontinental air freight.
                </div>
              </div>

            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
