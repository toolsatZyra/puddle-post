// Exercise only an isolated draft counter, never inflate a production counter with synthetic loads.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const base = new URL(process.argv[2]);
assert.ok(base.hostname.includes('--') && base.hostname.endsWith('.netlify.app'), 'Use a Netlify draft URL');
const endpoint = new URL('/api/game-count', base);
async function call(id) {
  let response;
  for (let attempt=0;attempt<3;attempt++) {
    response = await fetch(endpoint, id ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) } : {});
    if(response.status!==503) break;
    await new Promise(resolve=>setTimeout(resolve,1000*(attempt+1)));
  }
  assert.equal(response.status,200,await response.clone().text());
  assert.equal(response.headers.get('cache-control'),'no-store');
  return (await response.json()).count;
}
const before = await call();
const ids = Array.from({length:8},()=>randomUUID());
const values = await Promise.all(ids.map(call));
const after = await call();
assert.equal(after,before+8);
await Promise.all(ids.map(call));
assert.equal(await call(),after);
assert.equal(new Set(values).size,8);
console.log(JSON.stringify({endpoint:String(endpoint),before,after,concurrentLoads:8,retriesAdded:0,passed:true},null,2));
