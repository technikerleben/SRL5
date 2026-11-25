// Geführtes Tutorial: hebt Bereiche hervor und wartet, bis die Kinder handeln.
// Die Kinder spielen dabei echt Level 1 – nichts ist gestellt.

export function createTutorial(api) {
  const $ = s => document.querySelector(s);
  const visible = el => el && el.offsetParent !== null && el.getClientRects().length > 0;
  const onScreen = id => !$(id).hidden;
  const inL1 = () => onScreen('#scr-game') && api.cur() && api.cur().levelId === 'L1';
  const phase = () => (api.cur() ? api.cur().phase : null);

  const STEPS = [
    { id: 'hallo', title: 'Hallo, ich bin Ola! 🦦',
      text: 'Ich zeige euch jetzt Schritt für Schritt, wie die Expedition funktioniert. Lest alles laut vor und wechselt euch dabei ab. Wenn ich „Jetzt seid ihr dran!“ sage, macht ihr selbst etwas.' },
    { id: 'karte', target: '[data-level="L1"]', title: 'Die Expeditionskarte',
      text: 'Hier seht ihr alle 12 Level. Am Anfang ist nur Level 1 offen. Klickt auf „Ankunft am Strand“.',
      done: () => inL1() },
    { id: 'insel', target: '#board', title: 'Die Insel',
      text: 'Ola hat einen orangen Ring, Bodo einen blauen. Die rosa Muschel müsst ihr einsammeln. Die zwei Hügel mit Fahne sind der Bau – dort müssen am Ende beide stehen. Mit der Maus könnt ihr die Insel ein bisschen drehen.' },
    { id: 'phasen', target: '.phases', title: 'Die drei Phasen',
      text: 'Jedes Level hat drei Phasen: <b>Planung</b> (nachdenken und Plan bauen), <b>Durchführung</b> (Plan ausprobieren, zuschauen) und <b>Reflexion</b> (zurückschauen: Was hat geklappt?). Hier oben seht ihr immer, wo ihr gerade seid.' },
    { id: 'ziel', target: '#sec-goal', title: 'Erst das Ziel verstehen',
      text: 'Hier steht, was ihr schaffen müsst. „Energie“ heißt: So viele Schritte darf jede Figur höchstens machen.' },
    { id: 'strategie', target: '#sec-strat', title: 'Eine Strategie wählen',
      text: 'Eine Strategie ist euer Plan, <b>wie</b> ihr die Aufgabe angeht. Klickt auf „Strategie wählen“, lest die Karten und wählt eine aus.',
      modalText: 'Lest die Karten gemeinsam. Für Level 1 passt „🔭 Überblick verschaffen“ gut. Klickt eine Karte an und dann unten auf „Übernehmen“.',
      done: () => api.cur().strategies.length > 0 },
    { id: 'vorhersage', target: '#sec-pred', title: 'Eine Vorhersage treffen',
      text: 'Schätzt ehrlich: Wie viele Versuche werdet ihr brauchen? Wenn eure Schätzung stimmt, bekommt ihr einen Stern – egal ob 1 oder 3 Versuche.',
      done: () => api.prediction() != null },
    { id: 'ola1', target: '#sec-plan .pad', title: 'Den Plan für Ola bauen',
      text: 'Jetzt legt ihr Schritt-Karten. Oben ist „🦦 Ola planen“ ausgewählt. Die Muschel liegt 3 Felder rechts von Ola. Klickt 3× auf <b>→</b>.',
      done: () => api.plan().o.length >= 3 },
    { id: 'tabelle', target: '#pgrid', title: 'Die Plan-Tabelle',
      text: 'Jede Karte ist ein Schritt. Die Zahlen oben sind die Spalten: In Spalte 1 machen Ola und Bodo ihren ersten Schritt <b>gleichzeitig</b>, dann kommt Spalte 2 und so weiter.' },
    { id: 'ola2', target: '#sec-plan .pad', title: 'Ola zum Bau bringen',
      text: 'Von der Muschel aus muss Ola noch 2× nach unten <b>↓</b> und 1× nach rechts <b>→</b>. Legt die drei Karten.',
      done: () => api.plan().o.length >= 6 },
    { id: 'bodo-tab', target: '.row-tab.d', title: 'Jetzt ist Bodo dran',
      text: 'Klickt auf „🦡 Bodo planen“. Ab jetzt legen die Pfeile Karten für Bodo.',
      done: () => api.ui().row === 'd' || api.plan().d.length >= 5 },
    { id: 'bodo', target: '#sec-plan .pad', title: 'Bodos Weg',
      text: 'Bodo muss nur nach rechts in den Bau. Wie oft? Zählt die Felder auf der Insel und legt die Karten.',
      done: () => api.plan().d.length >= 4 },
    { id: 'aendern', target: '#pgrid', title: 'Karten ändern',
      text: 'Verklickt? Klickt eine Karte an – dann ersetzt der nächste Pfeil genau diese Karte. <b>⌫</b> löscht, <b>⏸</b> heißt „einen Schritt warten“. Ihr könnt auch die Pfeiltasten benutzen.' },
    { id: 'spur', target: '#btn-preview', title: 'Spur zeigen',
      text: 'Dieser Knopf zeigt eure geplanten Wege mit Nummern auf der Insel. Probiert ihn ruhig aus!' },
    { id: 'leiter', target: '#btn-ladder', title: 'Die Lösungsleiter',
      text: 'Kommt ihr nicht weiter? Die Lösungsleiter hat 3 Sprossen. Nehmt immer erst die unterste Sprosse und probiert dann selbst weiter.' },
    { id: 'wo', target: '#scr-game .top-actions [data-act="recap"]', title: 'Wo stehen wir?',
      text: 'Muss jemand von euch kurz weg? Dann spielt der andere einfach weiter. Kommt er zurück, drückt ihr diesen Knopf und erklärt euch gegenseitig, wo ihr steht.' },
    { id: 'los', target: '#btn-go', title: 'Ab zur Durchführung',
      text: 'Euer Plan ist fertig? Dann klickt auf „Zur Durchführung“. Ab dann könnt ihr nichts mehr ändern – nur noch zuschauen!',
      done: () => phase() === 'durchfuehrung' },
    { id: 'abspielen', target: '.run-ctrls', title: 'Genau beobachten',
      text: 'Klickt auf <b>▶ Abspielen</b>. Mit <b>⏭ 1 Schritt</b> geht es Spalte für Spalte. Schaut genau hin: Läuft alles so, wie ihr es geplant habt?',
      done: () => api.runDone() },
    { id: 'zur-reflexion', target: '#r-next', title: 'Fertig!',
      text: () => api.lastResult() === 'win'
        ? 'Geschafft! 🎉 Jetzt kommt die wichtigste Phase: die Reflexion. Klickt auf „Weiter zur Reflexion“.'
        : 'Hat nicht ganz geklappt? Das ist völlig normal – jetzt wisst ihr mehr. Klickt auf „Weiter zur Reflexion“.',
      done: () => phase() === 'reflexion' },
    { id: 'reflexion', target: '#panel', side: 'left', title: 'Die Reflexion',
      text: () => api.lastResult() === 'win'
        ? 'Hier schaut ihr zurück. Bewertet eure Strategie (👍 🤏 👎) und schreibt einen Satz, was euch geholfen hat. Die Satzanfänge helfen euch. Dann klickt ihr auf „Abschließen“.'
        : 'Überlegt gemeinsam: Woran lag es? Und was macht ihr jetzt? Wählt bei beiden Fragen eine Antwort. Dann geht es zurück in die Planung.',
      done: () => api.levelDone('L1') || phase() === 'planung',
      after: () => (api.levelDone('L1') ? 'karte-wo' : 'nochmal') },
    { id: 'nochmal', target: '#pgrid', title: 'Plan verbessern',
      text: 'Die rote Spalte zeigt, wo es schiefging. Ändert den Plan und geht dann wieder auf „Zur Durchführung“. Kein Stress – so arbeiten echte Profis!',
      done: () => phase() === 'durchfuehrung', after: () => 'abspielen' },
    { id: 'karte-wo', target: '#scr-map .top-actions', title: 'Super gemacht! ⭐',
      text: 'Hier oben findet ihr immer: <b>Wo stehen wir?</b>, die <b>Strategien</b>, euer <b>Logbuch</b> mit allen Reflexionen und die <b>Regeln</b>.' },
    { id: 'ende', target: '[data-level="L2"]', title: 'Jetzt seid ihr bereit!',
      text: 'Das war das Tutorial. Ab Level 2 spielt ihr selbst – mit Planung, Durchführung und Reflexion. Viel Erfolg auf eurer Expedition!', last: true },
  ];
  const idx = id => STEPS.findIndex(s => s.id === id);

  let spot, bubble, timer = null, cur = -1, lastHTML = '', scrolledFor = null;

  function build() {
    spot = document.createElement('div'); spot.className = 'tut-spot';
    bubble = document.createElement('div'); bubble.className = 'tut-bubble'; bubble.setAttribute('role', 'dialog');
    bubble.setAttribute('aria-live', 'polite');
    document.body.append(spot, bubble);
    bubble.addEventListener('click', e => {
      const b = e.target.closest('[data-tut]'); if (!b) return;
      if (b.dataset.tut === 'next') advance();
      if (b.dataset.tut === 'stop') stop(true);
    });
  }

  function start(fromStep = 0) {
    if (!spot) build();
    cur = typeof fromStep === 'string' ? Math.max(0, idx(fromStep)) : fromStep;
    api.saveStep(STEPS[cur].id);
    lastHTML = '';
    clearInterval(timer); timer = setInterval(tick, 250);
    spot.hidden = false; bubble.hidden = false;
    tick();
  }
  function stop(byUser) {
    clearInterval(timer); timer = null; cur = -1;
    if (spot) { spot.hidden = true; bubble.hidden = true; }
    api.saveStep(byUser ? 'aus' : 'fertig');
  }
  function advance() {
    const s = STEPS[cur];
    if (s.last) return stop(false);
    const nextId = s.after ? s.after() : null;
    cur = nextId ? idx(nextId) : cur + 1;
    api.saveStep(STEPS[cur].id);
    lastHTML = '';
    tick();
  }
  const running = () => timer !== null;
  function pause() { clearInterval(timer); timer = null; if (spot) { spot.hidden = true; bubble.hidden = true; } }

  function tick() {
    if (cur < 0) return;
    const s = STEPS[cur];
    if (s.done && s.done()) { advance(); return; }
    const modalOpen = !$('#modal-bg').hidden;
    const el = s.target ? $(s.target) : null;
    const text = typeof s.text === 'function' ? s.text() : s.text;
    let body = text, lost = false;
    if (modalOpen) body = s.modalText || 'Schließt das Fenster, wenn ihr fertig seid. Dann geht es weiter.';
    else if (s.target && !visible(el)) {
      lost = true;
      body = cur <= idx('karte') ? text
        : 'Hier geht es gerade nicht weiter. Geht zurück zu <b>Level 1</b> (Knopf „🗺️ Karte“ → Level 1), dann zeige ich euch den nächsten Schritt.';
    }
    if (el && !lost && !modalOpen && scrolledFor !== s.id) {
      scrolledFor = s.id;
      const r = el.getBoundingClientRect();
      if (r.top < 60 || r.bottom > window.innerHeight - 70) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    const action = s.done && !modalOpen && !lost;
    const html = `
      <div class="tut-head"><span class="tut-ava" aria-hidden="true">🦦</span>
        <div><div class="tut-count">Tutorial · Schritt ${Math.min(cur + 1, STEPS.length)} von ${STEPS.length}</div><h3>${s.title}</h3></div></div>
      <p>${body}</p>
      ${action ? '<div class="tut-do">👉 Jetzt seid ihr dran!</div>' : ''}
      <div class="tut-btns">
        <button class="tut-skip" data-tut="stop">Tutorial beenden</button>
        ${!s.done && !modalOpen ? `<button class="btn btn-primary" data-tut="next">${s.last ? 'Los geht’s! ✓' : 'Weiter →'}</button>` : ''}
      </div>`;
    if (html !== lastHTML) { bubble.innerHTML = html; lastHTML = html; }
    bubble.classList.toggle('mini', modalOpen);
    place(modalOpen || lost ? null : el, s, modalOpen);
  }

  function place(el, s, modalOpen) {
    const vw = window.innerWidth, vh = window.innerHeight;
    const bw = bubble.offsetWidth, bh = bubble.offsetHeight, gap = 16;
    if (!el) {
      spot.classList.toggle('full', !modalOpen);
      spot.style.cssText = modalOpen ? 'opacity:0' : `left:${vw / 2}px;top:${vh / 2}px;width:0;height:0`;
      if (modalOpen) { bubble.style.left = '12px'; bubble.style.top = (vh - bh - 12) + 'px'; }
      else { bubble.style.left = (vw - bw) / 2 + 'px'; bubble.style.top = Math.max(16, (vh - bh) / 2) + 'px'; }
      bubble.dataset.arrow = 'none';
      return;
    }
    spot.classList.remove('full');
    const r = el.getBoundingClientRect();
    const pad = 6;
    const R = { l: Math.max(2, r.left - pad), t: Math.max(2, r.top - pad), w: Math.min(vw - 4, r.width + pad * 2), h: Math.min(vh - 4, r.height + pad * 2) };
    spot.style.cssText = `left:${R.l}px;top:${R.t}px;width:${R.w}px;height:${R.h}px`;
    const cands = [];
    const big = R.w > vw * 0.45 || R.h > vh * 0.6;
    if (s.side === 'left' || big) cands.push('inside-left');
    cands.push('left', 'below', 'above', 'right');
    let pos = null;
    for (const c of cands) {
      let x, y;
      if (c === 'left') { x = R.l - bw - gap; y = R.t + R.h / 2 - bh / 2; }
      if (c === 'right') { x = R.l + R.w + gap; y = R.t + R.h / 2 - bh / 2; }
      if (c === 'below') { x = R.l + R.w / 2 - bw / 2; y = R.t + R.h + gap; }
      if (c === 'above') { x = R.l + R.w / 2 - bw / 2; y = R.t - bh - gap; }
      if (c === 'inside-left') {
        if (R.l > bw + gap * 2) { x = R.l - bw - gap; y = vh / 2 - bh / 2; }
        else { x = R.l + 20; y = R.t + R.h - bh - 20; }
      }
      y = Math.min(Math.max(8, y), vh - bh - 8);
      const xc = Math.min(Math.max(8, x), vw - bw - 8);
      const fits = c === 'inside-left' || (x >= 8 && x + bw <= vw - 8 && (c === 'left' || c === 'right' || (y >= 8 && y + bh <= vh - 8)));
      if (fits) { pos = { x: xc, y, c }; break; }
    }
    if (!pos) pos = { x: (vw - bw) / 2, y: vh - bh - 12, c: 'none' };
    bubble.style.left = pos.x + 'px'; bubble.style.top = pos.y + 'px';
    bubble.dataset.arrow = pos.c;
  }

  window.addEventListener('resize', () => { lastHTML = ''; tick(); });
  return { start, stop, pause, running, steps: STEPS };
}
