import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { Button } from '@/components/ui/forms/button';
import { Input } from '@/components/ui/forms/input';
import { Label } from '@/components/ui/forms/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/forms/select';
import { UNLocodeSelector } from '../shared/UNLocodeSelector';
import { useAuth } from '../../contexts/AuthContext';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import { Map, Plus, Database } from 'lucide-react';

export function RouteDefinitionForm({ onSaved }: { onSaved?: () => void }) {
  const { token } = useAuth();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [mode, setMode] = useState('Sea');
  const [transitTime, setTransitTime] = useState('');
  
  const [carrierId, setCarrierId] = useState('');
  const [carriers, setCarriers] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Fetch carriers
    if (token) {
      fetchApi('/entities?type=Carrier', token).then(data => {
        setCarriers(data || []);
      }).catch(err => console.error(err));
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    if (!carrierId) {
      toast.error('Please select a Carrier.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create rate first
      const rate = await fetchApi('/rates', token, {
        method: 'POST',
        body: JSON.stringify({
          carrierId,
          origin,
          destination,
          mode,
          currency,
          amount: parseFloat(amount)
        })
      });

      // Create routing tied to this rate
      await fetchApi('/routings', token, {
        method: 'POST',
        body: JSON.stringify({
          rateId: rate.id,
          origin,
          destination,
          mode,
          transitTimeDays: parseFloat(transitTime)
        })
      });

      toast.success('Route and Rate created successfully');
      setOrigin('');
      setDestination('');
      setAmount('');
      setTransitTime('');
      if (onSaved) onSaved();
    } catch (err: any) {
      toast.error('Failed to create route: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-emerald-200 dark:border-emerald-900 shadow-sm">
      <CardHeader className="bg-emerald-50/50 dark:bg-emerald-950/20 pb-4 border-b">
        <CardTitle className="text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
          <Database className="w-4 h-4" /> 
          Route & Rate Definition
        </CardTitle>
        <CardDescription>
          Define a new transit lane and associate a carrier rate. The DMN engine will use these values.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Origin Port (UN/LOCODE)</Label>
              <UNLocodeSelector value={origin} onChange={setOrigin} placeholder="e.g. CNSHA" />
            </div>
            <div className="space-y-2">
              <Label>Destination Port (UN/LOCODE)</Label>
              <UNLocodeSelector value={destination} onChange={setDestination} placeholder="e.g. USLAX" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Transport Mode</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sea">Ocean Freight (Sea)</SelectItem>
                  <SelectItem value="Air">Air Freight</SelectItem>
                  <SelectItem value="Road">Road (Truck)</SelectItem>
                  <SelectItem value="Rail">Rail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estimated Transit Time (Days)</Label>
              <Input type="number" value={transitTime} onChange={e => setTransitTime(e.target.value)} required />
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-semibold mb-4">Rate Assignment</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Carrier</Label>
                <Select value={carrierId} onValueChange={setCarrierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Carrier" />
                  </SelectTrigger>
                  <SelectContent>
                    {carriers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                    {carriers.length === 0 && <SelectItem value="dummy" disabled>No carriers found</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Base Amount</Label>
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} required step="0.01" />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
              {isSubmitting ? 'Saving...' : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Save Route & Rate
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
