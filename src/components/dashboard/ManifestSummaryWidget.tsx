import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/data-display/card';
import { Badge } from '@/components/ui/data-display/badge';
import { Button } from '@/components/ui/forms/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/forms/select';
import { useAuth } from '../../contexts/AuthContext';
import { fetchApi } from '../../lib/api';
import { 
  BrainCircuit, 
  Sparkles, 
  Copy, 
  Check, 
  Loader2, 
  Ship, 
  FileText, 
  AlertTriangle, 
  Globe, 
  RefreshCw,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import Markdown from 'react-markdown';

interface ManifestSummaryWidgetProps {
  shipments: any[];
}

export function ManifestSummaryWidget({ shipments }: ManifestSummaryWidgetProps) {
  const { token } = useAuth();
  const [summaryMode, setSummaryMode] = useState<'global' | 'shipment'>('global');
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>('all');
  const [summary, setSummary] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [loadingText, setLoadingText] = useState<string>('Processing...');

  // Fun operational loading states to keep user entertained and reflect depth of analysis
  const loadingMessages = [
    'Verifying shipment manifests from cloud databases...',
    'Consulting Gemini intelligence engine...',
    'Ingesting Commercial Invoices and Bills of Lading...',
    'Reviewing weight and cargo declaration volumes...',
    'Analyzing customs clearance bottleneck patterns...',
    'Structuring executive SCM bulleted report...'
  ];

  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      let idx = 0;
      interval = setInterval(() => {
        idx = (idx + 1) % loadingMessages.length;
        setLoadingText(loadingMessages[idx]);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Load shipments automatically if "shipment" mode is selected but none chosen
  useEffect(() => {
    if (summaryMode === 'shipment' && selectedShipmentId === 'all' && shipments.length > 0) {
      // Find first non-delivered if possible, otherwise first
      const active = shipments.find(s => s.status !== 'Delivered');
      if (active) {
        setSelectedShipmentId(active.id);
      } else {
        setSelectedShipmentId(shipments[0].id);
      }
    }
  }, [summaryMode, shipments]);

  const handleGenerateSummary = async () => {
    if (!token) {
      toast.error('Session expired. Please log in again.');
      return;
    }

    setIsGenerating(true);
    setLoadingText(loadingMessages[0]);
    setSummary('');

    try {
      const payload: any = {
        shipments: shipments
      };

      if (summaryMode === 'shipment' && selectedShipmentId !== 'all') {
        payload.shipmentId = selectedShipmentId;
      }

      const response = await fetch('/api/gemini/manifests-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok && data.summary) {
        setSummary(data.summary);
        toast.success(
          summaryMode === 'global' 
            ? 'Executive fleet manifest bulletin generated!' 
            : 'Shipment manifest summary compiled successfully!'
        );
      } else {
        toast.error(data.error || 'Failed to generate status update bulletin.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Network connection timeout. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    toast.success('Manifest bulletin copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter shipments for select box options (omit delivered if wanted, but keep all for maximum visibility)
  const activeShipmentsList = shipments.filter(s => s.status !== 'Draft');

  const selectedShipmentDetails = shipments.find(s => s.id === selectedShipmentId);

  return (
    <Card className="h-full border border-zinc-200/80 dark:border-zinc-800 bg-background hover:shadow-md transition-all duration-300 flex flex-col justify-between">
      <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
              <BrainCircuit className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
                AI Manifest Summary Generator
              </CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider mt-0.5">
                Gemini Logistics Intelligence
              </CardDescription>
            </div>
          </div>
          <Badge className="bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-none shadow-sm select-none">
            Gemini-3.5-Flash
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-4">
        {/* Toggle Controls */}
        <div className="space-y-3 shrink-0">
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl text-xs">
            <button
              type="button"
              onClick={() => {
                setSummaryMode('global');
                setSummary('');
              }}
              className={`py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                summaryMode === 'global'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              Global Bulletin
            </button>
            <button
              type="button"
              onClick={() => {
                setSummaryMode('shipment');
                setSummary('');
              }}
              className={`py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                summaryMode === 'shipment'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Ship className="w-3.5 h-3.5" />
              By Shipment
            </button>
          </div>

          {/* Shipment Selector Dropdown */}
          {summaryMode === 'shipment' && (
            <div className="space-y-1.5 animate-fade-in">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Select SCM Record to Summarize
              </label>
              <Select value={selectedShipmentId} onValueChange={(val) => {
                setSelectedShipmentId(val);
                setSummary('');
              }}>
                <SelectTrigger className="w-full h-9 text-xs">
                  <SelectValue placeholder="Select active shipment..." />
                </SelectTrigger>
                <SelectContent>
                  {activeShipmentsList.length === 0 ? (
                    <SelectItem value="none" disabled>No active shipments in log</SelectItem>
                  ) : (
                    activeShipmentsList.map(s => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">
                        {s.referenceNumber || s.id.slice(0,8)} ({s.originPort} → {s.destinationPort})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedShipmentDetails && (
                <div className="p-2 bg-muted/40 rounded-lg border border-border/40 text-[10px] text-muted-foreground flex items-center justify-between">
                  <span className="font-mono">Carrier: <strong className="text-foreground">{selectedShipmentDetails.carrierName || 'TBA'}</strong></span>
                  <span className="font-mono">Status: <strong className="text-foreground">{selectedShipmentDetails.status}</strong></span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Button & Output Slate */}
        <div className="flex-1 flex flex-col justify-between min-h-[180px] space-y-3">
          {summary ? (
            <div className="flex-1 p-3 bg-indigo-50/5 dark:bg-zinc-900/10 border border-indigo-200/40 dark:border-zinc-800/80 rounded-xl flex flex-col justify-between max-h-[300px] overflow-y-auto">
              <div className="markdown-body prose dark:prose-invert text-xs leading-relaxed space-y-1 select-text">
                <Markdown>{summary}</Markdown>
              </div>
              <div className="flex justify-end gap-2 pt-2 mt-2 border-t border-indigo-100/30 dark:border-zinc-800/30 shrink-0">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleCopyToClipboard}
                  className="h-7 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copy Summary
                    </>
                  )}
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={handleGenerateSummary}
                  className="h-7 text-[10px] font-semibold flex items-center gap-1 cursor-pointer hover:bg-muted"
                >
                  <RefreshCw className="w-3 h-3" /> Re-scan
                </Button>
              </div>
            </div>
          ) : isGenerating ? (
            <div className="flex-1 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div className="p-3 bg-indigo-500/10 rounded-full text-indigo-500 animate-spin">
                <Loader2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-foreground">Generating status briefing...</p>
                <p className="text-[10px] text-muted-foreground animate-pulse max-w-[240px] font-sans">
                  {loadingText}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col items-center justify-center p-6 text-center text-muted-foreground space-y-2">
              <div className="p-2.5 bg-muted rounded-full">
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">No Briefing Generated</p>
                <p className="text-[10px] leading-relaxed max-w-[240px] mt-1">
                  {summaryMode === 'global' 
                    ? 'Scan and compile the entire active fleet status and manifest metrics into an actionable brief.' 
                    : 'Analyze all cargo manifests, bills of lading, and custom reports for the selected shipment.'}
                </p>
              </div>
            </div>
          )}

          {!isGenerating && !summary && (
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 text-xs rounded-xl cursor-pointer shrink-0 transition-colors"
              onClick={handleGenerateSummary}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-400 animate-pulse" />
              {summaryMode === 'global' ? 'Generate Fleet Manifest Bulletin' : 'Analyze Shipment Manifest'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
