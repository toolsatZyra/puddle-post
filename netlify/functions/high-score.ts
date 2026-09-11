import { getStore } from '@netlify/blobs';
import { makeScoreHandler, verifyReplay } from './_shared/high-score.js';
import { MODES, createModel, resizeModel, WIDTH_RANGE } from './_shared/score-model.js';
export default (request, context) => makeScoreHandler(
  () => getStore({ name: context.deploy.published ? 'game-scores' : 'game-scores-preview', consistency: 'strong' }),
  replay => verifyReplay(replay, createModel, resizeModel, MODES, WIDTH_RANGE), MODES, { classic: 1650, free: 1155 },
)(request);
export const config = { path: '/api/high-score', rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip'], action: 'rate_limit' } };
