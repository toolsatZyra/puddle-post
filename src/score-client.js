export function createScoreClient({ endpoint, onScores, fetcher = fetch, wait = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  const best = {};
  async function request(replay) {
    const response = await fetcher(endpoint, {
      method: replay ? 'POST' : 'GET', mode: 'cors', credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(15000),
      ...(replay ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(replay) } : {}),
    });
    if (!response.ok) throw new Error('Scores unavailable');
    const { highScores } = await response.json();
    if (!highScores || Object.values(highScores).some(score => !Number.isSafeInteger(score) || score < 0)) throw new Error('Invalid scores');
    for (const [mode, score] of Object.entries(highScores)) best[mode] = Math.max(best[mode] ?? 0, score);
    onScores({ ...best });
  }
  return {
    async refresh() { try { await request(); } catch {} },
    async submit(replay) {
      if (!replay) return;
      for (let i = 0; i < 3; i++) {
        try { await request(replay); return; } catch { if (i < 2) await wait(1000 * (i + 1)); }
      }
    },
  };
}
