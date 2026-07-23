import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/data-display/card';
import { Button } from '@/components/ui/forms/button';
import { Badge } from '@/components/ui/data-display/badge';
import { useAuth } from '../../contexts/AuthContext';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import { 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Layers, 
  Users, 
  MapPin, 
  Package, 
  Ship, 
  TrendingUp, 
  FileText, 
  DollarSign, 
  ShieldCheck, 
  ClipboardList, 
  Bell, 
  Activity 
} from 'lucide-react';

export function DatabaseSeederTab() {
  const { token } = useAuth();
  const [seeding, setSeeding] = useState(false);
  const [seededData, setSeededData] = useState<any | null>(null);

  const handleSeed = async () => {
    setSeeding(true);
    setSeededData(null);
    const promise = new Promise(async (resolve, reject) => {
      try {
        const response = await fetchApi('/db/reseed', token as string, {
          method: 'POST',
        });
        
        if (response.success) {
          setSeededData(response.counts);
          resolve(response);
        } else {
          reject(new Error(response.message || 'Seeding failed'));
        }
      } catch (error: any) {
        reject(error);
      } finally {
        setSeeding(false);
      }
    });

    toast.promise(promise, {
      loading: 'Resetting SCM database and generating high-fidelity logistics datasets...',
      success: 'Database seeded successfully with 450+ freight forwarding records!',
      error: (err) => `Seeding failed: ${err.message || 'Server error'}`
    });
  };

  const getTableIcon = (tableName: string) => {
    switch (tableName) {
      case 'parties': return <Users className="w-4 h-4 text-emerald-500" />;
      case 'contacts': return <Users className="w-4 h-4 text-cyan-500 font-normal" />;
      case 'blFormats': return <FileText className="w-4 h-4 text-violet-500" />;
      case 'warehouses': return <MapPin className="w-4 h-4 text-amber-500" />;
      case 'inventory': return <Package className="w-4 h-4 text-indigo-500" />;
      case 'rates': return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'shipments': return <Ship className="w-4 h-4 text-sky-500" />;
      case 'events': return <Activity className="w-4 h-4 text-red-500" />;
      case 'invoices': return <DollarSign className="w-4 h-4 text-teal-500" />;
      case 'payments': return <DollarSign className="w-4 h-4 text-emerald-600" />;
      case 'folders': return <Layers className="w-4 h-4 text-zinc-500" />;
      case 'templates': return <FileText className="w-4 h-4 text-slate-500" />;
      case 'documents': return <FileText className="w-4 h-4 text-orange-500" />;
      case 'customs': return <ShieldCheck className="w-4 h-4 text-rose-500" />;
      case 'compliance': return <ShieldCheck className="w-4 h-4 text-violet-600" />;
      case 'activityLogs': return <ClipboardList className="w-4 h-4 text-teal-600" />;
      case 'auditLogs': return <ClipboardList className="w-4 h-4 text-zinc-600" />;
      case 'notifications': return <Bell className="w-4 h-4 text-amber-600" />;
      default: return <Database className="w-4 h-4 text-zinc-400" />;
    }
  };

  const formatTableName = (tableName: string) => {
    const formatted = tableName.replace(/([A-Z])/g, ' $1');
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  return (
    <div className="space-y-6" id="scm-db-seeder">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Info Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-zinc-200">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-zinc-900">Freight Forwarder SCM Data Engine</CardTitle>
                  <CardDescription className="text-sm text-zinc-500">
                    Instantly provision complete, high-fidelity mock datasets for development, demonstrations, and QA audits.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-zinc-600 text-sm leading-relaxed">
                Our seeding engine wipes existing transactional logs and constructs a fully connected supply chain environment modeling a global logistics organization. Over <strong>450+ records</strong> across <strong>21 modules</strong> are linked with correct relational references, realistic time series around <strong>Q2 and Q3 of 2026</strong>, and mathematically sound cost structures.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-zinc-50 border border-zinc-100 rounded-lg space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Dynamic Relationships</span>
                  <p className="text-xs text-zinc-600 leading-normal">
                    Shippers, Consignees, and multi-modal Carriers (Maersk, DHL, LATAM Cargo) are linked to shipments, which generate timeline event histories, commercial billing records, and customs declarations.
                  </p>
                </div>
                <div className="p-3 bg-zinc-50 border border-zinc-100 rounded-lg space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Durable Auditing & Compliance</span>
                  <p className="text-xs text-zinc-600 leading-normal">
                    FIDO2 biometric-sealed compliance PDFs, OFAC screening summaries, and custom-tailored House Bills of Lading are generated to feed the Cryptographic Audit and Trade Compliance dashboards.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3.5 bg-amber-50/70 border border-amber-200/60 rounded-lg text-amber-800 text-xs leading-relaxed">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold text-amber-900">Important Administrative Advisory:</strong> Doing a full reset will clear all active shipments, invoices, rates, documents, and historical logs. However, to prevent logouts or configuration loss, <strong>all active system users and role credentials are backed up and seamlessly preserved</strong> during the seed operation.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Panel */}
        <div className="space-y-6">
          <Card className="shadow-sm border-zinc-200 h-full flex flex-col justify-between">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold text-zinc-900">Control Panel</CardTitle>
              <CardDescription className="text-xs">
                Trigger database reset and seed payload.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center space-y-4 pt-2">
              <div className="text-center space-y-2 py-4">
                <div className="inline-flex items-center justify-center p-3 bg-zinc-100 rounded-full text-zinc-500 mb-2">
                  <RefreshCw className={`w-8 h-8 ${seeding ? 'animate-spin text-indigo-600' : ''}`} />
                </div>
                <div className="text-sm font-semibold text-zinc-700">Seeding Engine Status</div>
                <div className="flex justify-center">
                  <Badge variant={seeding ? 'secondary' : seededData ? 'default' : 'outline'}>
                    {seeding ? 'Generating Payload...' : seededData ? 'Database Seeded' : 'Ready to Seed'}
                  </Badge>
                </div>
              </div>

              <Button 
                onClick={handleSeed} 
                disabled={seeding}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md transition-all h-10 flex items-center justify-center gap-2"
              >
                {seeding ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Resetting & Seeding...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    Seed Freight SCM Data
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Seeding Summary Grid */}
      {seededData && (
        <Card className="shadow-sm border-zinc-200 animate-fadeIn" id="scm-seed-results">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <CardTitle className="text-base font-bold text-zinc-900">Seeding Summary Ledger</CardTitle>
              </div>
              <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 text-white font-normal text-xs">
                Success
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Review the detailed record payload populated across the 21 database modules.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(seededData).map(([table, count]) => (
                <div key={table} className="p-3 bg-zinc-50 border border-zinc-100 rounded-lg flex items-center justify-between gap-2 shadow-sm hover:border-zinc-200 transition-all">
                  <div className="flex items-center gap-2 text-zinc-700">
                    <div className="p-1.5 bg-white border border-zinc-100 rounded-md shrink-0 shadow-xs">
                      {getTableIcon(table)}
                    </div>
                    <div className="text-xs font-medium leading-tight truncate max-w-[80px]">
                      {formatTableName(table)}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-zinc-900 pr-1">
                    {count as number}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2 leading-relaxed">
              <Info className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                All records successfully inserted. Standard indexes rebuilt. You can now explore the <strong>Control Tower</strong>, <strong>Billing & Invoices</strong>, <strong>Warehouse Inventory</strong>, <strong>Rates</strong>, and <strong>Trade Compliance</strong> modules to view the live high-fidelity data.
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
