import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clamp, seeded, DELIVERY_TIERS, PLAYER_SCALE } from './flight.js';

const rnd = seeded(1047), range = (a, b) => a + rnd() * (b - a);
const sphere = new T.SphereGeometry(1, 24, 16), cylinder = new T.CylinderGeometry(1, 1, 1, 32), box = new T.BoxGeometry(1, 1, 1);
const mats = new Map();
const flightScale = new T.Vector3(PLAYER_SCALE, PLAYER_SCALE, PLAYER_SCALE);
const postageMaterials = new Map();
function postageMaterial(tier) {
  if (!postageMaterials.has(tier)) {
    const c=document.createElement('canvas'); c.width=384;c.height=128; const ctx=c.getContext('2d');
    ctx.fillStyle=`#${DELIVERY_TIERS[tier].color.toString(16)}`;ctx.beginPath();ctx.roundRect(4,4,376,120,56);ctx.fill();
    ctx.fillStyle='#49375e';ctx.font='600 61px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(`${DELIVERY_TIERS[tier].points} PTS`,192,68);
    const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
    postageMaterials.set(tier,new T.SpriteMaterial({map,transparent:true,depthWrite:false,toneMapped:false}));
  }
  return postageMaterials.get(tier);
}
// Blue-hour village: warm, varied facades against a cool evening atmosphere.
// The foreground foliage keeps its original green material palette.
const HOME_PALETTES = [
  { wall: 0xf0aa9f, roof: 0xa75d87, trim: 0xffd9ab },
  { wall: 0x9ebfe0, roof: 0x667fac, trim: 0xe5d3f4 },
  { wall: 0xc3a7e0, roof: 0x9866ac, trim: 0xffd0a4 },
  { wall: 0xf0cd8f, roof: 0xd18b89, trim: 0xffe5b7 },
];
let contactTexture;
function contact(parent, x, y, z, sx, sz) {
  if (!contactTexture) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const ctx = c.getContext('2d'); const gradient = ctx.createRadialGradient(64,64,0,64,64,64); gradient.addColorStop(0,'rgba(28,54,40,.38)'); gradient.addColorStop(.35,'rgba(28,54,40,.2)'); gradient.addColorStop(1,'rgba(28,54,40,0)'); ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128); contactTexture = new T.CanvasTexture(c);
  }
  const m = mesh(parent, new T.PlaneGeometry(1,1), new T.MeshBasicMaterial({map:contactTexture,transparent:true,depthWrite:false}), x,y,z,sx,sz,1); m.rotation.x=-Math.PI/2; return m;
}
function material(color, roughness = .72, metalness = 0) {
  const key = `${color}:${roughness}:${metalness}`;
  if (!mats.has(key)) mats.set(key, new T.MeshStandardMaterial({ color, roughness, metalness }));
  return mats.get(key);
}
function mesh(parent, geo, color, x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx) {
  const m = new T.Mesh(geo, color?.isMaterial ? color : material(color)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); parent.add(m); return m;
}
function ball(p, c, x, y, z, sx, sy = sx, sz = sx) { return mesh(p, sphere, c, x, y, z, sx, sy, sz); }
function tube(parent, points, radius, color, segments = 24) {
  return mesh(parent, new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p))), segments, radius, 6, false), color);
}
function rod(p, a, b, radius, color) {
  const va = new T.Vector3(...a), vb = new T.Vector3(...b), d = vb.clone().sub(va);
  const m = mesh(p, cylinder, color, ...va.clone().add(vb).multiplyScalar(.5).toArray(), radius, d.length(), radius);
  m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); return m;
}
function batch(root) {
  root.updateMatrixWorld(true); const groups = new Map(), inv = root.matrixWorld.clone().invert(), old = [];
  root.traverse(m => { if (!m.isMesh || Array.isArray(m.material)) return; const a = groups.get(m.material) || []; a.push(m.geometry.clone().applyMatrix4(inv.clone().multiply(m.matrixWorld))); groups.set(m.material, a); old.push(m); });
  old.forEach(m => m.removeFromParent());
  for (const [mat, gs] of groups) { const m = new T.Mesh(mergeGeometries(gs, false), mat); m.castShadow = !mat.transparent; m.receiveShadow = !mat.transparent; root.add(m); gs.forEach(g => g.dispose()); }
}
function leaf(parent, x, y, z, size, angle = 0, color = 0x6f9672) {
  const m = ball(parent, color, x, y, z, size * .48, size, size * .16); m.rotation.z = angle; m.rotation.y = .25; return m;
}
function plant(parent, x, y, z, scale = 1, color = 0x6f9672) {
  const g = new T.Group(); g.position.set(x, y, z); g.scale.setScalar(scale); parent.add(g);
  rod(g, [0, 0, 0], [.08, 1.15, 0], .019, 0x638068);
  for (let i = 0; i < 4; i++) { const side = i % 2 ? 1 : -1; leaf(g, side * .18, .3 + i * .2, .01, .27, side * -.95, color); }
  return g;
}
function flower(parent, x, y, z, scale, color = 0xf4e7b1) {
  rod(parent, [x, y, z], [x + .03, y + scale, z], .018, 0x63876a);
  for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; ball(parent, color, x + .03 + Math.cos(a) * .11, y + scale + Math.sin(a) * .11, z, .105, .09, .045); }
  ball(parent, 0xc8a650, x + .03, y + scale, z + .035, .065, .065, .04);
}
function makeUmbrella() {
  const g = new T.Group(), positions = [], colors = [], indices = [], segments = 96, rings = 14;
  const gold = new T.Color(0xf1bd4b), pale = new T.Color(0xf7ce69);
  for (let j = 0; j <= rings; j++) for (let i = 0; i <= segments; i++) {
    const a = i / segments * Math.PI * 2, r = j / rings;
    const scallop = Math.sin((i / segments * 8 % 1) * Math.PI) * .065 * r ** 7;
    positions.push(Math.cos(a) * r, .49 * Math.sqrt(1 - r * r * .94) - scallop, Math.sin(a) * r);
    const c = Math.floor(i / 12) % 2 ? gold : pale; colors.push(c.r, c.g, c.b);
    if (j < rings && i < segments) { const k = j * (segments + 1) + i; indices.push(k, k + segments + 1, k + 1, k + 1, k + segments + 1, k + segments + 2); }
  }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); geo.setIndex(indices); geo.computeVertexNormals();
  mesh(g, geo, new T.MeshStandardMaterial({ vertexColors: true, roughness: .46, side: T.DoubleSide }));
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, ps = [];
    for (let j = 0; j <= 10; j++) { const r = j / 10; ps.push([Math.cos(a) * r, .49 * Math.sqrt(1 - r * r * .94) + .006, Math.sin(a) * r]); }
    tube(g, ps, .009, 0xdba537, 20); ball(g, 0xd4a043, Math.cos(a), .12, Math.sin(a), .027);
  }
  rod(g, [0, -.96, 0], [0, .6, 0], .022, material(0x6d6550, .45, .4));
  tube(g, [[0, -.96, 0], [0, -1.09, 0], [-.08, -1.14, 0], [-.16, -1.08, 0], [-.16, -1.0, 0]], .036, 0x704d36);
  ball(g, 0xd6a443, 0, .6, 0, .055, .09, .055);
  return g;
}
function makeMouse() {
  const root = new T.Group(), body = new T.Group(); root.add(body);
  const fur = 0xc1aba0, light = 0xe5d1be, pink = 0xd89a96, coat = 0xdca646, dark = 0x292e2c;
  ball(body, coat, -.06, -.08, 0, .32, .4, .28);
  // Hood collar and round, slightly turned face.
  ball(body, 0xe9b950, -.02, .24, -.07, .31, .25, .24);
  ball(body, fur, .09, .36, .08, .32, .29, .27);
  ball(body, light, .28, .27, .24, .23, .15, .17);
  ball(body, pink, .455, .3, .26, .065, .048, .055);
  const ears = [];
  for (const p of [[-.12, .63, .12], [.2, .65, -.045]]) {
    const e = new T.Group(); e.position.set(...p); body.add(e); ball(e, fur, 0, 0, 0, .19, .235, .11); ball(e, pink, .01, .012, .085, .135, .17, .035); ears.push(e);
  }
  const eyes = [];
  for (const p of [[.19, .42, .308], [.36, .41, .16]]) { const eye = ball(body, dark, ...p, .038, .051, .029); eyes.push(eye); ball(body, 0xfff9e7, p[0] + .008, p[1] + .018, p[2] + .023, .011); }
  ball(body, 0xd69c90, .12, .28, .324, .065, .037, .012);
  tube(body, [[.29, .205, .325], [.34, .192, .32], [.38, .21, .3]], .008, 0x866c61, 12);
  for (let i = 0; i < 3; i++) tube(body, [[.34, .25, .34], [.49, .255 + (i - 1) * .045, .38], [.62, .255 + (i - 1) * .08, .34]], .004, 0x8c7b70, 8);
  tube(body, [[-.3, -.25, -.08], [-.62, -.3, -.12], [-.85, -.18, -.04], [-.93, .02, .04], [-.84, .08, .06]], .032, pink);
  // A scarf, coat buttons, little boots and a leather mail satchel.
  ball(body, 0xae6d53, .03, .12, .17, .3, .065, .16);
  const scarf = mesh(body, box, 0xb77658, -.38, .08, .09, .38, .095, .1); scarf.rotation.z = -.12;
  for (let i = 0; i < 2; i++) ball(body, 0x93692c, .1, -.04 - i * .13, .268, .025);
  const feet = [];
  for (let i = 0; i < 2; i++) { const f = new T.Group(); f.position.set(i * .3 - .15, -.41, i ? .14 : -.07); body.add(f); rod(f, [0, 0, 0], [.03, -.14, 0], .045, fur); ball(f, 0x476156, .06, -.15, .035, .115, .075, .115); feet.push(f); }
  tube(body, [[-.2, .2, .22], [-.05, .02, .32], [.2, -.23, .22]], .035, 0x775038);
  const bag = ball(body, 0x9b694c, -.23, -.21, .27, .2, .18, .095); ball(body, 0xae7b58, -.23, -.13, .31, .2, .09, .073);
  ball(body, 0xd3ad64, -.2, -.2, .391, .025, .03, .015);
  const letter = mesh(body, box, 0xffedc5, -.26, -.02, .28, .21, .15, .035); letter.rotation.z = -.18;
  rod(body, [.17, .06, .14], [.35, .53, .035], .074, coat); ball(body, light, .35, .51, .04, .083, .063, .075);
  const umbrella = makeUmbrella(); umbrella.position.set(.35, 1.1, -.03); root.add(umbrella);
  root.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return { root, body, umbrella, ears, eyes, feet, scarf, bag };
}
function windowLight(parent, x, y, z, size = .18, lit = false) {
  ball(parent, 0x674d3c, x, y, z, size * 1.28, size * 1.35, .055);
  const mat = new T.MeshStandardMaterial({ color: lit ? 0xffd484 : 0x66627e, emissive: 0xffb956, emissiveIntensity: lit ? 1.5 : 0, roughness: .55 });
  ball(parent, mat, x, y, z + .045, size, size * 1.06, .025);
  rod(parent, [x - size, y, z + .079], [x + size, y, z + .079], .014, 0x725943);
  rod(parent, [x, y - size, z + .079], [x, y + size, z + .079], .014, 0x725943);
  return mat;
}
function roof(parent, color, x = 0, y = 0, z = 0, s = 1) {
  const g = new T.Group(); g.position.set(x, y, z); g.scale.setScalar(s); parent.add(g);
  ball(g, 0xd2b7a1, 0, -.12, 0, 1.02, .1, .95);
  ball(g, material(color, .46), 0, -.02, 0, 1, .35, .94);
  ball(g, material(color, .46), -.09, .17, -.08, .73, .23, .68);
  for (let i = 0; i < 7; i++) { const a = range(0, Math.PI * 2), r = range(.3, .8); const m = ball(g, 0xe7cfb0, Math.cos(a) * r, .3 - r * .13, Math.sin(a) * r, range(.05, .11), .016, range(.05, .09)); m.rotation.x = range(-.3, .3); }
  return g;
}
function cottage(parent, x, y, z, s, palette = HOME_PALETTES[0], lit = true) {
  const g = new T.Group(); parent.add(g); g.position.set(x, y, z); g.scale.setScalar(s);
  mesh(g, new T.CylinderGeometry(.62, .8, 1.4, 32), palette.wall, 0, .7, 0);
  roof(g, palette.roof, 0, 1.45);
  ball(g, 0x66566d, .04, .36, .8, .2, .34, .045); ball(g, 0xd8b466, .16, .35, .85, .025);
  windowLight(g, -.36, .95, .65, .16, lit); windowLight(g, .33, .93, .65, .14, lit);
  mesh(g,box,palette.trim,-.35,.73,.67,.4,.045,.2); mesh(g,box,palette.trim,.34,.73,.67,.34,.045,.2);
  mesh(g, cylinder, palette.roof, .37, 1.76, -.17, .11, .65, .11);
  mesh(g, cylinder, 0x735a48, .37, 2.09, -.17, .145, .055, .145);
  for (let i = 0; i < 3; i++) ball(g, 0xbcb8a1, .05, .06 + i * .035, .91 - i * .15, .31 - i * .04, .07, .17);
  plant(g, -.83, .03, .13, .6); flower(g, .82, .02, .3, .45);
  batch(g); return g;
}
function makeGate(index) {
  const root = new T.Group(), lower = new T.Group(), upper = new T.Group(); root.add(lower, upper);
  const palette = HOME_PALETTES[index % HOME_PALETTES.length];
  const wall = mesh(root, cylinder, palette.wall, 0, -3, -.05, .56, 2, .52);
  // The top of this roof is the visible lower edge of the passage.
  const cap = roof(lower, palette.roof, 0, -.31, -.05, .83); batch(cap); wall.castShadow = true; wall.receiveShadow = true;
  const light = windowLight(lower, .01, -.93, .515, .22);
  mesh(lower, box, palette.trim, 0, -1.23, .58, .56, .045, .22);
  plant(lower, -.53, -.8, .12, .55, 0x759271); flower(lower, .55, -1.1, .2, .4, 0xf1dab0);
  const resident = new T.Group(); lower.add(resident); resident.position.set(0, -1.05, .69); resident.scale.setScalar(.001);
  ball(resident, 0xb49a81, 0, 0, 0, .14, .18, .12); ball(resident, 0xc8b398, -.09, .16, 0, .073); ball(resident, 0xc8b398, .09, .16, 0, .073);
  ball(resident, 0x293a32, -.047, .055, .112, .017); ball(resident, 0x293a32, .047, .055, .112, .017);
  const arm = new T.Group(); resident.add(arm); arm.position.set(.12, -.02, .02); ball(arm, 0xc8b398, .045, .1, .02, .045, .12, .04);
  // A rain-fed hanging planter, its leafy silhouette reaching down to the upper passage edge.
  const stem = mesh(root, cylinder, palette.roof, 0, 6, -.05, .42, 4, .4);
  mesh(upper, new T.CylinderGeometry(.7, .47, .72, 32), material(palette.wall, .45), 0, .63, -.05);
  mesh(upper, cylinder, palette.trim, 0, 1.01, -.05, .74, .075, .68);
  ball(upper, 0x485f4a, 0, 1.06, -.05, .64, .045, .58);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; leaf(upper, Math.cos(a) * .44, .32 + range(-.06, .15), Math.sin(a) * .36, range(.34, .48), Math.cos(a) * .9, i % 2 ? 0x759771 : 0x5d8265); }
  for (let i = 0; i < 3; i++) { const x = (i - 1) * .35; tube(upper, [[x, .7, .25], [x + .08, .3, .32], [x - .03, .06, .32]], .016, 0x638467); }
  plant(upper, -.2, 1.05, 0, .85, 0x66896b); plant(upper, .27, 1.05, -.1, .65, 0x8ea177);
  batch(upper);
  const mail = new T.Group(); root.add(mail);
  const ringMat = new T.MeshBasicMaterial({ color: 0xf9dc8d, transparent: true, opacity: .72 });
  const ring = mesh(mail, new T.TorusGeometry(.48, .014, 6, 48), ringMat, 0, 0, -.03);
  const postage = new T.Sprite(postageMaterial(0)); postage.position.set(0,.62,.04); postage.scale.set(1.05,.35,1); mail.add(postage);
  const envelope = new T.Group(); mail.add(envelope);
  mesh(envelope, box, material(0xffedc2, .55), 0, 0, 0, .49, .32, .055);
  tube(envelope, [[-.235, .145, .03], [0, -.027, .036], [.235, .145, .03]], .009, 0xbf9863, 2);
  ball(envelope, 0xb2775e, 0, -.025, .044, .043, .04, .012);
  // Mailbox below the delivery marker; it never collides with the mouse.
  const mailbox = new T.Group(); root.add(mailbox); ball(mailbox, 0x8979a8, 0, 0, 0, .24, .19, .16);
  mesh(mailbox, box, 0x493c65, 0, .025, .16, .26, .027, .015);
  const flag = mesh(mailbox, box, 0xccaa64, .25, .2, .06, .13, .09, .025); rod(mailbox, [.19, -.04, .06], [.19, .24, .06], .012, 0x685941);
  return { root, lower, upper, wall, stem, light, resident, arm, mail, envelope, ring, ringMat, postage, mailbox, flag, id: -1, deliveryAge: -1 };
}

