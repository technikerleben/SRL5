// Expedition Otterbucht – Ablauf, Oberfläche, Speichern
import { parseLevel, initialState, step, isWin } from './engine.js';
import { LEVELS, WORLDS } from './levels.js';
import { Board, webglAvailable } from './scene.js';
import { createTutorial } from './tutorial.js';

/* ================= Inhalte ================= */
const STRATEGIES = [
  { id: 'ueberblick', icon: '🔭', name: 'Überblick verschaffen',
    text: 'Wir schauen uns erst das ganze Feld in Ruhe an: Wo ist das Ziel? Wo sind Muscheln, Hindernisse und Schalter? Erst dann planen wir.',
    frage: 'Habt ihr alles entdeckt, bevor ihr losgeplant habt?' },
  { id: 'rueckwaerts', icon: '🔙', name: 'Vom Ziel rückwärts denken',
    text: 'Wir fangen beim Ziel an und fragen: Was muss direkt davor passieren? Und was davor?',
    frage: 'Was muss als Letztes passieren – und was davor?' },
  { id: 'etappen', icon: '🧩', name: 'In Etappen teilen',
    text: 'Wir teilen die große Aufgabe in kleine Etappen (z. B. 1. Muschel holen, 2. zum Tor, 3. in den Bau) und planen eine nach der anderen.',
    frage: 'Welche Etappen hat dieses Level?' },
  { id: 'verteilen', icon: '🤝', name: 'Aufgaben verteilen',
    text: 'Wir überlegen: Was kann Ola, was kann Bodo? Wer übernimmt welche Aufgabe?',
    frage: 'Wer ist für welche Aufgabe am besten geeignet?' },
  { id: 'takt', icon: '⏱️', name: 'Im Takt planen',
    text: 'Wir gehen die Spalten durch: Wo ist Ola bei Schritt 1, 2, 3 … – und wo ist Bodo? So kommen beide rechtzeitig an und stoßen nicht zusammen.',
    frage: 'Wo stehen beide in jeder Spalte?' },
  { id: 'testen', icon: '🧪', name: 'Teil testen & anpassen',
    text: 'Wir planen nur ein Stück, testen es in der Durchführung und bauen den Plan dann Schritt für Schritt weiter.',
    frage: 'Welches Stück testet ihr zuerst?' },
];
const S_BY_ID = Object.fromEntries(STRATEGIES.map(s => [s.id, s]));

const PREDICTIONS = [
  { v: 1, icon: '😀', label: 'Klappt im 1. Versuch' },
  { v: 2, icon: '🙂', label: 'Wir brauchen 2 Versuche' },
  { v: 3, icon: '🤔', label: '3 oder mehr Versuche' },
];

const CAUSES = [
  { id: 'verzaehlt', icon: '🔢', label: 'Wir haben uns verzählt.' },
  { id: 'uebersehen', icon: '👀', label: 'Wir haben etwas übersehen.' },
  { id: 'takt', icon: '⏱️', label: 'Ola und Bodo waren nicht im Takt.' },
  { id: 'regel', icon: '📏', label: 'Wir kannten eine Regel nicht.' },
  { id: 'unfertig', icon: '🧩', label: 'Der Plan war absichtlich noch nicht fertig.' },
  { id: 'unklar', icon: '❓', label: 'Wissen wir noch nicht.' },
];
const CHANGES = [
  { id: 'verbessern', icon: '🔧', label: 'Plan an einer Stelle verbessern' },
  { id: 'wechseln', icon: '🔄', label: 'Strategie wechseln' },
  { id: 'neu', icon: '🧹', label: 'Ganz neu planen' },
  { id: 'leiter', icon: '🪜', label: 'Lösungsleiter nutzen' },
];
const TIPS = {
  oob: 'Zählt die Felder bis zum Rand genau nach. Der Knopf „👣 Spur zeigen“ hilft beim Zählen.',
  rock: 'Fahrt den Weg mit dem Finger auf dem Bildschirm nach – Feld für Feld.',
  gate: 'Ein Tor ist nur offen, solange schon VOR diesem Schritt jemand (oder eine Kiste) auf dem Schalter in derselben Farbe steht.',
  swim: 'Bodo kann nicht schwimmen. Eine Kiste im Wasser wird zur Brücke.',
  crate: 'Nur Bodo kann Kisten schieben. Ola muss außen herum.',
  push: 'Hinter der Kiste muss ein freies Feld oder Wasser sein. Auch Muscheln, Felsen und Figuren blockieren.',
  collide: 'Schaut euch die rote Spalte an: Wo stehen beide in diesem Schritt? Eine ⏸-Karte kann helfen.',
  incomplete: 'Der Plan war zu Ende, aber das Ziel ist noch nicht erreicht. Was fehlt noch: Muscheln? Bau?',
  aborted: 'Ihr habt die Durchführung gestoppt. Was habt ihr dabei gesehen?',
};
const SENTENCE_STARTERS = ['Geholfen hat uns, dass …', 'Schwierig war …', 'Beim nächsten Mal …', 'Unsere Strategie war gut, weil …', 'Wir haben gelernt, dass …'];
const NAME_IDEAS = ['Die Muschelsucher', 'Team Flossenkraft', 'Die Brückenbauer', 'Otterpower', 'Die Planprofis', 'Team Dachsbau'];
const ACT_ICON = { U: '↑', D: '↓', L: '←', R: '→', W: '⏸' };
const ACT_WORD = { U: 'nach oben', D: 'nach unten', L: 'nach links', R: 'nach rechts', W: 'wartet' };

/* ================= Speicher ================= */
const STORE = 'hbg_expedition_otterbucht_v1';
let db = load() || { teams: {}, last: null, sound: false };
function load() { try { return JSON.parse(localStorage.getItem(STORE)); } catch (e) { return null; } }
function save() { try { team && (team.updated = Date.now()); localStorage.setItem(STORE, JSON.stringify(db)); } catch (e) { /* voll */ } }

let team = null;          // aktuelles Team
let board = null;         // 3D-Board
let L = null, LV = null;  // aktuelles Level (geparst / Rohdaten)
let ui = { row: 'o', sel: null, preview: false };
let runner = null;

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const levelIdx = id => LEVELS.findIndex(l => l.id === id);

function rec(id) {
  if (!team.levels[id]) team.levels[id] = { done: false, durchgang: 1, open: true, attempts: [], best: null, dg: {} };
  return team.levels[id];
}
function dgRec(id) {
  const r = rec(id);
  if (!r.dg[r.durchgang]) r.dg[r.durchgang] = { prediction: null, hints: 0, ratings: {}, text: '', stars: null, finished: false };
  return r.dg[r.durchgang];
}
function attemptsNow(id) { const r = rec(id); return r.attempts.filter(a => a.dg === r.durchgang); }
function starsOf(id) { const r = team.levels[id]; return r && r.best ? r.best : null; }
function starCount(s) { return s ? (s.geschafft ? 1 : 0) + (s.eingeschaetzt ? 1 : 0) + (s.reflektiert ? 1 : 0) : 0; }
function unlockedUpTo() { return unlockedIdx(team); }
// Index des höchsten spielbaren Levels: erstes nicht geschafftes Level
// oder die Freischaltung aus der Administration – je nachdem, was weiter reicht.
function unlockedIdx(t) {
  return Math.min(LEVELS.length - 1, Math.max(unlockedFor(t), t.unlockedTo || 0));
}

/* ================= Ton ================= */
let actx = null;
function beep(freq = 520, dur = 0.08, type = 'sine', vol = 0.06) {
  if (!db.sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = vol;
    o.connect(g); g.connect(actx.destination);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
    o.start(); o.stop(actx.currentTime + dur);
  } catch (e) { /* egal */ }
}
const sfx = {
  step: () => beep(420, 0.05, 'triangle', 0.04),
  shell: () => { beep(880, 0.08); setTimeout(() => beep(1320, 0.1), 80); },
  fail: () => { beep(200, 0.25, 'sawtooth', 0.04); },
  win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.15, 'triangle', 0.06), i * 120)),
  click: () => beep(660, 0.03, 'square', 0.02),
};

/* ================= Bildschirme ================= */
function show(id) {
  document.querySelectorAll('.screen').forEach(s => { s.hidden = s.id !== id; });
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.tm); toast.tm = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------- Start ---------- */
function renderStart() {
  show('scr-start');
  $('#name-ideas').innerHTML = NAME_IDEAS.map(n => `<button class="chip" data-name="${esc(n)}">${esc(n)}</button>`).join('');
  const teams = Object.values(db.teams).sort((a, b) => b.updated - a.updated);
  $('#team-list').innerHTML = teams.length ? teams.map(t => {
    const n = unlockedFor(t);
    const stars = LEVELS.reduce((s, l) => s + starCount(t.levels[l.id] && t.levels[l.id].best), 0);
    return `<button class="team-btn" data-team="${t.id}"><span><b>${esc(t.name)}</b><br><span class="team-meta">Level ${Math.min(n + 1, 12)} von 12 · ⭐ ${stars}</span></span><span>▶</span></button>`;
  }).join('') : '<p class="empty">Auf diesem Gerät gibt es noch keine Teams.</p>';
}
function unlockedFor(t) { let n = 0; while (n < LEVELS.length && t.levels[LEVELS[n].id] && t.levels[LEVELS[n].id].done) n++; return n; }

function newTeam() {
  const name = $('#team-name').value.trim();
  if (name.length < 2) { $('#team-name').focus(); toast('Gebt eurem Team zuerst einen Namen.'); return; }
  const id = 't' + Date.now().toString(36);
  db.teams[id] = { id, name, created: Date.now(), updated: Date.now(), introDone: false, levels: {}, worlds: {}, cur: null, plans: {} };
  db.last = id; team = db.teams[id]; save();
  $('#team-name').value = '';
  renderIntro(0);
}
function openTeam(id) {
  team = db.teams[id]; db.last = id; save();
  if (!team.introDone) return renderIntro(0);
  setTimeout(resumeTutorial, 600);
  if (team.cur && team.cur.levelId && !team.cur.pendingWorld) return openLevel(team.cur.levelId);
  if (team.cur && team.cur.pendingWorld != null) return renderWorldReflection(team.cur.pendingWorld);
  renderMap();
}

