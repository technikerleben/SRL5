// 3D-Darstellung mit three.js + GSAP
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { gateOpen, DIRS } from './engine.js';

const gsap = window.gsap;

const THEMES = [
  { ground: [0xe9d6a5, 0xe1cb93], side: 0xc9a86a, sky: [0x9fd6f2, 0xfdf3dc], block: 'rock', fog: 0xfdf3dc },
  { ground: [0x86b86c, 0x7aad61], side: 0x6b4f33, sky: [0xa9d8c8, 0xeef6e4], block: 'tree', fog: 0xeef6e4 },
  { ground: [0x8fc39a, 0x83b78e], side: 0x5f6f86, sky: [0x8fb8e6, 0xe6eefc], block: 'crystal', fog: 0xe6eefc },
  { ground: [0xf1f4f7, 0xe4eaef], side: 0x8d98a3, sky: [0xb9c6d6, 0xf4f6f9], block: 'snowrock', fog: 0xf4f6f9 },
];

const COL = { rot: 0xc0392b, blau: 0x2f6fae, ola: 0xd97a4a, bodo: 0x3e5668 };

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function textSprite(text, { color = '#fff', bg = 'rgba(0,0,0,0)', size = 64, font = 'bold 44px Arial' } = {}) {
  const tex = canvasTex(size, size, (g, w, h) => {
    if (bg) { g.fillStyle = bg; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = color; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 2);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.renderOrder = 10;
  return s;
}

function waterTexture() {
  const t = canvasTex(128, 128, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, h);
    grd.addColorStop(0, '#4fa3d1'); grd.addColorStop(1, '#3c8fc0');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const y = 10 + i * 21;
      g.beginPath();
      for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin((x / w) * Math.PI * 2 + i) * 4);
      g.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function woodTexture() {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#b07a3f'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#7a4f23'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
    g.lineWidth = 8; g.beginPath(); g.moveTo(10, 10); g.lineTo(w - 10, h - 10); g.stroke();
    g.strokeStyle = 'rgba(90,55,20,.35)'; g.lineWidth = 2;
    for (let i = 20; i < w; i += 18) { g.beginPath(); g.moveTo(12, i); g.lineTo(w - 12, i + 4); g.stroke(); }
  });
}

