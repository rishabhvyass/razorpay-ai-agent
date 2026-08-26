import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_CONFIG } from './config';
import { ApiEnvelope, ApiErrorBody } from '../types';

export class AppApiError extends Error {
  code: string;
  status: number;
  requestId?: string;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, status = 500, requestId?: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AppApiError';
    this.code = code;
    this.status = status;
    this.requestId = requestId;
    this.details = details;
  }
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.baseUrl,
  timeout: API_CONFIG.timeoutMs,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Dynamically update baseURL if API_CONFIG changes
apiClient.interceptors.request.use((config) => {
  config.baseURL = API_CONFIG.baseUrl;
  return config;
});

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (data && data.error) {
        throw new AppApiError(
          data.error.code || 'API_ERROR',
          data.error.message || 'An unexpected error occurred.',
          status,
          data.error.requestId,
          data.error.details,
        );
      }

      throw new AppApiError(
        `HTTP_${status}`,
        `Server returned error status ${status}.`,
        status,
      );
    }

    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new AppApiError(
        'NETWORK_TIMEOUT',
        'Request timed out. Please check your connection or server status.',
        408,
      );
    }

    throw new AppApiError(
      'NETWORK_UNAVAILABLE',
      "Can't connect to Checkout Concierge backend. Check if backend is running.",
      0,
    );
  },
);

export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await apiClient.get<ApiEnvelope<T> | T>(url, config);
  const body = res.data;
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as ApiEnvelope<T>).data;
  }
  return body as T;
}

export async function post<T, B = unknown>(url: string, data?: B, config?: AxiosRequestConfig): Promise<T> {
  const res = await apiClient.post<ApiEnvelope<T> | T>(url, data, config);
  const body = res.data;
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as ApiEnvelope<T>).data;
  }
  return body as T;
}

export async function patch<T, B = unknown>(url: string, data?: B, config?: AxiosRequestConfig): Promise<T> {
  const res = await apiClient.patch<ApiEnvelope<T> | T>(url, data, config);
  const body = res.data;
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as ApiEnvelope<T>).data;
  }
  return body as T;
}
