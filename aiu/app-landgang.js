/* Landgangstruhe, Wochenvorrat und Einsätze.

   Grundregeln (verbindlich):
   - Es wird nie etwas weggenommen. Steine verlassen die Gefäße nur, wenn die
     Klasse sie im Besatzungsrat bewusst einsetzt; sie wandern dann in die Truhe.
   - Nichts wird einzelnen Kindern zugerechnet.
   - Keine Automatismen: Wochenvorrat, Einsätze und Landgang löst die Lehrkraft
     nach Absprache mit der Klasse aus. */

const RES_KEYS = ['antrieb', 'wissen', 'zusammenhalt'];

function lgEmpty() { return { antrieb: 0, wissen: 0, zusammenhalt: 0 }; }
function lgSum(obj) { return RES_KEYS.reduce((s, k) => s + Math.max(0, Number(obj?.[k] || 0)), 0); }
function lgTruhe() { return { ...lgEmpty(), ...(runtime?.truhe || {}) }; }
function lgZiele() { return CFG?.landgang?.ziele || []; }
function lgZielAktiv() { return lgZiele().find(z => z.id === runtime?.landgangZiel) || null; }
function lgCost(kosten) { return RES_KEYS.map(k => [k, Number(kosten?.[k] || 0)]).filter(([, n]) => n > 0); }
function lgCostText(kosten) {
  const teile = lgCost(kosten).map(([k, n]) => `${n} ${CFG.resources[k].label}`);
  return teile.length ? teile.join(' + ') : 'keine Kosten';
}

/* Wochenvorrat: Basis plus Ertrag aller gebauten Ausbauten. */
function lgWochenvorrat() {
  const vorrat = { ...lgEmpty(), ...(CFG?.wirtschaft?.basisProWoche || {}) };
  (CFG?.shipUpgrades || []).forEach(u => {
    if (!runtime?.upgrades?.[u.id]) return;
    RES_KEYS.forEach(k => { vorrat[k] += Number(u.ertrag?.[k] || 0); });
  });
  return vorrat;
}
function lgWocheGebucht(nr) { return !!(runtime?.wochenBuchungen || {})[String(nr)]; }

/* Wofür kann die Klasse Steine einsetzen? */
function lgZwecke() {
  const liste = [];
  const ms = currentWeek?.milestones || {};
  Object.entries(ms).forEach(([k, m]) => {
    if (!m?.einsatz) return;
    const id = `meilenstein-${currentWeek.number}-${k}`;
    if ((runtime?.einsaetze || []).some(e => e.zweckId === id)) return;
    liste.push({ id, titel: m.einsatz, kosten: { [k]: Number(m.target || 0) }, ausbau: m.ausbau || null });
  });
  (CFG?.shipUpgrades || []).forEach(u => {
    if (runtime?.upgrades?.[u.id]) return;
    if (liste.some(z => z.ausbau === u.id)) return;
    if (!lgCost(u.kosten).length) return;
    liste.push({ id: `ausbau-${u.id}`, titel: `${u.title} bauen`, kosten: u.kosten, ausbau: u.id });
  });
  liste.push({ id: 'frei', titel: 'Anderer Zweck', kosten: null, ausbau: null });
  return liste;
}

/* ---------- Deck ---------- */
function renderLandgang() {
  const host = $('#landgangCard');
  if (!host || !CFG?.landgang) return;
  const truhe = lgTruhe(), summe = lgSum(truhe), ziel = lgZielAktiv();
  const vorrat = lgWochenvorrat();
  const breite = ziel ? Math.min(100, summe / ziel.steine * 100) : 0;
  const segmente = ziel ? RES_KEYS.map(k => {
    const w = Math.min(100, truhe[k] / ziel.steine * 100);
    return `<i style="width:${w}%;background:${RES_COLOR[k]}"></i>`;
  }).join('') : '';
  const rest = ziel ? Math.max(0, ziel.steine - summe) : 0;
  const status = !ziel
    ? 'Noch kein Ziel gewählt. Der Besatzungsrat entscheidet, worauf ihr spart.'
    : rest > 0 ? `Noch <b>${rest}</b> Steine bis zum Landgang „${esc(ziel.titel)}“.`
               : `Geschafft! Die Truhe reicht für „${esc(ziel.titel)}“.`;
  const letzte = (runtime?.einsaetze || []).slice(-3).reverse().map(e =>
    `<li><span>${esc(e.zweck)}</span><span class="muted">${lgSum(e.steine)} Steine</span></li>`).join('');
  host.innerHTML = `
    <div class="row spread"><div><div class="eyebrow">Landgangstruhe</div>
      <h2 class="card-title">Gemeinsam sparen für den Landgang</h2></div>
      <div class="lg-count"><strong>${summe}</strong><span>${ziel ? `von ${ziel.steine}` : 'Steine'}</span></div></div>
    <p class="small muted">Eingesetzte Steine wandern hierher. Aus der Truhe wird nie etwas weggenommen.</p>
    <div class="lg-bar" role="img" aria-label="${summe} von ${ziel ? ziel.steine : '–'} Steinen">${segmente}</div>
    <p class="lg-status">${status}</p>
    <div class="lg-foot">
      <div class="lg-ziele">${lgZiele().map(z => `<span class="tag ${ziel?.id === z.id ? 'on' : ''}">${esc(z.titel)} · ${z.steine}</span>`).join('')}</div>
      <div class="small muted">Wochenvorrat: ${RES_KEYS.map(k => `${vorrat[k]} ${CFG.resources[k].label}`).join(' · ')}</div>
    </div>
    ${letzte ? `<ul class="lg-log">${letzte}</ul>` : ''}`;
}