/* ---------- Intro ---------- */
const INTRO = [
  () => `<h2>Willkommen in der Otterbucht! 🌊</h2>
    <p>Zwei Freunde wollen eine Expedition machen und Muscheln sammeln. Am Ende jedes Abschnitts müssen beide sicher in ihren <b>Bau</b> 🏠.</p>
    <div class="duo">
      <div class="hero-card ola"><div class="big">🦦</div><h3>Ola, der Otter</h3><ul><li>kann <b>schwimmen</b> 🌊</li><li>ist leicht – kann <b>keine Kisten</b> schieben</li><li>Farbe im Plan: <b style="color:var(--rust-dark)">orange</b></li></ul></div>
      <div class="hero-card bodo"><div class="big">🦡</div><h3>Bodo, der Dachs</h3><ul><li>ist stark – kann <b>Kisten schieben</b> 📦</li><li>kann <b>nicht schwimmen</b></li><li>Farbe im Plan: <b style="color:var(--slate)">blau</b></li></ul></div>
    </div>
    <p style="margin-top:14px">Ihr steuert beide Figuren gemeinsam. Das klappt nur mit einem guten <b>Plan</b>.</p>`,
  () => `<h2>Was ist eine Strategie? 🧭</h2>
    <p>Eine <b>Strategie</b> ist ein geplanter Weg, <b>wie</b> ihr eine Aufgabe angeht.</p>
    <div class="compare">
      <div class="what"><b>Die Aufgabe (WAS?)</b><br>Ein Puzzle mit 500 Teilen legen.</div>
      <div class="how"><b>Eine Strategie (WIE?)</b><br>„Wir suchen zuerst alle Randteile.“</div>
    </div>
    <div class="example">Gute Strategien kennt ihr schon aus der Schule: <b>Unbekannte Wörter klären</b> oder <b>Schlüsselwörter finden</b> sind Lese-Strategien.</div>
    <p>In diesem Spiel lernt ihr <b>6 Strategien</b> zum Planen kennen. Vor jedem Versuch wählt ihr eine oder zwei aus – und am Ende überlegt ihr: <b>Hat sie geholfen?</b></p>
    <p class="muted">Profi-Wissen: Eine Strategie ist kein Trick, der immer funktioniert. Man muss prüfen, ob sie zur Aufgabe passt.</p>`,
  () => `<h2>Der Expeditions-Kreislauf 🔄</h2>
    <p>Jedes Level spielt ihr in drei Phasen – genau wie beim Lernen in der Schule:</p>
    <div class="cycle">
      <div class="ph-box ph-plan"><h3>1 · Planung</h3><p>Ziel verstehen, Strategie wählen, Vorhersage treffen, Schritte legen.</p></div>
      <div class="arrow">→</div>
      <div class="ph-box ph-do"><h3>2 · Durchführung</h3><p>Ola und Bodo laufen los. Ihr beobachtet genau.</p></div>
      <div class="arrow">→</div>
      <div class="ph-box ph-ref"><h3>3 · Reflexion</h3><p>Was ist passiert? Was hat geholfen? Was ändern wir?</p></div>
    </div>
    <p>Klappt etwas nicht, ist das <b>kein Fehler</b>, sondern eine Information. Nach der Reflexion geht es zurück in die Planung.</p>`,
  () => `<h2>So spielt ihr zu zweit 🤝</h2>
    <ul style="padding-left:22px;font-size:1.05rem;display:flex;flex-direction:column;gap:8px">
      <li><b>Redet miteinander!</b> Erklärt euch eure Ideen, bevor ihr Karten legt.</li>
      <li>Wechselt euch an der Maus ab – zum Beispiel nach jedem Level.</li>
      <li>Ist jemand von euch <b>kurz weg</b>? Kein Problem: Spielt einfach weiter.</li>
      <li>Kommt jemand zurück, drückt den Knopf <b>👋 Wo stehen wir?</b> Dann erklärt ihr euch gegenseitig, wo ihr gerade seid.</li>
      <li>Wenn ihr nicht weiterkommt, nutzt die <b>🪜 Lösungsleiter</b>. Die hat drei Sprossen – nehmt erst die unterste.</li>
      <li>Alles wird automatisch gespeichert. Ihr könnt später genau hier weitermachen.</li>
      <li>Gleich zeigt euch <b>Ola in einem Tutorial</b> Schritt für Schritt, wie alles geht.</li>
    </ul>
    <p style="margin-top:14px">Für jedes Level gibt es bis zu <b>3 Sterne</b>: ⭐ geschafft · ⭐ gut eingeschätzt · ⭐ gut reflektiert.</p>`,
];
function renderIntro(i) {
  show('scr-intro');
  $('#intro-slide').innerHTML = INTRO[i]();
  $('#intro-dots').innerHTML = INTRO.map((_, k) => `<span class="${k === i ? 'on' : ''}"></span>`).join('');
  $('#intro-back').style.visibility = i === 0 ? 'hidden' : 'visible';
  $('#intro-next').textContent = i === INTRO.length - 1 ? 'Los geht’s! →' : 'Weiter →';
  $('#intro-back').onclick = () => renderIntro(i - 1);
  $('#intro-next').onclick = () => {
    if (i < INTRO.length - 1) return renderIntro(i + 1);
    team.introDone = true; save(); renderMap(); tut.start('hallo');
  };
}

/* ---------- Karte ---------- */
function renderMap() {
  show('scr-map');
  $('#map-team').textContent = team.name;
  const unl = unlockedUpTo();
  const total = LEVELS.reduce((s, l) => s + starCount(starsOf(l.id)), 0);
  $('#star-total').textContent = `⭐ ${total} von ${LEVELS.length * 3} Sternen`;
  $('#worlds').innerHTML = WORLDS.map((w, wi) => {
    const lvls = LEVELS.map((l, i) => ({ l, i })).filter(x => x.l.world === wi);
    return `<div class="world w${wi}"><div class="world-top"><div class="wi">${w.icon}</div><h3>${esc(w.name)}</h3><p>${esc(w.text)}</p></div>
      <div class="world-levels">${lvls.map(({ l, i }) => {
        const r = team.levels[l.id];
        const done = r && r.done;
        const cur = team.cur && team.cur.levelId === l.id;
        const st = starsOf(l.id);
        const stars = done ? '⭐'.repeat(starCount(st)) + '☆'.repeat(3 - starCount(st)) : (i <= unl ? 'neu' : '🔒');
        return `<button class="lvl-btn ${done ? 'done' : ''} ${cur ? 'current' : ''}" data-level="${l.id}" ${i > unl ? 'disabled' : ''}>
          <span class="lvl-num">${i + 1}</span><span><span class="lvl-name">${esc(l.title)}</span><br><span class="lvl-stars">${stars}</span></span></button>`;
      }).join('')}</div>
      ${team.worlds[wi] ? `<div class="world-refl">✓ Etappen-Reflexion erledigt</div>` : ''}</div>`;
  }).join('');
}

/* ---------- Level öffnen ---------- */
function openLevel(id) {
  LV = LEVELS.find(l => l.id === id); L = parseLevel(LV);
  const r = rec(id);
  if (r.done && !r.open) { r.durchgang += 1; r.open = true; }
  dgRec(id);
  if (!team.cur || team.cur.levelId !== id) {
    team.cur = { levelId: id, phase: 'planung', strategies: [], lastFail: null, pending: null };
  }
  if (team.cur.phase === 'durchfuehrung') team.cur.phase = 'planung';
  if (!team.plans[id]) team.plans[id] = { o: [], d: [] };
  ui.sel = null; ui.row = 'o';
  save();
  show('scr-game');
  $('#lvl-title').textContent = `Level ${levelIdx(id) + 1} · ${LV.title}`;
  if (!board) {
    if (!webglAvailable()) {
      $('#board').innerHTML = '<div class="no-webgl"><div><h2>3D-Grafik nicht verfügbar</h2><p>Dieser Browser kann leider keine 3D-Grafik anzeigen. Bitte Chrome, Edge oder Firefox verwenden.</p></div></div>';
    } else board = new Board($('#board'));
  }
  if (board) board.load(L, initialState(L), LV.world);
  renderLegend();
  updateHud(initialState(L), null);
  renderPhase();
}

function renderLegend() {
  const has = c => LV.map.some(r => r.includes(c));
  const parts = ['<span>🦦 Ola</span>', '<span>🦡 Bodo</span>', '<span>🐚 Muschel</span>', '<span>🏠 Bau (Ziel)</span>'];
  if (has('~') || has('w')) parts.push('<span>🌊 Wasser</span>');
  if (has('C')) parts.push('<span>📦 Kiste</span>');
  if (has('p')) parts.push('<span>🔴 runder Schalter → rotes Tor</span>');
  if (has('q')) parts.push('<span>🔷 eckiger Schalter → blaues Tor</span>');
  $('#board-legend').innerHTML = parts.join('');
}
function updateHud(S, stepNo) {
  const got = S.got.filter(Boolean).length;
  $('#hud-shells').textContent = `🐚 ${got}/${S.got.length}`;
  $('#hud-step').textContent = stepNo == null ? 'Startaufstellung' : `Schritt ${stepNo}`;
}

