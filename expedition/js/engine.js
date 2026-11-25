// Expedition Otterbucht – Spiellogik (ohne Grafik, auch in Node testbar)
// Legende der Karten:
//  .  Gras        #  Fels/Baum     ~  Wasser       H  Bau (Ziel)
//  O  Start Ola   D  Start Bodo    s  Muschel      w  Muschel im Wasser
//  C  Kiste       p/q  Schalter (rot/blau)          P/Q  Tor (rot/blau)

export const DIRS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0], W: [0, 0] };
export const ACTIONS = ['U', 'D', 'L', 'R', 'W'];

export function parseLevel(lv) {
  const rows = lv.map;
  const h = rows.length, w = rows[0].length;
  const tiles = [];
  const L = { w, h, tiles, plates: [], gates: [], shells: [], crates: [], goals: [], o: null, d: null };
  for (let y = 0; y < h; y++) {
    if (rows[y].length !== w) throw new Error(`Zeile ${y} hat falsche Länge in ${lv.id}`);
    tiles.push([]);
    for (let x = 0; x < w; x++) {
      const c = rows[y][x];
      let t = 'grass';
      switch (c) {
        case '#': t = 'rock'; break;
        case '~': t = 'water'; break;
        case 'w': t = 'water'; L.shells.push([x, y]); break;
        case 'H': t = 'goal'; L.goals.push([x, y]); break;
        case 's': L.shells.push([x, y]); break;
        case 'C': L.crates.push([x, y]); break;
        case 'O': L.o = [x, y]; break;
        case 'D': L.d = [x, y]; break;
        case 'p': L.plates.push({ x, y, color: 'rot' }); break;
        case 'q': L.plates.push({ x, y, color: 'blau' }); break;
        case 'P': t = 'gate'; L.gates.push({ x, y, color: 'rot' }); break;
        case 'Q': t = 'gate'; L.gates.push({ x, y, color: 'blau' }); break;
        case '.': break;
        default: throw new Error(`Unbekanntes Zeichen ${c}`);
      }
      tiles[y].push(t);
    }
  }
  return L;
}

export function initialState(L) {
  return {
    o: [...L.o], d: [...L.d],
    crates: L.crates.map(c => [...c]),
    bridges: [],
    got: L.shells.map(() => false),
  };
}

const eq = (a, b) => a[0] === b[0] && a[1] === b[1];
const has = (list, p) => list.some(q => eq(q, p));

export function gateOpen(L, S, color) {
  return L.plates.some(pl => pl.color === color &&
    (eq([pl.x, pl.y], S.o) || eq([pl.x, pl.y], S.d) || has(S.crates, [pl.x, pl.y])));
}

function tileAt(L, S, p) {
  const [x, y] = p;
  if (x < 0 || y < 0 || x >= L.w || y >= L.h) return 'out';
  const t = L.tiles[y][x];
  if (t === 'water' && has(S.bridges, p)) return 'bridge';
  return t;
}

function gateAt(L, p) { return L.gates.find(g => g.x === p[0] && g.y === p[1]); }

// Ein Schritt: beide Figuren handeln gleichzeitig.
// Tore richten sich nach dem Zustand zu Beginn des Schritts.
export function step(L, S, aO, aD) {
  const open = { rot: gateOpen(L, S, 'rot'), blau: gateOpen(L, S, 'blau') };
  const ev = { moves: {}, push: null, collected: [] };
  const fail = (who, code, text) => ({ state: S, ev, fail: { who, code, text } });
  const add = (p, d) => [p[0] + d[0], p[1] + d[1]];

  // Ziel von Ola
  let tO = add(S.o, DIRS[aO]);
  if (aO !== 'W') {
    const t = tileAt(L, S, tO);
    if (t === 'out') return fail('O', 'oob', 'Ola wollte aus dem Spielfeld laufen.');
    if (t === 'rock') return fail('O', 'rock', 'Ola ist gegen einen Felsen gelaufen.');
    if (t === 'gate' && !open[gateAt(L, tO).color]) return fail('O', 'gate', `Ola stand vor dem geschlossenen ${gateAt(L, tO).color}en Tor.`);
    if (has(S.crates, tO)) return fail('O', 'crate', 'Ola ist zu leicht, um Kisten zu schieben.');
  }
  // Ziel von Bodo
  let tD = add(S.d, DIRS[aD]);
  let push = null;
  if (aD !== 'W') {
    const t = tileAt(L, S, tD);
    if (t === 'out') return fail('D', 'oob', 'Bodo wollte aus dem Spielfeld laufen.');
    if (t === 'rock') return fail('D', 'rock', 'Bodo ist gegen einen Felsen gelaufen.');
    if (t === 'gate' && !open[gateAt(L, tD).color]) return fail('D', 'gate', `Bodo stand vor dem geschlossenen ${gateAt(L, tD).color}en Tor.`);
    if (t === 'water') return fail('D', 'swim', 'Bodo kann nicht schwimmen!');
    if (has(S.crates, tD)) {
      const m = add(tD, DIRS[aD]);
      const tm = tileAt(L, S, m);
      const blocked = tm === 'out' || tm === 'rock' || (tm === 'gate' && !open[gateAt(L, m).color]) ||
        has(S.crates, m) || eq(m, S.o) || eq(m, tO) ||
        L.shells.some((s, i) => !S.got[i] && eq(s, m));
      if (blocked) return fail('D', 'push', 'Die Kiste klemmt – dahinter ist kein Platz.');
      push = { from: tD, to: m, sink: tm === 'water' };
    }
  }
  if (eq(tO, tD)) return fail('both', 'collide', 'Ola und Bodo sind zusammengestoßen.');
  if (eq(tO, S.d) && eq(tD, S.o)) return fail('both', 'collide', 'Ola und Bodo sind zusammengestoßen.');

  const N = {
    o: tO, d: tD,
    crates: S.crates.map(c => [...c]),
    bridges: S.bridges.map(b => [...b]),
    got: [...S.got],
  };
  if (push) {
    N.crates = N.crates.filter(c => !eq(c, push.from));
    if (push.sink) N.bridges.push(push.to); else N.crates.push(push.to);
    ev.push = push;
  }
  L.shells.forEach((s, i) => {
    if (!N.got[i] && (eq(s, N.o) || eq(s, N.d))) { N.got[i] = true; ev.collected.push(i); }
  });
  ev.moves = { o: [S.o, tO], d: [S.d, tD] };
  return { state: N, ev, fail: null };
}

export function isWin(L, S) {
  const onGoal = p => L.goals.some(g => eq(g, p));
  return S.got.every(Boolean) && onGoal(S.o) && onGoal(S.d);
}

// Plan ausführen (für Tests und Vorschau)
export function runPlan(L, planO, planD) {
  let S = initialState(L);
  const n = Math.max(planO.length, planD.length);
  for (let i = 0; i < n; i++) {
    const r = step(L, S, planO[i] || 'W', planD[i] || 'W');
    if (r.fail) return { ok: false, at: i, fail: r.fail, state: S };
    S = r.state;
    if (isWin(L, S)) return { ok: true, at: i, state: S };
  }
  return { ok: false, at: n, fail: null, state: S };
}

export function stateKey(S) {
  return S.o.join(',') + '|' + S.d.join(',') + '|' +
    S.crates.map(c => c.join(',')).sort().join(';') + '|' +
    S.bridges.map(c => c.join(',')).sort().join(';') + '|' +
    S.got.map(g => (g ? 1 : 0)).join('');
}
