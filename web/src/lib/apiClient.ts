type ApiFetchOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

export type ApiError = Error & { status?: number; details?: unknown };

const AUTH_EXPIRED_EVENT = 'moneygen:auth-expired';

function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL;
  if (!raw) return '';
  return raw.replace(/\/$/, '');
}

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem('auth_token');
  } catch {
    return null;
  }
}

export function getUserId(): string {
  try {
    const explicitUserId = localStorage.getItem('userId');
    if (explicitUserId) return explicitUserId;

    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser) as { id?: string };
      return parsed.id || '';
    }

    return '';
  } catch {
    return '';
  }
}

function notifyAuthExpired(reason = 'expired'): void {
  try {
    sessionStorage.setItem('auth_redirect_reason', reason);
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT, { detail: { reason } }));
  } catch {
    // ignore storage/event failures
  }
}

function shouldTriggerAuthExpiry(status: number, details: unknown): boolean {
  if (status !== 401) return false;
  if (!details || typeof details !== 'object') return true;
  const code = 'code' in details ? String((details as { code?: unknown }).code || '') : '';
  return ['NO_TOKEN', 'INVALID_TOKEN', 'AUTH_ERROR'].includes(code) || code.length === 0;
}

export async function apiFetchJson<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = baseUrl ? `${baseUrl}${path}` : path;

  const headers = new Headers(options.headers);
  if (!headers.has('x-user-id')) {
    headers.set('x-user-id', getUserId());
  }
  
  // Add auth token if available
  const token = getAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    headers.set('Content-Type', headers.get('Content-Type') || 'application/json');
    body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  const res = await fetch(url, {
    ...options,
    headers,
    body,
  });

  if (!res.ok) {
    const err: ApiError = new Error(`Request failed: ${res.status} ${res.statusText}`) as ApiError;
    err.status = res.status;
    try {
      err.details = await res.json();
    } catch {
      try {
        err.details = await res.text();
      } catch {
        err.details = undefined;
      }
    }
    if (shouldTriggerAuthExpiry(res.status, err.details)) {
      notifyAuthExpired('session_expired');
    }
    throw err;
  }

  return (await res.json()) as T;
}

export async function apiFetchText(path: string, options: ApiFetchOptions = {}): Promise<string> {
  const baseUrl = getApiBaseUrl();
  const url = baseUrl ? `${baseUrl}${path}` : path;

  const headers = new Headers(options.headers);
  if (!headers.has('x-user-id')) {
    headers.set('x-user-id', getUserId());
  }

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    headers.set('Content-Type', headers.get('Content-Type') || 'application/json');
    body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  const res = await fetch(url, {
    ...options,
    headers,
    body,
  });

  if (!res.ok) {
    const err: ApiError = new Error(`Request failed: ${res.status} ${res.statusText}`) as ApiError;
    err.status = res.status;
    try {
      err.details = await res.text();
    } catch {
      err.details = undefined;
    }
    if (shouldTriggerAuthExpiry(res.status, err.details)) {
      notifyAuthExpired('session_expired');
    }
    throw err;
  }

  return await res.text();
}

export async function apiFetchBlob(path: string, options: ApiFetchOptions = {}): Promise<Blob> {
  const baseUrl = getApiBaseUrl();
  const url = baseUrl ? `${baseUrl}${path}` : path;

  const headers = new Headers(options.headers);
  if (!headers.has('x-user-id')) {
    headers.set('x-user-id', getUserId());
  }

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    headers.set('Content-Type', headers.get('Content-Type') || 'application/json');
    body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  const res = await fetch(url, {
    ...options,
    headers,
    body,
  });

  if (!res.ok) {
    const err: ApiError = new Error(`Request failed: ${res.status} ${res.statusText}`) as ApiError;
    err.status = res.status;
    try {
      err.details = await res.text();
    } catch {
      err.details = undefined;
    }
    if (shouldTriggerAuthExpiry(res.status, err.details)) {
      notifyAuthExpired('session_expired');
    }
    throw err;
  }

  return await res.blob();
}
