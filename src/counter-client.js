export function createCounterClient({ endpoint, fetcher = fetch, makeId = () => crypto.randomUUID(), onCount, onUnavailable = () => {}, wait = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  const id = makeId();
  let recorded, maximum = 0;
  async function request(method) {
    const response = await fetcher(endpoint, {
      method, mode: 'cors', credentials: 'omit', cache: 'no-store',
      signal: AbortSignal.timeout(8000),
      ...(method === 'POST' ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) } : {}),
    });
    if (!response.ok) throw new Error('Counter unavailable');
    const { count } = await response.json();
    if (!Number.isSafeInteger(count) || count < 179) throw new Error('Invalid count');
    maximum = Math.max(maximum, count);
    onCount(maximum);
  }
  return {
    recordLoad() {
      // One logical increment per document, even when retrying a lost response.
      recorded ??= (async () => {
        for (let attempt = 0; attempt < 3; attempt++) {
          try { await request('POST'); return; } catch {
            if (attempt < 2) await wait(1000 * (attempt + 1));
          }
        }
        onUnavailable();
      })();
      return recorded;
    },
    async refresh() { try { await request('GET'); } catch { onUnavailable(); } },
  };
}
