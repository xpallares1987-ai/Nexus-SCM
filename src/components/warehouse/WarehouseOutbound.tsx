import React from 'react';
import { Card, CardContent } from '@/components/ui/data-display/card';
import { ArrowUpFromLine } from 'lucide-react';

export function WarehouseOutbound() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Outbound Shipments</h2>
        <p className="text-muted-foreground text-sm">Manage dispatch and outgoing orders</p>
      </div>
      <Card>
        <CardContent className="py-16 text-center">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <ArrowUpFromLine className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="text-foreground font-medium">No outbound orders</div>
            <p className="text-muted-foreground text-sm max-w-sm">No outgoing shipments are currently scheduled.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
