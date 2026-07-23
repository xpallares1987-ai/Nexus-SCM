export interface TrackingEvent {
  status: string;
  location: string;
  timestamp: string;
  description: string;
}

export interface TrackingResponse {
  shipmentId: string;
  provider: string;
  currentStatus: string;
  eta: string;
  events: TrackingEvent[];
}

export class TrackingService {
  /**
   * Simulates a call to a maritime carrier tracking API (e.g., Maersk, MSC)
   */
  async trackMaritimeShipment(containerNumber: string): Promise<TrackingResponse> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const now = new Date();
    
    return {
      shipmentId: containerNumber,
      provider: 'OceanTrack API',
      currentStatus: 'In Transit',
      eta: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
      events: [
        {
          status: 'Departed',
          location: 'Shanghai Port, CN',
          timestamp: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          description: 'Vessel departed from origin port.',
        },
        {
          status: 'In Transit',
          location: 'Pacific Ocean',
          timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          description: 'Vessel is en route to destination.',
        }
      ]
    };
  }

  /**
   * Simulates a call to an air freight tracking API (e.g., DHL, FedEx)
   */
  async trackAirShipment(awbNumber: string): Promise<TrackingResponse> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    const now = new Date();

    return {
      shipmentId: awbNumber,
      provider: 'AirExpress API',
      currentStatus: 'Customs Clearance',
      eta: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
      events: [
        {
          status: 'Departed',
          location: 'Frankfurt Airport, DE',
          timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          description: 'Flight departed.',
        },
        {
          status: 'Arrived',
          location: 'JFK Airport, US',
          timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
          description: 'Flight arrived at destination airport.',
        },
        {
          status: 'Customs Clearance',
          location: 'JFK Airport, US',
          timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
          description: 'Shipment is undergoing customs clearance.',
        }
      ]
    };
  }

  /**
   * Simulates a call to a ground transport tracking API
   */
  async trackLandShipment(reference: string): Promise<TrackingResponse> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    const now = new Date();

    return {
      shipmentId: reference,
      provider: 'GroundTrack API',
      currentStatus: 'Dispatched',
      eta: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      events: [
        {
          status: 'Dispatched',
          location: 'Distribution Center',
          timestamp: now.toISOString(),
          description: 'Truck dispatched.',
        }
      ]
    };
  }

  /**
   * Main entry point to track a shipment based on its type/mode
   */
  async getTrackingUpdates(referenceNumber: string, mode: 'Sea' | 'Air' | 'Land' | string): Promise<TrackingResponse> {
    if (mode === 'Sea') {
      return this.trackMaritimeShipment(referenceNumber);
    } else if (mode === 'Air') {
      return this.trackAirShipment(referenceNumber);
    } else {
      return this.trackLandShipment(referenceNumber);
    }
  }
}
