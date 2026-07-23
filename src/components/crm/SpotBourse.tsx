import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { Button } from '@/components/ui/forms/button';
import { Input } from '@/components/ui/forms/input';
import { Label } from '@/components/ui/forms/label';
import { Badge } from '@/components/ui/data-display/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/data-display/table';
import { 
  Gavel, 
  Plus, 
  Search, 
  TrendingUp, 
  Calendar, 
  MapPin, 
  Container, 
  Package, 
  Clock, 
  CheckCircle, 
  History, 
  Filter, 
  DollarSign, 
  ArrowRightLeft, 
  Coins 
} from 'lucide-react';
import { toast } from 'sonner';

interface BourseListing {
  id: string;
  route: string;
  origin: string;
  destination: string;
  type: 'LCL_SPACE_AVAILABLE' | 'VACANT_CONTAINER_CAPACITY';
  capacity: string;
  minBid: number;
  currentHighestBid: number;
  highestBidder: string;
  bidCount: number;
  closingTime: string;
  timeLeft: string;
  postedBy: string;
  status: 'Open' | 'Closed' | 'Awarded';
  bids: Array<{
    id: string;
    bidder: string;
    amount: number;
    timestamp: string;
  }>;
}

const INITIAL_LISTINGS: BourseListing[] = [
  {
    id: "BSE-4412",
    route: "Shanghai (CNSHA) ➔ Rotterdam (NLRTM)",
    origin: "Shanghai (CNSHA)",
    destination: "Rotterdam (NLRTM)",
    type: "LCL_SPACE_AVAILABLE",
    capacity: "15 CBM / 3,200 kg",
    minBid: 450,
    currentHighestBid: 580,
    highestBidder: "Apex Freight Forwarders",
    bidCount: 5,
    closingTime: "2026-07-18T22:00:00Z",
    timeLeft: "4h 12m",
    postedBy: "Hapag-Lloyd (Ocean Carrier)",
    status: "Open",
    bids: [
      { id: "B-1", bidder: "Apex Freight Forwarders", amount: 580, timestamp: "16:15" },
      { id: "B-2", bidder: "DHL Global Forwarding", amount: 550, timestamp: "15:40" },
      { id: "B-3", bidder: "Kuehne + Nagel", amount: 520, timestamp: "14:10" },
      { id: "B-4", bidder: "Apex Freight Forwarders", amount: 490, timestamp: "13:30" },
      { id: "B-5", bidder: "DHL Global Forwarding", amount: 460, timestamp: "12:00" },
    ]
  },
  {
    id: "BSE-9938",
    route: "Singapore (SGSIN) ➔ Los Angeles (USLAX)",
    origin: "Singapore (SGSIN)",
    destination: "Los Angeles (USLAX)",
    type: "VACANT_CONTAINER_CAPACITY",
    capacity: "40ft High Cube Container",
    minBid: 1200,
    currentHighestBid: 1450,
    highestBidder: "Kuehne + Nagel",
    bidCount: 3,
    closingTime: "2026-07-19T06:00:00Z",
    timeLeft: "12h 45m",
    postedBy: "Maersk Logistics Ltd",
    status: "Open",
    bids: [
      { id: "B-6", bidder: "Kuehne + Nagel", amount: 1450, timestamp: "15:10" },
      { id: "B-7", bidder: "Expeditors International", amount: 1350, timestamp: "13:25" },
      { id: "B-8", bidder: "DB Schenker", amount: 1250, timestamp: "11:15" },
    ]
  },
  {
    id: "BSE-2291",
    route: "Hamburg (DEHAM) ➔ New York (USNYC)",
    origin: "Hamburg (DEHAM)",
    destination: "New York (USNYC)",
    type: "LCL_SPACE_AVAILABLE",
    capacity: "8 CBM / 1,500 kg",
    minBid: 320,
    currentHighestBid: 320,
    highestBidder: "No active bids",
    bidCount: 0,
    closingTime: "2026-07-18T18:30:00Z",
    timeLeft: "1h 45m",
    postedBy: "Ocean Alliance Partners",
    status: "Open",
    bids: []
  },
  {
    id: "BSE-3108",
    route: "Tokyo (JPTYO) ➔ Shanghai (CNSHA)",
    origin: "Tokyo (JPTYO)",
    destination: "Shanghai (CNSHA)",
    type: "VACANT_CONTAINER_CAPACITY",
    capacity: "20ft Standard Container (Backhaul Route)",
    minBid: 400,
    currentHighestBid: 480,
    highestBidder: "Sinotrans Group",
    bidCount: 2,
    closingTime: "2026-07-20T12:00:00Z",
    timeLeft: "1d 19h",
    postedBy: "COSCO Shipping Lines",
    status: "Open",
    bids: [
      { id: "B-9", bidder: "Sinotrans Group", amount: 480, timestamp: "Yesterday" },
      { id: "B-10", bidder: "Nippon Express", amount: 420, timestamp: "Yesterday" }
    ]
  },
  {
    id: "BSE-8841",
    route: "Rotterdam (NLRTM) ➔ Houston (USHOU)",
    origin: "Rotterdam (NLRTM)",
    destination: "Houston (USHOU)",
    type: "VACANT_CONTAINER_CAPACITY",
    capacity: "40ft Flat Rack Container",
    minBid: 2200,
    currentHighestBid: 2450,
    highestBidder: "Panalpina S.A.",
    bidCount: 4,
    closingTime: "2026-07-17T15:00:00Z",
    timeLeft: "Expired",
    postedBy: "MSC Mediterranean Shipping",
    status: "Awarded",
    bids: [
      { id: "B-11", bidder: "Panalpina S.A.", amount: 2450, timestamp: "Closed" },
      { id: "B-12", bidder: "Ceva Logistics", amount: 2400, timestamp: "Closed" },
      { id: "B-13", bidder: "Panalpina S.A.", amount: 2350, timestamp: "Closed" },
      { id: "B-14", bidder: "Kintetsu World Express", amount: 2250, timestamp: "Closed" }
    ]
  }
];

