import { request } from './api';
import type { HealthReport } from '@/types';

/** `GET /health` - answers with a bare object, not the data envelope. */
export function getHealth(signal?: AbortSignal): Promise<HealthReport> {
  return request<HealthReport>('/health', { signal, timeoutMs: 5000 });
}
