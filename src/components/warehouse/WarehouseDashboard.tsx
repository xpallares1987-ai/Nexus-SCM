import React, { useEffect, useState } from 'react';
import { fetchApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Warehouse } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { Button } from '@/components/ui/forms/button';
import { Input } from '@/components/ui/forms/input';
import { Label } from '@/components/ui/forms/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/overlays/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/data-display/table';
import { Building2, Plus } from 'lucide-react';
import { toast } from 'sonner';

export function WarehouseDashboard() {
  const { token } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // Form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('');

  useEffect(() => {
    loadWarehouses();
  }, [token]);

  const loadWarehouses = async () => {
    if (!token) return;
    try {
      const data = await fetchApi('/warehouses', token);
      setWarehouses(data);
    } catch (error) {
      toast.error('Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newWarehouse = await fetchApi('/warehouses', token, {
        method: 'POST',
        body: JSON.stringify({
          code,
          name,
          location,
          capacity: capacity ? parseInt(capacity) : null,
        }),
      });
      setWarehouses([...warehouses, newWarehouse]);
      setIsOpen(false);
      setCode('');
      setName('');
      setLocation('');
      setCapacity('');
      toast.success('Warehouse created successfully');
    } catch (error) {
      toast.error('Failed to create warehouse');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Warehouses</h2>
          <p className="text-muted-foreground text-sm">Manage your storage facilities</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger render={
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Warehouse
            </Button>
          } />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Warehouse</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code (Unique)</Label>
                <Input id="code" value={code} onChange={e => setCode(e.target.value)} required placeholder="WH-001" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} required placeholder="Main Distribution Center" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" value={location} onChange={e => setLocation(e.target.value)} required placeholder="Madrid, Spain" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity (Optional)</Label>
                <Input id="capacity" type="number" value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="10000" />
              </div>
              <Button type="submit" className="w-full">Save Warehouse</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : warehouses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <Building2 className="w-8 h-8 mx-auto text-zinc-300 mb-2" />
                    No warehouses found. Add one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                warehouses.map(wh => (
                  <TableRow key={wh.id}>
                    <TableCell className="font-medium">{wh.code}</TableCell>
                    <TableCell>{wh.name}</TableCell>
                    <TableCell>{wh.location}</TableCell>
                    <TableCell>{wh.capacity || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Edit</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
