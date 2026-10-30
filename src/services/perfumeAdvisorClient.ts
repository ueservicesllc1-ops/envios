import { getApiUrl } from '../config/api.config';

export interface EnrichedPerfumeResponse {
  success: boolean;
  perfume?: any;
  error?: string;
}

export const perfumeAdvisorClient = {
  async investigatePreview(params: { name?: string; brand?: string; barcode?: string; sku?: string }): Promise<{
    success: boolean;
    analysis?: any;
    error?: string;
  }> {
    const url = getApiUrl('/api/perfumes/investigate-preview');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return await res.json();
  },

  async enrichOne(productId: string): Promise<EnrichedPerfumeResponse> {
    const url = getApiUrl('/api/perfumes/enrich-one');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId })
    });
    return await res.json();
  },

  async syncPending(limit: number = 10, mode: 'inventory' | 'catalog' = 'catalog'): Promise<{ success: boolean; processed: number; details: string[]; error?: string }> {
    const url = getApiUrl('/api/perfumes/sync-pending');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit, mode })
    });
    return await res.json();
  },

  async configKey(apiKey: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const url = getApiUrl('/api/perfumes/config-key');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey })
    });
    return await res.json();
  },

  async getStatus(): Promise<{ success: boolean; hasGeminiKey: boolean; totalPerfumes: number; enrichedCount: number; pendingCount: number }> {
    const url = getApiUrl('/api/perfumes/status');
    const res = await fetch(url);
    return await res.json();
  },

  async getRequested(): Promise<{ success: boolean; count: number; items: any[]; error?: string }> {
    const url = getApiUrl('/api/perfumes/requested');
    const res = await fetch(url);
    return await res.json();
  },

  async updateRequestStatus(id: string, status: string): Promise<{ success: boolean; error?: string }> {
    const url = getApiUrl(`/api/perfumes/requested/${id}`);
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return await res.json();
  }
};
