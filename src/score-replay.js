export const REPLAY_VERSION = 1;
export const MAX_STEPS = 216000; // Thirty minutes at 120 Hz.
export const MAX_COMMANDS = 25000;

export function recordFlight(model, mode, width) {
  const replay = { version: REPLAY_VERSION, mode, seed: model.seed, width, commands: [] };
  let insideStep = false, steps = 0, enabled = true;
  const originalStep = model.step, originalFlap = model.flap;
  const push = command => {
    if (!enabled || !model.alive) return;
    replay.commands.push(command);
    if (replay.commands.length > MAX_COMMANDS) enabled = false;
  };
  model.flap = function(...args) { if (!insideStep) push([0]); return originalFlap.apply(this, args); };
  model.step = function(dt, axis = 0, lift = false) {
    if (enabled && model.alive) {
      const last = replay.commands.at(-1);
      if (last?.length === 3 && last[0] > 0 && last[1] === axis && last[2] === Number(lift)) last[0]++;
      else push([1, axis, Number(lift)]);
      if (++steps > MAX_STEPS || Math.abs(dt - 1/120) > 1e-12) enabled = false;
    }
    insideStep = true;
    try { return originalStep.call(this, dt, axis, lift); } finally { insideStep = false; }
  };
  return {
    resize(nextWidth) { push([-1, nextWidth]); },
    finish() { return enabled ? structuredClone(replay) : null; },
    stop() { model.step = originalStep; model.flap = originalFlap; enabled = false; },
  };
}
