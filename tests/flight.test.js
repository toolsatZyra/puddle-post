import test from 'node:test';
import assert from 'node:assert/strict';
import { Flight, STEP, BASE_SPEED, DELIVERY_TIERS } from '../src/flight.js';

function pilot(m) {
  const next = m.gates.filter(g => g.x > m.x - .95).sort((a,b) => a.x - b.x)[0];
  const target = next ? next.mailY : 0;
  if (m.y < target - .32 && m.vy < .2) m.flap();
}
test('tap produces lift and releasing lets gravity bring the mouse down', () => {
  const m = new Flight(); m.flap(); for (let i=0;i<20;i++) m.step(STEP); assert.ok(m.y > .4);
  for (let i=0;i<65;i++) m.step(STEP); assert.ok(m.vy < 0);
});
test('no input ends the route instead of falling forever', () => {
  const m = new Flight(); for(let i=0;i<200;i++) m.step(STEP); assert.equal(m.alive,false); const t=m.time; assert.deepEqual(m.step(STEP),[]); assert.equal(m.time,t);
});
test('a steady pilot can deliver across 40 seeded routes without impossible passages', () => {
  for(let seed=0;seed<40;seed++) { const m=new Flight(seed); m.flap(); let deliveryEvents=0;
    for(let i=0;i<120*80 && m.alive;i++) { pilot(m); for(const e of m.step(STEP)) if(e.type==='delivery') deliveryEvents++; }
    assert.ok(m.passed >= 30, `seed ${seed}: only ${m.passed} homes, y=${m.y}`);
    assert.ok(m.delivered >= 25, `seed ${seed}: only ${m.delivered} letters`); assert.equal(m.delivered,deliveryEvents);
  }
});
test('a letter is counted only once despite many frames inside its pickup area', () => {
  const m=new Flight(); const g=m.gates[0]; g.x=m.x; g.previousX=g.x; m.y=g.mailY;
  for(let i=0;i<12;i++) m.step(STEP); assert.equal(m.delivered,1); assert.equal(g.delivered,true);
});
test('missing a mailbox does not end a safe flight', () => {
  const m=new Flight(); const g=m.gates[0]; g.x=m.x; m.y=-1.5; m.vy=1;
  for(let i=0;i<60 && m.alive;i++) { if(m.vy < 0) m.vy=0; m.step(STEP); }
  assert.equal(m.alive,true); assert.equal(m.delivered,0); assert.equal(g.missed,true);
});
test('obstacle and ceiling collisions are detected', () => {
  const m=new Flight(); m.gates[0].x=m.x; m.y=2; assert.ok(m.step(STEP).some(e=>e.type==='hit'));
  m.reset(); m.y=5; assert.ok(m.step(STEP).some(e=>e.type==='hit'));
});
test('a new route resets all score, flight, and delivery state', () => {
  const m=new Flight(); m.delivered=30; m.points=500; m.speed=8; m.passed=4; m.alive=false; m.reset(-2); assert.equal(m.x,-2); assert.equal(m.delivered,0); assert.equal(m.points,0); assert.equal(m.level,1); assert.equal(m.speed,BASE_SPEED); assert.equal(m.passed,0); assert.ok(m.alive); assert.equal(m.gates.length,6);
});
test('the first three homes are gentle, followed by visibly different bounded gap tiers', () => {
  for(let seed=0;seed<40;seed++) {
    const m=new Flight(seed); const gates=[...m.gates];
    for(let i=6;i<80;i++) gates.push(m.makeGate(i*5.8,gates.at(-1).center));
    assert.deepEqual(gates.slice(0,3).map(g=>g.gap),[4.9,4.9,4.9]);
    assert.equal(gates[3].tier,1);
    for(let i=3;i<gates.length;i++) { const g=gates[i]; assert.notEqual(g.tier,gates[i-1].tier); assert.ok(Math.abs(g.gap-gates[i-1].gap)>.5); assert.ok(g.gap>=3.06 && g.gap<=4.99); assert.equal(g.reward,DELIVERY_TIERS[g.tier].points); }
    for(let i=3;i+2<gates.length;i+=3) assert.equal(new Set(gates.slice(i,i+3).map(g=>g.tier)).size,3);
  }
});
function deliverAt(m,tier) {
  const g=m.makeGate(m.x,0); g.tier=tier; g.reward=DELIVERY_TIERS[tier].points; g.gap=DELIVERY_TIERS[tier].gap; m.gates=[g]; m.y=g.mailY; m.vy=0; return m.step(STEP);
}
test('delivery points reflect difficulty, with one bonus per five-letter streak', () => {
  const m=new Flight(); let awarded=0;
  for(const tier of [0,1,2,1,2]) { const events=deliverAt(m,tier); const e=events.find(e=>e.type==='delivery'); awarded+=e.points+e.bonus; }
  assert.equal(m.delivered,5); assert.equal(m.points,180); assert.equal(awarded,180);
  assert.equal(m.streak,5);
});
test('a missed delivery breaks the streak without removing points', () => {
  const m=new Flight(); m.points=75;m.streak=4;
  const g=m.gates[0];g.x=m.x-1.2;g.previousX=g.x; m.step(STEP);
  assert.equal(m.streak,0);assert.equal(m.points,75);assert.equal(m.level,1);
});
test('every ten deliveries levels up exactly once and compounds target speed by 15 percent', () => {
  const m=new Flight(); let levelEvents=0;
  for(let i=1;i<=30;i++) {
    const events=deliverAt(m,0);levelEvents+=events.filter(e=>e.type==='level').length;
    assert.equal(m.level,Math.floor(i/10)+1);
    assert.ok(Math.abs(m.targetSpeed-BASE_SPEED*1.15**Math.floor(i/10))<1e-10);
    assert.equal(events.filter(e=>e.type==='level').length,i%10===0?1:0);
  }
  assert.equal(levelEvents,3);
});
test('passing homes without delivering does not accelerate; level changes ease into their new speed', () => {
  const m=new Flight();m.passed=100;m.step(STEP);assert.equal(m.speed,BASE_SPEED);
  m.delivered=10;m.step(STEP);assert.ok(m.speed>BASE_SPEED&&m.speed<m.targetSpeed);
  for(let i=0;i<120;i++){m.y=0;m.vy=0;m.gates=[];m.step(STEP);}
  assert.ok(Math.abs(m.speed-m.targetSpeed)<.008);
});
test('collision cannot award a delivery or points on the same step', () => {
  const m=new Flight();const g=m.gates[0];g.x=m.x;g.mailY=2;m.y=2;
  const events=m.step(STEP);assert.deepEqual(events.map(e=>e.type),['hit']);assert.equal(m.points,0);assert.equal(m.delivered,0);
});
test('smaller umbrella clears a tight passage at the newly safe height, but still collides above it', () => {
  const m=new Flight();const g=m.gates[0];g.x=m.x;g.center=0;g.gap=3.15;
  m.y=.4;m.vy=0;m.step(STEP);assert.equal(m.alive,true);
  m.y=.6;m.vy=0;assert.ok(m.step(STEP).some(e=>e.type==='hit'));
});
