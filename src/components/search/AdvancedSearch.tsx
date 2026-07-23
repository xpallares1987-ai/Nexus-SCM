import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchApi } from '../../lib/api';
import { Search, Filter, Ship, Users, FileText, ArrowRight, Calendar as CalendarIcon, X } from 'lucide-react';
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

  useEffect(() => {
    if (!token) return;
    const loadAllData = async () => {
      try {
        const [ships, parts] = await Promise.all([
          fetchApi('/shipments', token).catch(() => []),
          fetchApi('/parties', token).catch(() => [])
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
    </div>
  );
}
