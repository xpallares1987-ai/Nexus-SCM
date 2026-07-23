import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { Button } from '@/components/ui/forms/button';
import { Badge } from '@/components/ui/data-display/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/data-display/table';
import { useAuth } from '../../contexts/AuthContext';
import { fetchApi } from '../../lib/api';
import { AlertTriangle, CheckCircle2, FileWarning, RefreshCw, Info } from 'lucide-react';
import { toast } from 'sonner';


export function ComplianceAuditTool() {
  const { token } = useAuth();
  const [shipments, setShipments] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [auditResults, setAuditResults] = useState<any[]>([]);

  const loadData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [shipData, docData] = await Promise.all([
        fetchApi('/shipments', token),
        fetchApi('/documents', token)
      ]);
      setShipments(shipData || []);
      setDocuments(docData || []);
      runAudit(shipData || [], docData || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load compliance data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const runAudit = (shipmentsData: any[], docsData: any[]) => {
    const results = shipmentsData.map(shipment => {
      const shipmentDocs = docsData.filter(d => d.shipmentId === shipment.id);
      
      const isInternational = shipment.originPort?.substring(0, 2) !== shipment.destinationPort?.substring(0, 2);
      const isSea = shipment.type.includes('Sea');
      const isAir = shipment.type.includes('Air');

      let requiredDocs = [];
      if (isInternational) {
        requiredDocs.push('Commercial Invoice', 'Packing List', 'Customs Declaration');
        if (isSea) requiredDocs.push('Bill of Lading');
        if (isAir) requiredDocs.push('Air Waybill');
      } else {
        requiredDocs.push('Waybill');
      }

      const foundDocs = shipmentDocs.map(d => d.documentType.toLowerCase());
      
      const missing = requiredDocs.filter(req => {
        const reqLower = req.toLowerCase();
        // Check exact or partial match
        return !foundDocs.some(f => f.includes(reqLower) || (reqLower === 'bill of lading' && f === 'bl') || (reqLower === 'air waybill' && f === 'awb'));
      });

      // Special signature logic (simulated by checking if any doc has "signed" in the name)
      const hasSignature = shipmentDocs.some(d => d.fileName.toLowerCase().includes('signed'));
      const missingSignature = isInternational && !hasSignature;

      let status = 'Compliant';
      if (missing.length > 0 || missingSignature) status = 'Non-Compliant';

      return {
        shipment,
        isInternational,
        requiredDocs,
        missingDocs: missing,
        missingSignature,
        status
      };
    });

    setAuditResults(results);
  };

  const compliantCount = auditResults.filter(r => r.status === 'Compliant').length;
  const nonCompliantCount = auditResults.length - compliantCount;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl">Compliance Audit</CardTitle>
          <CardDescription>Automated check for missing international freight documentation and signatures.</CardDescription>
        </div>
        <Button onClick={loadData} variant="outline" size="sm" disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Run Audit
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Running compliance checks...</div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
               <Card className="bg-muted/50">
                 <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                   <div className="text-2xl font-bold">{auditResults.length}</div>
                   <div className="text-xs text-muted-foreground">Total Audited</div>
                 </CardContent>
               </Card>
               <Card className="bg-green-50/50 border-green-100 dark:bg-green-950/20 dark:border-green-900/50">
                 <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                   <div className="text-2xl font-bold text-green-600">{compliantCount}</div>
                   <div className="text-xs text-green-600/80">Compliant</div>
                 </CardContent>
               </Card>
               <Card className="bg-red-50/50 border-red-100 dark:bg-red-950/20 dark:border-red-900/50">
                 <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                   <div className="text-2xl font-bold text-red-600">{nonCompliantCount}</div>
                   <div className="text-xs text-red-600/80">Action Required</div>
                 </CardContent>
               </Card>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shipment Ref</TableHead>
                  <TableHead>Route Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Missing Requirements</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditResults.map((result, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{result.shipment.referenceNumber}</TableCell>
                    <TableCell>
                      {result.isInternational ? (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">International</Badge>
                      ) : (
                        <Badge variant="outline">Domestic</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {result.status === 'Compliant' ? (
                        <div className="flex items-center text-green-600 text-sm">
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Compliant
                        </div>
                      ) : (
                        <div className="flex items-center text-red-600 text-sm">
                          <AlertTriangle className="w-4 h-4 mr-1" /> Non-Compliant
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {result.status === 'Compliant' ? (
                        <span className="text-muted-foreground text-sm">-</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {result.missingDocs.map((doc: string, i: number) => (
                            <Badge key={i} variant="destructive" className="text-[10px] bg-red-100 text-red-700 hover:bg-red-200 border-none dark:bg-red-900/40 dark:text-red-400">
                              Missing: {doc}
                            </Badge>
                          ))}
                          {result.missingSignature && (
                            <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600 dark:text-amber-500">
                              Missing: Signatures
                            </Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {auditResults.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No shipments to audit.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
