import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrackingService } from '../services/TrackingService.ts';

describe('TrackingService', () => {
  let trackingService: TrackingService;

  beforeEach(() => {
    trackingService = new TrackingService();
  });

  describe('trackMaritimeShipment', () => {
    it('should return maritime tracking data', async () => {
      const result = await trackingService.trackMaritimeShipment('MSCU1234567');
      expect(result).toBeDefined();
      expect(result.shipmentId).toBe('MSCU1234567');
      expect(result.provider).toBe('OceanTrack API');
      expect(result.events.length).toBeGreaterThan(0);
      expect(result.events[0].status).toBe('Departed');
    });
  });

  describe('trackAirShipment', () => {
    it('should return air tracking data', async () => {
      const result = await trackingService.trackAirShipment('AWB-123456');
      expect(result).toBeDefined();
      expect(result.shipmentId).toBe('AWB-123456');
      expect(result.provider).toBe('AirExpress API');
      expect(result.events.length).toBeGreaterThan(0);
      expect(result.events[0].status).toBe('Departed');
    });
  });

  describe('trackLandShipment', () => {
    it('should return land tracking data', async () => {
      const result = await trackingService.trackLandShipment('TRK-999');
      expect(result).toBeDefined();
      expect(result.shipmentId).toBe('TRK-999');
      expect(result.provider).toBe('GroundTrack API');
      expect(result.events.length).toBeGreaterThan(0);
      expect(result.events[0].status).toBe('Dispatched');
    });
  });

  describe('getTrackingUpdates', () => {
    it('should route to maritime tracking when mode is Sea', async () => {
      const spy = vi.spyOn(trackingService, 'trackMaritimeShipment');
      await trackingService.getTrackingUpdates('REF-001', 'Sea');
      expect(spy).toHaveBeenCalledWith('REF-001');
    });

    it('should route to air tracking when mode is Air', async () => {
      const spy = vi.spyOn(trackingService, 'trackAirShipment');
      await trackingService.getTrackingUpdates('REF-002', 'Air');
      expect(spy).toHaveBeenCalledWith('REF-002');
    });

    it('should route to land tracking when mode is Land', async () => {
      const spy = vi.spyOn(trackingService, 'trackLandShipment');
      await trackingService.getTrackingUpdates('REF-003', 'Land');
      expect(spy).toHaveBeenCalledWith('REF-003');
    });
  });
});
