import assert from 'node:assert/strict';
import { recordFlight } from '../src/score-replay.js';
import { MODES, createModel, resizeModel } from '../netlify/functions/_shared/score-model.js';
const base = new URL(process.argv[2]);
assert.ok(base.hostname.includes('--') && base.hostname.endsWith('.netlify.app'), 'Use an isolated Netlify draft URL');
const endpoint = new URL('/api/high-score', base);
async function request(replay) {
  let response;
  for(let attempt=0;attempt<3;attempt++){
    response=await fetch(endpoint,replay?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(replay)}:{});
    if(response.status!==503)break;
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  assert.equal(response.status,200,await response.clone().text());
  return (await response.json()).highScores;
}
const before=await request(),runs=[];
for(const mode of MODES){
 const width=mode==='trip'?1000:19.2,model=createModel({mode,seed:47,width}),trace=recordFlight(model,mode,width);
 model.flap();
 for(let frame=0;model.alive&&frame<120*40;frame++){
  if(frame===100){trace.resize(width*.9);resizeModel(model,width*.9);}
  if(frame<120*10){
   if(mode==='trip'){const next=model.columns.filter(c=>c.x<model.player.x+55).sort((a,b)=>b.x-a.x)[0];if(model.player.y>(next?.safeY??310)+8&&model.player.vy>-35)model.flap();}
   else{const next=model.gates.filter(g=>g.x>model.x-.95).sort((a,b)=>a.x-b.x)[0];if(model.y<(next?.mailY??0)-.32&&model.vy<.2)model.flap();}
  }
  model.step(1/120,0,mode==='free'&&frame<30);
 }
 assert.equal(model.alive,false);
 const score=Math.floor(model.points??model.score),replay=trace.finish();
 const submitted=await request(replay),repeated=await request(replay);
 assert.equal(submitted[mode],Math.max(before[mode],score));assert.equal(repeated[mode],submitted[mode]);
 runs.push({mode,computedScore:score,sharedHighScore:submitted[mode],commands:replay.commands.length});
}
const invalid=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:MODES[0],score:999999})});
assert.equal(invalid.status,400);
console.log(JSON.stringify({endpoint:String(endpoint),before,runs,arbitraryScoreRejected:true,passed:true},null,2));
