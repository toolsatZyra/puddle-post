import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readCount, recordLoad, makeHandler } from '../netlify/functions/_shared/counter.js';
import { createCounterClient } from '../src/counter-client.js';

function memoryStore() {
  let data = null, revision = 0;
  return {
    async get() { return structuredClone(data); },
    async getWithMetadata() { return data ? { data: structuredClone(data), etag: String(revision) } : null; },
    async setJSON(key, next, conditions) {
      if (conditions.onlyIfNew ? data !== null : conditions.onlyIfMatch !== String(revision)) return { modified: false };
      data = structuredClone(next); revision++; return { modified: true, etag: String(revision) };
    },
  };
}
test('reading starts at 179 without counting a visit; accepted loads persist', async () => {
  const store=memoryStore();
  assert.equal(await readCount(store),179);
  assert.equal(await readCount(store),179);
  assert.equal(await recordLoad(store,randomUUID()),180);
  assert.equal(await readCount(store),180);
});
test('concurrent loads cannot overwrite increments; retries cannot double count', async () => {
  const store=memoryStore(),ids=Array.from({length:12},()=>randomUUID());
  await Promise.all(ids.map(id=>recordLoad(store,id,async()=>{})));
  assert.equal(await readCount(store),191);
  await Promise.all(ids.map(id=>recordLoad(store,id,async()=>{})));
  assert.equal(await readCount(store),191);
});
test('unconfirmed SDK writes and corrupt records fail without inventing a total', async () => {
  const store=memoryStore();store.setJSON=async()=>({modified:true,etag:''});
  await assert.rejects(recordLoad(store,randomUUID()),/not confirmed/);
  store.get=async()=>({count:0,recent:[]});
  await assert.rejects(readCount(store),/Invalid counter/);
});
test('API validates requests, uses noncached CORS responses, and reads never increment', async () => {
  const handler=makeHandler(()=>memoryStore());
  const read=await handler(new Request('https://game.test/api/game-count'));
  assert.equal((await read.json()).count,179);
  assert.equal(read.headers.get('cache-control'),'no-store');
  assert.equal(read.headers.get('access-control-allow-origin'),'*');
  for(const [method,body,expected] of [['DELETE',null,405],['POST','oops',400],['POST','{"id":"bad"}',400]]) {
    assert.equal((await handler(new Request('https://game.test/api/game-count',{method,...(body?{body,headers:{'content-type':'application/json'}}:{})}))).status,expected);
  }
  assert.equal((await handler(new Request('https://game.test/api/game-count',{method:'OPTIONS'}))).status,204);
  const failed=makeHandler(()=>{throw new Error('offline');});
  assert.equal((await failed(new Request('https://game.test/api/game-count'))).status,503);
});
test('one browser document records once; refresh only reads and never lowers the display', async () => {
  const methods=[],counts=[];
  const client=createCounterClient({endpoint:'/api/game-count',makeId:()=>randomUUID(),onCount:n=>counts.push(n),
    fetcher:async(url,options)=>{methods.push(options.method);return Response.json({count:methods.length===1?181:180});}});
  await Promise.all([client.recordLoad(),client.recordLoad()]);
  await client.refresh();await client.refresh();
  assert.deepEqual(methods,['POST','GET','GET']);
  assert.deepEqual(counts,[181,181,181]);
});
test('a lost increment response retries the same load ID without increasing twice', async () => {
  const store=memoryStore(),handler=makeHandler(()=>store);let calls=0,last;
  const client=createCounterClient({endpoint:'https://game.test/api/game-count',makeId:()=>randomUUID(),onCount:n=>last=n,wait:async()=>{},
    fetcher:async(url,options)=>{const response=await handler(new Request(url,options));if(calls++===0)throw new Error('lost response');return response;}});
  await client.recordLoad();
  assert.equal(calls,2);assert.equal(last,180);assert.equal(await readCount(store),180);
});
test('counter outage never displays a fabricated live total or blocks the game', async () => {
  let unavailable=0;
  const client=createCounterClient({endpoint:'/',makeId:()=>randomUUID(),onCount:()=>assert.fail('no live count'),onUnavailable:()=>unavailable++,wait:async()=>{},fetcher:async()=>{throw new Error('offline');}});
  await client.recordLoad();assert.equal(unavailable,1);
});
