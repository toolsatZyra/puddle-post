import { REPLAY_VERSION, MAX_STEPS, MAX_COMMANDS } from '../../../src/score-replay.js';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export function verifyReplay(replay, createModel, resizeModel, modes, widthRange) {
  if (!replay || replay.version !== REPLAY_VERSION || !modes.includes(replay.mode) ||
      !Number.isInteger(replay.seed) || replay.seed < 0 || replay.seed > 0xffffffff ||
      !Number.isFinite(replay.width) || replay.width < widthRange[0] || replay.width > widthRange[1] ||
      !Array.isArray(replay.commands) || replay.commands.length > MAX_COMMANDS) throw new Error('Invalid replay');
  const model = createModel(replay);
  let steps = 0;
  for (const command of replay.commands) {
    if (!Array.isArray(command) || !model.alive) throw new Error('Invalid command');
    if (command.length === 1 && command[0] === 0) { model.flap(); continue; }
    if (command.length === 2 && command[0] === -1) {
      if (!Number.isFinite(command[1]) || command[1] < widthRange[0] || command[1] > widthRange[1]) throw new Error('Invalid resize');
      resizeModel(model, command[1]); continue;
    }
    const [frames, axis, lift] = command;
    if (command.length !== 3 || !Number.isInteger(frames) || frames < 1 || ![-1,0,1].includes(axis) || ![0,1].includes(lift) || (steps += frames) > MAX_STEPS) throw new Error('Invalid input');
    for (let i = 0; i < frames; i++) {
      if (!model.alive) throw new Error('Input after game over');
      model.step(1/120, axis, Boolean(lift));
    }
  }
  if (model.alive || steps === 0) throw new Error('Unfinished flight');
  return Math.floor(model.points ?? model.score);
}

export async function readHighScore(store, mode, baseline = 0) {
  const data = await store.get('high-score-v1-' + mode, { type: 'json' });
  if (data === null) return baseline;
  if (!Number.isSafeInteger(data.score) || data.score < 0) throw new Error('Invalid saved score');
  return Math.max(baseline, data.score);
}
export async function saveHighScore(store, mode, score, backoff = wait, baseline = 0) {
  const key = 'high-score-v1-' + mode;
  for (let attempt = 0; attempt < 20; attempt++) {
    const entry = await store.getWithMetadata(key, { type: 'json' });
    const current = Math.max(baseline, entry?.data.score ?? 0);
    if (!Number.isSafeInteger(current) || current < 0) throw new Error('Invalid saved score');
    if (score <= current) return current;
    const result = await store.setJSON(key, { score, updatedAt: new Date().toISOString() }, entry ? { onlyIfMatch: entry.etag } : { onlyIfNew: true });
    if (result.modified) {
      if (!result.etag) throw new Error('Unconfirmed score write');
      return score;
    }
    await backoff(20 + Math.random() * 150);
  }
  throw new Error('Score service busy');
}
export function makeScoreHandler(getStore, validate, modes, baselines = {}) {
  return async request => {
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
    const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (!['GET','POST'].includes(request.method)) return reply({ error: 'Method not allowed' }, 405);
    try {
      let replay, score;
      if (request.method === 'POST') {
        if (!request.headers.get('content-type')?.startsWith('application/json')) return reply({ error: 'JSON required' }, 415);
        const raw = await request.text();
        if (raw.length > 256000) return reply({ error: 'Replay too large' }, 413);
        try { replay = JSON.parse(raw); score = validate(replay); } catch { return reply({ error: 'Invalid flight' }, 400); }
      }
      const store = getStore();
      if (replay) await saveHighScore(store, replay.mode, score, wait, baselines[replay.mode] ?? 0);
      const highScores = Object.fromEntries(await Promise.all(modes.map(async mode => [mode, await readHighScore(store, mode, baselines[mode] ?? 0)])));
      return reply({ highScores });
    } catch { return reply({ error: 'Scores temporarily unavailable' }, 503); }
  };
}
