export function generateAlerts(
  shipments: any[], 
  enableDelayAlerts: boolean, 
  enableArrivalAlerts: boolean, 
  priorityLevel: string, 
  currentTime: Date
) {
  const next48Hours = new Date(currentTime.getTime() + 48 * 60 * 60 * 1000);
  const newAlerts: any[] = [];
  
  shipments.forEach(s => {
    if (s.status !== 'Delivered' && s.eta) {
      const etaDate = new Date(s.eta);
      if (etaDate < currentTime) {
        if (enableDelayAlerts) {
          newAlerts.push({
            id: `delayed-${s.id}`,
            shipmentId: s.id,
            reference: s.referenceNumber,
            type: 'delayed',
            message: `Delayed: ${s.referenceNumber} (ETA was ${etaDate.toLocaleDateString()})`
          });
        }
      } else if (etaDate <= next48Hours && enableArrivalAlerts && priorityLevel !== 'high') {
        newAlerts.push({
          id: `approaching-${s.id}`,
          shipmentId: s.id,
          reference: s.referenceNumber,
          type: 'approaching',
          message: `Approaching: ${s.referenceNumber} (ETA is ${etaDate.toLocaleDateString()})`
        });
      }
    }
  });

  return newAlerts;
}
