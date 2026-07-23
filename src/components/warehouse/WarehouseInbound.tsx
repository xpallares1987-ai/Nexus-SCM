import React from 'react';
import { Card, CardContent } from '@/components/ui/data-display/card';
import { ArrowDownToLine } from 'lucide-react';

export function WarehouseInbound() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Inbound Deliveries</h2>
        <p className="text-muted-foreground text-sm">Manage incoming stock and receipts</p>
      </div>
      <Card>
        <CardContent className="py-16 text-center">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <ArrowDownToLine className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="text-foreground font-medium">No inbound deliveries</div>
            <p className="text-muted-foreground text-sm max-w-sm">No incoming shipments are scheduled for today.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