/* ---------- Kajüte ---------- */
function renderLandgangTeacher() {
  const host = $('#teacherLandgang');
  if (!host || !CFG?.landgang) return;
  const nr = currentWeek?.number, gebucht = lgWocheGebucht(nr), vorrat = lgWochenvorrat();
  const zwecke = lgZwecke(), ziel = lgZielAktiv(), summe = lgSum(lgTruhe());
  host.innerHTML = `
    <h3 class="card-title">Wochenvorrat</h3>
    <p class="small muted">Jede Woche kommen ${RES_KEYS.map(k => `${vorrat[k]} ${CFG.resources[k].label}`).join(', ')} dazu.
      Ausbauten erhöhen den Vorrat.</p>
    <button class="secondary" id="lgBook" style="width:100%" ${gebucht ? 'disabled' : ''}>
      ${gebucht ? `Woche ${nr} ist eingebucht` : `Wochenvorrat für Woche ${nr} einbuchen`}</button>

    <hr class="lg-hr"><h3 class="card-title">Steine einsetzen</h3>
    <label class="caps" for="lgZweck">Wofür?</label>
    <select id="lgZweck">${zwecke.map(z => `<option value="${z.id}">${esc(z.titel)}${z.kosten ? ` – ${lgCostText(z.kosten)}` : ''}</option>`).join('')}</select>
    <div id="lgFrei" class="stack hidden" style="margin-top:8px">
      <input id="lgFreiText" type="text" placeholder="Zweck, z. B. Hinweis am Leuchtturm kaufen">
      <div class="row">${RES_KEYS.map(k => `<label class="lg-num"><span>${CFG.resources[k].label}</span><input type="number" min="0" value="0" data-lgfrei="${k}"></label>`).join('')}</div>
    </div>
    <label class="row lg-consent"><input type="checkbox" id="lgConsent"> <span>Der Besatzungsrat hat zugestimmt.</span></label>
    <button class="primary" id="lgSpend" style="width:100%">Steine einsetzen</button>

    <hr class="lg-hr"><h3 class="card-title">Landgang</h3>
    <label class="caps" for="lgZiel">Ziel, das die Klasse gewählt hat</label>
    <div class="row"><select id="lgZiel" style="flex:1"><option value="">– noch kein Ziel –</option>
      ${lgZiele().map(z => `<option value="${z.id}" ${ziel?.id === z.id ? 'selected' : ''}>${esc(z.titel)} (${z.steine} Steine)</option>`).join('')}</select>
      <button class="secondary" id="lgZielSet">Festlegen</button></div>
    <p class="small muted" style="margin-top:8px">In der Truhe: ${summe} Steine.</p>
    <button class="primary" id="lgRedeem" style="width:100%" ${ziel && summe >= ziel.steine ? '' : 'disabled'}>
      ${ziel ? `Landgang „${esc(ziel.titel)}“ einlösen` : 'Landgang einlösen'}</button>`;

  $('#lgZweck').onchange = () => $('#lgFrei').classList.toggle('hidden', $('#lgZweck').value !== 'frei');
  $('#lgBook').onclick = lgBookWeek;
  $('#lgSpend').onclick = lgSpend;
  $('#lgZielSet').onclick = lgSetZiel;
  $('#lgRedeem').onclick = lgRedeem;
}

