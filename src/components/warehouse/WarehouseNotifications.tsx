import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/data-display/card';
import { Bell } from 'lucide-react';

export function WarehouseNotifications() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Warehouse Notifications</h2>
        <p className="text-muted-foreground text-sm">Alerts and tasks for warehouse operations</p>
      </div>
      <Card>
        <CardContent className="py-16 text-center">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Bell className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="text-foreground font-medium">All caught up!</div>
            <p className="text-muted-foreground text-sm max-w-sm">You have no pending notifications at this time.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
