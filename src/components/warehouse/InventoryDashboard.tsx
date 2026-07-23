import React, { useEffect, useState } from 'react';
import { fetchApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Inventory, Warehouse } from '../../types';
import { Card, CardContent } from '@/components/ui/data-display/card';
import { Button } from '@/components/ui/forms/button';
import { Input } from '@/components/ui/forms/input';
import { Label } from '@/components/ui/forms/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/overlays/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/data-display/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/forms/select';
import { Package, Plus, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';

export function InventoryDashboard() {
  const { token } = useAuth();
  const [inventoryItems, setInventoryItems] = useState<Inventory[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [binLocation, setBinLocation] = useState('');
  
  // Movement state
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);
  const [moveType, setMoveType] = useState<'IN' | 'OUT'>('IN');
  const [moveQty, setMoveQty] = useState('');
  const [moveRef, setMoveRef] = useState('');

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    if (!token) return;
    try {
      const [invData, whData] = await Promise.all([
        fetchApi('/inventory', token),
        fetchApi('/warehouses', token)
      ]);
      setInventoryItems(invData);
      setWarehouses(whData);
    } catch (error) {
      toast.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newItem = await fetchApi('/inventory', token, {
        method: 'POST',
        body: JSON.stringify({
          warehouseId, sku, description, binLocation, quantity: '0'
        }),
      });
      setInventoryItems([...inventoryItems, newItem]);
      setIsCreateOpen(false);
      setSku('');
      setDescription('');
      setBinLocation('');
      toast.success('Inventory SKU created successfully');
    } catch (error) {
      toast.error('Failed to create inventory SKU');
    }
  };

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInventoryId) return;
    try {
      await fetchApi(`/inventory/${selectedInventoryId}/move`, token, {
        method: 'POST',
        body: JSON.stringify({
          type: moveType,
          quantity: moveQty,
          reference: moveRef,
        }),
      });
      setIsMoveOpen(false);
      setMoveQty('');
      setMoveRef('');
      await loadData(); // Reload to get updated quantities
      toast.success(`Stock ${moveType === 'IN' ? 'received' : 'dispatched'} successfully`);
    } catch (error) {
      toast.error('Failed to process movement');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Inventory</h2>
          <p className="text-muted-foreground text-sm">Manage SKUs and stock levels</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger render={
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add SKU
            </Button>
          } />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New SKU</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Warehouse</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map(wh => (
                      <SelectItem key={wh.id} value={wh.id}>{wh.name} ({wh.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU Code</Label>
                <Input id="sku" value={sku} onChange={e => setSku(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Description</Label>
                <Input id="desc" value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bin">Bin Location</Label>
                <Input id="bin" value={binLocation} onChange={e => setBinLocation(e.target.value)} placeholder="A-12-B" />
              </div>
              <Button type="submit" className="w-full">Save SKU</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Bin</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : inventoryItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div className="text-foreground font-medium">No inventory SKUs</div>
                      <p className="text-muted-foreground text-sm max-w-sm">Get started by creating a new SKU to track stock levels in your warehouses.</p>
                      <Button variant="outline" className="mt-4" onClick={() => setIsCreateOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add New SKU
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                inventoryItems.map(item => {
                  const wh = warehouses.find(w => w.id === item.warehouseId);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.sku}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{wh?.code}</TableCell>
                      <TableCell>{item.binLocation || 'N/A'}</TableCell>
                      <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => {
                          setSelectedInventoryId(item.id);
                          setIsMoveOpen(true);
                        }}>
                          <ArrowRightLeft className="w-4 h-4 mr-2" />
                          Move
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isMoveOpen} onOpenChange={setIsMoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Stock Movement</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMovement} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Movement Type</Label>
              <Select value={moveType} onValueChange={(v: 'IN' | 'OUT') => setMoveType(v)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">Receive (IN)</SelectItem>
                  <SelectItem value="OUT">Dispatch (OUT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qty">Quantity</Label>
              <Input id="qty" type="number" min="0.01" step="0.01" value={moveQty} onChange={e => setMoveQty(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ref">Reference (PO/Shipment ID)</Label>
              <Input id="ref" value={moveRef} onChange={e => setMoveRef(e.target.value)} />
            </div>
            <Button type="submit" className="w-full">Confirm Movement</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
