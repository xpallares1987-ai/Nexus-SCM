import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/data-display/card';
import { Button } from '@/components/ui/forms/button';
import { Input } from '@/components/ui/forms/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/data-display/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/forms/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/overlays/dialog';
import { fetchApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Search, Trash2, Edit, Users, Building } from 'lucide-react';
import { cacheData, getCachedData } from '../../lib/idbCache';

export function PartiesEntities() {
  const { token } = useAuth();
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form State
  const [category, setCategory] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');

  const CACHE_KEY = 'scm_parties_cache';

  const loadEntities = async () => {
    try {
      setLoading(true);
      // Try to load from IndexedDB first for fast render
      const cached = await getCachedData<any[]>(CACHE_KEY);
      if (cached && cached.length > 0) {
        setEntities(cached);
      }

      if (token) {
        const data = await fetchApi('/parties', token);
        if (Array.isArray(data)) {
          setEntities(data);
          // Cache the fresh data
          await cacheData(CACHE_KEY, data);
        }
      }
    } catch (err) {
      console.error('Failed to load parties:', err);
      toast.error('Failed to load parties & entities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntities();
  }, [token]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchVal = params.get('search');
    if (searchVal) {
      setSearchQuery(decodeURIComponent(searchVal));
    }
    if (params.get('action') === 'create-entity') {
      setIsAddOpen(true);
    }
    if (searchVal || params.get('action') === 'create-entity') {
      // Clean up search param without full reload
      const search = window.location.search
        .replace(/[?&]action=create-entity/, '')
        .replace(/[?&]search=[^&]+/, '')
        .replace(/^&/, '?')
        .replace(/^\?&/, '?');
      const newUrl = window.location.pathname + (search === '?' || search === '' ? '' : search);
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        category,
        companyName,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        country
      };

      if (isEdit && editId) {
        await fetchApi(`/parties/${editId}`, token, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        toast.success('Entity updated successfully');
      } else {
        await fetchApi('/parties', token, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        toast.success('Entity created successfully');
      }

      setIsAddOpen(false);
      resetForm();
      loadEntities();
    } catch (error) {
      toast.error(isEdit ? 'Failed to update entity' : 'Failed to create entity');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entity?')) return;
    try {
      await fetchApi(`/parties/${id}`, token, {
        method: 'DELETE'
      });
      toast.success('Entity deleted successfully');
      loadEntities();
    } catch (err) {
      toast.error('Failed to delete entity');
    }
  };

  const handleEdit = (entity: any) => {
    setIsEdit(true);
    setEditId(entity.id);
    setCategory(entity.category);
    setCompanyName(entity.companyName);
    setAddressLine1(entity.addressLine1 || '');
    setAddressLine2(entity.addressLine2 || '');
    setCity(entity.city || '');
    setState(entity.state || '');
    setPostalCode(entity.postalCode || '');
    setCountry(entity.country || '');
    setIsAddOpen(true);
  };

  const resetForm = () => {
    setIsEdit(false);
    setEditId(null);
    setCategory('');
    setCompanyName('');
    setAddressLine1('');
    setAddressLine2('');
    setCity('');
    setState('');
    setPostalCode('');
    setCountry('');
  };

  const filteredEntities = entities.filter(e => 
    e.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.country?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Parties & Entities</h1>
          <p className="text-muted-foreground text-sm">Manage Shippers, Consignees, Carriers, Forwarding Agents, and Customs.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger>
            <div className="group/button inline-flex items-center justify-center rounded-lg border bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
              <Plus className="w-4 h-4 mr-2" /> Add Entity
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{isEdit ? 'Edit Entity' : 'Add New Entity'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Company Name</label>
                  <Input required value={companyName} onChange={e => setCompanyName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select required value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Shipper">Shipper</SelectItem>
                      <SelectItem value="Consignee">Consignee</SelectItem>
                      <SelectItem value="Carrier">Carrier</SelectItem>
                      <SelectItem value="Forwarding Agent">Forwarding Agent</SelectItem>
                      <SelectItem value="Customs">Customs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium">Address Line 1</label>
                  <Input required value={addressLine1} onChange={e => setAddressLine1(e.target.value)} />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium">Address Line 2 (Optional)</label>
                  <Input value={addressLine2} onChange={e => setAddressLine2(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">City</label>
                  <Input required value={city} onChange={e => setCity(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">State / Province</label>
                  <Input value={state} onChange={e => setState(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Postal Code</label>
                  <Input value={postalCode} onChange={e => setPostalCode(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Country</label>
                  <Input required value={country} onChange={e => setCountry(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit">{isEdit ? 'Save Changes' : 'Create Entity'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Directory</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search entities..."
                className="pl-8"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && entities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : filteredEntities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No entities found.</TableCell>
                  </TableRow>
                ) : (
                  filteredEntities.map((entity) => (
                    <TableRow key={entity.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <Building className="w-4 h-4 text-muted-foreground" />
                        {entity.companyName}
                      </TableCell>
                      <TableCell>{entity.category}</TableCell>
                      <TableCell>{entity.city}{entity.state ? `, ${entity.state}` : ''}</TableCell>
                      <TableCell>{entity.country}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(entity)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(entity.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
