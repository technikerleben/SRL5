/* 3D-Landgangstruhe: Holztruhe mit Deckel, eingesetzte Steine fallen hinein.
   Nutzt das vorhandene vendor/three.min.js. Ohne WebGL bleibt die Zahlenanzeige. */

const truheState = {
  ready: false, scene: null, camera: null, renderer: null, clock: null,
  group: null, lid: null, glow: null, gems: [], lidAngle: -1.05, kickUntil: 0,
  reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, visible: true
};
const TRUHE_COLORS = (typeof GEM_COLORS !== 'undefined') ? GEM_COLORS
  : { antrieb: [0x52b788, 0x2f7a55], wissen: [0x58a9d2, 0x2876a3], zusammenhalt: [0xf4a261, 0xd46e2a] };
const TRUHE_KEYS = ['antrieb', 'wissen', 'zusammenhalt'];
const T_W = 2.7, T_D = 1.55, T_H = 1.15, T_WALL = .09, T_GEM = .16, T_MAX_GEMS = 140, T_FILL = .52;

function truheRand(seed) { let v = seed % 2147483647; if (v <= 0) v += 2147483646; return () => ((v = v * 16807 % 2147483647) - 1) / 2147483646; }

function truheTarget(i) {
  const cols = 7, rows = 4, perLayer = cols * rows;
  const layer = Math.floor(i / perLayer), slot = i % perLayer;
  const r = truheRand(911 + i * 37);
  const innerW = T_W - 2 * T_WALL - 2 * T_GEM, innerD = T_D - 2 * T_WALL - 2 * T_GEM;
  const x = -innerW / 2 + (slot % cols + .5) / cols * innerW + (r() - .5) * .06 + (layer % 2) * .08;
  const z = -innerD / 2 + (Math.floor(slot / cols) + .5) / rows * innerD + (r() - .5) * .06;
  const y = T_FILL + T_GEM + layer * T_GEM * 1.5 + r() * .03;
  return new THREE.Vector3(x, y, z);
}

function truheBuild() {
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b3f1d, roughness: .78 });
  const woodDark = new THREE.MeshStandardMaterial({ color: 0x4a2a12, roughness: .85 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xc9962e, roughness: .32, metalness: .8 });
  const g = new THREE.Group();

  const box = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; };
  /* Korpus aus Boden und vier Wänden, damit man hineinsehen kann. */
  box(T_W, T_WALL, T_D, woodDark, 0, T_WALL / 2, 0);
  box(T_W, T_H, T_WALL, wood, 0, T_H / 2, T_D / 2 - T_WALL / 2);
  box(T_W, T_H, T_WALL, wood, 0, T_H / 2, -T_D / 2 + T_WALL / 2);
  box(T_WALL, T_H, T_D, wood, T_W / 2 - T_WALL / 2, T_H / 2, 0);
  box(T_WALL, T_H, T_D, wood, -T_W / 2 + T_WALL / 2, T_H / 2, 0);
  /* Innenfläche dunkler */
  box(T_W - 2 * T_WALL, .02, T_D - 2 * T_WALL, new THREE.MeshStandardMaterial({ color: 0x3b2412, roughness: .95 }), 0, T_FILL, 0);
  /* Beschläge */
  [-T_W / 2 + .38, T_W / 2 - .38].forEach(x => {
    box(.12, T_H + .02, .03, metal, x, T_H / 2, T_D / 2 + .012);
    box(.12, T_H + .02, .03, metal, x, T_H / 2, -T_D / 2 - .012);
  });
  /* Kanten oben und unten als schmale Leisten, die Öffnung bleibt frei */
  [T_H - .03, .05].forEach(y => {
    box(T_W + .04, .06, .05, metal, 0, y, T_D / 2 + .005);
    box(T_W + .04, .06, .05, metal, 0, y, -T_D / 2 - .005);
    box(.05, .06, T_D + .04, metal, T_W / 2 + .005, y, 0);
    box(.05, .06, T_D + .04, metal, -T_W / 2 - .005, y, 0);
  });
  const schloss = box(.28, .34, .05, metal, 0, T_H - .26, T_D / 2 + .03);
  schloss.add(new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .06, 12), woodDark).rotateX(Math.PI / 2));

  /* Deckel: halber Zylinder, Drehpunkt an der hinteren Oberkante. */
  const pivot = new THREE.Group();
  pivot.position.set(0, T_H, -T_D / 2);
  const lidShell = new THREE.Mesh(new THREE.CylinderGeometry(T_D / 2, T_D / 2, T_W, 28, 1, true, 0, Math.PI), wood);
  lidShell.material = wood.clone(); lidShell.material.side = THREE.DoubleSide;
  lidShell.rotation.z = Math.PI / 2;
  lidShell.position.z = T_D / 2;
  pivot.add(lidShell);
  [-1, 1].forEach(s => {
    const cap = new THREE.Mesh(new THREE.CircleGeometry(T_D / 2, 28, 0, Math.PI), woodDark);
    cap.material = woodDark.clone(); cap.material.side = THREE.DoubleSide;
    cap.rotation.y = Math.PI / 2; cap.position.set(s * T_W / 2, 0, T_D / 2);
    pivot.add(cap);
  });
  [-T_W / 2 + .38, T_W / 2 - .38].forEach(x => {
    const band = new THREE.Mesh(new THREE.TorusGeometry(T_D / 2 + .012, .035, 8, 28, Math.PI), metal);
    band.rotation.y = Math.PI / 2; band.position.set(x, 0, T_D / 2);
    pivot.add(band);
  });
  g.add(pivot);

  /* Goldener Schein, wenn das Ziel erreicht ist. */
  const glow = new THREE.PointLight(0xffd27a, 0, 6);
  glow.position.set(0, T_H + .6, 0);
  g.add(glow);

  truheState.scene.add(g);
  truheState.group = g; truheState.lid = pivot; truheState.glow = glow;
}