// Scrollposition im Panel beim Neuzeichnen behalten
function setPanel(html, key) {
  const panel = $('#panel');
  const old = panel.querySelector('.panel-scroll');
  const top = old && panel.dataset.view === key ? old.scrollTop : 0;
  panel.innerHTML = html; panel.dataset.view = key;
  const sc = panel.querySelector('.panel-scroll'); if (sc) sc.scrollTop = top;
}
function setPhase(ph) { team.cur.phase = ph; save(); renderPhase(); }
function renderPhase() {
  document.querySelectorAll('.phase').forEach(p => p.classList.toggle('on', p.dataset.ph === team.cur.phase));
  if (team.cur.phase === 'planung') renderPlanung();
  else if (team.cur.phase === 'durchfuehrung') renderDurchfuehrung();
  else renderReflexion();
}

/* ================= PLANUNG ================= */
function plan() { return team.plans[team.cur.levelId]; }

function planGridHTML({ editable, curCol = null, failCol = null, ranUpTo = -1 }) {
  const P = plan(), max = LV.maxSteps;
  let html = '';
  for (let b = 0; b < Math.ceil(max / 10); b++) {
    html += '<div class="grid-block"><div class="pgrid"><span></span>';
    for (let c = b * 10; c < b * 10 + 10; c++) {
      const cls = c === curCol ? 'cur' : (c === failCol ? 'failcol' : '');
      html += c < max ? `<span class="colnum ${cls}">${c + 1}</span>` : '<span></span>';
    }
    for (const r of ['o', 'd']) {
      html += `<span class="rlab" title="${r === 'o' ? 'Ola' : 'Bodo'}">${r === 'o' ? '🦦' : '🦡'}</span>`;
      for (let c = b * 10; c < b * 10 + 10; c++) {
        if (c >= max) { html += '<span></span>'; continue; }
        const a = P[r][c];
        const cls = ['cell', r];
        if (a) cls.push('filled');
        if (!a && c === P[r].length && editable && ui.row === r) cls.push('next');
        if (editable && ui.row === r && ui.sel === c) cls.push('sel');
        if (c === curCol && a) cls.push('cur');
        if (c === failCol && (team.cur.lastFail && (team.cur.lastFail.who === r || team.cur.lastFail.who === 'both' || (team.cur.lastFail.who === 'O' && r === 'o') || (team.cur.lastFail.who === 'D' && r === 'd')))) cls.push('failcell');
        if (c <= ranUpTo) cls.push('ran');
        html += `<span class="${cls.join(' ')}" data-row="${r}" data-col="${c}" ${editable ? 'role="button" tabindex="-1"' : ''}>${a ? ACT_ICON[a] : ''}</span>`;
      }
    }
    html += '</div></div>';
  }
  return html;
}

function planningStatus() {
  const d = dgRec(team.cur.levelId);
  const P = plan();
  return {
    strat: team.cur.strategies.length > 0,
    pred: d.prediction != null,
    plan: P.o.length + P.d.length > 0,
  };
}

function renderPlanung() {
  const id = team.cur.levelId, d = dgRec(id), P = plan();
  const nAtt = attemptsNow(id).length;
  const st = planningStatus();
  const shells = L.shells.length;
  const lf = team.cur.lastFail;
  setPanel(`
  <div class="panel-scroll">
    <div class="ph-head ph-plan"><h2>1 · Planung ${nAtt ? `– Versuch ${nAtt + 1}` : ''}</h2>
      <p>${nAtt ? 'Nutzt, was ihr in der Reflexion herausgefunden habt.' : 'Erst denken, dann losgehen. Arbeitet die vier Punkte von oben nach unten ab.'}</p></div>
    ${nAtt === 0 ? `<div class="newbox">🆕 <b>Neu:</b> ${esc(LV.neu)}</div>` : ''}
    ${lf ? `<div class="failnote">✗ Letzter Versuch: ${lf.step != null ? `<b>Schritt ${lf.step + 1}</b> – ` : ''}${esc(lf.text)}${lf.change ? `<br>Euer Vorhaben: ${esc(CHANGES.find(c => c.id === lf.change)?.label || '')}` : ''}</div>` : ''}

    <div class="sec done" id="sec-goal"><div class="sec-title"><span>🎯 Ziel verstehen</span></div>
      <ul class="goal-list">
        ${shells ? `<li>🐚 ${shells === 1 ? 'Die Muschel' : `Alle ${shells} Muscheln`} einsammeln</li>` : ''}
        <li>🏠 Am Ende stehen <b>beide</b> im Bau (die Felder mit Fahne)</li>
        <li>⚡ Energie: höchstens <b>${LV.maxSteps} Karten</b> pro Figur</li>
      </ul></div>

    <div class="sec ${st.strat ? 'done' : 'todo'}" id="sec-strat"><div class="sec-title"><span>🧭 Strategie wählen</span><span class="state">${st.strat ? '✓ erledigt' : 'noch offen'}</span></div>
      ${st.strat ? `<div class="strat-chosen">${team.cur.strategies.map(s => `<span class="strat-pill">${S_BY_ID[s].icon} ${esc(S_BY_ID[s].name)}</span>`).join('')}</div>
        <p class="muted">Leitfrage: ${team.cur.strategies.map(s => esc(S_BY_ID[s].frage)).join(' · ')}</p>` : '<p class="muted">Wie wollt ihr vorgehen? Wählt 1 oder 2 Strategien.</p>'}
      <button class="btn btn-secondary small" id="btn-strat" style="margin-top:6px">${st.strat ? '🔄 Strategie ändern' : '🧭 Strategie wählen'}</button>
    </div>

    <div class="sec ${st.pred ? 'done' : 'todo'}" id="sec-pred"><div class="sec-title"><span>🔮 Vorhersage</span><span class="state">${st.pred ? '✓ erledigt' : 'noch offen'}</span></div>
      ${nAtt === 0 ? `<p class="muted" style="margin-bottom:6px">Wie viele Versuche werdet ihr brauchen? Schätzt ehrlich – eine gute Einschätzung bringt einen Stern!</p>
      <div class="pred-btns">${PREDICTIONS.map(p => `<button class="pred-btn ${d.prediction === p.v ? 'on' : ''}" data-pred="${p.v}"><b>${p.icon}</b>${p.label}</button>`).join('')}</div>`
      : `<p>Eure Vorhersage: <b>${PREDICTIONS.find(p => p.v === d.prediction)?.icon} ${PREDICTIONS.find(p => p.v === d.prediction)?.label}</b></p><p class="muted">Die Vorhersage gilt für das ganze Level.</p>`}
    </div>

    <div class="sec ${st.plan ? 'done' : 'todo'}" id="sec-plan"><div class="sec-title"><span>🗺️ Schritte planen</span><span class="state">${P.o.length} + ${P.d.length} Karten</span></div>
      <div class="row-tabs">
        <button class="row-tab o ${ui.row === 'o' ? 'on' : ''}" data-row="o">🦦 Ola planen <span class="energy">${P.o.length}/${LV.maxSteps}</span></button>
        <button class="row-tab d ${ui.row === 'd' ? 'on' : ''}" data-row="d">🦡 Bodo planen <span class="energy">${P.d.length}/${LV.maxSteps}</span></button>
      </div>
      <div class="pad">
        <button class="btn" data-a="L" title="nach links (Taste ←)">←</button>
        <button class="btn" data-a="U" title="nach oben (Taste ↑)">↑</button>
        <button class="btn" data-a="D" title="nach unten (Taste ↓)">↓</button>
        <button class="btn" data-a="R" title="nach rechts (Taste →)">→</button>
        <button class="btn" data-a="W" title="warten (Leertaste)">⏸<small>warten</small></button>
        <button class="btn" data-edit="ins" title="Lücke einfügen">⇥<small>Lücke</small></button>
        <button class="btn del" data-edit="del" title="Karte löschen (Rücktaste)">⌫<small>löschen</small></button>
      </div>
      <div id="pgrid">${planGridHTML({ editable: true, failCol: lf ? lf.step : null })}</div>
      <div class="edit-row">
        <button class="btn btn-ghost" data-edit="clear">🧹 ${ui.row === 'o' ? 'Ola' : 'Bodo'}-Zeile leeren</button>
        ${ui.sel != null ? '<button class="btn btn-ghost" data-edit="unsel">✕ Auswahl aufheben</button>' : ''}
      </div>
      <p class="hintline">${ui.sel != null ? `Karte ${ui.sel + 1} ist ausgewählt: Ein Pfeil <b>ersetzt</b> sie, „Lücke“ fügt davor ein ⏸ ein.` : 'Tipp: Klickt eine Karte an, um sie zu ändern. Tastatur: Pfeile, Leertaste = warten, Tab = Figur wechseln.'}</p>
    </div>
  </div>
  <div class="panel-foot">
    <button class="btn btn-secondary" id="btn-ladder">🪜 Lösungsleiter</button>
    <button class="btn btn-primary" id="btn-go" ${st.strat && st.pred && st.plan ? '' : 'disabled'}>▶ Zur Durchführung</button>
  </div>`, 'plan-' + id);
  if (board) board.setPreview(P.o, P.d, ui.preview);
  if (board) { board.setState(initialState(L)); updateHud(initialState(L), null); }
  bindPlanung();
}

function bindPlanung() {
  const panel = $('#panel');
  panel.querySelector('#btn-strat').onclick = () => openStrategyPicker();
  panel.querySelectorAll('.pred-btn').forEach(b => b.onclick = () => {
    dgRec(team.cur.levelId).prediction = +b.dataset.pred; save(); sfx.click(); renderPlanung();
  });
  panel.querySelectorAll('.row-tab').forEach(b => b.onclick = () => { ui.row = b.dataset.row; ui.sel = null; renderPlanung(); });
  panel.querySelectorAll('[data-a]').forEach(b => b.onclick = () => planAction(b.dataset.a));
  panel.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => planEdit(b.dataset.edit));
  panel.querySelectorAll('.cell[data-row]').forEach(c => c.onclick = () => {
    const r = c.dataset.row, col = +c.dataset.col;
    ui.row = r;
    ui.sel = col < plan()[r].length ? (ui.sel === col ? null : col) : null;
    renderPlanung();
  });
  $('#btn-ladder').onclick = () => openLadder();
  $('#btn-go').onclick = () => {
    const st = planningStatus();
    if (!(st.strat && st.pred && st.plan)) return;
    ui.sel = null; setPhase('durchfuehrung');
  };
}

