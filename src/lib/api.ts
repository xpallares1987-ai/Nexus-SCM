import { queueShipmentUpdate } from './syncQueue';
import { toast } from 'sonner';

export class APIError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function fetchApi(endpoint: string, token: string | null, options: RequestInit = {}) {
  if (!token) throw new Error("No auth token available");
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  if (!navigator.onLine && options.method && ['POST', 'PUT', 'DELETE'].includes(options.method)) {
    if (endpoint.startsWith('/shipments')) {
      await queueShipmentUpdate(
        `/api${endpoint}`, 
        options.method, 
        options.body ? JSON.parse(options.body as string) : null, 
        headers as any
      );
      toast.info('Offline mode: Modification queued for background sync', { icon: '🔄' });
      window.dispatchEvent(new CustomEvent('offline_sync_queued'));
      return { success: true, offlineQueued: true, id: 'temp-id-' + Date.now() };
    }
  }

  let retries = 3;
  let response;
  
  while (retries > 0) {
    try {
      response = await fetch(`/api${endpoint}`, {
        ...options,
        headers,
      });
      
      if (response.status === 429 || response.status === 502 || response.status === 503) {
        retries--;
        if (retries > 0) {
          // Wait 1-2 seconds
          await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
          continue;
        }
      }
      break;
    } catch (err: any) {
      retries--;
      if (retries > 0) {
        // Wait 1-2 seconds
        await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
        continue;
      }
      throw new APIError(err?.message || 'Network error', 0);
    }
  }

  if (!response) {
    throw new APIError('Network error', 0);
  }

  if (response.status === 401) {
    window.dispatchEvent(new Event('auth_unauthorized'));
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorData: any = {};
    try {
      errorData = JSON.parse(errorText);
    } catch(e) {
      if (errorText.includes("Rate exceeded")) {
        errorData = { error: "Rate limit exceeded. Please try again later." };
      } else {
        console.error("Non-JSON API error response:", errorText);
      }
    }
    
    throw new APIError(errorData.error || (response.status === 502 ? 'Server is restarting, please try again.' : 'An error occurred'), response.status);
  }
  
  return response.json();
}