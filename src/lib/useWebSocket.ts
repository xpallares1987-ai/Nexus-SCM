import { useEffect, useState } from 'react';
import { eventBus, EventTypes } from './eventBus.ts';

export function useWebSocket() {
  const [lastMessage, setLastMessage] = useState<any>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let eventSource: EventSource | null = null;
    let retryTimeout: any;
    let isClosedIntentionally = false;
    let connectingSse = false;

    const connectWs = () => {
      if (isClosedIntentionally) return;
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log('Attempting WebSocket connection to:', wsUrl);
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected successfully');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          
          const customEvent = new CustomEvent('ws-message', { detail: data });
          document.dispatchEvent(customEvent);
          
          // Emit via Event Bus for Clean Code architecture
          eventBus.emit(EventTypes.SHIPMENT_UPDATED, data);
        } catch (e) {
          console.error('Failed to parse WebSocket message', e);
        }
      };

      ws.onerror = (error) => {
        // console.warn('WebSocket error, falling back to SSE...');
        // We do not call connectSse here, we let onclose handle it to avoid duplicate connections
      };

      ws.onclose = (event) => {
        if (!isClosedIntentionally && !connectingSse) {
          // console.log('WebSocket closed. Switching to SSE fallback...');
          connectingSse = true;
          // Small delay before fallback
          retryTimeout = setTimeout(connectSse, 1000);
        }
      };
    };

    const connectSse = () => {
      if (isClosedIntentionally) return;
      console.log('Attempting SSE fallback connection...');
      
      if (eventSource) {
        eventSource.close();
      }
      
      eventSource = new EventSource('/api/events');

      eventSource.onopen = () => {
        console.log('SSE fallback connected successfully');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          
          const customEvent = new CustomEvent('ws-message', { detail: data });
          document.dispatchEvent(customEvent);
          
          // Emit via Event Bus for Clean Code architecture
          eventBus.emit(EventTypes.SHIPMENT_UPDATED, data);
        } catch (e) {
          console.error('Failed to parse SSE message', e);
        }
      };

      eventSource.onerror = (error) => {
        // The browser will automatically attempt to reconnect EventSource
        if (!isClosedIntentionally) {
          console.warn('SSE connection error. Browser will attempt to auto-reconnect...');
        }
      };
    };

    // Try WS first
    connectWs();

    return () => {
      isClosedIntentionally = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (ws) ws.close();
      if (eventSource) eventSource.close();
    };
  }, []);

  return lastMessage;
}