function planChanged() { team.cur.lastFail = team.cur.lastFail ? { ...team.cur.lastFail, step: null } : null; save(); renderPlanung(); }
function planAction(a) {
  const row = plan()[ui.row];
  sfx.click();
  if (ui.sel != null && ui.sel < row.length) {
    row[ui.sel] = a;
    ui.sel = ui.sel + 1 < row.length ? ui.sel + 1 : null;
  } else {
    if (row.length >= LV.maxSteps) { toast(`Keine Energie mehr: höchstens ${LV.maxSteps} Karten pro Figur.`); return; }
    row.push(a);
  }
  planChanged();
}
function planEdit(kind) {
  const row = plan()[ui.row];
  if (kind === 'del') {
    if (ui.sel != null) { row.splice(ui.sel, 1); if (ui.sel >= row.length) ui.sel = null; }
    else row.pop();
  } else if (kind === 'ins') {
    if (row.length >= LV.maxSteps) { toast('Keine Energie mehr für eine weitere Karte.'); return; }
    if (ui.sel != null) { row.splice(ui.sel, 0, 'W'); ui.sel += 1; }
    else row.push('W');
  } else if (kind === 'clear') {
    return confirmBox(`Wirklich alle Karten von ${ui.row === 'o' ? 'Ola' : 'Bodo'} löschen?`, () => { row.length = 0; ui.sel = null; planChanged(); });
  } else if (kind === 'unsel') { ui.sel = null; return renderPlanung(); }
  planChanged();
}

/* ---- Strategie-Auswahl ---- */
function strategyCards(selected) {
  return `<div class="strat-grid">${STRATEGIES.map(s => `
    <button class="strat-card ${selected.includes(s.id) ? 'on' : ''}" data-s="${s.id}">
      <div class="si">${s.icon}</div><h3>${esc(s.name)}</h3><p>${esc(s.text)}</p><div class="sq">${esc(s.frage)}</div></button>`).join('')}</div>`;
}
function openStrategyPicker() {
  let sel = [...team.cur.strategies];
  const draw = () => {
    openModal('🧭 Welche Strategie nutzt ihr?',
      `<p style="margin-bottom:10px">Wählt <b>1 oder 2</b> Strategien. Sprecht kurz darüber: Warum passt sie zu diesem Level?</p>${strategyCards(sel)}`,
      [{ label: 'Abbrechen', cls: 'btn-secondary', fn: closeModal },
       { label: `Übernehmen (${sel.length})`, cls: 'btn-primary', disabled: !sel.length, fn: () => { team.cur.strategies = sel; save(); closeModal(); renderPlanung(); } }]);
    document.querySelectorAll('.strat-card').forEach(c => c.onclick = () => {
      const id = c.dataset.s;
      if (sel.includes(id)) sel = sel.filter(x => x !== id);
      else { if (sel.length >= 2) sel.shift(); sel.push(id); }
      sfx.click(); draw();
    });
  };
  draw();
}

/* ---- Lösungsleiter ---- */
function openLadder() {
  const d = dgRec(team.cur.levelId);
  const draw = () => {
    const rungs = LV.hints.map((h, i) => i < d.hints
      ? `<div class="rung open"><b>Sprosse ${i + 1}</b>${esc(h)}</div>`
      : `<div class="rung"><b>Sprosse ${i + 1}</b>${i === d.hints ? 'Noch verdeckt.' : '🔒'}</div>`).join('');
    openModal('🪜 Lösungsleiter',
      `<p style="margin-bottom:10px">Steigt Sprosse für Sprosse hoch. Probiert nach jeder Sprosse erst selbst weiter! Wie viele Sprossen ihr nutzt, steht im Logbuch – Hilfe holen ist klug, nicht schlimm.</p>
       <div class="ladder">${rungs}</div>`,
      [{ label: 'Schließen', cls: 'btn-secondary', fn: closeModal },
       ...(d.hints < LV.hints.length ? [{ label: `Sprosse ${d.hints + 1} aufdecken`, cls: 'btn-primary', fn: () => { d.hints++; save(); draw(); } }] : [])]);
  };
  draw();
}

/* ================= DURCHFÜHRUNG ================= */
function renderDurchfuehrung() {
  const nAtt = attemptsNow(team.cur.levelId).length;
  const P = plan();
  const n = Math.max(P.o.length, P.d.length);
  runner = { S: initialState(L), i: 0, n, playing: false, busy: false, done: false, abort: false, log: [], speed: runner ? runner.speed : 1 };
  if (board) { board.setState(runner.S); board.setPreview([], [], false); }
  updateHud(runner.S, null);
  setPanel(`
  <div class="panel-scroll">
    <div class="ph-head ph-do"><h2>2 · Durchführung – Versuch ${nAtt + 1}</h2><p>Jetzt wird nicht mehr geplant – beobachtet genau! Läuft alles so, wie ihr es euch gedacht habt?</p></div>
    <div class="run-ctrls">
      <button class="btn btn-primary" id="r-play">▶ Abspielen</button>
      <button class="btn btn-secondary" id="r-step" title="Einen Schritt">⏭ 1 Schritt</button>
      <button class="btn btn-secondary" id="r-speed" title="Tempo">${runner.speed === 1 ? '🐢 langsam' : '🐇 schnell'}</button>
      <button class="btn btn-ghost" id="r-stop" title="Abbrechen">⏹ Stopp</button>
    </div>
    <div id="run-grid">${planGridHTML({ editable: false })}</div>
    <ul class="runlog" id="runlog"><li>Startaufstellung. Drückt ▶ oder ⏭.</li></ul>
    <div id="run-result"></div>
  </div>
  <div class="panel-foot"><button class="btn btn-success" id="r-next" disabled>Weiter zur Reflexion →</button></div>`, 'run-' + Date.now());
  $('#r-play').onclick = () => {
    if (runner.done) return;
    runner.playing = !runner.playing;
    $('#r-play').textContent = runner.playing ? '⏸ Pause' : '▶ Weiter';
    if (runner.playing) playLoop();
  };
  $('#r-step').onclick = async () => { if (runner.done || runner.busy) return; runner.playing = false; $('#r-play').textContent = '▶ Weiter'; await doStep(); };
  $('#r-speed').onclick = () => { runner.speed = runner.speed === 1 ? 2 : 1; $('#r-speed').textContent = runner.speed === 1 ? '🐢 langsam' : '🐇 schnell'; };
  $('#r-stop').onclick = () => {
    if (runner.done) return;
    runner.playing = false;
    if (runner.busy) runner.abort = true; else finishRun('aborted');
  };
  $('#r-next').onclick = () => setPhase('reflexion');
}

async function playLoop() {
  while (runner.playing && !runner.done) {
    await doStep();
    if (!runner.done) await new Promise(r => setTimeout(r, runner.speed === 1 ? 180 : 40));
  }
}

function addLog(text, cls = '') {
  runner.log.push({ text, cls });
  const ul = $('#runlog'); if (!ul) return;
  const li = document.createElement('li'); li.className = cls; li.textContent = text; ul.appendChild(li);
  ul.scrollTop = ul.scrollHeight;
}

async function doStep() {
  if (runner.busy || runner.done) return;
  runner.busy = true;
  const P = plan(), i = runner.i;
  const aO = P.o[i] || 'W', aD = P.d[i] || 'W';
  $('#run-grid').innerHTML = planGridHTML({ editable: false, curCol: i, ranUpTo: i - 1 });
  const res = step(L, runner.S, aO, aD);
  const dur = runner.speed === 1 ? 0.55 : 0.28;
  if (board) await board.animateStep(runner.S, aO, aD, res, dur);
  runner.busy = false;
  if (res.fail) {
    sfx.fail();
    addLog(`Schritt ${i + 1}: ✗ ${res.fail.text}`, 'bad');
    $('#run-grid').innerHTML = planGridHTML({ editable: false, curCol: null, failCol: i, ranUpTo: i - 1 });
    return finishRun('fail', { step: i, ...res.fail });
  }
  sfx.step();
  const parts = [];
  parts.push(`Ola ${ACT_WORD[aO]}`, `Bodo ${ACT_WORD[aD]}`);
  if (res.ev.push) parts.push(res.ev.push.sink ? 'Kiste wird zur Brücke! 🌉' : 'Kiste verschoben 📦');
  if (res.ev.collected.length) { parts.push('Muschel gefunden! 🐚'); sfx.shell(); }
  addLog(`Schritt ${i + 1}: ${parts.join(' · ')}`);
  runner.S = res.state;
  updateHud(runner.S, i + 1);
  runner.i++;
  if (isWin(L, runner.S)) return finishRun('win');
  if (runner.abort) return finishRun('aborted');
  if (runner.i >= runner.n) return finishRun('incomplete');
}

