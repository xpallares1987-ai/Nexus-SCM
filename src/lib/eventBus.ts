import EventEmitter from 'eventemitter3';

class EventBus extends EventEmitter {}

export const eventBus = new EventBus();

// Typed events
export enum EventTypes {
  ALERT_TRIGGERED = 'ALERT_TRIGGERED',
  SHIPMENT_UPDATED = 'SHIPMENT_UPDATED',
  KPI_UPDATED = 'KPI_UPDATED',
}
