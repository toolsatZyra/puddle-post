export const STARTING_COUNT = 179;
const KEY = 'home-loads-v1';

function valid(data) {
  if (!data || !Number.isSafeInteger(data.count) || data.count < STARTING_COUNT || !Array.isArray(data.recent)) {
    throw new Error('Invalid counter record');
  }
  return data;
}

export async function readCount(store) {
  const record = await store.get(KEY, { type: 'json' });
  return record === null ? STARTING_COUNT : valid(record).count;
}

export async function recordLoad(store, id, wait = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const entry = await store.getWithMetadata(KEY, { type: 'json' });
    const current = entry ? valid(entry.data) : { count: STARTING_COUNT, recent: [] };
    if (current.recent.includes(id)) return current.count;
    const next = { count: current.count + 1, recent: [...current.recent.slice(-511), id] };
    const result = await store.setJSON(KEY, next, entry ? { onlyIfMatch: entry.etag } : { onlyIfNew: true });
    if (result.modified) {
      // The SDK can report modified=true on a failed conditional write. A real write has an ETag.
      if (!result.etag) throw new Error('Counter write was not confirmed');
      return next.count;
    }
    await wait(15 + Math.random() * Math.min(250, 20 * (attempt + 1)));
  }
  throw new Error('Counter busy');
}

export function makeHandler(getStore) {
  return async request => {
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (!['GET', 'POST'].includes(request.method)) return reply({ error: 'Method not allowed' }, 405);
    try {
      let id;
      if (request.method === 'POST') {
        if (!request.headers.get('content-type')?.startsWith('application/json')) return reply({ error: 'JSON required' }, 415);
        const text = await request.text();
        if (text.length > 100) return reply({ error: 'Payload too large' }, 413);
        try { id = JSON.parse(text).id; } catch { return reply({ error: 'Invalid JSON' }, 400); }
        if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return reply({ error: 'Invalid load ID' }, 400);
      }
      const store = getStore();
      const count = id ? await recordLoad(store, id) : await readCount(store);
      return reply({ count, startingCount: STARTING_COUNT, counts: 'home-page-loads' });
    } catch {
      return reply({ error: 'Counter temporarily unavailable' }, 503);
    }
  };
}
