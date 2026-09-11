import './style.css';
import './game-counter.css';
import './game-counter.js';
import { Flight, STEP, DELIVERY_TIERS, BASE_SPEED } from './flight.js';
import { FreeFlight, FREE_LABELS } from './free-flight.js';
import { Village } from './scene.js';
import { Sound } from './audio.js';

const $ = id => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let village, state = 'loading', accumulator = 0, previous = 0, deathAge = 0, run = 0, best = 0, bestHomes = 0, bestLetters = 0, toastTime = 0, popupAnimation;
const sound = new Sound(), neighborhoods = ['WILLOW LANE', 'TEACUP TERRACE', 'CLOVER COMMON', 'LANTERN GARDENS'];
let model = new Flight(47), mode = 'classic';
const steering = new Set(), touchInput = new Map();
function clearSteering() { steering.clear(); touchInput.clear(); }
function chooseMode(next) {
  testPilot=false;
  mode=next;model=next==='free'?new FreeFlight(47):new Flight(47);document.body.dataset.mode=next;
  model.reset(-village.worldW*.24);model.bound=village.worldW/2-.65;
  $('classic-mode').setAttribute('aria-pressed',String(next==='classic'));$('free-mode').setAttribute('aria-pressed',String(next==='free'));
  $('control-hint').innerHTML=next==='free'?'<kbd>←</kbd> <kbd>→</kbd> steer · <kbd>SPACE</kbd> lift':'<kbd>SPACE</kbd> or tap to float';
  $('guide').textContent=next==='free'?'← → to steer and brake. Choose your letters. Avoid the storm sparks.':'Tap gently to lift. Float near an envelope to deliver.';
  $('world').setAttribute('aria-label',next==='free'?'Puddle Post Free Flight. Use left and right to steer and brake, and Space or Up to lift. Collect optional letters and avoid moving storm sparks.':'Puddle Post game. Tap or press Space to lift the mouse. Float through leafy gaps and close to glowing envelopes to deliver letters.');
  best=0;bestLetters=0;bestHomes=0;try{const saved=JSON.parse(localStorage.getItem(next==='free'?'puddle-post.free-records':'puddle-post.records')||'{}');best=Number(saved.points)||0;bestLetters=Number(saved.letters)||0;bestHomes=Number(saved.homes)||0;}catch{}
  $('best').textContent=String(best).padStart(2,'0');
}
let testPilot = false;
let recoveryCheck = 0;
try { const saved = JSON.parse(localStorage.getItem('puddle-post.records') || '{}'); best = Math.max(0, Math.floor(Number(saved.points) || 0)); bestLetters = Math.max(0, Math.floor(Number(saved.letters) || 0)); bestHomes = Math.max(0, Math.floor(Number(saved.homes) || 0)); } catch {}
$('best').textContent = String(best).padStart(2, '0');
function setState(next) {
  state = next; document.body.dataset.state = next; village?.setState(next);
  if(next!=='playing')clearSteering();
  $('intro').inert = next !== 'ready'; $('pause-panel').hidden = next !== 'paused'; $('result-panel').hidden = next !== 'over';
  $('hud').setAttribute('aria-hidden',String(next !== 'playing' && next !== 'paused'));
  document.querySelector('header').inert = next === 'paused' || next === 'over';
  $('world').tabIndex = next === 'paused' || next === 'over' ? -1 : 0;
}
function hud() {
  $('points').textContent = model.points; $('delivered').textContent = model.delivered; $('passed').textContent = model.passed;
  $('level').textContent = `LEVEL ${model.level}`; $('level-progress').textContent = `${model.delivered % 10}/10 deliveries to level ${model.level + 1}`;
  $('speed').textContent = `${Math.round(model.targetSpeed / (BASE_SPEED*(model.free?.65:1)) * 100)}% SPEED`;
  $('neighborhood').textContent = neighborhoods[Math.floor(model.passed / 5) % neighborhoods.length];
  [...$('route-dots').children].forEach((el, i) => el.classList.toggle('done', i < model.delivered % 10));
}
function toast(message) { $('toast').textContent = message; $('toast').classList.add('visible'); toastTime = 3; }
function start() {
  if (!village || state === 'loading') return;
  testPilot=false;recoveryCheck=0;village.gates.forEach(g=>{g.id=-1;g.deliveryAge=-1;});
  clearSteering(); model.seed = mode==='free'?crypto.getRandomValues(new Uint32Array(1))[0]:47 + run++ * 17; model.reset(-village.worldW * .24); model.bound=village.worldW/2-.65; setState('playing'); accumulator = 0; previous = performance.now(); deathAge = 0; hud();
  $('guide').classList.add('visible'); $('toast').classList.remove('visible'); $('toast').textContent=''; toastTime=0; popupAnimation?.cancel(); $('delivery-pop').style.opacity = '0';
  sound.resume(); flap(); $('world').focus({ preventScroll: true });
}
function flap() { model.flap(); village.flap(); sound.lift(); }
function pause() { if (state !== 'playing') return; setState('paused'); sound.pause(); $('resume').focus({ preventScroll: true }); }
function resume() { if (state !== 'paused') return; setState('playing'); sound.resume(); accumulator = 0; previous = performance.now(); $('world').focus({ preventScroll: true }); }
function home() { setState('ready'); model.reset(-village.worldW * .24); $('start').focus({ preventScroll: true }); $('toast').classList.remove('visible'); popupAnimation?.cancel(); }
function act() { if (state === 'ready' || state === 'over') start(); else if (state === 'playing') flap(); }
function delivery(event) {
  village.delivered(event.gate.id); sound.chime(); hud();
  const p = village.screenPoint(model.x, model.y + 1.9), el = $('delivery-pop');
  el.textContent = `${model.free?FREE_LABELS[event.gate.tier]:DELIVERY_TIERS[event.gate.tier].name} · +${event.points} pts${event.bonus ? ' · +20 streak!' : ''}`;
  el.style.left = `${Math.min(innerWidth - 215, Math.max(15, p.x - 85))}px`; el.style.top = `${Math.max(150, p.y)}px`;
  popupAnimation?.cancel(); popupAnimation = el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)', offset: .16 }, { opacity: 1, transform: 'translateY(-7px)', offset: .7 }, { opacity: 0, transform: 'translateY(-18px)' }], { duration: reduced ? 1000 : 1600 });
  if (event.bonus) toast(`${event.streak} in a row · +20 streak points!`);
}
function finish() {
  const record = model.points > best; best = Math.max(best, model.points); bestLetters = Math.max(bestLetters, model.delivered); bestHomes = Math.max(bestHomes, model.passed);
  try { localStorage.setItem(mode==='free'?'puddle-post.free-records':'puddle-post.records', JSON.stringify({ version:2, points:best, letters:bestLetters, homes:bestHomes })); } catch {}
  $('best').textContent = String(best).padStart(2, '0'); $('result-points').textContent = model.points; $('result-letters').textContent = model.delivered; $('result-level').textContent = model.level; $('result-homes').textContent=model.passed;
  $('result-title').innerHTML = model.delivered ? 'A little rain.<br/>A lot of heart.' : 'Every journey<br/>starts with a hop.';
  $('result-message').textContent = model.delivered ? `${model.delivered === 1 ? 'One doorstep is' : `${model.delivered} doorsteps are`} a little happier because of you.` : 'Small, steady taps keep your umbrella afloat.';
  $('new-best').textContent = record ? 'A NEW PERSONAL BEST. SPECIAL DELIVERY!' : best ? `YOUR BEST SCORE: ${best} POINTS` : 'There’s a letter with your name on it.';
  $('toast').classList.remove('visible'); setState('over'); $('retry').focus({ preventScroll: true });
}
$('start').onclick = start; $('retry').onclick = start; $('pause').onclick = pause; $('resume').onclick = resume; $('home').onclick = home; $('pause-home').onclick = home;
$('classic-mode').onclick=()=>chooseMode('classic');$('free-mode').onclick=()=>chooseMode('free');
for(const b of document.querySelectorAll('#free-controls button')){b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);touchInput.set(e.pointerId,b.dataset.action);});for(const action of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(action,e=>touchInput.delete(e.pointerId));}
$('sound').onclick = () => { const enabled = sound.toggle(); document.body.dataset.sound = enabled ? 'on' : 'off'; $('sound').setAttribute('aria-label', enabled ? 'Mute sound' : 'Enable sound'); $('sound').setAttribute('aria-pressed', String(enabled)); };
document.addEventListener('pointerdown', e => { if (e.target.closest('button,a,.overlay,.game-counter') || e.button !== 0 || !e.isPrimary) return; e.preventDefault(); act(); });
document.addEventListener('keydown', e => {
  if (e.target.closest('.game-counter')) return;
  if(mode==='free'&&['ArrowLeft','ArrowRight','KeyA','KeyD','KeyX'].includes(e.code)){e.preventDefault();if(state==='playing')steering.add(e.code);}
  if (e.code === 'Tab' && (state === 'paused' || state === 'over')) {
    const buttons = [...$(state === 'paused' ? 'pause-panel' : 'result-panel').querySelectorAll('button')];
    if (e.shiftKey && document.activeElement === buttons[0]) { e.preventDefault(); buttons.at(-1).focus(); }
    else if (!e.shiftKey && document.activeElement === buttons.at(-1)) { e.preventDefault(); buttons[0].focus(); }
  }
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { if (e.target.closest('button,a') && e.code === 'Space') return; e.preventDefault(); if (!e.repeat) act(); }
  if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) { e.preventDefault(); state === 'paused' ? resume() : pause(); }
  if (e.code === 'KeyM' && !e.repeat) $('sound').click();
});
document.addEventListener('keyup',e=>steering.delete(e.code));
window.addEventListener('blur', pause); document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); previous = performance.now(); accumulator = 0; });
window.addEventListener('resize', () => { if (!village) return; pause(); const oldX = model.x; village.resize(); model.x = -village.worldW * .24; model.previousX=model.x;model.bound=village.worldW/2-.65; const dx = model.x - oldX; model.gates.forEach(g => { g.x += dx; g.previousX += dx; }); model.hazards?.forEach(h=>{h.x+=dx;h.previousX+=dx;}); });
$('world').addEventListener('webglcontextlost', e => { e.preventDefault(); pause(); $('error-message').textContent = 'The rain interrupted the canvas. Reload the village to take another trip.'; $('error').hidden = false; });
try {
  village = new Village($('world'), reduced); model.reset(-village.worldW * .24); setState('ready'); $('start').disabled = false; $('start-label').textContent = 'Make someone’s day';
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('verify')) {
    const panel = document.createElement('div'); panel.id = 'verification-controls'; panel.style.cssText = 'position:fixed;bottom:8px;right:8px;z-index:25;background:#fff5db;padding:8px;border-radius:8px;font-size:11px;display:flex;gap:8px';
    const check = document.createElement('button'); check.textContent = 'Run 22-delivery flight check'; check.onclick = () => { start(); testPilot = true; };
    const stop = document.createElement('button'); stop.textContent = 'Release controls'; stop.onclick = () => testPilot = false;
    const recovery = document.createElement('button'); recovery.textContent='Check falling recovery'; recovery.onclick=()=>{chooseMode('free');start();model.y=-2.8;model.previousY=-2.8;model.vy=-3.6;model.flapCooldown=0;recoveryCheck=1;};
    panel.append(check,stop,recovery); document.body.appendChild(panel);
  }
  const metricsEl = document.createElement('output'); metricsEl.id = 'dev-metrics'; metricsEl.hidden = true; document.body.appendChild(metricsEl);
  let metricTime = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const raw = previous ? (now - previous) / 1000 : 1 / 60; const dt = Math.min(.05, Math.max(0, raw)); previous = now;
    if (document.hidden) return;
    if (state === 'playing') {
      accumulator += dt;
      while (accumulator >= STEP && state === 'playing') {
        if(import.meta.env.DEV&&recoveryCheck){if(recoveryCheck===1&&model.time>=.12){flap();recoveryCheck=2;}if(recoveryCheck===2&&model.time>=.6){recoveryCheck=0;pause();break;}}
        if (testPilot) {
          const next = model.gates.filter(g => g.x > model.x - .95).sort((a,b) => a.x-b.x)[0];
          if (model.y < (next?.mailY ?? 0) - .32 && model.vy < .2) flap();
          if (model.delivered >= 22 || model.passed >= 32) { testPilot = false; pause(); break; }
        }
        const axis=Number(steering.has('ArrowRight')||steering.has('KeyD')||[...touchInput.values()].includes('right'))-Number(steering.has('ArrowLeft')||steering.has('KeyA')||[...touchInput.values()].includes('left'));
        for (const event of model.step(STEP,axis,steering.has('KeyX')||[...touchInput.values()].includes('lift'))) {
          if (event.type === 'delivery') delivery(event);
          if (event.type === 'pass') hud();
          if (event.type === 'level') { hud(); toast(`Level ${event.level} · 15% faster. Keep floating!`); }
          if (event.type === 'hit') { setState('dying'); sound.bump(); $('guide').classList.remove('visible'); }
        }
        accumulator -= STEP;
      }
      if (model.time > 9) $('guide').classList.remove('visible');
      const next=model.gates.filter(g=>!g.delivered&&!g.missed&&(model.free||g.x+.35>model.x-.8)).sort((a,b)=>model.free?Math.hypot(a.x-model.x,a.mailY-model.y)-Math.hypot(b.x-model.x,b.mailY-model.y):a.x-b.x)[0];
      if (next) { $('next-reward').textContent=`${model.free?FREE_LABELS[next.tier]:DELIVERY_TIERS[next.tier].name} · ${next.reward} pts`; $('next-delivery').dataset.tier=String(next.tier); }
    } else if (state === 'dying') { deathAge += dt; if (deathAge > .85) finish(); }
    if (toastTime > 0 && state !== 'paused') { toastTime -= dt; if (toastTime <= 0) $('toast').classList.remove('visible'); }
    village.render(dt, model, state === 'playing' ? accumulator / STEP : 1);
    metricTime += dt;
    if (metricTime > .5) { metricTime = 0; metricsEl.textContent = JSON.stringify({ state, ...village.metrics(), y: model.y, vy: model.vy, x: model.x, time: model.time, points:model.points, level:model.level, speed:model.speed, targetSpeed:model.targetSpeed, delivered: model.delivered, passed: model.passed, next: model.gates.filter(g => g.x > model.x - .9).sort((a,b) => a.x-b.x).slice(0,2).map(g => ({ x:g.x, center:g.center, mailY:g.mailY, gap:g.gap, tier:g.tier, reward:g.reward })), sound: sound.enabled }); }
  }
  requestAnimationFrame(frame);
} catch (error) { console.error(error); $('error').hidden = false; }
