import test from 'node:test';
import assert from 'node:assert/strict';
import { recordFlight, MAX_STEPS } from '../src/score-replay.js';
import { verifyReplay, readHighScore, saveHighScore, makeScoreHandler } from '../netlify/functions/_shared/high-score.js';
import { MODES, createModel, resizeModel, WIDTH_RANGE } from '../netlify/functions/_shared/score-model.js';
import { createScoreClient } from '../src/score-client.js';

function store() {
  const records=new Map();let revision=0;
  return {
    async get(key){return structuredClone(records.get(key)?.data ?? null);},
    async getWithMetadata(key){return structuredClone(records.get(key) ?? null);},
    async setJSON(key,data,condition){const current=records.get(key);if(condition.onlyIfNew?Boolean(current):condition.onlyIfMatch!==current?.etag)return {modified:false};const etag=String(++revision);records.set(key,{data:structuredClone(data),etag});return {modified:true,etag};},
  };
}
const validate = replay => verifyReplay(replay,createModel,resizeModel,MODES,WIDTH_RANGE);
function flight(mode=MODES[0],withResize=false) {
  const width=WIDTH_RANGE[0]===2?19.2:1000;
  const initial={mode,seed:47,width},model=createModel(initial),trace=recordFlight(model,mode,width);
  model.flap();
  for(let frame=0;frame<120*40&&model.alive;frame++){
    if(frame===100&&withResize){const w=width*.9;trace.resize(w);resizeModel(model,w);}
    if(frame<120*10){
      if(model.points!==undefined){
        const next=model.gates.filter(g=>g.x>model.x-.95).sort((a,b)=>a.x-b.x)[0];
        if(model.y<(next?.mailY??0)-.32&&model.vy<.2)model.flap();
      }else{
        const next=model.columns.filter(c=>c.x<model.player.x+55).sort((a,b)=>b.x-a.x)[0];
        if(model.player.y>(next?.safeY??310)+8&&model.player.vy>-35)model.flap();
      }
    }
    model.step(1/120,0,mode==='free'&&frame<30);
  }
  assert.equal(model.alive,false);
  const countBefore=trace.finish().commands.length;
  trace.resize(width);model.flap();
  assert.equal(trace.finish().commands.length,countBefore,'events after a loss do not contaminate the finished replay');
  const replay=trace.finish();trace.stop();
  return {replay,score:Math.floor(model.points??model.score)};
}
test('recorded live physics replay to exactly the same score, including held lift and resize',()=>{
  for(const mode of MODES)for(const resized of [false,true]){
    const {replay,score}=flight(mode,resized);
    assert.equal(validate(replay),score);
    assert.equal(validate({...replay,score:999999999}),score,'reported score is ignored');
    assert.ok(replay.commands.length<500);
  }
});
test('unfinished, oversized, invalid-mode and post-death replays cannot set a record',()=>{
  const {replay}=flight();
  for(const invalid of [
    {...replay,commands:[]}, {...replay,mode:'made-up'}, {...replay,commands:[[MAX_STEPS+1,0,0]]},
    {...replay,commands:[...replay.commands,[0]]}, {...replay,width:Infinity},
    {...replay,commands:[[20,999,0]]},
  ])assert.throws(()=>validate(invalid));
});
test('concurrent records keep the maximum and independent modes never overwrite each other',async()=>{
  const db=store();
  await Promise.all([120,400,250,200].map(n=>saveHighScore(db,'one',n,async()=>{})));
  assert.equal(await readHighScore(db,'one'),400);
  await saveHighScore(db,'two',1155);
  assert.equal(await readHighScore(db,'one'),400);
  assert.equal(await readHighScore(db,'two'),1155);
  await saveHighScore(db,'one',100);
  assert.equal(await readHighScore(db,'one'),400);
});
test('user-supplied starting records cannot be lowered by a smaller run',async()=>{
  const db=store();
  assert.equal(await readHighScore(db,'classic',1650),1650);
  assert.equal(await saveHighScore(db,'classic',100,async()=>{},1650),1650);
  assert.equal(await saveHighScore(db,'classic',1700,async()=>{},1650),1700);
  assert.equal(await readHighScore(db,'classic',1650),1700);
  assert.equal(await readHighScore(db,'free',1155),1155);
});
test('score endpoint computes scores from real flight input and rejects arbitrary totals',async()=>{
  const db=store(),handler=makeScoreHandler(()=>db,validate,MODES);
  const send=body=>handler(new Request('https://game.test/api/high-score',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));
  const {replay,score}=flight();
  const good=await send(replay);assert.equal(good.status,200);
  assert.equal((await good.json()).highScores[replay.mode],score);
  assert.equal((await send({score:999999,mode:MODES[0]})).status,400);
  const read=await handler(new Request('https://game.test/api/high-score'));
  assert.equal(read.headers.get('cache-control'),'no-store');
  assert.equal(read.headers.get('access-control-allow-origin'),'*');
});
test('score display never regresses and service failure stays isolated from gameplay',async()=>{
  const seen=[];let calls=0;
  const client=createScoreClient({endpoint:'/',onScores:s=>seen.push(s),wait:async()=>{},fetcher:async()=>{if(++calls===3)throw new Error('offline');return Response.json({highScores:{classic:calls===1?1650:100}});}});
  await client.refresh();await client.refresh();await client.refresh();
  assert.deepEqual(seen,[{classic:1650},{classic:1650}]);
});
