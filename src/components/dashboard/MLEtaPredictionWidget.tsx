import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/data-display/card';
import { Badge } from '@/components/ui/data-display/badge';
import { Button } from '@/components/ui/forms/button';
import { BrainCircuit, Clock, CheckCircle2, ChevronRight, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { fetchApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Skeleton } from '@/components/ui/feedback/skeleton';

export function MLEtaPredictionWidget({ shipments, onUpdateEta }: { shipments: any[], onUpdateEta: () => void }) {
  const { token } = useAuth();
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const activeShipments = shipments.filter(s => s.status === 'InTransit' || s.status === 'In Transit' || s.status === 'Delayed');
  const historicalShipments = shipments.filter(s => s.status === 'Delivered').slice(0, 50); // Get up to 50 delivered for historical context

  const runPrediction = async () => {
    if (!token || activeShipments.length === 0) return;
    
    setIsLoading(true);
    try {
      const data = await fetchApi('/gemini/predict-eta', token, {
        method: 'POST',
        body: JSON.stringify({
          activeShipments: activeShipments.slice(0, 10), // Limit to 10 active for the demo
          historicalShipments
        })
      });
      
      if (Array.isArray(data)) {
        setPredictions(data);
      }
    } catch (err) {
      console.error("Failed to fetch ML ETA predictions:", err);
      toast.error("Failed to generate ETA predictions.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only run prediction if we have shipments and no predictions yet
    if (shipments.length > 0 && predictions.length === 0 && !isLoading) {
      runPrediction();
    }
  }, [shipments.length]);

  const handleUpdateEta = async (prediction: any) => {
    if (!token) return;
    setIsUpdating(prediction.shipmentId);
    
    try {
      const res = await fetch(`/api/shipments/${prediction.shipmentId}/eta`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          eta: prediction.predictedEta,
          updatedBy: 'ML Prediction System'
        })
      });
      
      if (res.ok) {
        toast.success(`Updated ETA for ${prediction.referenceNumber}`);
        // Remove from list or mark as updated
        setPredictions(prev => prev.filter(p => p.shipmentId !== prediction.shipmentId));
        onUpdateEta();
      } else {
        toast.error("Failed to update ETA");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating ETA");
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <BrainCircuit className="w-5 h-5 text-indigo-500" /> ML ETA Predictions
            </CardTitle>
            <CardDescription>AI-driven arrival time estimates based on historical routes</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={runPrediction} disabled={isLoading || activeShipments.length === 0}>
            {isLoading ? 'Analyzing...' : 'Refresh Predictions'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="overflow-y-auto flex-1 pb-4 pt-0">
        {isLoading ? (
          <div className="space-y-3 mt-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-start gap-4 p-3 border rounded-lg">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : predictions.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground h-full flex flex-col items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="font-medium text-foreground text-sm">No predictions available</p>
            <p className="text-xs text-muted-foreground mt-1 px-4">There are currently no active shipments or enough historical data to generate predictions.</p>
          </div>
        ) : (
          <div className="space-y-3 mt-2">
            {predictions.map((pred, idx) => {
              const confidenceColor = pred.confidence > 0.8 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' : 
                                      pred.confidence > 0.6 ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' : 'text-red-600 bg-red-50 dark:bg-red-950/30';
                                      
              // Formatting dates nicely
              const currentEtaFormatted = pred.currentEta ? new Date(pred.currentEta).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Unknown';
              const predictedEtaFormatted = pred.predictedEta ? new Date(pred.predictedEta).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Unknown';
              
              // Check if predicted is later than current
              const isDelayExpected = pred.currentEta && pred.predictedEta && new Date(pred.predictedEta) > new Date(pred.currentEta);

              return (
                <div key={idx} className="flex flex-col md:flex-row items-start md:items-center p-4 rounded-lg border bg-card hover:shadow-sm transition-all gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground">{pred.referenceNumber}</span>
                      <Badge variant="secondary" className={`text-[10px] uppercase font-semibold ${confidenceColor}`}>
                        {Math.round((pred.confidence || 0) * 100)}% Confidence
                      </Badge>
                      {isDelayExpected && (
                        <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
                          <AlertTriangle className="w-3 h-3 mr-1" /> Expected Delay
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <div className="flex items-center gap-1 line-through opacity-70">
                        <Clock className="w-3 h-3" />
                        <span>Current: {currentEtaFormatted}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-primary" />
                      <div className="flex items-center gap-1 font-medium text-primary">
                        <Clock className="w-3 h-3" />
                        <span>Predicted: {predictedEtaFormatted}</span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {pred.reasoning}
                    </p>
                  </div>
                  
                  <div className="shrink-0 w-full md:w-auto mt-3 md:mt-0">
                    <Button 
                      size="sm" 
                      className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
                      disabled={isUpdating === pred.shipmentId}
                      onClick={() => handleUpdateEta(pred)}
                    >
                      {isUpdating === pred.shipmentId ? 'Updating...' : 'Accept Prediction'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
