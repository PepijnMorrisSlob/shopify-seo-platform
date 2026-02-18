// API Client for Shopify SEO Platform
// Handles all HTTP requests with session token authentication

import type { APIError } from '../types/api.types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export class APIClient {
  private static async getAuthHeaders(_app: any): Promise<HeadersInit> {
    // TODO: When App Bridge is configured, get session token
    // const { getSessionToken } = await import('@shopify/app-bridge/utilities');
    // const sessionToken = await getSessionToken(_app);

    return {
      'Content-Type': 'application/json',
      // TODO: Add Authorization header when App Bridge is configured
      // 'Authorization': `Bearer ${sessionToken}`,
    };
  }

  static async request<T>(
    app: any,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = await this.getAuthHeaders(app);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error: APIError = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }

  static async get<T>(app: any, endpoint: string): Promise<T> {
    return this.request<T>(app, endpoint, { method: 'GET' });
  }

  static async post<T>(app: any, endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(app, endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  static async put<T>(app: any, endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(app, endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  static async delete<T>(app: any, endpoint: string): Promise<T> {
    return this.request<T>(app, endpoint, { method: 'DELETE' });
  }
}