function truheInit() {
  if (truheState.ready) return true;
  const canvas = $('#truhe3d-canvas'), wrap = $('#truhe3d-wrap');
  if (!canvas || !wrap) return false;
  if (typeof THREE === 'undefined') { wrap.classList.add('hidden'); return false; }
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
  catch (e) { wrap.classList.add('hidden'); return false; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, .1, 50);
  Object.assign(truheState, { renderer, scene, camera, clock: new THREE.Clock() });
  scene.add(new THREE.HemisphereLight(0xfff4dd, 0x3a2614, .7));
  const key = new THREE.DirectionalLight(0xffffff, .85); key.position.set(3, 7, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffe0b0, .4); rim.position.set(-4, 3, -4); scene.add(rim);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1.9, 40), new THREE.MeshBasicMaterial({ color: 0x6b4a28, transparent: true, opacity: .14 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.001; scene.add(floor);
  truheBuild();
  const resize = () => {
    const w = Math.max(1, wrap.clientWidth), h = Math.max(1, wrap.clientHeight), a = w / h;
    renderer.setSize(w, h, false); camera.aspect = a;
    camera.position.set(0, 5.0, a < 1 ? 8.6 : 6.9); camera.lookAt(0, 1.0, 0); camera.updateProjectionMatrix();
  };
  resize();
  new ResizeObserver(resize).observe(wrap);
  if ('IntersectionObserver' in window) new IntersectionObserver(e => { truheState.visible = e[0].isIntersecting; }).observe(wrap);
  truheState.ready = true;
  truheUpdate(true);
  truheAnimate();
  return true;
}

function truheUpdate(initial = false) {
  if (!truheState.ready) return;
  const t = (typeof lgTruhe === 'function') ? lgTruhe() : { antrieb: 0, wissen: 0, zusammenhalt: 0 };
  const total = TRUHE_KEYS.reduce((s, k) => s + t[k], 0);
  const scale = total > T_MAX_GEMS ? T_MAX_GEMS / total : 1;
  const want = Object.fromEntries(TRUHE_KEYS.map(k => [k, Math.round(t[k] * scale)]));
  let added = 0;
  const fehlt = {};
  TRUHE_KEYS.forEach(k => {
    let have = truheState.gems.filter(x => x.key === k).length;
    while (have > want[k]) {
      const idx = truheState.gems.map(x => x.key).lastIndexOf(k);
      const [gem] = truheState.gems.splice(idx, 1);
      truheState.group.remove(gem.mesh); gem.mesh.geometry.dispose(); gem.mesh.material.dispose();
      have--;
    }
    fehlt[k] = { offen: want[k] - have, have };
  });
  /* Neue Steine abwechselnd nach Farbe einfügen, damit die Truhe gemischt aussieht. */
  while (TRUHE_KEYS.some(k => fehlt[k].offen > 0)) {
    TRUHE_KEYS.forEach(k => {
      if (fehlt[k].offen <= 0) return;
      const c = TRUHE_COLORS[k][fehlt[k].have % 2];
      const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(T_GEM, 1),
        new THREE.MeshPhysicalMaterial({ color: c, roughness: .12, metalness: .04, clearcoat: 1, clearcoatRoughness: .1, emissive: c, emissiveIntensity: .07 }));
      mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      truheState.group.add(mesh);
      truheState.gems.push({ key: k, mesh, velocity: 0, settled: false, spin: (Math.random() - .5) * 3, delay: Math.min(1.2, added * .035) });
      fehlt[k].offen--; fehlt[k].have++; added++;
    });
  }
  /* Farben gut gemischt, aber stabil: Reihenfolge nach festem Zufallsschlüssel. */
  truheState.gems.forEach((g, i) => {
    g.target = truheTarget(i);
    if (initial || truheState.reduced) { g.mesh.position.copy(g.target); g.settled = true; }
    else if (!g.settled && g.velocity === 0 && g.mesh.position.y < 1e-6) { g.mesh.position.set(g.target.x, T_H + 1.7, g.target.z); }
    else if (g.settled) { g.mesh.position.lerp(g.target, 1); }
  });
  if (added && !initial) truheState.kickUntil = performance.now() + 1600 + added * 70;
}

