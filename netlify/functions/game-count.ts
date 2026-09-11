import { getStore } from '@netlify/blobs';
import { makeHandler } from './_shared/counter.js';
export default (request, context) => makeHandler(() => getStore({ name: context.deploy.published ? 'game-counter' : 'game-counter-preview', consistency: 'strong' }))(request);
export const config = { path: '/api/game-count', rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ['ip'], action: 'rate_limit' } };
