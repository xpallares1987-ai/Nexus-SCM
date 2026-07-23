import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { Button } from '@/components/ui/forms/button';
import { Input } from '@/components/ui/forms/input';
import { Label } from '@/components/ui/forms/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/forms/select';
import { Calculator, DollarSign, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchApi } from '../../lib/api';

import { Skeleton } from '@/components/ui/feedback/skeleton';

export function CostEstimator() {
  const { token } = useAuth();
  const [rates, setRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [mode, setMode] = useState("Sea-FCL 20' DV");
  const [weight, setWeight] = useState('2000');
  const [quote, setQuote] = useState<number | null>(null);
  const [error, setError] = useState('');

  const [origins, setOrigins] = useState<string[]>([]);
  const [destinations, setDestinations] = useState<string[]>([]);

  useEffect(() => {
    async function loadRates() {
      if (!token) return;
      try {
        const data = await fetchApi('/rates', token);
        setRates(data || []);
        
        const uniqueOrigins = Array.from(new Set(data.map((r: any) => r.origin))) as string[];
        const uniqueDestinations = Array.from(new Set(data.map((r: any) => r.destination))) as string[];
        
        setOrigins(uniqueOrigins.sort());
        setDestinations(uniqueDestinations.sort());
        
        if (uniqueOrigins.length > 0) setOrigin(uniqueOrigins[0]);
        if (uniqueDestinations.length > 0) setDestination(uniqueDestinations[0]);
        
      } catch (err) {
        console.error("Failed to load rates for estimator", err);
      } finally {
        setLoading(false);
      }
    }
    loadRates();
  }, [token]);

  const handleCalculate = () => {
    setError('');
    setQuote(null);
    
    const matchedRates = rates.filter(r => 
      r.origin === origin && 
      r.destination === destination && 
      r.mode === mode
    );

    if (matchedRates.length === 0) {
      setError('No rate found for this route and container type.');
      return;
    }

    const bestRate = matchedRates.find(r => r.status === 'Approved') || matchedRates[0];
    
    const baseAmount = parseFloat(bestRate.amount);
    const weightNum = parseFloat(weight);
    
    if (isNaN(weightNum) || weightNum <= 0) {
      setError('Please enter a valid weight.');
      return;
    }

    let finalQuote = baseAmount;
    
    if (mode === 'Air') {
       finalQuote = baseAmount * (weightNum / 100);
    } else if (mode === 'Sea-LCL') {
       finalQuote = baseAmount * (weightNum / 1000);
    } else if (mode.includes('FCL')) {
       if (weightNum > 25000) {
         finalQuote += 500;
       }
    } else if (mode === 'Road') {
       finalQuote = baseAmount * (weightNum / 1000);
    }

    setQuote(finalQuote);
  };

  if (loading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-500" /> Freight Cost Estimator
        </CardTitle>
        <CardDescription>Get an instant quote based on current routing rates</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Origin Port</Label>
            <Select value={origin} onValueChange={setOrigin}>
              <SelectTrigger>
                <SelectValue placeholder="Select origin" />
              </SelectTrigger>
              <SelectContent>
                {origins.map(o => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Destination Port</Label>
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger>
                <SelectValue placeholder="Select destination" />
              </SelectTrigger>
              <SelectContent>
                {destinations.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Container Type / Mode</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger>
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Sea-FCL 20' DV">Sea-FCL 20' DV</SelectItem>
                <SelectItem value="Sea-FCL 40' DV">Sea-FCL 40' DV</SelectItem>
                <SelectItem value="Sea-FCL 40' HC">Sea-FCL 40' HC</SelectItem>
                <SelectItem value="Sea-LCL">Sea-LCL</SelectItem>
                <SelectItem value="Air">Air</SelectItem>
                <SelectItem value="Road">Road</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Total Weight (kg)</Label>
            <Input 
              type="number" 
              value={weight} 
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g. 2000"
            />
          </div>
        </div>

        <Button onClick={handleCalculate} className="w-full mt-4">
          <DollarSign className="w-4 h-4 mr-2" /> Calculate Quote
        </Button>

        {error && (
          <div className="mt-4 p-4 flex items-start gap-3 bg-red-50 text-red-600 rounded-md border border-red-200">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {quote !== null && (
          <div className="mt-6 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900 text-center">
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">Estimated Freight Cost</p>
            <div className="text-4xl font-bold text-blue-700 dark:text-blue-300">
              ${quote.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Based on historical/current rate data. Subject to change.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