export function SpotBourse() {
  const [listings, setListings] = useState<BourseListing[]>(INITIAL_LISTINGS);
  const [filterType, setFilterType] = useState<'ALL' | 'LCL' | 'CONTAINER'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedListing, setSelectedListing] = useState<BourseListing | null>(listings[0]);
  const [bidAmount, setBidAmount] = useState('');
  const [bidderName, setBidderName] = useState('Global Forwarder Inc.');
  
  // Create New Listing Form state
  const [isCreating, setIsCreating] = useState(false);
  const [newOrigin, setNewOrigin] = useState('');
  const [newDestination, setNewDestination] = useState('');
  const [newType, setNewType] = useState<'LCL_SPACE_AVAILABLE' | 'VACANT_CONTAINER_CAPACITY'>('LCL_SPACE_AVAILABLE');
  const [newCapacity, setNewCapacity] = useState('');
  const [newMinBid, setNewMinBid] = useState('');
  const [newClosingHours, setNewClosingHours] = useState('24');

  // Filter & Search Logic
  const filteredListings = listings.filter(l => {
    const matchesSearch = l.route.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          l.postedBy.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterType === 'ALL') return matchesSearch;
    if (filterType === 'LCL') return matchesSearch && l.type === 'LCL_SPACE_AVAILABLE';
    if (filterType === 'CONTAINER') return matchesSearch && l.type === 'VACANT_CONTAINER_CAPACITY';
    return matchesSearch;
  });

  // Place Bid handler
  const handlePlaceBid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedListing) return;

    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid numeric bid amount.");
      return;
    }

    const minAllowedBid = Math.max(selectedListing.minBid, selectedListing.currentHighestBid);
    if (amount <= selectedListing.currentHighestBid) {
      toast.error(`Bid must exceed the current highest bid of $${selectedListing.currentHighestBid}.`);
      return;
    }

    if (amount < selectedListing.minBid) {
      toast.error(`Bid must be at least the minimum opening bid of $${selectedListing.minBid}.`);
      return;
    }

    // Success! Update local state
    const updatedListings = listings.map(l => {
      if (l.id === selectedListing.id) {
        const newBid = {
          id: `B-${Date.now()}`,
          bidder: bidderName,
          amount,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        const newBids = [newBid, ...l.bids];
        return {
          ...l,
          currentHighestBid: amount,
          highestBidder: bidderName,
          bidCount: l.bidCount + 1,
          bids: newBids
        };
      }
      return l;
    });

    setListings(updatedListings);
    
    // Update active selected listing view details
    const activeMatch = updatedListings.find(l => l.id === selectedListing.id);
    if (activeMatch) {
      setSelectedListing(activeMatch);
    }

    toast.success(`Bid of $${amount} submitted successfully! Your offer has been recorded on the spot bourse ledger.`);
    setBidAmount('');
  };

  // Submit New Listing
  const handleCreateListing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrigin || !newDestination || !newCapacity || !newMinBid) {
      toast.error("All fields are required to publish a spot listing.");
      return;
    }

    const minBidNum = parseFloat(newMinBid);
    if (isNaN(minBidNum) || minBidNum <= 0) {
      toast.error("Minimum bid must be a positive number.");
      return;
    }

    const newId = `BSE-${Math.floor(1000 + Math.random() * 9000)}`;
    const route = `${newOrigin.toUpperCase()} ➔ ${newDestination.toUpperCase()}`;
    const newListing: BourseListing = {
      id: newId,
      route,
      origin: newOrigin.toUpperCase(),
      destination: newDestination.toUpperCase(),
      type: newType,
      capacity: newCapacity,
      minBid: minBidNum,
      currentHighestBid: minBidNum,
      highestBidder: "No active bids",
      bidCount: 0,
      closingTime: new Date(Date.now() + parseInt(newClosingHours) * 60 * 60 * 1000).toISOString(),
      timeLeft: `${newClosingHours}h 00m`,
      postedBy: "Logistics Hub Forwarder (You)",
      status: "Open",
      bids: []
    };

    setListings([newListing, ...listings]);
    setSelectedListing(newListing);
    setIsCreating(false);
    toast.success(`Spot market listing ${newId} published successfully! Internal forwarders can now place active bids.`);
    
    // Reset Form
    setNewOrigin('');
    setNewDestination('');
    setNewCapacity('');
    setNewMinBid('');
  };

  // Stats
  const totalBourseOpen = listings.filter(l => l.status === 'Open').length;
  const lclAvailableCount = listings.filter(l => l.status === 'Open' && l.type === 'LCL_SPACE_AVAILABLE').length;
  const containerCount = listings.filter(l => l.status === 'Open' && l.type === 'VACANT_CONTAINER_CAPACITY').length;
  
  return (
    <div className="space-y-6">
      
      {/* Overview Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
        <Card className="shadow-sm border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
              <Gavel className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Bourse Listings</p>
              <h4 className="text-2xl font-bold mt-1">{totalBourseOpen} Active</h4>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
              <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Unutilized LCL Space</p>
              <h4 className="text-2xl font-bold mt-1">{lclAvailableCount} Open Lots</h4>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
              <Container className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Vacant Backhaul Capacity</p>
              <h4 className="text-2xl font-bold mt-1">{containerCount} Equipment Slots</h4>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl">
              <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Equipment Load Factor</p>
              <h4 className="text-2xl font-bold mt-1">94.8% Avg</h4>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Listings panel */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="shadow-sm border-zinc-200 dark:border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/10">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Coins className="w-4 h-4 text-zinc-500" />
                  Spot Space Auction Ledger
                </CardTitle>
                <CardDescription className="text-xs">
                  Instantly secure Less Than Container Load (LCL) gaps or place backhaul container bids to capture low-cost capacity.
                </CardDescription>
              </div>
              <Button 
                size="sm" 
                className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200 h-8 font-semibold text-xs gap-1"
                onClick={() => setIsCreating(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                Post Space Opportunity
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search by route, carrier or listing..." 
                    className="pl-9 h-9 text-xs" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                  <Button
                    variant={filterType === 'ALL' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-[10.5px] font-semibold"
                    onClick={() => setFilterType('ALL')}
                  >
                    All
                  </Button>
                  <Button
                    variant={filterType === 'LCL' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-[10.5px] font-semibold"
                    onClick={() => setFilterType('LCL')}
                  >
                    LCL Space
                  </Button>
                  <Button
                    variant={filterType === 'CONTAINER' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-[10.5px] font-semibold"
                    onClick={() => setFilterType('CONTAINER')}
                  >
                    Vacant Containers
                  </Button>
                </div>
              </div>

              {/* Listings List */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {filteredListings.length === 0 ? (
                  <div className="text-center py-12 border border-dashed rounded-xl border-zinc-200 dark:border-zinc-800">
                    <History className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-55" />
                    <p className="text-xs font-medium text-muted-foreground">No spot bourse matching opportunities found.</p>
                  </div>
                ) : (
                  filteredListings.map(l => {
                    const isSelected = selectedListing?.id === l.id;
                    const isLcl = l.type === 'LCL_SPACE_AVAILABLE';
                    return (
                      <div
                        key={l.id}
                        onClick={() => setSelectedListing(l)}
                        className={`p-4 border rounded-xl cursor-pointer transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                          isSelected 
                            ? 'border-zinc-900 bg-zinc-50 dark:border-zinc-300 dark:bg-zinc-900' 
                            : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50 dark:border-zinc-800 dark:hover:border-zinc-700/50'
                        }`}
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge className="font-mono text-[9px] h-4 leading-none" variant="outline">{l.id}</Badge>
                            <span className="text-[10px] text-muted-foreground font-medium">{l.postedBy}</span>
                          </div>
                          
                          <h4 className="text-xs font-bold truncate text-foreground flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            {l.route}
                          </h4>

                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground font-medium pt-1">
                            <span className="flex items-center gap-1">
                              {isLcl ? <Package className="w-3.5 h-3.5 text-blue-500" /> : <Container className="w-3.5 h-3.5 text-emerald-500" />}
                              {isLcl ? "LCL Surplus Space" : "Vacant Container"}
                            </span>
                            <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                              Cap: {l.capacity}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-end sm:flex-col justify-between w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 gap-1 border-zinc-100 dark:border-zinc-800">
                          <div className="text-left sm:text-right">
                            <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold block">current bid</span>
                            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-mono">${l.currentHighestBid}</span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                            <Clock className="w-3.5 h-3.5" />
                            <span className={l.timeLeft === 'Expired' ? 'text-red-500 font-bold' : 'font-semibold text-zinc-600 dark:text-zinc-400'}>
                              {l.timeLeft}
                            </span>
                            <span className="text-zinc-400 font-normal">({l.bidCount} bids)</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Selected Details & Bid Panel */}
        <div className="space-y-4">
          {selectedListing ? (
            <>
              {/* Detailed Bidding View */}
              <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 flex flex-col h-full">
                <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono font-bold text-muted-foreground">{selectedListing.id}</span>
                    <Badge variant={selectedListing.status === 'Open' ? 'default' : 'secondary'} className="text-[9px] leading-none h-4">
                      {selectedListing.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-extrabold text-foreground pt-1.5">
                    {selectedListing.route}
                  </CardTitle>
                  <CardDescription className="text-[11px] font-medium text-muted-foreground pt-0.5">
                    Posted by {selectedListing.postedBy}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="p-5 flex-1 space-y-5">
                  
                  {/* Space Details */}
                  <div className="grid grid-cols-2 gap-3.5 bg-zinc-50 dark:bg-zinc-900/30 p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80">
                    <div>
                      <span className="text-[8px] uppercase tracking-widest text-muted-foreground font-bold">opportunity type</span>
                      <strong className="text-[11px] font-bold block mt-1 flex items-center gap-1">
                        {selectedListing.type === 'LCL_SPACE_AVAILABLE' ? (
                          <>
                            <Package className="w-3.5 h-3.5 text-blue-500" />
                            LCL Surplus Space
                          </>
                        ) : (
                          <>
                            <Container className="w-3.5 h-3.5 text-emerald-500" />
                            Empty Backhaul Equipment
                          </>
                        )}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[8px] uppercase tracking-widest text-muted-foreground font-bold">volume & payload</span>
                      <strong className="text-[11px] font-mono font-extrabold text-zinc-800 dark:text-zinc-200 block mt-1 truncate">
                        {selectedListing.capacity}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[8px] uppercase tracking-widest text-muted-foreground font-bold">minimum opening bid</span>
                      <strong className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block mt-1 font-mono">
                        ${selectedListing.minBid} USD
                      </strong>
                    </div>

                    <div>
                      <span className="text-[8px] uppercase tracking-widest text-muted-foreground font-bold">time remaining</span>
                      <strong className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block mt-1 flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        {selectedListing.timeLeft}
                      </strong>
                    </div>
                  </div>

                  {/* Auction Placing Form */}
                  {selectedListing.status === 'Open' ? (
                    <form onSubmit={handlePlaceBid} className="space-y-3 border-b border-zinc-100 dark:border-zinc-800 pb-5">
                      <div className="space-y-1.5">
                        <Label htmlFor="bidderName" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">My Bidder Name</Label>
                        <Input 
                          id="bidderName" 
                          value={bidderName} 
                          onChange={(e) => setBidderName(e.target.value)} 
                          className="h-8 text-xs font-semibold"
                          required 
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="bidAmount" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Offer Price (USD)</Label>
                          <span className="text-[9.5px] font-semibold text-indigo-500">
                            Min bid amount: &gt; ${selectedListing.currentHighestBid}
                          </span>
                        </div>
                        <div className="relative">
                          <DollarSign className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            id="bidAmount"
                            type="number"
                            placeholder={String(selectedListing.currentHighestBid + 25)}
                            className="pl-8 h-8 font-mono text-xs font-bold"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full h-8.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex justify-center items-center gap-1"
                      >
                        <Gavel className="w-3.5 h-3.5" />
                        Submit Spot Bidding Offer
                      </Button>
                    </form>
                  ) : (
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 p-3 rounded-xl text-center text-xs font-semibold flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-amber-500" />
                      <span>This spot auction is closed and space has been awarded.</span>
                    </div>
                  )}

                  {/* Active Bids Ledger Trail */}
                  <div className="space-y-2.5">
                    <h5 className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                      <History className="w-3.5 h-3.5" />
                      Live Ledger Bidding Activity
                    </h5>

                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                      {selectedListing.bids.length === 0 ? (
                        <p className="text-[10.5px] text-muted-foreground italic py-4 text-center">No active bidding history yet. Be the first to place an offer!</p>
                      ) : (
                        selectedListing.bids.map((b, index) => (
                          <div 
                            key={b.id} 
                            className={`flex justify-between items-center p-2 rounded-lg text-xs border ${
                              index === 0 
                                ? 'bg-indigo-50/40 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/40' 
                                : 'bg-transparent border-zinc-100 dark:border-zinc-800/80'
                            }`}
                          >
                            <div className="flex flex-col">
                              <span className="font-bold text-foreground truncate max-w-[150px]">{b.bidder}</span>
                              <span className="text-[9px] text-muted-foreground">{b.timestamp}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {index === 0 && (
                                <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider scale-95">
                                  Highest
                                </span>
                              )}
                              <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">${b.amount}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </CardContent>
              </Card>
            </>
          ) : (
            <div className="h-full flex items-center justify-center border border-dashed rounded-xl border-zinc-200 dark:border-zinc-800 p-12 text-center text-muted-foreground">
              Select an auction listing to view active ledger bids and bid on spot container cargo space.
            </div>
          )}
        </div>
      </div>

      {/* New Space Post Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-xl max-w-md w-full shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-extrabold text-foreground flex items-center gap-2 mb-1">
              <Plus className="w-5 h-5 text-indigo-500" />
              Publish Spot Freight Cargo Space
            </h3>
            <p className="text-xs text-muted-foreground mb-5">
              Advertise unutilized Less Than Container Load (LCL) space or vacant container backhaul slots to logistics partners to optimize load factor ratios.
            </p>

            <form onSubmit={handleCreateListing} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="originPort" className="text-xs font-semibold">Origin Port / Hub Code</Label>
                  <Input 
                    id="originPort" 
                    placeholder="e.g. CNSHA" 
                    value={newOrigin}
                    onChange={(e) => setNewOrigin(e.target.value)}
                    className="h-8 text-xs uppercase"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="destPort" className="text-xs font-semibold">Destination Port / Hub Code</Label>
                  <Input 
                    id="destPort" 
                    placeholder="e.g. NLRTM" 
                    value={newDestination}
                    onChange={(e) => setNewDestination(e.target.value)}
                    className="h-8 text-xs uppercase"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Equipment Space Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewType('LCL_SPACE_AVAILABLE')}
                    className={`py-2 px-3 border rounded-lg text-xs font-semibold text-center transition-all ${
                      newType === 'LCL_SPACE_AVAILABLE'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                        : 'border-zinc-200 hover:border-zinc-300 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    LCL Surplus Space
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType('VACANT_CONTAINER_CAPACITY')}
                    className={`py-2 px-3 border rounded-lg text-xs font-semibold text-center transition-all ${
                      newType === 'VACANT_CONTAINER_CAPACITY'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : 'border-zinc-200 hover:border-zinc-300 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    Vacant Container Slot
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="capacity" className="text-xs font-semibold">Available Capacity (e.g. Volume/Payload)</Label>
                <Input 
                  id="capacity" 
                  placeholder="e.g. 10 CBM / 2,000 kg, or 40ft High Cube Container" 
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="minBid" className="text-xs font-semibold">Minimum Opening Bid (USD)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input 
                      id="minBid" 
                      type="number"
                      placeholder="400" 
                      value={newMinBid}
                      onChange={(e) => setNewMinBid(e.target.value)}
                      className="pl-7 h-8 text-xs font-mono font-bold"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="hours" className="text-xs font-semibold">Auction Closing Limit</Label>
                  <select
                    id="hours"
                    className="w-full bg-background border border-border rounded-lg text-xs px-2.5 h-8 outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700"
                    value={newClosingHours}
                    onChange={(e) => setNewClosingHours(e.target.value)}
                  >
                    <option value="6">6 Hours</option>
                    <option value="12">12 Hours</option>
                    <option value="24">24 Hours (1 day)</option>
                    <option value="48">48 Hours (2 days)</option>
                    <option value="72">72 Hours (3 days)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-3 justify-end">
                <Button 
                  type="button"
                  variant="outline"
                  className="h-8 text-xs font-semibold"
                  onClick={() => setIsCreating(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  Publish to Bourse
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
