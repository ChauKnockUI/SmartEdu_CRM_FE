import type {
  PaginatedResponse,
  ApiError,
} from '../../shared/types/entities';

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  apiKey?: string;
}

export interface ApiRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
  timeout?: number;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: ApiError;
  status: number;
  statusText: string;
}

// ============= API CLIENT CLASS =============
export class ApiClient {
  private baseURL: string;
  private timeout: number;
  private headers: Record<string, string>;
  private apiKey?: string;

  constructor(config: ApiClientConfig) {
    this.baseURL = config.baseURL;
    this.timeout = config.timeout || 30000;
    this.headers = config.headers || {
      'Content-Type': 'application/json',
    };
    this.apiKey = config.apiKey;
  }

  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(`${this.baseURL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    return url.toString();
  }

  private getHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const headers = { ...this.headers, ...customHeaders };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  async request<T>(
    endpoint: string,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers: customHeaders,
      body,
      params,
      timeout = this.timeout,
    } = config;

    const url = this.buildUrl(endpoint, params);
    const requestHeaders = this.getHeaders(customHeaders);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type');
      let responseData: any;

      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      return {
        data: response.ok ? responseData : undefined,
        error: !response.ok
          ? {
              code: String(response.status),
              message: response.statusText,
              details: responseData,
            }
          : undefined,
        status: response.status,
        statusText: response.statusText,
      };
    } catch (error: any) {
      return {
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || 'Network error occurred',
        },
        status: 0,
        statusText: 'Error',
      };
    }
  }

  // Convenience methods
  async get<T>(endpoint: string, config?: Omit<ApiRequestConfig, 'method'>) {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T>(endpoint: string, body: any, config?: Omit<ApiRequestConfig, 'method' | 'body'>) {
    return this.request<T>(endpoint, { ...config, method: 'POST', body });
  }

  async put<T>(endpoint: string, body: any, config?: Omit<ApiRequestConfig, 'method' | 'body'>) {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body });
  }

  async patch<T>(endpoint: string, body: any, config?: Omit<ApiRequestConfig, 'method' | 'body'>) {
    return this.request<T>(endpoint, { ...config, method: 'PATCH', body });
  }

  async delete<T>(endpoint: string, config?: Omit<ApiRequestConfig, 'method'>) {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }
}

export const getApiConfig = (): ApiClientConfig => {
  const env = (import.meta as any).env.MODE || 'development';
  const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:3000/api';
  const apiKey = (import.meta as any).env.VITE_API_KEY;

  console.log(`🚀 Running in ${env} mode with API: ${apiBaseUrl}`);

  return {
    baseURL: apiBaseUrl,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
    apiKey,
  };
};

// ============= API CLIENT SINGLETON =============
let apiClient: ApiClient | null = null;

export const getApiClient = (): ApiClient => {
  if (!apiClient) {
    apiClient = new ApiClient(getApiConfig());
  }
  return apiClient;
};

// Reset for testing
export const resetApiClient = () => {
  apiClient = null;
};