function truheAnimate() {
  if (!truheState.ready) return;
  requestAnimationFrame(truheAnimate);
  if (document.hidden || !truheState.visible) { truheState.clock.getDelta(); return; }
  const dt = Math.min(truheState.clock.getDelta(), .05), time = truheState.clock.getElapsedTime();
  const ziel = (typeof lgZielAktiv === 'function') ? lgZielAktiv() : null;
  const summe = (typeof lgSum === 'function' && typeof lgTruhe === 'function') ? lgSum(lgTruhe()) : 0;
  const erreicht = !!ziel && summe >= ziel.steine;
  const kick = performance.now() < truheState.kickUntil;
  const target = kick ? -1.85 : erreicht ? -1.7 : -1.05;
  truheState.lidAngle += (target - truheState.lidAngle) * Math.min(1, dt * (kick ? 7 : 3));
  if (!truheState.reduced && !kick && !erreicht) truheState.lidAngle += Math.sin(time * 1.3) * .0008;
  truheState.lid.rotation.x = truheState.lidAngle;
  truheState.glow.intensity = erreicht ? 1.2 + Math.sin(time * 2.4) * .45 : 0;
  if (!truheState.reduced) truheState.group.rotation.y = Math.sin(time * .32) * .16;
  truheState.gems.forEach(g => {
    if (g.settled) return;
    if (g.delay > 0) { g.delay -= dt; return; }
    g.velocity -= 9.2 * dt;
    g.mesh.position.y += g.velocity * dt;
    g.mesh.rotation.x += g.spin * dt; g.mesh.rotation.z += g.spin * .6 * dt;
    if (g.mesh.position.y <= g.target.y) {
      if (Math.abs(g.velocity) > 1.1) { g.velocity = -g.velocity * .28; g.mesh.position.y = g.target.y; }
      else { g.mesh.position.copy(g.target); g.settled = true; }
    }
  });
  truheState.renderer.render(truheState.scene, truheState.camera);
}

function truheRefresh() { if (!truheState.ready) truheInit(); else truheUpdate(false); }
AIU_STORE.on('landgang', truheRefresh, 'Landgangstruhe 3D');
