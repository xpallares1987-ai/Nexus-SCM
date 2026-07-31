import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchApi } from '../../lib/api';
import { Search, Filter, Ship, Users, FileText, ArrowRight, Calendar as CalendarIcon, X, Bookmark, BookmarkPlus, Save, Trash2, Tag } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/overlays/dialog';
import { Badge } from '@/components/ui/data-display/badge';
import { Input } from '@/components/ui/forms/input';
import { Button } from '@/components/ui/forms/button';
import { Link } from 'react-router';
import { format } from 'date-fns';
import { filterAdvancedSearch } from '../../lib/searchUtils';

export function AdvancedSearch() {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all'); // all, shipments, parties, documents
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [allData, setAllData] = useState<any[]>([]);

  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [searchName, setSearchName] = useState('');

  useEffect(() => {
    const loaded = localStorage.getItem('scm_saved_searches');
    if (loaded) {
      try {
        setSavedSearches(JSON.parse(loaded));
      } catch (e) {}
    }
  }, []);

  const handleSaveSearch = () => {
    if (!searchName.trim()) return;
    const newSearch = {
      id: Date.now().toString(),
      name: searchName,
      query,
      category,
      statusFilter,
      dateFrom,
      dateTo
    };
    const updated = [...savedSearches, newSearch];
    setSavedSearches(updated);
    localStorage.setItem('scm_saved_searches', JSON.stringify(updated));
    setSearchName('');
    setIsSaveDialogOpen(false);
  };

  const applySavedSearch = (search: any) => {
    setQuery(search.query || '');
    setCategory(search.category || 'all');
    setStatusFilter(search.statusFilter || 'all');
    setDateFrom(search.dateFrom || '');
    setDateTo(search.dateTo || '');
    // Optionally trigger search immediately
  };

  const deleteSavedSearch = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedSearches.filter(s => s.id !== id);
    setSavedSearches(updated);
    localStorage.setItem('scm_saved_searches', JSON.stringify(updated));
  };


  useEffect(() => {
    if (!token) return;
    const loadAllData = async () => {
      try {
        const [ships, parts] = await Promise.all([
          fetchApi('/shipments', token).catch(() => []),
          fetchApi('/entities', token).catch(() => [])
        ]);
        const combined = [
          ...(Array.isArray(ships) ? ships : []),
          ...(Array.isArray(parts) ? parts : [])
        ];
        setAllData(combined);
      } catch(e) {}
    };
    loadAllData();
  }, [token]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    
    setTimeout(() => {
      const compiledResults = filterAdvancedSearch(allData, query, category, statusFilter, dateFrom, dateTo);
      setResults(compiledResults);
      setHasSearched(true);
      setLoading(false);
    }, 400); // Simulate network delay
  };

  const clearFilters = () => {
    setQuery('');
    setCategory('all');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setResults([]);
    setHasSearched(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Advanced Search</h1>
          <p className="text-sm text-muted-foreground mt-1">Search across shipments, parties, and documents with precise filters.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        
      {savedSearches.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-xs font-medium text-muted-foreground mr-2 flex items-center"><Bookmark className="w-3.5 h-3.5 mr-1" /> Saved Searches:</span>
          {savedSearches.map(search => (
            <Badge 
              key={search.id} 
              variant="secondary" 
              className="cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors py-1.5 px-3 flex items-center gap-2"
              onClick={() => applySavedSearch(search)}
            >
              <span>{search.name}</span>
              <button onClick={(e) => deleteSavedSearch(search.id, e)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Search by reference, name, or code..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full md:w-auto h-10 px-8 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
            {loading ? 'Searching...' : 'Search Engine'}
          </Button>
          <Button type="button" variant="outline" onClick={clearFilters} className="w-full md:w-auto h-10 px-4">
            <X className="w-4 h-4 mr-2" />
            Clear
          </Button>

          <Button type="button" variant="outline" onClick={() => setIsSaveDialogOpen(true)} className="w-full md:w-auto h-10 px-4">
            <BookmarkPlus className="w-4 h-4 mr-2" />
            Save
          </Button>

        </form>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <select 
              value={category} 
              onChange={e => setCategory(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-transparent text-sm px-3 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            >
              <option value="all">All Modules</option>
              <option value="shipments">Shipments</option>
              <option value="parties">Parties & Entities</option>
              {/* <option value="documents">Documents</option> */}
            </select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Status / Type</label>
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-transparent text-sm px-3 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            >
              <option value="all">Any</option>
              {category === 'shipments' || category === 'all' ? (
                <>
                  <option value="Pending">Pending</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Delayed">Delayed</option>
                </>
              ) : null}
              {category === 'parties' || category === 'all' ? (
                <>
                  <option value="Client">Client / Consignee</option>
                  <option value="Carrier">Carrier</option>
                  <option value="Agent">Agent</option>
                </>
              ) : null}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Date From (ETA)</label>
            <input 
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-transparent text-sm px-3 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Date To (ETA)</label>
            <input 
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-transparent text-sm px-3 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
          </div>
        </div>
      </div>

      {hasSearched && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-foreground">Results ({results.length})</h2>
          
          {results.length === 0 ? (
            <div className="bg-card border border-border border-dashed rounded-xl p-12 text-center">
              <p className="text-muted-foreground">No records matched your search criteria.</p>
              <Button variant="link" onClick={clearFilters} className="mt-2 text-zinc-900 dark:text-zinc-100">Reset Filters</Button>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Reference / Name</th>
                      <th className="px-4 py-3 font-medium">Status / Category</th>
                      <th className="px-4 py-3 font-medium">Date info</th>
                      <th className="px-4 py-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {results.map((item, idx) => (
                      <tr key={`${item.id}-${idx}`} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          {item.searchType === 'shipment' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                              <Ship className="w-3 h-3" /> Shipment
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                              <Users className="w-3 h-3" /> Entity
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {item.searchType === 'shipment' ? (item.referenceNumber || item.hbl) : (item.name || item.companyName)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {item.searchType === 'shipment' ? item.status : item.category}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {item.searchType === 'shipment' && item.eta ? format(new Date(item.eta), 'MMM dd, yyyy') : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link 
                            to={item.searchType === 'shipment' ? `/shipments?search=${item.referenceNumber}` : `/directory?search=${item.name}`}
                            className="inline-flex items-center justify-center p-2 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Save Search Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Save className="w-5 h-5 text-indigo-500" /> Save Search Filter</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Search Name</label>
              <Input 
                value={searchName} 
                onChange={(e) => setSearchName(e.target.value)} 
                placeholder="e.g. Delayed Shanghai Shipments" 
                autoFocus 
              />
            </div>
            <div className="bg-muted/50 p-3 rounded-lg text-xs space-y-1">
              <p><strong className="text-foreground">Current parameters to save:</strong></p>
              <p className="text-muted-foreground">• Query: {query || '(empty)'}</p>
              <p className="text-muted-foreground">• Category: {category}</p>
              <p className="text-muted-foreground">• Status: {statusFilter}</p>
              <p className="text-muted-foreground">• Date Range: {dateFrom || 'Any'} to {dateTo || 'Any'}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSearch} className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={!searchName.trim()}>Save Filter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