async function lgCommit(meldung) {
  saveRuntimeLocal();
  try { await syncSaveRuntime(runtime); } catch (e) { console.error(e); toast('Spielstand konnte nicht synchronisiert werden.'); }
  render();
  if (meldung) toast(meldung);
}

async function lgBookWeek() {
  const nr = currentWeek.number;
  if (lgWocheGebucht(nr)) return;
  const vorrat = lgWochenvorrat();
  RES_KEYS.forEach(k => { runtime.resources[k] = Number(runtime.resources[k] || 0) + vorrat[k]; });
  runtime.wochenBuchungen = { ...(runtime.wochenBuchungen || {}), [String(nr)]: vorrat };
  await lgCommit(`Wochenvorrat eingebucht: ${lgCostText(vorrat)}.`);
}

async function lgSpend() {
  if (!$('#lgConsent').checked) { toast('Bitte erst im Besatzungsrat abstimmen und die Zustimmung bestätigen.'); return; }
  const zweck = lgZwecke().find(z => z.id === $('#lgZweck').value);
  if (!zweck) return;
  let kosten = zweck.kosten, titel = zweck.titel;
  if (zweck.id === 'frei') {
    titel = ($('#lgFreiText').value || '').trim();
    kosten = Object.fromEntries(RES_KEYS.map(k => [k, Math.max(0, Number($(`[data-lgfrei="${k}"]`).value || 0))]));
    if (!titel) { toast('Bitte den Zweck eintragen.'); return; }
  }
  if (!lgSum(kosten)) { toast('Es sind keine Steine ausgewählt.'); return; }
  const fehlt = lgCost(kosten).filter(([k, n]) => Number(runtime.resources[k] || 0) < n);
  if (fehlt.length) { toast(`Dafür reicht es noch nicht: ${fehlt.map(([k]) => CFG.resources[k].label).join(', ')}.`); return; }
  const truhe = lgTruhe();
  lgCost(kosten).forEach(([k, n]) => { runtime.resources[k] -= n; truhe[k] += n; });
  runtime.truhe = truhe;
  if (zweck.ausbau) runtime.upgrades = { ...(runtime.upgrades || {}), [zweck.ausbau]: true };
  runtime.einsaetze = [...(runtime.einsaetze || []), {
    woche: currentWeek.number, zweckId: zweck.id, zweck: titel,
    steine: Object.fromEntries(RES_KEYS.map(k => [k, Number(kosten[k] || 0)])), am: Date.now()
  }];
  await lgCommit(`${lgCostText(kosten)} wandern in die Landgangstruhe.`);
}

async function lgSetZiel() {
  const id = $('#lgZiel').value || null;
  if (id === (runtime.landgangZiel || null)) return;
  if (id && !confirm('Hat die Klasse dieses Ziel im Besatzungsrat gewählt?')) return;
  runtime.landgangZiel = id;
  await lgCommit(id ? `Ziel festgelegt: ${lgZielAktiv().titel}.` : 'Ziel zurückgesetzt.');
}

async function lgRedeem() {
  const ziel = lgZielAktiv();
  if (!ziel) return;
  const truhe = lgTruhe();
  if (lgSum(truhe) < ziel.steine) return;
  if (!confirm(`Landgang „${ziel.titel}“ jetzt einlösen? Dafür werden ${ziel.steine} Steine aus der Truhe verwendet.`)) return;
  /* Einlösen verbraucht nur die Zielsumme; der Rest bleibt für den nächsten Landgang. */
  let offen = ziel.steine;
  const anteil = RES_KEYS.map(k => [k, truhe[k]]).sort((a, b) => b[1] - a[1]);
  while (offen > 0) {
    for (const eintrag of anteil) {
      if (offen <= 0) break;
      if (truhe[eintrag[0]] > 0) { truhe[eintrag[0]] -= 1; offen -= 1; }
    }
  }
  runtime.truhe = truhe;
  runtime.landgaenge = [...(runtime.landgaenge || []), { ziel: ziel.titel, steine: ziel.steine, woche: currentWeek.number, am: Date.now() }];
  runtime.landgangZiel = null;
  await lgCommit(`Landgang „${ziel.titel}“ eingelöst. Viel Freude!`);
}

AIU_STORE.on('landgang', () => { renderLandgang(); renderLandgangTeacher(); }, 'Landgangstruhe');
AIU_STORE.on('teacher', () => renderLandgangTeacher(), 'Landgang in der Kajüte');
