import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/data-display/card';
import { Button } from '@/components/ui/forms/button';
import { Input } from '@/components/ui/forms/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/data-display/table';
import { Plus, Search, Building, Trash2, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/overlays/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/forms/select';
import { useAuth } from '../../contexts/AuthContext';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';

type Entity = {
  id: string;
  companyName: string;
  companyType: string;
  street?: string;
  zipCode?: string;
  city?: string;
  federalState?: string;
  countryIsoCode?: string;
  countryName?: string;
  unlocode?: string;
  taxId?: string;
  phone?: string;
  email?: string;
};

const COMPANY_TYPES = [
  'Carrier', 'Terminal', 'Agent', 'Broker', 'Supplier', 
  'Customer', 'Haulier', 'Forwarder', 'Depot', 'Authority', 
  'Inland Container Depot', 'Warehouse'
];

export function PartiesEntities() {
  const { token } = useAuth();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [street, setStreet] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [city, setCity] = useState('');
  const [federalState, setFederalState] = useState('');
  const [countryIsoCode, setCountryIsoCode] = useState('');
  const [countryName, setCountryName] = useState('');
  const [unlocode, setUnlocode] = useState('');
  const [taxId, setTaxId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const loadEntities = async () => {
    try {
      const data = await fetchApi('/entities', token);
      setEntities(data);
    } catch (err) {
      toast.error('Failed to load entities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadEntities();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      companyName, companyType, street, zipCode, city, federalState,
      countryIsoCode, countryName, unlocode, taxId, phone, email
    };
    
    try {
      if (isEdit && editId) {
        await fetchApi(`/entities/${editId}`, token, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        toast.success('Entity updated successfully');
      } else {
        await fetchApi('/entities', token, {
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
      await fetchApi(`/entities/${id}`, token, {
        method: 'DELETE'
      });
      toast.success('Entity deleted successfully');
      loadEntities();
    } catch (err) {
      toast.error('Failed to delete entity');
    }
  };

  const handleEdit = (entity: Entity) => {
    setIsEdit(true);
    setEditId(entity.id);
    setCompanyName(entity.companyName);
    setCompanyType(entity.companyType);
    setStreet(entity.street || '');
    setZipCode(entity.zipCode || '');
    setCity(entity.city || '');
    setFederalState(entity.federalState || '');
    setCountryIsoCode(entity.countryIsoCode || '');
    setCountryName(entity.countryName || '');
    setUnlocode(entity.unlocode || '');
    setTaxId(entity.taxId || '');
    setPhone(entity.phone || '');
    setEmail(entity.email || '');
    setIsAddOpen(true);
  };

  const resetForm = () => {
    setIsEdit(false);
    setEditId(null);
    setCompanyName('');
    setCompanyType('');
    setStreet('');
    setZipCode('');
    setCity('');
    setFederalState('');
    setCountryIsoCode('');
    setCountryName('');
    setUnlocode('');
    setTaxId('');
    setPhone('');
    setEmail('');
  };

  const filteredEntities = entities.filter(e => 
    e.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.companyType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.countryIsoCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Entities</h1>
          <p className="text-muted-foreground text-sm">Manage company profiles, partners, and stakeholders.</p>
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEdit ? 'Edit Entity' : 'Add New Entity'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium">Company Name</label>
                  <Input required value={companyName} onChange={e => setCompanyName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Company Type</label>
                  <Select required value={companyType} onValueChange={setCompanyType}>
                    <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                    <SelectContent>
                      {COMPANY_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tax ID</label>
                  <Input value={taxId} onChange={e => setTaxId(e.target.value)} />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Street</label>
                  <Input value={street} onChange={e => setStreet(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">City</label>
                  <Input value={city} onChange={e => setCity(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Federal State</label>
                  <Input value={federalState} onChange={e => setFederalState(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">ZIP Code</label>
                  <Input value={zipCode} onChange={e => setZipCode(e.target.value)} />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Country Name</label>
                  <Input value={countryName} onChange={e => setCountryName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Country ISO Code</label>
                  <Input value={countryIsoCode} onChange={e => setCountryIsoCode(e.target.value)} maxLength={2} />
                </div>
                
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium">UNLOCODE</label>
                  <Input value={unlocode} onChange={e => setUnlocode(e.target.value)} placeholder="e.g. USNYC" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone</label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} type="tel" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">E-mail</label>
                  <Input value={email} onChange={e => setEmail(e.target.value)} type="email" />
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
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Country ISO</TableHead>
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
                      <TableCell>{entity.companyType}</TableCell>
                      <TableCell>{entity.city}{entity.federalState ? `, ${entity.federalState}` : ''}</TableCell>
                      <TableCell>{entity.countryIsoCode}</TableCell>
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
