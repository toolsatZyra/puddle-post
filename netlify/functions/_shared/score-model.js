import { Flight } from '../../../src/flight.js';
import { FreeFlight } from '../../../src/free-flight.js';
export const MODES = ['classic', 'free'];
export function resizeModel(model, width) { const oldX=model.x; model.x=-width*.24; model.previousX=model.x; model.bound=width/2-.65; const dx=model.x-oldX; model.gates.forEach(g=>{g.x+=dx;g.previousX+=dx;}); model.hazards?.forEach(h=>{h.x+=dx;h.previousX+=dx;}); }
export function createModel(replay) { const model=new (replay.mode==='free'?FreeFlight:Flight)(replay.seed); model.reset(-replay.width*.24); model.bound=replay.width/2-.65; return model; }
export const WIDTH_RANGE=[2,100];
