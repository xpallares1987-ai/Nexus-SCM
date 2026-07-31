type EventHandler = (payload: any) => void;

export enum EventTypes {
  SHIPMENT_UPDATED = 'SHIPMENT_UPDATED',
  SYNC_ENQUEUED = 'SYNC_ENQUEUED',
  SYNC_READY = 'SYNC_READY',
  ITEM_SYNCED = 'ITEM_SYNCED',
  SYNC_COMPLETED = 'SYNC_COMPLETED'
}

export class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  on(event: string, handler: EventHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  off(event: string, handler: EventHandler) {
    if (!this.handlers.has(event)) return;
    const filtered = this.handlers.get(event)!.filter(h => h !== handler);
    this.handlers.set(event, filtered);
  }

  emit(event: string, payload?: any) {
    if (!this.handlers.has(event)) return;
    this.handlers.get(event)!.forEach(handler => {
      try {
        handler(payload);
      } catch (err) {
        console.error(`Error in event handler for ${event}:`, err);
      }
    });
  }

  clear(event?: string) {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }
}

export const eventBus = new EventBus();
