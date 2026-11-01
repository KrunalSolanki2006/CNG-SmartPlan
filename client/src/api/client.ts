import { ApiResponseError, ApiErrorDetail } from '../types/api';

export class ApiError extends Error {
  public code: string;
  public status: number;
  public fields?: Record<string, string[]> | null;

  constructor(status: number, errorDetail: ApiErrorDetail) {
    super(errorDetail.message || `API Error: ${errorDetail.code || status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = errorDetail.code || 'UNKNOWN_ERROR';
    this.fields = errorDetail.fields;
  }
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
}

const DEFAULT_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || '/api/v1';

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, timeoutMs = 15000, signal, headers, ...customConfig } = options;

  // Build URL with query params
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let url = `${DEFAULT_BASE_URL}${cleanEndpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  // Set up abort controller for timeout and cancellation
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const combinedSignal = signal
    ? composeAbortSignals(signal, controller.signal)
    : controller.signal;

  try {
    const response = await fetch(url, {
      ...customConfig,
      signal: combinedSignal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorDetail: ApiErrorDetail = {
        code: `HTTP_${response.status}`,
        message: response.statusText || 'Request failed',
        fields: null,
      };

      try {
        const errorJson = (await response.json()) as ApiResponseError;
        if (errorJson && errorJson.error) {
          errorDetail = errorJson.error;
        }
      } catch {
        // Response was not JSON, fallback to standard HTTP status message
      }

      throw new ApiError(response.status, errorDetail);
    }

    // 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof ApiError) {
      throw err;
    }

    if (err instanceof DOMException && err.name === 'AbortError') {
      if (signal?.aborted) {
        const abortErr = new Error('The request was cancelled.');
        abortErr.name = 'AbortError';
        throw abortErr;
      }
      throw new ApiError(408, {
        code: 'REQUEST_TIMEOUT',
        message: 'The request took too long or was cancelled.',
        fields: null,
      });
    }

    throw new ApiError(0, {
      code: 'NETWORK_ERROR',
      message: err instanceof Error ? err.message : 'Unable to connect to the backend server.',
      fields: null,
    });
  }
}

function composeAbortSignals(signal1: AbortSignal, signal2: AbortSignal): AbortSignal {
  if (signal1.aborted) return signal1;
  if (signal2.aborted) return signal2;

  const controller = new AbortController();
  const onAbort = () => controller.abort();

  signal1.addEventListener('abort', onAbort, { once: true });
  signal2.addEventListener('abort', onAbort, { once: true });

  return controller.signal;
}
