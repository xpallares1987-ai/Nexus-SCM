export function filterAdvancedSearch(data: any[], query: string, category: string, statusFilter: string, dateFrom: string, dateTo: string) {
  let compiledResults: any[] = [];
  const q = query.toLowerCase().trim();

  data.forEach(item => {
    let matches = false;

    // Check entity type based on data structure
    const isShipment = item.referenceNumber !== undefined || item.hbl !== undefined;
    const isParty = item.companyName !== undefined || item.category === 'Carrier' || item.category === 'Client';

    const itemCategory = isShipment ? 'shipments' : isParty ? 'parties' : 'other';

    if (category !== 'all' && itemCategory !== category) {
      return;
    }

    if (isShipment) {
      if (!q) matches = true;
      else if (
        (item.referenceNumber && item.referenceNumber.toLowerCase().includes(q)) ||
        (item.hbl && item.hbl.toLowerCase().includes(q)) ||
        (item.mbl && item.mbl.toLowerCase().includes(q))
      ) {
        matches = true;
      }

      if (matches && statusFilter !== 'all' && item.status !== statusFilter) matches = false;
      
      if (matches && (dateFrom || dateTo)) {
        const sDate = item.eta ? new Date(item.eta) : null;
        if (sDate) {
          if (dateFrom && sDate < new Date(dateFrom)) matches = false;
          if (dateTo && sDate > new Date(dateTo)) matches = false;
        } else {
          matches = false;
        }
      }

      if (matches) {
        compiledResults.push({ ...item, searchType: 'shipment' });
      }
    } else if (isParty) {
      if (!q) matches = true;
      else if (
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.companyName && item.companyName.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q))
      ) {
        matches = true;
      }

      if (matches && statusFilter !== 'all' && item.category !== statusFilter) matches = false;

      // Filter out parties if date is provided, since they don't have dates in this context
      if (matches && (dateFrom || dateTo) && category !== 'parties') matches = false;

      if (matches) {
        compiledResults.push({ ...item, searchType: 'party' });
      }
    }
  });

  return compiledResults;
}