function finishRun(result, fail = null) {
  runner.done = true; runner.playing = false;
  const id = team.cur.levelId, r = rec(id);
  const P = plan();
  const nr = attemptsNow(id).length + 1;
  let failInfo = null;
  if (result === 'fail') failInfo = { step: fail.step, who: fail.who, code: fail.code, text: fail.text };
  if (result === 'incomplete') {
    const missing = [];
    const gotN = runner.S.got.filter(Boolean).length;
    if (gotN < runner.S.got.length) missing.push(`noch ${runner.S.got.length - gotN} Muschel${runner.S.got.length - gotN > 1 ? 'n' : ''} übrig`);
    const onG = p => L.goals.some(g => g[0] === p[0] && g[1] === p[1]);
    if (!onG(runner.S.o)) missing.push('Ola ist nicht im Bau');
    if (!onG(runner.S.d)) missing.push('Bodo ist nicht im Bau');
    failInfo = { step: null, who: null, code: 'incomplete', text: `Der Plan ist zu Ende: ${missing.join(', ')}.` };
  }
  if (result === 'aborted') failInfo = { step: null, who: null, code: 'aborted', text: `Ihr habt nach Schritt ${runner.i} gestoppt.` };
  r.attempts.push({ dg: r.durchgang, nr, time: Date.now(), strategies: [...team.cur.strategies], result,
    fail: failInfo, planO: P.o.join(''), planD: P.d.join(''), hintsSoFar: dgRec(id).hints });
  team.cur.pending = { result, fail: failInfo, nr };
  save();
  const box = $('#run-result');
  if (result === 'win') {
    sfx.win();
    addLog(`🎉 Geschafft in Versuch ${nr}!`, 'good');
    box.innerHTML = `<div class="result-box win">🎉 Geschafft! Beide sind im Bau und alle Muscheln sind gesammelt.</div>`;
    if (board) board.celebrate();
    if (window.confetti) window.confetti({ particleCount: 160, spread: 90, origin: { x: 0.35, y: 0.6 }, colors: ['#D97A4A', '#7DBB6F', '#3E5668', '#F7A8B8', '#FFD84D'] });
  } else if (result === 'fail') {
    box.innerHTML = `<div class="result-box fail">✗ Schritt ${fail.step + 1}: ${esc(fail.text)}</div>`;
  } else {
    if (result === 'incomplete') addLog('Plan zu Ende – Ziel noch nicht erreicht.', 'bad');
    box.innerHTML = `<div class="result-box info">⚠ ${esc(failInfo.text)}</div>`;
  }
  ['r-play', 'r-step', 'r-stop'].forEach(k => { const b = $('#' + k); if (b) b.disabled = true; });
  const nx = $('#r-next'); nx.disabled = false; nx.focus();
}

/* ================= REFLEXION ================= */
function renderReflexion() {
  const pend = team.cur.pending;
  if (!pend) { setPhase('planung'); return; }
  if (pend.result === 'win') return renderReflexionWin();
  const draft = team.cur.reflDraft || (team.cur.reflDraft = { cause: null, change: null });
  const code = pend.fail?.code;
  setPanel(`
  <div class="panel-scroll">
    <div class="ph-head ph-ref"><h2>3 · Reflexion – Versuch ${pend.nr}</h2><p>Kein Problem – jetzt wisst ihr mehr als vorher. Findet heraus, was passiert ist.</p></div>
    <div class="result-box ${pend.result === 'fail' ? 'fail' : 'info'}">${pend.result === 'fail' ? `✗ Schritt ${pend.fail.step + 1}: ` : '⚠ '}${esc(pend.fail?.text)}</div>
    <div class="q"><b>1. Woran lag es? Was meint ihr?</b>
      <div class="chips">${CAUSES.map(c => `<button class="chip ${draft.cause === c.id ? 'on' : ''}" data-cause="${c.id}">${c.icon} ${esc(c.label)}</button>`).join('')}</div>
      ${draft.cause ? `<div class="tipbox">💡 <b>Spiel-Tipp:</b> ${esc(TIPS[code] || '')}</div>` : ''}
    </div>
    <div class="q"><b>2. Was macht ihr jetzt?</b>
      <div class="chips">${CHANGES.map(c => `<button class="chip ${draft.change === c.id ? 'on' : ''}" data-change="${c.id}">${c.icon} ${esc(c.label)}</button>`).join('')}</div>
    </div>
    ${team.cur.strategies.length ? `<p class="muted">Eure Strategie bisher: ${team.cur.strategies.map(s => S_BY_ID[s].icon + ' ' + S_BY_ID[s].name).join(', ')}</p>` : ''}
  </div>
  <div class="panel-foot"><button class="btn btn-slate" id="btn-back-plan" ${draft.cause && draft.change ? '' : 'disabled'}>Zurück zur Planung →</button></div>`, 'refl-' + pend.nr);
  document.querySelectorAll('[data-cause]').forEach(b => b.onclick = () => { draft.cause = b.dataset.cause; save(); sfx.click(); renderReflexion(); });
  document.querySelectorAll('[data-change]').forEach(b => b.onclick = () => { draft.change = b.dataset.change; save(); sfx.click(); renderReflexion(); });
  $('#btn-back-plan').onclick = () => {
    const r = rec(team.cur.levelId);
    const att = r.attempts[r.attempts.length - 1];
    att.cause = draft.cause; att.change = draft.change;
    team.cur.lastFail = pend.fail ? { ...pend.fail, change: draft.change } : null;
    team.cur.pending = null; team.cur.reflDraft = null;
    if (draft.change === 'neu') { team.plans[team.cur.levelId] = { o: [], d: [] }; team.cur.lastFail.step = null; }
    setPhase('planung');
    if (draft.change === 'wechseln') openStrategyPicker();
    if (draft.change === 'leiter') openLadder();
  };
}

