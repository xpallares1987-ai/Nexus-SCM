import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { Button } from '@/components/ui/forms/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/data-display/table';
import { Badge } from '@/components/ui/data-display/badge';
import { Truck, Search, Plus, Filter, Star, Activity, Ship, Award, Scale } from 'lucide-react';
import { Input } from '@/components/ui/forms/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { CarrierScorecard } from './CarrierScorecard';
import { SlaRenegotiator } from './SlaRenegotiator';

export function CarrierManagement() {
  const [carriers] = useState([
    { id: 'CAR-001', name: 'Maersk Line', type: 'Ocean', rating: 4.8, activeRoutes: 124, status: 'Active' },
    { id: 'CAR-002', name: 'DHL Express', type: 'Air', rating: 4.9, activeRoutes: 342, status: 'Active' },
    { id: 'CAR-003', name: 'FedEx Freight', type: 'Road', rating: 4.5, activeRoutes: 89, status: 'Active' },
    { id: 'CAR-004', name: 'Evergreen Marine', type: 'Ocean', rating: 4.2, activeRoutes: 56, status: 'Under Review' },
    { id: 'CAR-005', name: 'DB Schenker', type: 'Rail/Road', rating: 4.6, activeRoutes: 112, status: 'Active' },
    { id: 'CAR-006', name: 'MSC', type: 'Ocean', rating: 4.7, activeRoutes: 201, status: 'Active' },
    { id: 'CAR-007', name: 'Hapag-Lloyd', type: 'Ocean', rating: 4.5, activeRoutes: 95, status: 'Active' },
    { id: 'CAR-008', name: 'UPS Supply Chain', type: 'Air/Road', rating: 4.8, activeRoutes: 215, status: 'Active' },
    { id: 'CAR-009', name: 'CMA CGM', type: 'Ocean', rating: 4.4, activeRoutes: 134, status: 'Active' },
    { id: 'CAR-010', name: 'Expeditors', type: 'Air/Ocean', rating: 4.7, activeRoutes: 156, status: 'Active' },
    { id: 'CAR-011', name: 'Kuehne + Nagel', type: 'Air/Ocean', rating: 4.8, activeRoutes: 290, status: 'Active' },
    { id: 'CAR-012', name: 'ZIM', type: 'Ocean', rating: 4.1, activeRoutes: 45, status: 'Suspended' },
  ]);

  const performanceData = [
    { name: 'Maersk Line', onTime: 96, avgDelay: 2.1 },
    { name: 'DHL Express', onTime: 98, avgDelay: 0.5 },
    { name: 'FedEx Freight', onTime: 92, avgDelay: 1.2 },
    { name: 'Evergreen Marine', onTime: 88, avgDelay: 3.4 },
    { name: 'DB Schenker', onTime: 95, avgDelay: 1.8 },
    { name: 'MSC', onTime: 91, avgDelay: 2.7 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Carrier Management</h2>
          <p className="text-muted-foreground">Manage logistics partners, performance ratings, and contracts.</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Onboard Carrier
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Carriers</p>
                <p className="text-3xl font-bold mt-2">142</p>
              </div>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Rating</p>
                <p className="text-3xl font-bold mt-2 text-amber-600">4.6</p>
              </div>
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Star className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">On-Time Perf.</p>
                <p className="text-3xl font-bold mt-2 text-emerald-600">94.2%</p>
              </div>
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Ocean</p>
                <p className="text-3xl font-bold mt-2 text-indigo-600">28</p>
              </div>
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <Ship className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="scorecard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scorecard" className="flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-indigo-500" /> Carrier Scorecard
          </TabsTrigger>
          <TabsTrigger value="renegotiator" className="flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-indigo-500" /> AI SLA Renegotiator
          </TabsTrigger>
          <TabsTrigger value="directory">Carrier Directory</TabsTrigger>
          <TabsTrigger value="performance">Carrier Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Carrier Directory</CardTitle>
              <CardDescription>View all registered carriers and their current performance metrics.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search carriers..." className="pl-9" />
                </div>
                <Button variant="outline"><Filter className="w-4 h-4 mr-2"/> Filter</Button>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Carrier ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Active Routes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {carriers.map((car) => (
                    <TableRow key={car.id}>
                      <TableCell className="font-medium">{car.id}</TableCell>
                      <TableCell>{car.name}</TableCell>
                      <TableCell>{car.type}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-amber-500 mr-1 fill-amber-500" />
                          {car.rating}
                        </div>
                      </TableCell>
                      <TableCell>{car.activeRoutes}</TableCell>
                      <TableCell>
                        <Badge variant={
                          car.status === 'Active' ? 'default' : 
                          car.status === 'Under Review' ? 'destructive' : 'secondary'
                        }>
                          {car.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">Manage</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>On-Time Delivery Performance</CardTitle>
              <CardDescription>Percentage of shipments delivered on time by carrier (last 30 days)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={80} 
                      tick={{ fontSize: 12 }} 
                    />
                    <YAxis 
                      tickFormatter={(value) => `${value}%`} 
                      domain={[0, 100]} 
                      tick={{ fontSize: 12 }}
                    />
                    <RechartsTooltip 
                      formatter={(value) => [`${value}%`, 'On-Time Delivery']}
                      contentStyle={{ borderRadius: '8px' }}
                    />
                    <Bar dataKey="onTime" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="renegotiator" className="space-y-4">
          <SlaRenegotiator />
        </TabsContent>

        <TabsContent value="scorecard" className="space-y-4">
          <CarrierScorecard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
