import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from './secure-storage';
import { getTenantDomain } from './tenant';
import { API_URL } from '../constants/config';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ──────────────── Network logging (dev only) ────────────────
//
// Streams every request, response, and error to the Metro terminal so the
// collector portal is debuggable without running a proxy. Disabled in
// production so that no PII or auth tokens leak into release logs.

const NETWORK_LOG_ENABLED = __DEV__;

/**
 * The api-client lives below the auth store in the import graph (auth store
 * imports it), so we use a lazy callback hook to avoid a cycle. The auth
 * store registers its "session lost" handler at startup; the response
 * interceptor calls it whenever refresh-token rotation fails.
 */
let onSessionLost: (() => void) | null = null;
export function setOnSessionLost(handler: (() => void) | null) {
  onSessionLost = handler;
}

interface RequestMeta {
  startedAt: number;
}

// Max characters of a JSON body to print before truncating. Tunable.
const LOG_BODY_MAX_CHARS = 600;
// Arrays larger than this print only metadata (length + first-item shape).
const LOG_ARRAY_MAX_ITEMS = 3;

const redact = (data: unknown): unknown => {
  if (!data || typeof data !== 'object') return data;
  // Redact common secret fields when logging
  const REDACT_KEYS = new Set([
    'password',
    'newPassword',
    'currentPassword',
    'refreshToken',
    'accessToken',
    'token',
    'otp',
    'smsCode',
    'idCardPhoto', // can be a long base64 blob; replace with a marker
  ]);
  if (Array.isArray(data)) {
    if (data.length > LOG_ARRAY_MAX_ITEMS) {
      return [
        ...data.slice(0, LOG_ARRAY_MAX_ITEMS).map(redact),
        `<+${data.length - LOG_ARRAY_MAX_ITEMS} more items>`,
      ];
    }
    return data.map(redact);
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (REDACT_KEYS.has(k)) {
      if (typeof v === 'string' && v.startsWith('data:')) {
        out[k] = `<data url ${v.length} bytes>`;
      } else {
        out[k] = '<redacted>';
      }
    } else {
      out[k] = redact(v);
    }
  }
  return out;
};

const formatBody = (data: unknown): string => {
  let body = data;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { /* keep as string */ }
  }
  const redacted = redact(body);
  let str: string;
  try {
    str = typeof redacted === 'string' ? redacted : JSON.stringify(redacted);
  } catch {
    return '<unserializable>';
  }
  if (str.length > LOG_BODY_MAX_CHARS) {
    return str.slice(0, LOG_BODY_MAX_CHARS) + `… <+${str.length - LOG_BODY_MAX_CHARS} chars>`;
  }
  return str;
};

const fmtUrl = (config: InternalAxiosRequestConfig): string => {
  const base = (config.baseURL ?? '').replace(/\/$/, '');
  const path = config.url ?? '';
  const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  if (!config.params || Object.keys(config.params).length === 0) return url;
  const qs = new URLSearchParams(
    Object.entries(config.params as Record<string, unknown>)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => [k, String(v)]),
  ).toString();
  return `${url}${url.includes('?') ? '&' : '?'}${qs}`;
};

const logRequest = (config: InternalAxiosRequestConfig) => {
  if (!NETWORK_LOG_ENABLED) return;
  const method = (config.method ?? 'get').toUpperCase();
  // eslint-disable-next-line no-console
  console.log(`▶ ${method} ${fmtUrl(config)}`);
  if (config.data !== undefined) {
    // eslint-disable-next-line no-console
    console.log('  ↳ payload', formatBody(config.data));
  }
};

const logResponse = (response: { config: InternalAxiosRequestConfig; status: number; data: unknown }) => {
  if (!NETWORK_LOG_ENABLED) return;
  const meta = (response.config as InternalAxiosRequestConfig & { _meta?: RequestMeta })._meta;
  const ms = meta ? Date.now() - meta.startedAt : null;
  const method = (response.config.method ?? 'get').toUpperCase();
  // eslint-disable-next-line no-console
  console.log(
    `◀ ${response.status} ${method} ${fmtUrl(response.config)}${ms !== null ? ` · ${ms}ms` : ''}`,
  );
  if (response.data !== undefined) {
    // eslint-disable-next-line no-console
    console.log('  ↳ response', formatBody(response.data));
  }
};

const logError = (error: AxiosError) => {
  if (!NETWORK_LOG_ENABLED) return;
  const meta = (error.config as (InternalAxiosRequestConfig & { _meta?: RequestMeta }) | undefined)?._meta;
  const ms = meta ? Date.now() - meta.startedAt : null;
  const method = (error.config?.method ?? 'get').toUpperCase();
  const url = error.config ? fmtUrl(error.config as InternalAxiosRequestConfig) : '<unknown>';
  const status = error.response?.status ?? error.code ?? 'NETWORK';
  // eslint-disable-next-line no-console
  console.warn(`✖ ${status} ${method} ${url}${ms !== null ? ` · ${ms}ms` : ''}`);
  if (error.response?.data !== undefined) {
    // eslint-disable-next-line no-console
    console.warn('  ↳ error body', formatBody(error.response.data));
  } else if (error.message) {
    // eslint-disable-next-line no-console
    console.warn('  ↳', error.message);
  }
};

// Request interceptor: attach access token + start timer + log
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const tenantDomain = await getTenantDomain();
  if (tenantDomain) {
    config.headers['X-Tenant-Domain'] = tenantDomain;
  }
  // Stash a timer for the response interceptor to pick up
  (config as InternalAxiosRequestConfig & { _meta?: RequestMeta })._meta = {
    startedAt: Date.now(),
  };
  logRequest(config);
  return config;
});

// Response interceptor: log + handle 401 + refresh token
apiClient.interceptors.response.use(
  (response) => {
    logResponse(response);
    return response;
  },
  async (error: AxiosError) => {
    logError(error);
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const tenantDomain = await getTenantDomain();
        const { data } = await axios.post(
          `${API_URL}/auth/refresh`,
          { refreshToken },
          { headers: tenantDomain ? { 'X-Tenant-Domain': tenantDomain } : {} },
        );

        const newAccessToken = data.data?.accessToken || data.accessToken;
        const newRefreshToken = data.data?.refreshToken || data.refreshToken;

        await SecureStore.setItemAsync('accessToken', newAccessToken);
        await SecureStore.setItemAsync('refreshToken', newRefreshToken);

        if (originalRequest.headers) {
          (originalRequest.headers as Record<string, string>).Authorization =
            `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest);
      } catch {
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        // Notify the auth store so the redirector can send the user to /login.
        // Without this the UI would happily keep firing requests with no token.
        onSessionLost?.();
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
