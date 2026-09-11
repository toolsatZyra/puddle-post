export const STEP = 1 / 120;
export const BASE_SPEED = 2.55;
export const PLAYER_SCALE = .9;
export const DELIVERY_TIERS = [
  { name: 'Wide gap', gap: 4.9, points: 10, color: 0xb8d3ef },
  { name: 'Medium gap', gap: 3.95, points: 25, color: 0xffd19c },
  { name: 'Tight gap', gap: 3.15, points: 50, color: 0xefaccf },
];
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export function seeded(seed = 1) { return () => { seed |= 0; seed = seed + 0x6d2b79f5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export class Flight {
  constructor(seed = 1) { this.seed = seed; this.reset(); }
  reset(x = -4) {
    this.random = seeded(this.seed); this.x = x; this.y = 0; this.previousY = 0; this.vy = 0; this.time = 0; this.passed = 0; this.delivered = 0; this.streak = 0; this.alive = true; this.ceiling = 5.4 - 1.7 * PLAYER_SCALE; this.floor = -4.15 + .6 * PLAYER_SCALE;
    this.points = 0; this.speed = BASE_SPEED; this.tierBag = []; this.lastTier = 0;
    this.gates = []; this.nextId = 0; let center = 0;
    for (let i = 0; i < 6; i++) { const g = this.makeGate(x + 6.8 + i * 5.8, center); center = g.center; this.gates.push(g); }
  }
  makeGate(x, lastCenter) {
    const id = this.nextId++;
    let tier = 0;
    if (id >= 3) {
      if (!this.tierBag.length) {
        this.tierBag = [0,1,2];
        for (let i=2;i>0;i--) { const j=Math.floor(this.random()*(i+1)); [this.tierBag[i],this.tierBag[j]]=[this.tierBag[j],this.tierBag[i]]; }
        if (this.tierBag[0] === this.lastTier) [this.tierBag[0],this.tierBag[1]]=[this.tierBag[1],this.tierBag[0]];
        if (id === 3) { const medium = this.tierBag.indexOf(1); [this.tierBag[0],this.tierBag[medium]]=[this.tierBag[medium],this.tierBag[0]]; }
      }
      tier = this.tierBag.shift();
    }
    this.lastTier = tier;
    const center = id === 0 ? 0 : clamp(lastCenter + (this.random() - .5) * (id < 3 ? .6 : 1.9), -.6, 1.15);
    const gap = DELIVERY_TIERS[tier].gap + (id < 3 ? 0 : (this.random() - .5) * .18);
    const mailY = center - .55 + (id < 3 ? 0 : (this.random() - .5) * (tier === 2 ? .12 : .3));
    return { id, x, previousX: x, center, gap, mailY, tier, reward: DELIVERY_TIERS[tier].points, passed: false, delivered: false, missed: false };
  }
  get level() { return 1 + Math.floor(this.delivered / 10); }
  get targetSpeed() { return BASE_SPEED * 1.15 ** (this.level - 1); }
  flap() { if (this.alive) this.vy = 3.65; }
  step(dt) {
    if (!this.alive) return [];
    const events = []; this.time += dt; this.previousY = this.y;
    this.vy = Math.max(-6.5, this.vy - 8.5 * dt); this.y += this.vy * dt;
    this.speed += (this.targetSpeed - this.speed) * (1 - Math.exp(-dt * 4));
    for (const g of this.gates) { g.previousX = g.x; g.x -= this.speed * dt; }
    // Resolve collisions before rewards, so a failed passage cannot award points.
    if (this.y < this.floor || this.y > this.ceiling || this.gates.some(g => Math.abs(g.x - this.x) < .55 + .28 * PLAYER_SCALE && (this.y - .35 * PLAYER_SCALE < g.center - g.gap / 2 || this.y + 1.25 * PLAYER_SCALE > g.center + g.gap / 2))) {
      this.alive = false; return [{ type: 'hit' }];
    }
    for (const g of this.gates) {
      const mx = g.x + .35;
      if (!g.delivered && !g.missed && Math.abs(mx - this.x) < .78 && Math.abs(this.y - g.mailY) < .83 && this.alive) {
        const previousLevel = this.level;
        g.delivered = true; this.delivered++; this.streak++;
        const bonus = this.streak % 5 === 0 ? 20 : 0;
        this.points += g.reward + bonus;
        events.push({ type: 'delivery', gate: g, streak: this.streak, points: g.reward, bonus });
        if (this.level > previousLevel) events.push({ type: 'level', level: this.level });
      }
      if (!g.passed && g.x < this.x - .9 && this.alive) { g.passed = true; this.passed++; events.push({ type: 'pass', gate: g }); }
      if (!g.delivered && !g.missed && mx < this.x - .8) { g.missed = true; this.streak = 0; }
    }
    for (let i = 0; i < this.gates.length; i++) if (this.gates[i].x < this.x - 10) {
      const last = this.gates.reduce((a, b) => a.x > b.x ? a : b);
      this.gates[i] = this.makeGate(last.x + 5.8, last.center);
    }
    return events;
  }
}