function makeAnimal(kind) {
  const g = new THREE.Group();
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, ...o });
  const isOla = kind === 'ola';
  const furC = isOla ? 0x8a5a33 : 0x6f7275;
  const lightC = isOla ? 0xe9c9a0 : 0xf2f2f2;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.26, 6, 12), std(furC));
  body.rotation.x = Math.PI / 2; body.position.set(0, 0.24, 0); body.castShadow = true;
  g.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), std(lightC));
  belly.scale.set(1, 0.7, 1.4); belly.position.set(0, 0.17, 0.02); g.add(belly);
  const head = new THREE.Group(); head.position.set(0, 0.42, 0.24); g.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), std(furC));
  skull.castShadow = true; head.add(skull);
  if (isOla) {
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), std(lightC));
    muzzle.scale.set(1.2, 0.8, 0.9); muzzle.position.set(0, -0.04, 0.12); head.add(muzzle);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.45, 10), std(furC));
    tail.rotation.x = -Math.PI / 2 - 0.25; tail.position.set(0, 0.18, -0.42); g.add(tail);
    g.userData.tail = tail;
  } else {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.3), std(0xffffff));
    stripe.position.set(0, 0.15, 0.03); head.add(stripe);
    for (const s of [-1, 1]) {
      const patch = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), std(0x222222));
      patch.scale.set(1, 1.4, 0.6); patch.position.set(0.08 * s, 0.02, 0.13); head.add(patch);
    }
    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 10), std(0xdddddd));
    snout.rotation.x = Math.PI / 2; snout.position.set(0, -0.03, 0.18); head.add(snout);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 8), std(furC));
    tail.rotation.x = -Math.PI / 2 - 0.6; tail.position.set(0, 0.3, -0.38); g.add(tail);
    g.userData.tail = tail;
  }
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), std(isOla ? 0x6a4224 : 0x333333));
    ear.position.set(0.12 * s, 0.13, -0.02); head.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), std(0x111111, { roughness: 0.2 }));
    eye.position.set(0.07 * s, 0.05, isOla ? 0.13 : 0.14); head.add(eye);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 4), std(0xffffff, { emissive: 0xffffff }));
    shine.position.set(0.075 * s + 0.01, 0.065, isOla ? 0.155 : 0.165); head.add(shine);
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), std(0x1a1a1a, { roughness: 0.3 }));
  nose.position.set(0, -0.02, isOla ? 0.22 : 0.26); head.add(nose);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 8), std(isOla ? 0x6a4224 : 0x2b2b2b));
    leg.position.set(0.12 * sx, 0.06, 0.14 * sz); g.add(leg);
  }
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.33, 0.42, 32),
    new THREE.MeshBasicMaterial({ color: isOla ? COL.ola : COL.bodo, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; g.add(ring);
  g.userData.head = head; g.userData.ring = ring;
  return g;
}

export class Board {
  constructor(container) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    Object.assign(this.controls, {
      enablePan: false, enableDamping: true, dampingFactor: 0.08,
      minPolarAngle: 0.25, maxPolarAngle: 1.15, minAzimuthAngle: -0.8, maxAzimuthAngle: 0.8,
    });
    this.waterTex = waterTexture();
    this.woodTex = woodTexture();
    this.t0 = performance.now();
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.fx = [];
    this.setupLights();
    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
    const loop = () => { this.tick(); this.raf = requestAnimationFrame(loop); };
    loop();
  }

  setupLights() {
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x88775a, 1.4);
    this.scene.add(this.hemi);
    const sun = new THREE.DirectionalLight(0xfff2dd, 2.2);
    sun.position.set(-6, 12, 8); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 });
    sun.shadow.bias = -0.0008;
    this.scene.add(sun); this.sun = sun;
  }

  resize() {
    const w = this.container.clientWidth || 600, h = this.container.clientHeight || 400;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = w + 'px';
    this.renderer.domElement.style.height = h + 'px';
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    if (this.L) this.fitCamera(false);
  }

  pos(p, y = 0) { return new THREE.Vector3(p[0] - this.L.w / 2 + 0.5, y, p[1] - this.L.h / 2 + 0.5); }

  fitCamera(animate = true) {
    const { w, h } = this.L;
    const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    const vNeed = h * 0.85 + 1.8;      // Board ist gekippt -> wirkt flacher
    const hNeed = w + 0.9;
    const dist = Math.max(vNeed / (2 * tanH), hNeed / (2 * tanH * this.camera.aspect)) * 1.08;
    const target = new THREE.Vector3(0, 0, 0.4);
    const to = new THREE.Vector3(0, dist * 0.82, dist * 0.6);
    if (animate) {
      this.camera.position.set(to.x + 4, to.y + 6, to.z + 8);
      gsap.to(this.camera.position, { x: to.x, y: to.y, z: to.z, duration: 1.4, ease: 'power2.out' });
    } else this.camera.position.copy(to);
    this.controls.target.copy(target);
    this.controls.minDistance = dist * 0.5; this.controls.maxDistance = dist * 1.5;
  }

  resetView() {
    const { w, h } = this.L; void w; void h;
    this.fitCamera(true);
  }

  clear() {
    this.root.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    this.scene.remove(this.root);
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.fx = [];
  }

  load(L, S, world = 0) {
    this.clear();
    this.L = L; this.theme = THEMES[world] || THEMES[0];
    const th = this.theme;
    this.scene.background = canvasTex(4, 256, (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, '#' + th.sky[0].toString(16).padStart(6, '0'));
      grd.addColorStop(1, '#' + th.sky[1].toString(16).padStart(6, '0'));
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
    });
    this.scene.fog = new THREE.Fog(th.fog, 25, 60);

    // Sockel
    const base = new THREE.Mesh(new THREE.BoxGeometry(L.w + 0.6, 0.8, L.h + 0.6),
      new THREE.MeshStandardMaterial({ color: th.side, roughness: 0.9 }));
    base.position.y = -0.62; base.receiveShadow = true; this.root.add(base);
    // Meer drumherum
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({ color: 0x5aa9d6, roughness: 0.4, map: this.waterTex, transparent: true, opacity: 0.9 }));
    sea.rotation.x = -Math.PI / 2; sea.position.y = -0.95; this.root.add(sea);
    this.seaMat = sea.material;

    const groundMats = th.ground.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 }));
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x66b6e3, map: this.waterTex, roughness: 0.25, metalness: 0.05, transparent: true, opacity: 0.88 });
    this.waterMat = waterMat;
    const sandMat = new THREE.MeshStandardMaterial({ color: 0xc9b07a });
    this.tileMeshes = {};
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      const t = L.tiles[y][x];
      const p = this.pos([x, y]);
      if (t === 'water') {
        const bed = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 1), sandMat);
        bed.position.set(p.x, -0.42, p.z); bed.receiveShadow = true; this.root.add(bed);
        const wt = new THREE.Mesh(new THREE.BoxGeometry(1, 0.22, 1), waterMat);
        wt.position.set(p.x, -0.2, p.z); wt.receiveShadow = true; this.root.add(wt);
      } else {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.3, 0.98), groundMats[(x + y) % 2]);
        m.position.set(p.x, -0.15, p.z); m.receiveShadow = true; this.root.add(m);
        if (t === 'rock') this.addBlocker(p, x * 7 + y * 13);
        if (t === 'goal') this.addDen(p);
        if (t === 'grass' && ((x * 31 + y * 17) % 5 === 0)) this.addTuft(p, x + y);
      }
    }
    // Schalter
    this.plateMeshes = L.plates.map(pl => {
      const p = this.pos([pl.x, pl.y]);
      const geo = pl.color === 'rot' ? new THREE.CylinderGeometry(0.34, 0.38, 0.1, 28) : new THREE.BoxGeometry(0.62, 0.1, 0.62);
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: COL[pl.color], roughness: 0.5, emissive: COL[pl.color], emissiveIntensity: 0.1 }));
      m.position.set(p.x, 0.05, p.z); m.receiveShadow = true; m.castShadow = true;
      const rim = new THREE.Mesh(pl.color === 'rot' ? new THREE.CylinderGeometry(0.42, 0.42, 0.04, 28) : new THREE.BoxGeometry(0.74, 0.04, 0.74),
        new THREE.MeshStandardMaterial({ color: 0x444444 }));
      rim.position.set(p.x, 0.01, p.z); this.root.add(rim);
      this.root.add(m); return m;
    });
    // Tore
    this.gateMeshes = L.gates.map(gt => {
      const p = this.pos([gt.x, gt.y]);
      const grp = new THREE.Group(); grp.position.copy(p);
      const postMat = new THREE.MeshStandardMaterial({ color: 0x5b4a3a });
      const horizontal = this.isHorizontalGate(gt);
      for (const s of [-1, 1]) {
        const post = new THREE.Mesh(gt.color === 'rot' ? new THREE.CylinderGeometry(0.08, 0.08, 1.0, 12) : new THREE.BoxGeometry(0.15, 1.0, 0.15), postMat);
        post.position.set(horizontal ? 0.45 * s : 0, 0.5, horizontal ? 0 : 0.45 * s); post.castShadow = true; grp.add(post);
      }
      const bars = new THREE.Group();
      const barMat = new THREE.MeshStandardMaterial({ color: COL[gt.color], roughness: 0.4, emissive: COL[gt.color], emissiveIntensity: 0.15 });
      for (let i = 0; i < 3; i++) {
        const b = new THREE.Mesh(horizontal ? new THREE.BoxGeometry(0.85, 0.15, 0.26) : new THREE.BoxGeometry(0.26, 0.15, 0.85), barMat);
        b.position.y = 0.25 + i * 0.25; b.castShadow = true; bars.add(b);
      }
      grp.add(bars); grp.userData.bars = bars;
      const sign = textSprite(gt.color === 'rot' ? '●' : '◆', { bg: 'rgba(255,255,255,0.92)', color: gt.color === 'rot' ? '#C0392B' : '#2F6FAE', font: 'bold 40px Arial' });
      sign.position.set(0, 1.25, 0); sign.scale.set(0.38, 0.38, 0.38); grp.add(sign); grp.userData.sign = sign;
      this.root.add(grp); return grp;
    });
    // Muscheln
    this.shellMeshes = L.shells.map(s => {
      const p = this.pos(s);
      const grp = new THREE.Group();
      const shellMat = new THREE.MeshStandardMaterial({ color: 0xf7a8b8, roughness: 0.35, emissive: 0xf7a8b8, emissiveIntensity: 0.25 });
      const fan = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), shellMat);
      fan.scale.set(1, 0.55, 0.85); grp.add(fan);
      for (let i = -2; i <= 2; i++) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.36), new THREE.MeshStandardMaterial({ color: 0xe0788f }));
        rib.position.set(i * 0.075, 0.03, 0); rib.rotation.z = i * 0.25; grp.add(rib);
      }
      const isWater = L.tiles[s[1]][s[0]] === 'water';
      grp.position.set(p.x, isWater ? 0.05 : 0.15, p.z);
      grp.userData.baseY = grp.position.y; grp.userData.phase = Math.random() * 6;
      grp.traverse(o => { if (o.isMesh) o.castShadow = true; });
      this.root.add(grp); return grp;
    });
    // Kisten
    this.crateMeshes = new Map();
    S.crates.forEach((c, i) => this.addCrate(c, 'c' + i));
    this.bridgeMeshes = [];
    // Figuren
    this.ola = makeAnimal('ola'); this.bodo = makeAnimal('bodo');
    this.root.add(this.ola, this.bodo);
    this.previewGroup = new THREE.Group(); this.root.add(this.previewGroup);
    this.markerGroup = new THREE.Group(); this.root.add(this.markerGroup);
    this.setState(S);
    this.fitCamera(true);
  }

  isHorizontalGate(gt) {
    // Tor quer zum Durchgang: wenn links/rechts Fels, verläuft der Weg vertikal
    const L = this.L;
    const solid = (x, y) => x < 0 || y < 0 || x >= L.w || y >= L.h || L.tiles[y][x] === 'rock';
    return solid(gt.x - 1, gt.y) && solid(gt.x + 1, gt.y);
  }

  addTuft(p, seed) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 5), new THREE.MeshStandardMaterial({ color: 0x5f9a4a }));
    for (let i = 0; i < 3; i++) {
      const t = m.clone(); t.position.set(p.x - 0.3 + ((seed + i * 3) % 5) * 0.12, 0.07, p.z + 0.25 - i * 0.08);
      this.root.add(t);
    }
  }

  addBlocker(p, seed) {
    const type = this.theme.block;
    const grp = new THREE.Group(); grp.position.copy(p);
    if (type === 'tree') {
      grp.scale.set(0.85, 0.75, 0.85);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x6b4426 }));
      trunk.position.y = 0.2; grp.add(trunk);
      for (let i = 0; i < 3; i++) {
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.42 - i * 0.1, 0.45, 8), new THREE.MeshStandardMaterial({ color: [0x2f6b3a, 0x3a7d45, 0x478f50][i], flatShading: true }));
        c.position.y = 0.5 + i * 0.25; grp.add(c);
      }
    } else {
      const colors = { rock: 0x9b8f80, crystal: 0x7d8fb3, snowrock: 0x8a939c };
      const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), new THREE.MeshStandardMaterial({ color: colors[type], flatShading: true, roughness: 0.9 }));
      r.scale.set(1, 0.85, 1); r.rotation.set(seed, seed * 0.7, 0); r.position.y = 0.3; grp.add(r);
      if (type === 'crystal') {
        const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), new THREE.MeshStandardMaterial({ color: 0x9fe3ff, emissive: 0x3aa0d0, emissiveIntensity: 0.5, flatShading: true }));
        cr.scale.y = 1.8; cr.position.set(0.12, 0.72, 0.05); grp.add(cr);
      }
      if (type === 'snowrock') {
        const cap = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true }));
        cap.scale.set(1, 0.4, 1); cap.position.y = 0.6; grp.add(cap);
      }
    }
    grp.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.root.add(grp);
  }

  addDen(p) {
    const grp = new THREE.Group(); grp.position.copy(p);
    const mound = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x8b6a45, roughness: 1 }));
    mound.scale.y = 0.55; mound.position.y = 0; grp.add(mound);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20), new THREE.MeshBasicMaterial({ color: 0x2a1c10 }));
    hole.position.set(0, 0.1, 0.36); hole.rotation.x = -0.3; grp.add(hole);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6), new THREE.MeshStandardMaterial({ color: 0x444444 }));
    pole.position.set(0.25, 0.4, -0.2); grp.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.2), new THREE.MeshStandardMaterial({ color: 0x4d8b3f, side: THREE.DoubleSide }));
    flag.position.set(0.4, 0.7, -0.2); grp.add(flag); grp.userData.flag = flag;
    this.fx.push({ tick: (t) => { flag.rotation.y = Math.sin(t * 3 + p.x) * 0.3; } });
    const glow = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.47, 32), new THREE.MeshBasicMaterial({ color: 0x7dbb6f, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.015; grp.add(glow);
    grp.traverse(o => { if (o.isMesh) o.castShadow = true; });
    this.root.add(grp);
  }

  addCrate(c, key) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.78, 0.78), new THREE.MeshStandardMaterial({ map: this.woodTex, roughness: 0.8 }));
    const p = this.pos(c, 0.39); m.position.copy(p); m.castShadow = true; m.receiveShadow = true;
    m.userData.cell = [...c];
    this.root.add(m); this.crateMeshes.set(key, m);
  }

  addBridge(c, animate) {
    const grp = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ map: this.woodTex, color: 0xd9b07a, roughness: 0.9 });
    for (let i = -1; i <= 1; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.96), mat);
      plank.position.x = i * 0.32; plank.castShadow = true; plank.receiveShadow = true; grp.add(plank);
    }
    const p = this.pos(c, -0.05); grp.position.copy(p);
    this.root.add(grp); this.bridgeMeshes.push(grp);
    if (animate) { grp.scale.set(0.2, 0.2, 0.2); gsap.to(grp.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: 'back.out(2)' }); }
  }

  charY(p) {
    const t = this.L.tiles[p[1]][p[0]];
    const bridged = this.state && this.state.bridges.some(b => b[0] === p[0] && b[1] === p[1]);
    return t === 'water' && !bridged ? -0.18 : 0.02;
  }

  setState(S) {
    this.state = S;
    const po = this.pos(S.o, this.charY(S.o)); this.ola.position.copy(po);
    const pd = this.pos(S.d, this.charY(S.d)); this.bodo.position.copy(pd);
    this.ola.rotation.y = 0; this.bodo.rotation.y = 0;
    // Kisten neu aufbauen
    for (const m of this.crateMeshes.values()) this.root.remove(m);
    this.crateMeshes = new Map();
    S.crates.forEach((c, i) => this.addCrate(c, 'c' + i));
    for (const b of this.bridgeMeshes) this.root.remove(b);
    this.bridgeMeshes = [];
    S.bridges.forEach(b => this.addBridge(b, false));
    this.shellMeshes.forEach((m, i) => { m.visible = !S.got[i]; m.scale.set(1, 1, 1); });
    this.updateGates(S, false);
    this.markerGroup.clear();
  }

  updateGates(S, animate = true) {
    this.L.gates.forEach((gt, i) => {
      const open = gateOpen(this.L, S, gt.color);
      const bars = this.gateMeshes[i].userData.bars;
      const y = open ? -0.95 : 0;
      if (animate) gsap.to(bars.position, { y, duration: 0.35, ease: 'power2.inOut' });
      else bars.position.y = y;
      this.gateMeshes[i].userData.sign.material.opacity = open ? 0.35 : 1;
    });
    this.L.plates.forEach((pl, i) => {
      const pressed = [S.o, S.d, ...S.crates].some(p => p[0] === pl.x && p[1] === pl.y);
      const m = this.plateMeshes[i];
      const y = pressed ? 0.015 : 0.05;
      if (animate) gsap.to(m.position, { y, duration: 0.2 }); else m.position.y = y;
      m.material.emissiveIntensity = pressed ? 0.6 : 0.1;
    });
  }

  face(obj, dir) {
    const ang = { U: Math.PI, D: 0, L: -Math.PI / 2, R: Math.PI / 2 }[dir];
    if (ang === undefined) return;
    let cur = obj.rotation.y;
    let diff = ((ang - cur + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    gsap.to(obj.rotation, { y: cur + diff, duration: 0.15 });
  }

  // Einen Schritt animieren
  animateStep(S, aO, aD, res, dur = 0.55) {
    return new Promise(resolve => {
      const tl = gsap.timeline({ onComplete: resolve });
      if (res.fail) {
        const who = res.fail.who;
        const bump = (obj, from, dir) => {
          if (dir === 'W') return;
          const d = DIRS[dir];
          const p = this.pos(from, this.charY(from));
          this.face(obj, dir);
          tl.to(obj.position, { x: p.x + d[0] * 0.38, z: p.z + d[1] * 0.38, y: p.y + 0.15, duration: dur * 0.45, ease: 'power2.out' }, 0);
          tl.to(obj.position, { x: p.x, z: p.z, y: p.y, duration: dur * 0.5, ease: 'bounce.out' }, dur * 0.45);
        };
        if (who === 'O' || who === 'both') bump(this.ola, S.o, aO);
        if (who === 'D' || who === 'both') bump(this.bodo, S.d, aD);
        tl.call(() => this.showFailMarker(res.fail, S, aO, aD), null, dur * 0.4);
        return;
      }
      const N = res.state, ev = res.ev;
      const move = (obj, from, to, dir) => {
        if (dir === 'W') {
          tl.to(obj.scale, { y: 0.9, duration: dur * 0.25, yoyo: true, repeat: 1 }, 0);
          return;
        }
        this.face(obj, dir);
        const pTo = this.pos(to, 0);
        const fromY = obj.position.y;
        const toY = (() => {
          const t = this.L.tiles[to[1]][to[0]];
          const bridged = N.bridges.some(b => b[0] === to[0] && b[1] === to[1]);
          return t === 'water' && !bridged ? -0.18 : 0.02;
        })();
        tl.to(obj.position, { x: pTo.x, z: pTo.z, duration: dur, ease: 'power1.inOut' }, 0);
        tl.to(obj.position, { y: Math.max(fromY, toY) + 0.28, duration: dur / 2, ease: 'power2.out' }, 0);
        tl.to(obj.position, { y: toY, duration: dur / 2, ease: 'power2.in' }, dur / 2);
        if (toY < 0 && fromY >= 0) tl.call(() => this.splash(pTo), null, dur * 0.9);
      };
      move(this.ola, S.o, N.o, aO);
      move(this.bodo, S.d, N.d, aD);
      if (ev.push) {
        const m = [...this.crateMeshes.values()].find(c => c.userData.cell[0] === ev.push.from[0] && c.userData.cell[1] === ev.push.from[1]);
        if (m) {
          const to = this.pos(ev.push.to, 0.39);
          m.userData.cell = [...ev.push.to];
          tl.to(m.position, { x: to.x, z: to.z, duration: dur, ease: 'power1.inOut' }, 0);
          if (ev.push.sink) {
            tl.to(m.position, { y: -0.6, duration: dur * 0.6, ease: 'power2.in' }, dur);
            tl.call(() => {
              this.root.remove(m);
              for (const [k, v] of this.crateMeshes) if (v === m) this.crateMeshes.delete(k);
              this.splash(to); this.addBridge(ev.push.to, true);
            }, null, dur * 1.6);
          }
        }
      }
      ev.collected.forEach(i => {
        const sm = this.shellMeshes[i];
        tl.to(sm.position, { y: sm.position.y + 0.9, duration: dur * 0.6, ease: 'power2.out' }, dur * 0.7);
        tl.to(sm.scale, { x: 0.01, y: 0.01, z: 0.01, duration: dur * 0.4 }, dur * 1.1);
        tl.call(() => { this.sparkle(sm.position.clone()); }, null, dur * 1.1);
        tl.call(() => { sm.visible = false; }, null, dur * 1.5);
      });
      tl.call(() => { this.state = N; this.updateGates(N, true); }, null, dur * 0.95);
      tl.to({}, { duration: 0.05 }, dur * (ev.push && ev.push.sink ? 1.7 : (ev.collected.length ? 1.55 : 1.0)));
    });
  }

  showFailMarker(fail, S, aO, aD) {
    const add = (p, d) => [p[0] + DIRS[d][0], p[1] + DIRS[d][1]];
    const spots = [];
    if (fail.who === 'O' || fail.who === 'both') spots.push(add(S.o, aO));
    if (fail.who === 'D' || fail.who === 'both') spots.push(add(S.d, aD));
    if (fail.code === 'collide') spots.length = 0, spots.push(add(S.o, aO));
    spots.forEach(sp => {
      const x = textSprite('✗', { bg: '#C0392B', font: 'bold 46px Arial' });
      const p = this.pos(sp, 1.0); x.position.copy(p); x.scale.set(0.01, 0.01, 0.01);
      this.markerGroup.add(x);
      gsap.to(x.scale, { x: 0.55, y: 0.55, z: 0.55, duration: 0.4, ease: 'back.out(3)' });
      gsap.to(x.position, { y: 1.2, duration: 0.8, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    });
  }

  celebrate() {
    [this.ola, this.bodo].forEach((o, i) => {
      gsap.to(o.position, { y: o.position.y + 0.5, duration: 0.25, yoyo: true, repeat: 5, ease: 'power1.out', delay: i * 0.12 });
      gsap.to(o.rotation, { y: o.rotation.y + Math.PI * 4, duration: 1.5, ease: 'power2.inOut', delay: i * 0.12 });
    });
  }

  splash(p) {
    for (let i = 0; i < 10; i++) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), new THREE.MeshBasicMaterial({ color: 0xd8f1ff, transparent: true }));
      d.position.set(p.x, 0, p.z); this.root.add(d);
      const a = (i / 10) * Math.PI * 2;
      gsap.to(d.position, { x: p.x + Math.cos(a) * 0.4, z: p.z + Math.sin(a) * 0.4, duration: 0.5 });
      gsap.to(d.position, { y: 0.4, duration: 0.25, yoyo: true, repeat: 1, ease: 'power1.out' });
      gsap.to(d.material, { opacity: 0, duration: 0.5, delay: 0.1, onComplete: () => this.root.remove(d) });
    }
  }

  sparkle(p) {
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.05), new THREE.MeshBasicMaterial({ color: [0xffd84d, 0xffffff, 0xf7a8b8][i % 3], transparent: true }));
      s.position.copy(p); this.root.add(s);
      const a = Math.random() * Math.PI * 2, r = 0.3 + Math.random() * 0.5;
      gsap.to(s.position, { x: p.x + Math.cos(a) * r, y: p.y + Math.random() * 0.6, z: p.z + Math.sin(a) * r, duration: 0.7, ease: 'power2.out' });
      gsap.to(s.material, { opacity: 0, duration: 0.7, onComplete: () => this.root.remove(s) });
    }
  }

  // Spur: naive Vorschau der Wege (ohne Regeln, nur Rand)
  setPreview(planO, planD, show) {
    this.previewGroup.clear();
    if (!show || !this.state) return;
    const draw = (start, plan, color, off) => {
      let p = [...start];
      plan.forEach((a, i) => {
        if (a === 'W') return;
        const n = [p[0] + DIRS[a][0], p[1] + DIRS[a][1]];
        if (n[0] < 0 || n[1] < 0 || n[0] >= this.L.w || n[1] >= this.L.h) return;
        p = n;
        const spr = textSprite(String(i + 1), { bg: color, font: 'bold 34px Arial' });
        const v = this.pos(p, 0.35); spr.position.set(v.x + off, v.y, v.z + off); spr.scale.set(0.32, 0.32, 0.32);
        this.previewGroup.add(spr);
      });
    };
    const S0 = this.state;
    draw(S0.o, planO, '#D97A4A', -0.18);
    draw(S0.d, planD, '#3E5668', 0.18);
  }

  tick() {
    const t = (performance.now() - this.t0) / 1000;
    this.waterTex.offset.set(t * 0.03, t * 0.05);
    if (this.shellMeshes) this.shellMeshes.forEach(m => {
      if (!m.visible) return;
      m.rotation.y = t * 0.8 + m.userData.phase;
    });
    for (const f of this.fx) f.tick(t);
    if (this.ola) {
      this.ola.userData.tail.rotation.y = Math.sin(t * 4) * 0.4;
      this.bodo.userData.tail.rotation.y = Math.sin(t * 5 + 1) * 0.3;
      this.ola.userData.head.position.y = 0.42 + Math.sin(t * 2.2) * 0.015;
      this.bodo.userData.head.position.y = 0.42 + Math.sin(t * 2 + 1) * 0.015;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}
