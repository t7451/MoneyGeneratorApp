type ApiFetchOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

export type ApiError = Error & { status?: number; details?: unknown };

function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL;
  if (!raw) return '';
  return raw.replace(/\/$/, '');
}

export function getUserId(): string {
  try {
    return localStorage.getItem('userId') || 'demo-user';
  } catch {
    return 'demo-user';
  }
}

export async function apiFetchJson<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
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
      err.details = await res.json();
    } catch {
      try {
        err.details = await res.text();
      } catch {
        err.details = undefined;
      }
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
    throw err;
  }

  return await res.blob();
}
