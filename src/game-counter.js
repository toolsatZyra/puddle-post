import { createCounterClient } from './counter-client.js';
const badge = document.getElementById('game-counter');
const value = document.getElementById('game-counter-value');
const client = createCounterClient({
  endpoint: import.meta.env.DEV || location.hostname.endsWith('.netlify.app') ? '/api/game-count' : 'https://puddle-post.netlify.app/api/game-count',
  onCount(count) { value.textContent = count.toLocaleString('en-US'); badge.dataset.connection = 'live'; value.removeAttribute('title'); },
  onUnavailable() { badge.dataset.connection = 'offline'; value.title = 'Counter connection unavailable; showing the last received total.'; },
});
const localApi = import.meta.env.DEV && new URLSearchParams(location.search).has('counter');
if (!import.meta.env.DEV || localApi) {
  void client.recordLoad();
  const refresh = () => { if (!document.hidden && (document.body.dataset.state === 'ready')) void client.refresh(); };
  setInterval(refresh, 5000);
  document.addEventListener('visibilitychange', refresh);
} else {
  value.textContent = '179';
  badge.dataset.connection = 'preview';
}
