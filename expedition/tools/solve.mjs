import { parseLevel, initialState, step, isWin, stateKey, ACTIONS } from '../js/engine.js';
import { LEVELS } from '../js/levels.js';

function bfs(L, allowWait = true, limit = 60) {
  const acts = allowWait ? ACTIONS : ['U', 'D', 'L', 'R'];
  const actsBoth = ACTIONS; // the other one may still idle at plan end; allow W only when allowWait
  let S0 = initialState(L);
  const seen = new Map([[stateKey(S0), null]]);
  let frontier = [S0];
  for (let depth = 0; depth < limit; depth++) {
    const next = [];
    for (const S of frontier) {
      for (const a of acts) for (const b of acts) {
        const r = step(L, S, a, b);
        if (r.fail) continue;
        const k = stateKey(r.state);
        if (seen.has(k)) continue;
        seen.set(k, { prev: stateKey(S), a, b, S: S });
        if (isWin(L, r.state)) {
          // rebuild
          const po = [], pd = [];
          let cur = k;
          while (seen.get(cur)) { const e = seen.get(cur); po.unshift(e.a); pd.unshift(e.b); cur = e.prev; }
          return { len: depth + 1, po, pd, states: seen.size };
        }
        next.push(r.state);
      }
    }
    frontier = next;
    if (!frontier.length) break;
  }
  return null;
}

const only = process.argv[2];
for (const lv of LEVELS) {
  if (only && lv.id !== only) continue;
  const L = parseLevel(lv);
  const r = bfs(L);
  const nw = bfs(L, false);
  const trim = a => { let x = [...a]; while (x.length && x[x.length - 1] === 'W') x.pop(); return x; };
  if (!r) { console.log(lv.id, 'UNLÖSBAR'); continue; }
  const lo = trim(r.po).length, ld = trim(r.pd).length;
  console.log(`${lv.id.padEnd(4)} ${lv.title.padEnd(26)} opt=${r.len} (O ${lo}, D ${ld}) maxSteps=${lv.maxSteps} ${lv.maxSteps < Math.max(lo, ld) ? '!!ZU KNAPP' : ''} ohneWarten=${nw ? nw.len : 'unlösbar'} states=${r.states}`);
  console.log('     O:', r.po.join(''), '\n     D:', r.pd.join(''));
}
