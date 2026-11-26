// Only list endpoints are cached. Details, exports and permission checks stay live.
const listPaths = /\/(?:leads(?:\/funnel|\/sources)?|students(?:\/filter-options)?|classes(?:\/filter-options)?|courses|rooms|teachers)$/;
const entries = new Map<string, { body: string; headers: Headers; status: number; statusText: string; expires: number }>();
const ttl = 30_000;
const maxEntries = 40;
let generation = 0;

export function clearListCache() {
  generation++;
  entries.clear();
}

export async function apiFetch(input: string, options: RequestInit = {}): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  const url = new URL(input, window.location.origin);
  const cacheable = method === 'GET' && listPaths.test(url.pathname) && options.cache !== 'no-store';
  const started = generation;
  const headers = new Headers(options.headers);
  // Token/header scope isolates accounts and centres, including explicit-token callers.
  url.searchParams.sort();
  if (url.pathname.endsWith('/leads/funnel')) {
    for (const key of ['page', 'limit', 'sort_by', 'sort_dir']) url.searchParams.delete(key);
  }
  const key = JSON.stringify([url.href, Array.from(headers.entries())]);
  if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const cached = cacheable ? entries.get(key) : undefined;
  if (cached && cached.expires > Date.now()) {
    return new Response(cached.body, { status: cached.status, statusText: cached.statusText, headers: cached.headers });
  }
  entries.delete(key);
  const response = await fetch(input, options);
  if (method !== 'GET' && method !== 'HEAD' && response.ok && !url.pathname.endsWith('/check-conflicts')) clearListCache();
  if (cacheable && response.ok && response.headers.get('content-type')?.includes('application/json')) {
    const body = await response.clone().text();
    let valid = false;
    try { valid = JSON.parse(body)?.success === true; } catch { /* Leave invalid API responses to the caller. */ }
    if (valid && !options.signal?.aborted && started === generation) {
      for (const [entryKey, entry] of entries) if (entry.expires <= Date.now()) entries.delete(entryKey);
      if (entries.size >= maxEntries) entries.delete(entries.keys().next().value!);
      entries.set(key, { body, headers: new Headers(response.headers), status: response.status, statusText: response.statusText, expires: Date.now() + ttl });
    }
  }
  return response;
}