export class Village {
  constructor(canvas, reduced) {
    this.canvas = canvas; this.reduced = reduced; this.elapsed = 0; this.kick = 0; this.deathAge = 0; this.state = 'ready'; this.dpr = Math.min(devicePixelRatio || 1, 2); this.frames = [];
    this.renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.dpr); this.renderer.setClearColor(0x69658d, 0); this.renderer.outputColorSpace = T.SRGBColorSpace; this.renderer.toneMapping = T.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.scene = new T.Scene(); this.scene.fog = new T.Fog(0x89819f, 27, 68);
    this.camera = new T.OrthographicCamera(-10, 10, 5.5, -5.5, .1, 100); this.camera.position.set(0, 3.5, 22); this.camera.lookAt(0, 0, 0);
    this.scene.add(new T.HemisphereLight(0xc8c9f1, 0x6d527c, 1.25));
    const sun = new T.DirectionalLight(0xffc5a0, 1.55); sun.position.set(-4, 10, 8); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 12, bottom: -12, near: .5, far: 45 }); sun.shadow.normalBias = .035; sun.shadow.bias = -.0002; sun.shadow.radius = 3; this.scene.add(sun);
    const rim = new T.DirectionalLight(0xb4c7ff, 1.7); rim.position.set(7, 5, -8); this.scene.add(rim);
    this.mouse = makeMouse(); this.scene.add(this.mouse.root);
    const ground = mesh(this.scene, new T.PlaneGeometry(200, 35), material(0x817b98, .65), 0, -4.15, -5); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
    this.mouseShadow = contact(this.scene, 0, -4.11, 1, 2 * PLAYER_SCALE, 1.3 * PLAYER_SCALE);
    this.scenery = [];
    this.buildScenery();
    this.buildEveningSky();
    this.gates = Array.from({ length: 6 }, (_, i) => { const g = makeGate(i); this.scene.add(g.root); return g; });
    this.rainCount = reduced ? 75 : 310; this.rainData = []; const pos = new Float32Array(this.rainCount * 6);
    for (let i = 0; i < this.rainCount; i++) this.rainData.push({ x: range(-23, 23), y: range(-5, 13), z: range(-16, 7), speed: range(4, 7) });
    this.rainGeo = new T.BufferGeometry(); this.rainGeo.setAttribute('position', new T.BufferAttribute(pos, 3));
    this.rain = new T.LineSegments(this.rainGeo, new T.LineBasicMaterial({ color: 0xd9dbff, transparent: true, opacity: .23, depthWrite: false })); this.rain.frustumCulled = false; this.scene.add(this.rain);
    this.puffs = []; this.puffMat = material(0xffedbf); for (let i = 0; i < 24; i++) { const m = ball(this.scene, this.puffMat, 0, -30, 0, .035); this.puffs.push({ m, life: 0, vx: 0, vy: 0 }); }
    this.ripples = [];
    for (let i = 0; i < 18; i++) { const mat = new T.MeshBasicMaterial({ color: 0xe4ceee, transparent: true, opacity: .2, depthWrite: false }); const m = mesh(this.scene, new T.RingGeometry(.92, 1, 48), mat, range(-22, 22), -4.12, range(-1, 5), .5); m.rotation.x = -Math.PI / 2; this.ripples.push({ m, phase: rnd(), size: range(.2, .5) }); }
    this.resize();
  }
  buildScenery() {
    const backdrop = new T.Group(); this.scene.add(backdrop);
    for (let i = 0; i < 14; i++) ball(backdrop, [0x8784a6, 0x858baa, 0x9691b0][i % 3], range(-40, 40), range(-9, -8), range(-34, -22), range(5, 10), range(3, 4.5), range(4, 8));
    batch(backdrop);
    for (let i = 0; i < 13; i++) {
      const g = new T.Group(); this.scene.add(g); g.position.set(-24 + i * 4.5, -4.13, -6 - i % 3 * 3); const s = range(.7, 1.3);
      cottage(g, 0, 0, 0, s, HOME_PALETTES[i % HOME_PALETTES.length], true);
      for (let j = 0; j < 2; j++) { const x = (j ? 1 : -1) * 1.5; ball(g, 0x6f8d74, x, .27, -.3, .75, .5, .55); plant(g, x + .2, .2, -.3, 1.3); }
      batch(g); contact(g,0,.012,0,3.6,2.5); this.scenery.push({ g, rate: .3 + i % 3 * .08, width: 60 });
    }
    // Oversized garden leaves frame the miniature world.
    for (let i = 0; i < 18; i++) {
      const g = new T.Group(); this.scene.add(g); g.position.set(-30 + i * 3.8, -4.12, -2.5); plant(g, 0, 0, 0, range(1.6, 3), i % 2 ? 0x66876b : 0x779576);
      for (let j = 0; j < 3; j++) ball(g, 0x698871, range(-1, 1), .1, range(-.3, .3), range(.3, .65), range(.15, .3), .32);
      batch(g); contact(g,0,.01,0,2.2,1.3); this.scenery.push({ g, rate: .52, width: 68 });
    }
    for (let i = 0; i < 18; i++) {
      const g = new T.Group(); this.scene.add(g); g.position.set(-28 + i * 3.4, -4.14, 2.5);
      const puddle = ball(g, material(0xb2b8df, .12, .25), 0, .015, 0, range(.55, 1.35), .022, range(.3, .6));
      for (let j = 0; j < 3; j++) ball(g, 0x9c91aa, range(-1.4, 1.4), .045, range(-.2, .8), range(.07, .16), .06, .1);
      if (i % 3 === 0) { plant(g, 1.3, 0, .4, .65, 0x597b61); flower(g, 1, 0, .5, .45); }
      batch(g); this.scenery.push({ g, rate: 1, width: 62 });
    }
    // A hero cottage and its lamp make the title screen a living diorama.
    this.heroHouse = new T.Group(); this.heroHouse.position.set(4.7, -4.1, 1.2); this.scene.add(this.heroHouse);
    cottage(this.heroHouse, 0, 0, 0, 1.35, HOME_PALETTES[0], true);
    rod(this.heroHouse, [-1.7, 0, 0], [-1.7, 2.5, 0], .045, 0x4f6553);
    tube(this.heroHouse, [[-1.7, 2.5, 0], [-1.65, 2.8, 0], [-1.2, 2.8, 0], [-1.05, 2.5, 0]], .045, 0x4f6553);
    mesh(this.heroHouse, new T.CylinderGeometry(.18, .27, .16, 24), 0x526a53, -1.05, 2.46, 0);
    ball(this.heroHouse, new T.MeshStandardMaterial({ color: 0xffd995, emissive: 0xffbc55, emissiveIntensity: 1.4 }), -1.05, 2.3, 0, .12, .17, .12);
    batch(this.heroHouse); contact(this.heroHouse,0,.01,0,4.7,3.4);
    const lantern = new T.PointLight(0xffc06c, 5, 5, 2); lantern.position.set(-1.05,2.3,.5); this.heroHouse.add(lantern);
  }
  buildEveningSky() {
    // Camera-relative sky ornaments stay behind the entire village.
    this.scene.add(this.camera); this.sky = new T.Group(); this.camera.add(this.sky);
    const c = document.createElement('canvas'); c.width = c.height = 256; const ctx = c.getContext('2d');
    const glow = ctx.createRadialGradient(128,128,24,128,128,128); glow.addColorStop(0,'rgba(255,223,177,.38)'); glow.addColorStop(.4,'rgba(255,223,177,.1)'); glow.addColorStop(1,'rgba(255,223,177,0)'); ctx.fillStyle=glow;ctx.fillRect(0,0,256,256);
    ctx.fillStyle='#ffeaca';ctx.beginPath();ctx.arc(128,128,32,0,Math.PI*2);ctx.fill();
    const texture = new T.CanvasTexture(c); texture.colorSpace = T.SRGBColorSpace;
    this.moon = new T.Sprite(new T.SpriteMaterial({map:texture,transparent:true,depthWrite:false,fog:false,toneMapped:false})); this.moon.scale.set(3.4,3.4,1); this.sky.add(this.moon);
    const starRand = seeded(828); this.stars=[];
    const starMat = new T.MeshBasicMaterial({color:0xffecd5,transparent:true,opacity:.55,depthWrite:false,fog:false,toneMapped:false});
    for(let i=0;i<36;i++) { const star=mesh(this.sky,new T.CircleGeometry(.011 + starRand()*.01,8),starMat); this.stars.push({star,x:starRand()-.5,y:.12+starRand()*.35}); }
  }
  resize() {
    this.dirty = true;
    const w = innerWidth, h = innerHeight; this.mobile = w <= 700 || w / h < .85; this.worldH = this.mobile ? 11.8 : 10.8; this.worldW = this.worldH * w / h;
    this.heroScale = (this.mobile ? clamp(h / 625, .95, 1.35) : 1.62) * PLAYER_SCALE; this.heroY = this.mobile ? (h < 700 ? -1.05 : -.5) : -.15;
    this.renderer.setSize(w, h); this.camera.left = -this.worldW / 2; this.camera.right = this.worldW / 2; this.camera.top = this.worldH / 2; this.camera.bottom = -this.worldH / 2; this.camera.updateProjectionMatrix();
    this.heroHouse.position.x = this.mobile ? 2.35 : this.worldW * .34; this.heroHouse.scale.setScalar(this.mobile ? .85 : 1);
    this.moon.position.set(this.worldW * (this.mobile ? .34 : .22),this.worldH * .35,-64);
    for(const s of this.stars) s.star.position.set(s.x*this.worldW,s.y*this.worldH,-65);
  }
  setState(state) { this.state = state; this.dirty = true; if (state === 'dying') { this.deathAge = 0; this.burst(this.mouse.root.position.x, this.mouse.root.position.y, 18); } }
  flap() { this.kick = 1; }
  burst(x, y, count = 10) { let n = 0; for (const p of this.puffs) if (p.life <= 0 && n++ < count) { p.life = range(.4, .9); p.m.position.set(x, y, .6); p.vx = range(-1.6, 1.6); p.vy = range(.2, 2); p.m.scale.setScalar(range(.035, .07)); } }
  delivered(id) { const g = this.gates.find(g => g.id === id); if (g) { g.deliveryAge = 0; this.burst(g.root.position.x + .35, g.mail.position.y); } }
  screenPoint(x, y) { const v = new T.Vector3(x, y, .5).project(this.camera); return { x: (v.x + 1) * innerWidth / 2, y: (1 - v.y) * innerHeight / 2 }; }
  render(dt, model, alpha = 1) {
    const paused = this.state === 'paused', ready = this.state === 'ready', playing = this.state === 'playing';
    if (paused && !this.dirty) return;
    this.dirty = false;
    const timeStep = paused ? 0 : dt; this.elapsed += timeStep; const t = this.elapsed; this.kick = Math.max(0, this.kick - timeStep * 5);
    const { root, body, umbrella, feet, eyes, ears, scarf } = this.mouse;
    if (ready) {
      const targetX = this.mobile ? -.3 : this.worldW * .12; root.position.set(targetX, this.heroY + Math.sin(t * 1.5) * .12, 1);
      root.scale.setScalar(this.heroScale); body.rotation.z = Math.sin(t * 1.6) * .035;
    } else if (playing || paused) {
      root.scale.lerp(flightScale, 1 - Math.exp(-8 * timeStep)); root.position.set(model.x, model.previousY + (model.y - model.previousY) * alpha, .3);
      body.rotation.z += (clamp(model.vy * .033, -.22, .16) - body.rotation.z) * (1 - Math.exp(-9 * timeStep));
    } else if (this.state === 'dying') { this.deathAge += dt; root.position.y = Math.max(-3.7, root.position.y - dt * (1 + this.deathAge * 4)); body.rotation.z += (.28 - body.rotation.z) * dt * 5; }
    if (!paused) {
      umbrella.rotation.z = Math.sin(t * 2) * .025 - (playing ? model.vy * .022 : .035); umbrella.rotation.x = -.1 + Math.sin(t * 1.2) * .025;
      umbrella.scale.set(1 + this.kick * .065, 1 - this.kick * .075, 1 + this.kick * .065);
      feet.forEach((f, i) => { f.rotation.z = Math.sin(t * (playing ? 5 : 2.6) + i * 1.8) * .16 + this.kick * .2; });
      ears.forEach((e, i) => e.rotation.z = Math.sin(t * 2 + i) * .055 + this.kick * .08);
      const blink = t % 5.3 > 5.12; eyes.forEach(e => e.scale.y = blink ? .008 : .051);
      scarf.rotation.z = Math.sin(t * 5) * .08 + (playing ? -.18 : -.1);
    }
    this.heroHouse.visible = ready;
    this.mouseShadow.position.x = root.position.x; this.mouseShadow.material.opacity = clamp(1 - (root.position.y + 3.7) * .085,.25,.7);
    for (let i = 0; i < this.gates.length; i++) {
      const g = this.gates[i], data = model.gates[i];
      if (ready) { g.root.visible = false; continue; }
      const x = data.previousX + (data.x - data.previousX) * alpha;
      g.root.visible = x > -this.worldW / 2 - 2 && x < this.worldW / 2 + 2; g.root.position.x = x;
      const low = data.center - data.gap / 2, high = data.center + data.gap / 2;
      g.lower.position.y = low; g.upper.position.y = high;
      g.wall.position.y = (-5 + low - .3) / 2; g.wall.scale.y = low + 5 - .3;
      g.stem.position.y = (high + 8) / 2; g.stem.scale.y = 8 - high;
      g.mail.position.set(.35, data.mailY, .55); g.mailbox.position.set(.35, low + .22, .6);
      if (g.id !== data.id) { g.id = data.id; g.deliveryAge = -1; g.light.color.set(0x66627e); g.light.emissiveIntensity = 0; g.resident.scale.setScalar(.001); g.postage.material=postageMaterial(data.tier); g.ringMat.color.set(DELIVERY_TIERS[data.tier].color); }
      if (g.deliveryAge >= 0) g.deliveryAge += timeStep;
      const d = g.deliveryAge;
      g.postage.visible = !data.delivered;
      g.mail.visible = (!data.delivered && !data.missed) || d >= 0 && d < .6; g.ring.visible = !data.delivered; g.envelope.position.y = d >= 0 ? (low + .22 - data.mailY) * Math.min(1,d/.6) : Math.sin(t * 2.8 + i) * .07; g.envelope.scale.setScalar(d >= 0 ? Math.max(.1,1-d) : 1); g.envelope.rotation.y = Math.sin(t * 1.7 + i) * .12; g.ring.scale.setScalar(1 + Math.sin(t * 2.8) * .05); g.ringMat.opacity = .5 + Math.sin(t * 2.8) * .15;
      g.light.emissiveIntensity = d >= 0 ? Math.min(1.5, d * 4) : 0;
      if (d >= 0) { g.light.color.set(0xffd484); g.resident.scale.setScalar(Math.min(1, d * 3)); g.arm.rotation.z = -.4 + Math.sin(d * 11) * .55; g.flag.rotation.z = -Math.PI / 2; } else g.flag.rotation.z = 0;
    }
    if (!paused) {
      for (const s of this.scenery) {
        s.g.visible = !(ready && !this.mobile && s.rate < .8 && s.g.position.x < -this.worldW * .15 && s.g.position.x > -this.worldW * .65);
        if (playing) s.g.position.x -= model.speed * dt * s.rate;
        if (s.g.position.x < -this.worldW / 2 - 8) s.g.position.x += s.width;
      }
      const ps = this.rainGeo.attributes.position.array;
      for (let i = 0; i < this.rainCount; i++) { const p = this.rainData[i]; p.y -= dt * p.speed; p.x -= dt * .6; if (p.y < -4.1) { p.y = range(9, 13); p.x = range(-this.worldW / 2 - 4, this.worldW / 2 + 8); } ps.set([p.x, p.y, p.z, p.x + .025, p.y + .18, p.z], i * 6); }
      this.rainGeo.attributes.position.needsUpdate = true;
      for (const p of this.puffs) { if (p.life > 0) { p.life -= dt; p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.vy -= dt * 2; p.m.scale.multiplyScalar(Math.exp(-dt * 1.9)); } p.m.visible = p.life > 0; }
      for (const r of this.ripples) { const life = (t * .5 + r.phase) % 1; r.m.scale.setScalar(r.size * (.3 + life * 2)); r.m.material.opacity = .32 * (1 - life); }
    }
    this.renderer.render(this.scene, this.camera);
    // Developer-readable telemetry, also used by the local verification page.
    if (dt > 0 && !paused) { this.frames.push(dt * 1000); if (this.frames.length > 240) this.frames.shift(); }
  }
  metrics() { const sorted = [...this.frames].sort((a, b) => a - b); return { frames: sorted.length, medianMs: sorted[Math.floor(sorted.length * .5)] || 0, p95Ms: sorted[Math.floor(sorted.length * .95)] || 0, drawCalls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles, pixelRatio: this.renderer.getPixelRatio(), canvas: [this.canvas.width, this.canvas.height] }; }
}
