import { createScoreClient } from './score-client.js';
import { recordFlight } from './score-replay.js';
const element = document.getElementById('global-high-score');
let selectedMode = 'classic', records = {}, trace;
const enabled = !import.meta.env.DEV || new URLSearchParams(location.search).has('counter');
const render = () => { element.textContent = Number.isSafeInteger(records[selectedMode]) ? records[selectedMode].toLocaleString('en-US') : '…'; };
const client = createScoreClient({
  endpoint: import.meta.env.DEV || location.hostname.endsWith('.netlify.app') ? '/api/high-score' : 'https://puddle-post.netlify.app/api/high-score',
  onScores(scores) { records = scores; render(); },
});
export function selectScoreMode(mode) { selectedMode = mode; render(); }
export function beginScoreRun(model, mode, width) { trace?.stop(); trace = recordFlight(model, mode, width); }
export function resizeScoreRun(width) { trace?.resize(width); }
export function completeScoreRun() { const replay = trace?.finish(); trace?.stop(); trace = null; if (enabled) void client.submit(replay); }
export function refreshHighScore() { if (enabled) void client.refresh(); }
if (enabled) {
  refreshHighScore();
  const refresh = () => { if (!document.hidden && (document.body.dataset.state === 'ready')) refreshHighScore(); };
  setInterval(refresh, 5000);
  document.addEventListener('visibilitychange', refresh);
} else { records = { classic: 1650, free: 1155 }; render(); }