function renderReflexionWin() {
  const id = team.cur.levelId, d = dgRec(id), pend = team.cur.pending;
  const nr = pend.nr;
  const pred = d.prediction;
  const calib = (pred === 1 && nr === 1) || (pred === 2 && nr === 2) || (pred === 3 && nr >= 3);
  const used = [...new Set(attemptsNow(id).flatMap(a => a.strategies))];
  const draft = team.cur.reflDraft || (team.cur.reflDraft = { ratings: {}, text: '' });
  const allRated = used.every(s => draft.ratings[s]);
  const reflOk = draft.text.trim().length >= 15;
  const predObj = PREDICTIONS.find(p => p.v === pred);
  const calibText = calib ? 'Super eingeschätzt! Ihr kennt euch gut.'
    : (nr < pred ? 'Es ging schneller als gedacht. Ihr könnt euch mehr zutrauen!' : 'Es hat länger gedauert als gedacht. Was hat euch überrascht?');
  setPanel(`
  <div class="panel-scroll">
    <div class="ph-head ph-ref"><h2>3 · Reflexion – Geschafft! 🎉</h2><p>Jetzt schaut ihr zurück: Was hat euch zum Ziel gebracht?</p></div>
    <div class="star-rows">
      <div class="star-row got"><span class="st">⭐</span> Geschafft – in ${nr} Versuch${nr > 1 ? 'en' : ''}</div>
      <div class="star-row ${calib ? 'got' : ''}"><span class="st">${calib ? '⭐' : '☆'}</span> Vorhersage: ${predObj.icon} „${predObj.label}“ – ${calibText}</div>
      <div class="star-row ${reflOk ? 'got' : ''}"><span class="st">${reflOk ? '⭐' : '☆'}</span> Reflexions-Stern: Schreibt unten einen Satz.</div>
    </div>
    <div class="q"><b>1. Haben eure Strategien geholfen?</b>
      ${used.map(s => `<div class="rate-row"><span>${S_BY_ID[s].icon} ${esc(S_BY_ID[s].name)}</span>
        <span class="chips">${[['ja', '👍 ja'], ['teils', '🤏 ein bisschen'], ['nein', '👎 nein']].map(([v, l]) =>
          `<button class="chip ${draft.ratings[s] === v ? 'on sage' : ''}" data-rate="${s}" data-v="${v}">${l}</button>`).join('')}</span></div>`).join('')}
    </div>
    <div class="q"><b>2. Ein Satz für euer Logbuch</b>
      <div class="chips" style="margin-bottom:6px">${SENTENCE_STARTERS.map(s => `<button class="chip" data-starter="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <label for="refl-text" class="muted" style="font-weight:400">Was hat euch geholfen? Was nehmt ihr mit? (mind. 15 Zeichen für den Stern)</label>
      <textarea id="refl-text" maxlength="400">${esc(draft.text)}</textarea>
    </div>
  </div>
  <div class="panel-foot"><button class="btn btn-success" id="btn-finish" ${allRated ? '' : 'disabled'}>${allRated ? 'Abschließen & weiter →' : 'Bitte erst die Strategien bewerten'}</button></div>`, 'win-' + id);
  document.querySelectorAll('[data-rate]').forEach(b => b.onclick = () => { draft.ratings[b.dataset.rate] = b.dataset.v; save(); sfx.click(); renderReflexionWin(); });
  const ta = $('#refl-text');
  ta.oninput = () => {
    draft.text = ta.value; save();
    const ok = ta.value.trim().length >= 15;
    const row = document.querySelectorAll('.star-row')[2];
    row.classList.toggle('got', ok); row.querySelector('.st').textContent = ok ? '⭐' : '☆';
  };
  document.querySelectorAll('[data-starter]').forEach(b => b.onclick = () => {
    const t = b.dataset.starter.replace(' …', ' ');
    ta.value = (ta.value.trim() ? ta.value.trim() + ' ' : '') + t; ta.focus(); ta.oninput();
  });
  $('#btn-finish').onclick = () => {
    const stars = { geschafft: true, eingeschaetzt: calib, reflektiert: draft.text.trim().length >= 15 };
    const r = rec(id);
    d.ratings = { ...draft.ratings }; d.text = draft.text.trim(); d.stars = stars; d.finished = true; d.attemptsNeeded = nr;
    r.done = true; r.open = false;
    if (!r.best || starCount(stars) >= starCount(r.best)) r.best = stars;
    delete team.plans[id];
    team.cur = null;
    save();
    const idx = levelIdx(id);
    const w = LEVELS[idx].world;
    const lastOfWorld = !LEVELS[idx + 1] || LEVELS[idx + 1].world !== w;
    if (lastOfWorld && !team.worlds[w]) { team.cur = { pendingWorld: w }; save(); return renderWorldReflection(w); }
    renderMap();
    const next = LEVELS[idx + 1];
    if (next && !(team.levels[next.id] && team.levels[next.id].done)) toast(`Level ${idx + 2} „${next.title}“ ist freigeschaltet!`);
  };
}

/* ================= Etappen-Reflexion ================= */
function strategyStats(levelFilter = () => true) {
  const st = {};
  STRATEGIES.forEach(s => st[s.id] = { used: 0, ja: 0, teils: 0, nein: 0 });
  LEVELS.filter(levelFilter).forEach(l => {
    const r = team.levels[l.id]; if (!r) return;
    r.attempts.forEach(a => a.strategies.forEach(s => st[s].used++));
    Object.values(r.dg).forEach(d => Object.entries(d.ratings || {}).forEach(([s, v]) => st[s][v]++));
  });
  return st;
}
function barsHTML(st) {
  const max = Math.max(1, ...Object.values(st).map(x => x.ja + x.teils + x.nein));
  return `<div class="bars">${STRATEGIES.map(s => {
    const x = st[s.id], tot = x.ja + x.teils + x.nein;
    return `<div class="bar-row"><span>${s.icon} ${esc(s.name)}</span>
      <div class="bar-track" title="👍 ${x.ja} · 🤏 ${x.teils} · 👎 ${x.nein}">
        <div class="bar-fill help" style="width:${x.ja / max * 100}%"></div>
        <div class="bar-fill part" style="width:${x.teils / max * 100}%"></div>
        <div class="bar-fill no" style="width:${x.nein / max * 100}%"></div></div>
      <span class="muted">${tot ? `👍${x.ja} 🤏${x.teils} 👎${x.nein}` : 'nicht genutzt'}</span></div>`;
  }).join('')}</div>`;
}
function renderWorldReflection(w) {
  show('scr-world');
  const st = strategyStats(l => l.world === w);
  const draft = team.cur && team.cur.worldDraft || { top: null, why: '' };
  const wrap = $('#world-wrap');
  wrap.innerHTML = `
    <h2>${WORLDS[w].icon} Etappen-Reflexion: ${esc(WORLDS[w].name)} geschafft!</h2>
    <p class="muted" style="margin-bottom:14px">Schaut gemeinsam zurück auf die letzten drei Level. Grün = „hat geholfen“, gelb = „ein bisschen“, grau = „nein“.</p>
    ${barsHTML(st)}
    <div class="q" style="margin-top:18px"><b>Welche Strategie hat euch in dieser Welt am meisten geholfen?</b>
      <div class="chips">${STRATEGIES.map(s => `<button class="chip ${draft.top === s.id ? 'on' : ''}" data-top="${s.id}">${s.icon} ${esc(s.name)}</button>`).join('')}</div></div>
    <div class="q"><label for="w-why"><b>Warum? Wann würdet ihr sie wieder benutzen – auch im Unterricht?</b></label>
      <textarea id="w-why" maxlength="400" placeholder="Die Strategie hilft, wenn …">${esc(draft.why)}</textarea></div>
    <div style="display:flex;justify-content:flex-end"><button class="btn btn-success" id="w-done" ${draft.top ? '' : 'disabled'}>${w === WORLDS.length - 1 ? 'Zur Urkunde →' : 'Weiter zur nächsten Welt →'}</button></div>`;
  const persist = () => { team.cur = { pendingWorld: w, worldDraft: draft }; save(); };
  wrap.querySelectorAll('[data-top]').forEach(b => b.onclick = () => { draft.top = b.dataset.top; persist(); renderWorldReflection(w); });
  $('#w-why').oninput = e => { draft.why = e.target.value; persist(); };
  $('#w-done').onclick = () => {
    team.worlds[w] = { top: draft.top, why: draft.why.trim(), time: Date.now() };
    team.cur = null; save();
    if (w === WORLDS.length - 1) renderEnd(); else renderMap();
  };
}

/* ================= Urkunde ================= */
function renderEnd() {
  show('scr-end');
  const total = LEVELS.reduce((s, l) => s + starCount(starsOf(l.id)), 0);
  const st = strategyStats();
  const top = STRATEGIES.map(s => ({ s, v: st[s.id].ja * 2 + st[s.id].teils })).sort((a, b) => b.v - a.v)[0].s;
  $('#end-wrap').innerHTML = `
    <div class="certificate">
      <div style="font-size:3.5rem">🦦 🏆 🦡</div>
      <h1>Expeditions-Urkunde</h1>
      <p>Die Expedition durch die Otterbucht hat erfolgreich gemeistert:</p>
      <div class="team">${esc(team.name)}</div>
      <p style="font-size:1.3rem">⭐ ${total} von ${LEVELS.length * 3} Sternen</p>
      <p style="margin-top:10px">Eure hilfreichste Strategie: <b>${top.icon} ${esc(top.name)}</b></p>
      <p class="muted" style="margin-top:14px">Ihr habt geplant, durchgeführt und reflektiert – genau so lernt man selbstreguliert.<br>${new Date().toLocaleDateString('de-DE')}</p>
    </div>
    <div style="display:flex;gap:10px;justify-content:center;margin-top:16px">
      <button class="btn btn-secondary" id="end-map">🗺️ Zur Karte</button>
      <button class="btn btn-secondary" id="end-log">📖 Logbuch</button>
      <button class="btn btn-primary" id="end-print">🖨️ Urkunde drucken</button>
    </div>`;
  if (window.confetti) window.confetti({ particleCount: 250, spread: 120, origin: { y: 0.5 } });
  $('#end-map').onclick = renderMap;
  $('#end-log').onclick = openLogbook;
  $('#end-print').onclick = () => { $('#print-area').innerHTML = $('.certificate').outerHTML; window.print(); };
}

/* ================= Modals ================= */
function openModal(title, body, buttons = []) {
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = body;
  const foot = $('#modal-foot'); foot.innerHTML = '';
  buttons.forEach(b => {
    const el = document.createElement('button');
    el.className = 'btn ' + (b.cls || 'btn-secondary'); el.textContent = b.label; el.disabled = !!b.disabled;
    el.onclick = b.fn; foot.appendChild(el);
  });
  $('#modal-bg').hidden = false;
}
function closeModal() { $('#modal-bg').hidden = true; }
function confirmBox(text, yes) {
  openModal('Sicher?', `<p>${esc(text)}</p>`, [{ label: 'Nein', fn: closeModal }, { label: 'Ja', cls: 'btn-primary', fn: () => { closeModal(); yes(); } }]);
}

function openRecap() {
  const c = team.cur;
  if (!c || !c.levelId) {
    const unl = unlockedFor(team);
    const next = LEVELS[unl];
    openModal('👋 Wo stehen wir?', `
      <div class="recap-grid">
        <div class="recap-item"><div class="k">Team</div><div class="v">${esc(team.name)}</div></div>
        <div class="recap-item"><div class="k">Geschafft</div><div class="v">${unl} von ${LEVELS.length} Leveln</div></div>
        <div class="recap-item wide"><div class="k">Als Nächstes</div><div class="v">${next ? `Level ${unl + 1}: ${esc(next.title)}` : 'Alle Level geschafft! 🎉'}</div></div>
      </div>
      <div class="talk"><b>Erklärt euch gegenseitig:</b><ol><li>Was war im letzten Level schwierig?</li><li>Welche Strategie hat euch zuletzt geholfen?</li></ol></div>`,
      [{ label: 'Alles klar!', cls: 'btn-primary', fn: closeModal }]);
    return;
  }
  const lv = LEVELS.find(l => l.id === c.levelId);
  const d = dgRec(c.levelId), atts = attemptsNow(c.levelId), last = atts[atts.length - 1];
  const P = team.plans[c.levelId] || { o: [], d: [] };
  const phaseName = { planung: '1 · Planung', durchfuehrung: '2 · Durchführung', reflexion: '3 · Reflexion' }[c.phase];
  const pred = PREDICTIONS.find(p => p.v === d.prediction);
  const lastTxt = last ? (last.result === 'win' ? '🎉 Geschafft!' : `✗ ${last.fail ? (last.fail.step != null ? 'Schritt ' + (last.fail.step + 1) + ': ' : '') + last.fail.text : ''}`) : 'Noch kein Versuch.';
  const changeTxt = last && last.change ? CHANGES.find(x => x.id === last.change).label : null;
  openModal('👋 Wo stehen wir?', `
    <p style="margin-bottom:10px">Wer gerade dageblieben ist, erklärt. Wer zurückkommt, fragt nach!</p>
    <div class="recap-grid">
      <div class="recap-item"><div class="k">Level</div><div class="v">${levelIdx(lv.id) + 1} · ${esc(lv.title)}</div></div>
      <div class="recap-item"><div class="k">Phase</div><div class="v">${phaseName} · Versuch ${atts.length + (c.phase === 'reflexion' ? 0 : 1)}</div></div>
      <div class="recap-item"><div class="k">Strategie</div><div class="v">${c.strategies.length ? c.strategies.map(s => S_BY_ID[s].icon + ' ' + esc(S_BY_ID[s].name)).join('<br>') : 'noch nicht gewählt'}</div></div>
      <div class="recap-item"><div class="k">Vorhersage</div><div class="v">${pred ? pred.icon + ' ' + pred.label : 'noch nicht gemacht'}</div></div>
      <div class="recap-item wide"><div class="k">Letzter Versuch</div><div class="v">${esc(lastTxt)}${changeTxt ? `<br><span class="muted">Vorhaben: ${esc(changeTxt)}</span>` : ''}</div></div>
      <div class="recap-item"><div class="k">Plan bisher</div><div class="v">🦦 ${P.o.length} Karten · 🦡 ${P.d.length} Karten</div></div>
      <div class="recap-item"><div class="k">Lösungsleiter</div><div class="v">${d.hints} von 3 Sprossen genutzt</div></div>
    </div>
    <div class="talk"><b>Erklärt euch gegenseitig (1–2 Minuten):</b><ol>
      <li>Was ist in diesem Level das <b>Ziel</b>?</li>
      <li>Welche <b>Strategie</b> nutzen wir gerade – und warum?</li>
      <li>Was haben wir zuletzt <b>geändert</b> oder herausgefunden?</li>
      <li>Was ist unser <b>nächster Schritt</b>?</li></ol></div>`,
    [{ label: 'Alles klar – weiter geht’s!', cls: 'btn-primary', fn: closeModal }]);
}

function openRules() {
  openModal('❓ Spielregeln', `
    <div class="rules-grid">
      <div class="rule"><b>🎯 Ziel:</b> Alle Muscheln einsammeln. Am Ende stehen Ola und Bodo beide im Bau (Felder mit Fahne).</div>
      <div class="rule"><b>👣 Gleichzeitig:</b> In der Durchführung machen beide ihre Karte aus derselben Spalte gleichzeitig. Hat eine Figur keine Karten mehr, wartet sie.</div>
      <div class="rule"><b>🦦 Ola</b> kann schwimmen, aber keine Kisten schieben.</div>
      <div class="rule"><b>🦡 Bodo</b> kann Kisten schieben, aber nicht schwimmen.</div>
      <div class="rule"><b>📦 Kisten:</b> Bodo schiebt eine Kiste ein Feld weiter. Fällt sie ins Wasser, wird sie zur Brücke 🌉.</div>
      <div class="rule"><b>🔴🔷 Schalter & Tore:</b> Ein Tor ist offen, solange jemand oder eine Kiste auf einem Schalter derselben Farbe steht – schon zu Beginn des Schritts.</div>
      <div class="rule"><b>⏸ Warten:</b> Die Figur bleibt einen Schritt stehen. Wichtig für das richtige Timing!</div>
      <div class="rule"><b>💥 Achtung:</b> Felsen, geschlossene Tore, der Spielfeldrand und Zusammenstöße stoppen die Durchführung.</div>
      <div class="rule"><b>⚡ Energie:</b> Jede Figur hat nur eine bestimmte Zahl an Karten.</div>
      <div class="rule"><b>🎥 Ansicht:</b> Mit der Maus könnt ihr die Insel etwas drehen und zoomen.</div>
    </div>
    <h3 style="margin:14px 0 6px;color:var(--slate-dark)">⭐ Sterne pro Level</h3>
    <p>⭐ Level geschafft · ⭐ Vorhersage hat gestimmt · ⭐ Reflexions-Satz geschrieben</p>`,
    [{ label: '🎓 Tutorial starten', fn: () => { closeModal(); startTutorial(); } },
     { label: 'Intro noch mal ansehen', fn: () => { closeModal(); renderIntro(0); } }, { label: 'Verstanden', cls: 'btn-primary', fn: closeModal }]);
}

function openStrategies() {
  const st = strategyStats();
  openModal('🧭 Die 6 Strategien', `
    <p style="margin-bottom:10px">Eine Strategie beschreibt, <b>wie</b> ihr eine Aufgabe angeht. Hier seht ihr alle Strategien – und unten, wie oft sie euch bisher geholfen haben.</p>
    ${strategyCards([])}
    <h3 style="margin:16px 0 8px;color:var(--slate-dark)">Eure Strategie-Bilanz</h3>${barsHTML(st)}`,
    [{ label: 'Schließen', cls: 'btn-primary', fn: closeModal }]);
  document.querySelectorAll('#modal-body .strat-card').forEach(c => { c.style.cursor = 'default'; c.onclick = null; });
}

function logbookHTML(t) {
  const fmt = ts => new Date(ts).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  let html = '';
  LEVELS.forEach((l, i) => {
    const r = t.levels[l.id]; if (!r || !r.attempts.length) return;
    html += `<div class="log-level"><h3>Level ${i + 1}: ${esc(l.title)} ${r.best ? '⭐'.repeat(starCount(r.best)) : ''}</h3>`;
    Object.entries(r.dg).forEach(([dg, d]) => {
      const atts = r.attempts.filter(a => String(a.dg) === String(dg));
      if (!atts.length) return;
      const pred = PREDICTIONS.find(p => p.v === d.prediction);
      html += `${Object.keys(r.dg).length > 1 ? `<p><b>Durchgang ${dg}</b></p>` : ''}
        <p class="muted">Vorhersage: ${pred ? pred.icon + ' ' + pred.label : '–'} · Lösungsleiter: ${d.hints} Sprosse(n)</p><ul>`;
      atts.forEach(a => {
        const res = a.result === 'win' ? '🎉 geschafft' : (a.fail ? `✗ ${a.fail.step != null ? 'Schritt ' + (a.fail.step + 1) + ': ' : ''}${a.fail.text}` : a.result);
        const cause = a.cause ? CAUSES.find(c => c.id === a.cause) : null;
        const ch = a.change ? CHANGES.find(c => c.id === a.change) : null;
        html += `<li><b>Versuch ${a.nr}</b> (${fmt(a.time)}) · Strategie: ${a.strategies.map(s => S_BY_ID[s].icon + ' ' + S_BY_ID[s].name).join(', ')}<br>${esc(res)}
          ${cause ? `<br>Woran lag es? ${cause.icon} ${esc(cause.label)}` : ''}${ch ? ` → ${ch.icon} ${esc(ch.label)}` : ''}</li>`;
      });
      html += '</ul>';
      if (d.finished) {
        html += `<p style="margin-top:4px">Bewertung: ${Object.entries(d.ratings).map(([s, v]) => `${S_BY_ID[s].icon} ${S_BY_ID[s].name}: ${{ ja: '👍 hat geholfen', teils: '🤏 ein bisschen', nein: '👎 nicht geholfen' }[v]}`).join(' · ')}</p>`;
        if (d.text) html += `<div class="log-quote">„${esc(d.text)}“</div>`;
      }
    });
    html += '</div>';
  });
  WORLDS.forEach((w, wi) => {
    const x = t.worlds[wi]; if (!x) return;
    html += `<div class="log-level"><h3>${w.icon} Etappen-Reflexion ${esc(w.name)}</h3><p>Hilfreichste Strategie: <b>${S_BY_ID[x.top].icon} ${esc(S_BY_ID[x.top].name)}</b></p>${x.why ? `<div class="log-quote">„${esc(x.why)}“</div>` : ''}</div>`;
  });
  return html || '<p class="empty">Noch keine Einträge. Das Logbuch füllt sich, sobald ihr spielt.</p>';
}
function openLogbook(t = team) {
  if (!t || t instanceof Event) t = team;
  openModal(`📖 Logbuch – ${t.name}`, logbookHTML(t),
    [{ label: '🖨️ Drucken', fn: () => { $('#print-area').innerHTML = `<h1>Expedition Otterbucht – Logbuch ${esc(t.name)}</h1>` + logbookHTML(t); window.print(); } },
     { label: 'Schließen', cls: 'btn-primary', fn: closeModal }]);
}

/* ================= Administration (PIN) ================= */
const ADMIN_PIN = 'B201';
let adminOpen = false;   // gilt bis zum Neuladen der Seite

function openTeacher() {
  if (adminOpen) return openAdmin();
  openModal('🔒 Administration', `
    <p style="margin-bottom:10px">Dieser Bereich ist für Lehrkräfte. Bitte die PIN eingeben.</p>
    <label for="pin">PIN</label>
    <input id="pin" type="password" autocomplete="off" maxlength="10" style="max-width:220px;font-size:1.3rem;letter-spacing:4px">
    <p id="pin-err" class="muted" style="color:var(--error);margin-top:6px" hidden>✗ Falsche PIN. Bitte noch einmal versuchen.</p>`,
    [{ label: 'Abbrechen', fn: closeModal }, { label: 'Öffnen', cls: 'btn-primary', fn: checkPin }]);
  const inp = $('#pin'); inp.focus();
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') checkPin(); });
}
function checkPin() {
  const v = ($('#pin').value || '').trim().toUpperCase();
  if (v === ADMIN_PIN) { adminOpen = true; openAdmin(); return; }
  $('#pin-err').hidden = false; $('#pin').value = ''; $('#pin').focus();
}

function levelOptions(sel) {
  return LEVELS.map((l, i) => `<option value="${i}" ${i === sel ? 'selected' : ''}>${i === 0 ? 'nur Level 1' : `Level 1–${i + 1}`} (${esc(l.title)})</option>`).join('');
}

function openAdmin() {
  const teams = Object.values(db.teams).sort((a, b) => a.name.localeCompare(b.name));
  const fmt = ts => new Date(ts).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  openModal('⚙️ Administration', `
    <p class="muted" style="margin-bottom:10px">Alle Teams auf <b>diesem Gerät</b>. Die Daten liegen nur im Browser dieses Laptops.</p>
    ${teams.length ? `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Team</th><th>Geschafft</th><th>Sterne</th><th>Versuche</th><th>Freigeschaltet</th><th>Zuletzt</th><th></th></tr></thead><tbody>
    ${teams.map(t => {
      const n = unlockedFor(t);
      const stars = LEVELS.reduce((s, l) => s + starCount(t.levels[l.id] && t.levels[l.id].best), 0);
      const atts = Object.values(t.levels).reduce((s, r) => s + r.attempts.length, 0);
      const hints = Object.values(t.levels).reduce((s, r) => s + Object.values(r.dg).reduce((x, d) => x + d.hints, 0), 0);
      return `<tr><td><b>${esc(t.name)}</b></td><td>${n}/12</td><td>⭐ ${stars}</td><td title="Versuche · genutzte Sprossen der Lösungsleiter">${atts} · 🪜${hints}</td>
        <td><select class="adm-sel" data-unlock="${t.id}" aria-label="Freigeschaltet für ${esc(t.name)}">${levelOptions(unlockedIdx(t))}</select></td>
        <td>${fmt(t.updated)}</td>
        <td style="white-space:nowrap"><button class="btn btn-secondary small" data-log="${t.id}" title="Logbuch">📖</button> <button class="btn btn-ghost small" data-del="${t.id}" title="Team löschen">🗑️</button></td></tr>`;
    }).join('')}</tbody></table></div>
    <p class="muted" style="margin-top:6px">Geschaffte Level bleiben immer offen. Die Auswahl öffnet zusätzlich alle Level bis zur gewählten Stelle.</p>` : '<p class="empty">Noch keine Teams auf diesem Gerät.</p>'}

    <div class="adm-box">
      <h3>➕ Team mit Freischaltung anlegen</h3>
      <p class="muted" style="margin-bottom:8px">Für Kinder, die an einem anderen Gerät weiterspielen: Team anlegen und die Level freischalten, bis zu denen sie schon gekommen sind.</p>
      <div class="adm-row">
        <div><label for="adm-name">Teamname</label><input id="adm-name" maxlength="28" placeholder="z. B. Die Muschelsucher"></div>
        <div><label for="adm-lvl">Freigeschaltet</label><select id="adm-lvl" class="adm-sel">${levelOptions(0)}</select></div>
      </div>
      <label class="adm-check"><input type="checkbox" id="adm-skip" checked> Intro und Tutorial überspringen (das Team kennt das Spiel schon)</label>
      <button class="btn btn-primary" id="adm-create" style="margin-top:8px">Team anlegen</button>
    </div>

    <div class="adm-box">
      <h3>🖥️ Gerät</h3>
      <button class="btn btn-secondary small" id="adm-all">Alle Teams: alle Level freischalten</button>
      <button class="btn btn-ghost small" id="adm-lock">Administration wieder sperren</button>
    </div>

    <h3 style="margin:16px 0 6px;color:var(--slate-dark)">Didaktische Hinweise</h3>
    <ul style="padding-left:20px;font-size:.93rem">
      <li>Jedes Level durchläuft <b>Planung – Durchführung – Reflexion</b>. Strategiewahl und Vorhersage sind Pflicht, bevor geplant wird.</li>
      <li>Der Stern „gut eingeschätzt“ belohnt eine <b>realistische Selbsteinschätzung</b>, nicht Perfektion.</li>
      <li>Die <b>Lösungsleiter</b> (3 Sprossen) entlastet Sie: Kinder holen sich gestufte Hilfe selbst.</li>
      <li>Spielt ein Kind kurz allein weiter, hilft <b>„Wo stehen wir?“</b> beim Wiedereinstieg.</li>
      <li>Das Logbuch eignet sich als Gesprächsanlass: „Welche Strategie hat euch geholfen – und wo könnt ihr sie im Unterricht nutzen?“</li>
    </ul>`,
    [{ label: 'Schließen', cls: 'btn-primary', fn: closeModal }]);

  document.querySelectorAll('[data-log]').forEach(b => b.onclick = () => openLogbook(db.teams[b.dataset.log]));
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
    const t = db.teams[b.dataset.del];
    confirmBox(`Team „${t.name}“ mit allen Daten löschen?`, () => {
      delete db.teams[t.id]; if (db.last === t.id) db.last = null; save(); renderStart(); openAdmin();
    });
  });
  document.querySelectorAll('[data-unlock]').forEach(sel => sel.onchange = () => {
    const t = db.teams[sel.dataset.unlock];
    t.unlockedTo = +sel.value; t.updated = Date.now(); save();
    toast(`„${t.name}“: Level 1–${+sel.value + 1} freigeschaltet.`);
    renderStart(); if (team === t && !$('#scr-map').hidden) renderMap();
  });
  $('#adm-create').onclick = () => {
    const name = $('#adm-name').value.trim();
    if (name.length < 2) { $('#adm-name').focus(); toast('Bitte einen Teamnamen eingeben.'); return; }
    const skip = $('#adm-skip').checked;
    const id = 't' + Date.now().toString(36);
    db.teams[id] = { id, name, created: Date.now(), updated: Date.now(), introDone: skip, tutorial: skip ? 'aus' : undefined,
      levels: {}, worlds: {}, cur: null, plans: {}, unlockedTo: +$('#adm-lvl').value };
    save(); renderStart(); openAdmin();
    toast(`Team „${name}“ angelegt.`);
  };
  $('#adm-all').onclick = () => confirmBox('Für alle Teams auf diesem Gerät alle 12 Level freischalten?', () => {
    Object.values(db.teams).forEach(t => { t.unlockedTo = LEVELS.length - 1; });
    save(); renderStart(); openAdmin(); toast('Alle Level freigeschaltet.');
  });
  $('#adm-lock').onclick = () => { adminOpen = false; closeModal(); toast('Administration gesperrt.'); };
}

/* ================= Vollbild ================= */
function isFull() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
function toggleFullscreen() {
  const el = document.documentElement;
  try {
    if (!isFull()) (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
    else (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  } catch (e) { toast('Vollbild geht hier nicht – drückt F11.'); }
}
function updateFullBtns() {
  document.querySelectorAll('[data-act="fullscreen"]').forEach(b => {
    const icon = b.classList.contains('fs-icon');
    b.textContent = icon ? (isFull() ? '🗗' : '⛶') : (isFull() ? '🗗 Vollbild aus' : '⛶ Vollbild');
    b.title = isFull() ? 'Vollbild beenden (Esc)' : 'Vollbild';
  });
}
document.addEventListener('fullscreenchange', updateFullBtns);
document.addEventListener('webkitfullscreenchange', updateFullBtns);

/* ================= Globale Ereignisse ================= */
function topAction(act) {
  if (act === 'recap') openRecap();
  if (act === 'strategies') openStrategies();
  if (act === 'logbook') openLogbook();
  if (act === 'rules') openRules();
  if (act === 'home') { tut.pause(); team = null; renderStart(); }
  if (act === 'tutorial') startTutorial();
  if (act === 'fullscreen') toggleFullscreen();
  if (act === 'map') {
    if (runner && !runner.done) { runner.playing = false; runner.abort = true; }
    if (team.cur && team.cur.phase === 'durchfuehrung') team.cur.phase = 'planung';
    save(); renderMap();
  }
  if (act === 'sound') { db.sound = !db.sound; save(); updateSoundBtn(); if (db.sound) beep(660, 0.1); }
}
function updateSoundBtn() { $('#btn-sound').textContent = db.sound ? '🔊' : '🔇'; }

document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]'); if (t) return topAction(t.dataset.act);
  const tm = e.target.closest('[data-team]'); if (tm) return openTeam(tm.dataset.team);
  const lv = e.target.closest('[data-level]'); if (lv && !lv.disabled) return openLevel(lv.dataset.level);
  const nm = e.target.closest('[data-name]'); if (nm) { $('#team-name').value = nm.dataset.name; }
});
$('#btn-new-team').onclick = newTeam;
$('#team-name').addEventListener('keydown', e => { if (e.key === 'Enter') newTeam(); });
$('#btn-teacher').onclick = openTeacher;
$('#modal-close').onclick = closeModal;
$('#modal-bg').addEventListener('click', e => { if (e.target.id === 'modal-bg') closeModal(); });
$('#btn-preview').onclick = () => {
  ui.preview = !ui.preview;
  $('#btn-preview').setAttribute('aria-pressed', ui.preview);
  if (team && team.cur && team.cur.phase === 'planung' && board) board.setPreview(plan().o, plan().d, ui.preview);
  else if (ui.preview) toast('Die Spur wird in der Planung angezeigt.');
};
$('#btn-view').onclick = () => board && board.resetView();

document.addEventListener('keydown', e => {
  if (!$('#modal-bg').hidden) { if (e.key === 'Escape') closeModal(); return; }
  if ($('#scr-game').hidden || !team || !team.cur || team.cur.phase !== 'planung') return;
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
  const map = { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R', ' ': 'W' };
  if (map[e.key]) { e.preventDefault(); planAction(map[e.key]); }
  else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); planEdit('del'); }
  else if (e.key === 'Tab') { e.preventDefault(); ui.row = ui.row === 'o' ? 'd' : 'o'; ui.sel = null; renderPlanung(); }
});

/* ================= Tutorial ================= */
const tut = createTutorial({
  cur: () => team && team.cur,
  ui: () => ui,
  plan: () => (team && team.cur && team.plans[team.cur.levelId]) || { o: [], d: [] },
  prediction: () => (team && team.cur && team.cur.levelId ? dgRec(team.cur.levelId).prediction : null),
  runDone: () => !!(runner && runner.done),
  lastResult: () => {
    if (team && team.cur && team.cur.pending) return team.cur.pending.result;
    const r = team && team.levels.L1; const a = r && r.attempts[r.attempts.length - 1];
    return a ? a.result : null;
  },
  levelDone: id => { const r = team && team.levels[id]; return !!(r && r.done && !r.open); },
  saveStep: stepId => { if (team) { team.tutorial = stepId; save(); } },
});
function startTutorial() {
  if (!team) return;
  if (!$('#scr-game').hidden && team.cur && team.cur.levelId === 'L1') return tut.start('insel');
  topAction('map');
  tut.start('hallo');
}
function resumeTutorial() {
  if (!team || !team.tutorial || ['aus', 'fertig'].includes(team.tutorial)) return;
  if (tut.running()) return;
  tut.start(team.tutorial);
}

/* ================= Start ================= */
updateSoundBtn();
updateFullBtns();
const params = new URLSearchParams(location.search);
if (db.last && db.teams[db.last] && !params.has('start')) renderStart(); else renderStart();
// Testhilfe: ?test=L5 öffnet direkt ein Level mit Testteam
if (params.has('test')) {
  const id = 'ttest';
  db.teams[id] = db.teams[id] || { id, name: 'Testteam', created: Date.now(), updated: Date.now(), introDone: true, levels: {}, worlds: {}, cur: null, plans: {} };
  team = db.teams[id];
  openLevel(params.get('test'));
}
window.__exp = { get team() { return team; }, LEVELS, openLevel, renderMap, tut };
