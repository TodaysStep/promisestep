/** Public reference service. No private record reads, credential handling, or remote mutations. */
export function createPublicAPI(resources, { release = 'ps-local-core-20261102.1' } = {}) {
  const responses = new Map(Object.entries(resources).map(([key, value]) => [key, JSON.stringify(value)]));
  const allowed = 'GET, HEAD, OPTIONS';
  return async function publicAPI(request) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return null;
    const base = { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Access-Control-Allow-Origin': '*', 'X-PromiseStep-Release': release, 'Cache-Control': 'no-store' };
    const error = (status, code, message, headers = {}) => new Response(request.method === 'HEAD' ? null : JSON.stringify({ error: { code, message }, release, docs: '/docs/api.html' }), { status, headers: { ...base, ...headers } });
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return error(405, 'READ_ONLY_API', 'This public reference API accepts no writes.', { Allow: allowed });
    if (url.search) return error(400, 'UNSUPPORTED_QUERY', 'Do not submit private work, credentials, or parameters to this public reference API.');
    const entry = responses.get(url.pathname);
    if (entry === undefined) return error(404, 'RESOURCE_NOT_FOUND', 'No public reference resource exists at this path.');
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...base, Allow: allowed, 'Access-Control-Allow-Methods': allowed, 'Access-Control-Allow-Headers': 'Accept, If-None-Match', 'Access-Control-Max-Age': '600' } });
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(entry))), b => b.toString(16).padStart(2, '0')).join('');
    const etag = '"' + hash + '"';
    const headers = { ...base, ETag: etag, 'Cache-Control': 'public, max-age=60', 'Access-Control-Expose-Headers': 'ETag, X-PromiseStep-Release', 'Content-Length': String(new TextEncoder().encode(entry).byteLength) };
    const matches = (request.headers.get('if-none-match') ?? '').split(',').map(x => x.trim().replace(/^W\//, ''));
    if (matches.includes(etag) || matches.includes('*')) { delete headers['Content-Length']; return new Response(null, { status: 304, headers }); }
    return new Response(request.method === 'HEAD' ? null : entry, { status: 200, headers });
  };
}
