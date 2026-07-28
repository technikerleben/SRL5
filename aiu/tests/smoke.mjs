import jsdomPkg from 'jsdom';
const { JSDOM, VirtualConsole } = jsdomPkg;
import fs from 'node:fs';
import path from 'node:path';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');

const problems = [];
process.on('unhandledRejection', reason => problems.push(`unhandledRejection: ${reason && reason.message ? reason.message : reason}`));

/* Startet die App in einer simulierten Seite. `query` erlaubt das
   Einschalten der Feature-Schalter ueber die Adresszeile. */
async function boot(query = '') {
  const baseUrl = `https://pruefung.test/aiu/${query}`;
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', e => problems.push(`jsdomError: ${e.message}`));
  virtualConsole.on('error', (...args) => problems.push(`console.error: ${String(args.join(' ')).slice(0, 200)}`));

  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/<script\b[^>]*><\/script>/g, '');
  const dom = new JSDOM(html, { url: baseUrl, runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole });
  const window = dom.window;

  window.alert = message => problems.push(`alert: ${message}`);
  window.confirm = () => true;
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.indexedDB = indexedDB;
  window.IDBKeyRange = IDBKeyRange;
  if (!window.crypto?.randomUUID) { try { Object.defineProperty(window, 'crypto', { value: globalThis.crypto, configurable: true }); } catch (e) {} }
  window.scrollTo = () => {};
  window.URL.createObjectURL = () => 'blob:test';
  window.fetch = async input => {
    const rel = String(input).replace(/^\.\//, '');
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) return { ok: false, status: 404, json: async () => ({}) };
    const body = fs.readFileSync(file, 'utf8');
    return { ok: true, status: 200, json: async () => JSON.parse(body), text: async () => body };
  };

  // Ladereihenfolge wie in index.html und app.js. app-ship.js baut ein iframe
  // auf, das jsdom nicht ausfuehrt – die Bruecke wird separat geprueft.
  const order = ['vendor/three.min.js', 'app-store.js', 'app-core.js', 'config-loader.js', 'sync-config.js',
    'app-sync.js', 'app-ship.js', 'app-gems.js', 'app-juice.js', 'app-kiosk.js', 'app-input.js', 'app-teacher.js'];
  for (const file of order) {
    try {
      const tag = window.document.createElement('script');
      tag.textContent = fs.readFileSync(path.join(ROOT, file), 'utf8');
      window.document.head.appendChild(tag);
    } catch (error) {
      problems.push(`Laden von ${file}: ${error.message}`);
    }
  }
  await new Promise(r => setTimeout(r, 2500));
  return window;
}

const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok, detail });
const wait = ms => new Promise(r => setTimeout(r, ms));

/* =================================================================
   Durchlauf 1: alles abgeschaltet (?ui=aus) – die App muss sich exakt so
   verhalten wie vor der Modernisierung, egal was in der Konfiguration steht
   ================================================================= */
const w1 = await boot('?ui=aus');
{
  const G = expr => w1.eval(expr);
  const $ = sel => w1.document.querySelector(sel);
  const text = sel => ($(sel)?.textContent || '').trim();

  check('Konfiguration geladen', !!G('CFG'));
  check('Store vorhanden', typeof w1.AIU_STORE === 'object');
  check('Themen mit Abonnenten', (w1.AIU_STORE?.topicsInUse() || []).length >= 10, (w1.AIU_STORE?.topicsInUse() || []).join(','));
  check('Kopfzeile gefüllt', text('#headerWeek').startsWith('Woche 1'), text('#headerWeek'));
  check('Kapitel gesetzt', text('#chapterTitle').length > 5);
  check('Wochenpunkte gezeichnet', w1.document.querySelectorAll('.week-dot').length === 6);
  check('Missionen gerendert', w1.document.querySelectorAll('.mission-card').length >= 3);
  check('Ressourcenkarten gerendert', w1.document.querySelectorAll('.resource').length === 3);
  check('Logbuch gefüllt', w1.document.querySelectorAll('.log-entry').length >= 1);
  check('Router hat Adresse gesetzt', w1.location.hash === '#/deck', w1.location.hash);

  // Phase 2 darf im Auslieferungszustand nichts veraendern
  check('Icons aus: Emoji bleibt', text('.nav-btn span').includes('⚓') && w1.document.querySelectorAll('.ico').length === 0);
  check('Icons aus: keine Schriftklasse', !w1.document.body.classList.contains('schriften'));
  check('SRL aus: keine Abzeichen', w1.document.querySelectorAll('.srl-badge').length === 0);
  check('SRL aus: Phasenfilter verborgen', $('#srlTabs')?.classList.contains('hidden'));
  check('Karte aus: keine Reisekarte', $('#routeCard')?.classList.contains('hidden'));

  // Daten aus Phase 1 und 2
  check('SRL-Feld vorhanden', G('CFG').weeks[0].missions[0].srl === 'durchfuehrung', G('CFG').weeks[0].missions[0].srl);
  check('Wochenfokus vorhanden', !!G('CFG').weeks[0].srlFokus, G('CFG').weeks[0].srlFokus);
  check('Ortskoordinaten vorhanden', G('CFG').weeks.every(w => w.ort && typeof w.ort.x === 'number'));
  check('Startkarte eingebunden', G('CFG').map.image === 'startkarte.svg' && G('CFG').map.source === 'startkarte.json');
  check('Routenkarte bleibt getrennt', G('CFG').map.routeImage === 'karte.svg');
  check('Alle Symbole im Sprite', w1.document.querySelectorAll('#icon-sprite symbol').length === 28, String(w1.document.querySelectorAll('#icon-sprite symbol').length));

  // Router und Sperren
  w1.gotoView('missionen');
  await wait(120);
  check('Ansichtswechsel Aufträge', $('#view-missionen')?.classList.contains('active') && w1.location.hash === '#/missionen');
  w1.gotoView('karte');
  await wait(120);
  check('Gesperrte Ansicht wird abgewiesen', w1.location.hash === '#/missionen');

  // Store
  G('runtime.week = 6');
  w1.AIU_STORE.emitSync(...w1.AIU_TOPICS);
  await wait(150);
  check('Ausbauten nach Wochenwechsel', w1.document.querySelectorAll('.upgrade').length >= 6);
  G('runtime.resources.antrieb = 7');
  w1.AIU_STORE.emit('resources');
  await wait(150);
  check('Teilaktualisierung Ressourcen', text('#resourceCards').includes('7'));

  const topics = w1.runtimeTopics({ week: 1, resources: { antrieb: 0 } }, { week: 1, resources: { antrieb: 3 } });
  check('Diff liefert nur Ressourcen', topics.includes('resources') && !topics.includes('logbook'), topics.join(','));
  check('Wochenwechsel zeichnet alles', w1.runtimeTopics({ week: 1 }, { week: 2 }).length === w1.AIU_TOPICS.length);
  const topicsUp = w1.runtimeTopics({ week: 1, upgrades: { beiboot: false } }, { week: 1, upgrades: { beiboot: true } });
  check('Ausbau meldet auch das Schiff', topicsUp.includes('ship'), topicsUp.join(','));

  // Phase 3 darf im Auslieferungszustand ebenfalls nichts veraendern
  check('Spielgefühl aus', w1.AIU_JUICE.an() === false && w1.AIU_SOUND.an() === false);
  check('Tonschalter verborgen', $('#soundToggle')?.hidden === true);
  check('Keine Merkstriche', w1.document.querySelectorAll('.bar-mark').length === 0);
  w1.toast('Probe');
  check('Nüchterne Meldung', !$('#toast')?.classList.contains('erzaehlung') && $('#toast')?.textContent === 'Probe');

  let survived = false;
  w1.AIU_STORE.on('map', () => { throw new Error('Testfehler'); }, 'Testfehler');
  w1.AIU_STORE.on('map', () => { survived = true; }, 'danach');
  w1.AIU_STORE.emit('map');
  await wait(120);
  check('Fehler bricht andere Renderer nicht ab', survived);
}

/* =================================================================
   Durchlauf 2: alle Schalter über die Adresszeile eingeschaltet
   ================================================================= */
const w2 = await boot('?ui=all');
{
  const G = expr => w2.eval(expr);
  const $ = sel => w2.document.querySelector(sel);

  check('Übersteuerung greift', G("flag('icons')") === true);
  check('Icons an: Symbole gesetzt', w2.document.querySelectorAll('.ico').length > 10, String(w2.document.querySelectorAll('.ico').length));
  check('Icons an: Navigation ohne Emoji', !($('.nav-btn span')?.textContent || '').includes('⚓'));
  check('Icons an: Schriftklasse gesetzt', w2.document.body.classList.contains('schriften'));
  check('Kein verwaistes Symbolziel', [...w2.document.querySelectorAll('use')].every(u => w2.document.querySelector(u.getAttribute('href'))));
  const restEmoji = [...w2.document.querySelectorAll('.nav-btn,.hotspot,#newPlaceBtn,#quickLogBtn,.teacher-key,#stamp,.resource h3,.mission-card .tag')]
    .map(e => e.textContent).join('');
  check('Keine Emoji mehr in der Oberfläche', !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u.test(restEmoji), restEmoji.slice(0, 60));

  check('SRL an: Abzeichen auf Missionen', w2.document.querySelectorAll('.mission-card .srl-badge').length >= 3, String(w2.document.querySelectorAll('.mission-card .srl-badge').length));
  check('SRL an: Phasenfilter sichtbar', !$('#srlTabs')?.classList.contains('hidden') && w2.document.querySelectorAll('#srlTabs .area-tab').length === 4);
  check('SRL an: Schwerpunkt im Kopf', !$('#srlFocusChip')?.classList.contains('hidden') && ($('#srlFocusChip')?.textContent || '').includes('Durchführung'), $('#srlFocusChip')?.textContent);
  const labels = [...w2.document.querySelectorAll('#srlTabs .area-tab')].map(b => b.textContent);
  check('Wortlaut Planung/Durchführung/Reflexion', labels.join('|') === 'Alle Phasen|Planung|Durchführung|Reflexion', labels.join('|'));

  const planungTab = [...w2.document.querySelectorAll('#srlTabs .area-tab')].find(b => b.dataset.srl === 'planung');
  planungTab.onclick();
  await wait(120);
  const gezeigt = [...w2.document.querySelectorAll('.mission-card .srl-badge')].map(b => b.textContent);
  check('Phasenfilter greift', gezeigt.length === 0 || gezeigt.every(t => t === 'Planung'), gezeigt.join(','));

  G('runtime.week = 9');
  w2.AIU_STORE.emitSync(...w2.AIU_TOPICS);
  await wait(200);
  check('Reisekarte sichtbar', !$('#routeCard')?.classList.contains('hidden'));
  check('Startkarte statt leerem Designer sichtbar', $('#mapIframe')?.classList.contains('hidden') && !$('#mapFallback')?.classList.contains('hidden') && $('#mapImage')?.getAttribute('src') === 'startkarte.svg');
  check('Route gezeichnet', !!$('#routeCard polyline'));
  check('Nebelmaske vorhanden', !!$('#routeCard mask#nebelMaske'));
  const loecher = w2.document.querySelectorAll('#routeCard mask circle').length;
  check('Nur besuchte Orte sind frei', loecher === 9, String(loecher));
  check('Aktuelle Position benannt', ($('#routeCard')?.textContent || '').includes('Fluss der zwei Wege'));

  check('Schiffsthema hat Abonnenten', (w2.AIU_STORE?.topicsInUse() || []).includes('ship'));

  /* ---- Kioskbetrieb: Startparameter werden erkannt ---- */
  check('Ohne Parameter kein Kioskbetrieb', w2.AIU_START.kiosk === false && w2.AIU_START.beamer === false);
  check('Bühnenmodus nicht aktiv', !w2.document.body.classList.contains('buehne'));

  /* ---- Phase 3 ---- */
  check('Spielgefühl an', w2.AIU_JUICE.an() === true && w2.AIU_SOUND.an() === true);
  check('Tonschalter sichtbar', $('#soundToggle')?.hidden === false);

  // Woche 2 hat einen Meilenstein bei Antrieb
  G('runtime.week = 2');
  G('runtime.resources.antrieb = 2');
  w2.AIU_STORE.emitSync(...w2.AIU_TOPICS);
  await wait(200);
  check('Merkstrich im Balken', w2.document.querySelectorAll('.bar-mark').length === 1, String(w2.document.querySelectorAll('.bar-mark').length));

  // Zahl laeuft hoch und kommt beim Zielwert an
  G('runtime.resources.antrieb = 9');
  w2.AIU_STORE.emit('resources');
  await wait(150);
  const zwischen = $('#resourceCards .resource .resource-value')?.textContent;
  await wait(900);
  const ende = $('#resourceCards .resource .resource-value')?.textContent;
  check('Zahl erreicht den Zielwert', ende === '9', `zwischen ${zwischen}, danach ${ende}`);

  // Meilenstein ausgeloest: erzaehlerische Einblendung
  const meldung = ($('#toast')?.textContent || '');
  check('Meilenstein meldet sich', $('#toast')?.classList.contains('erzaehlung') && meldung.includes('Probefahrt'), meldung.slice(0, 60));
  // jsdom kennt kein Layout: alle Elemente sind 0 breit. Der Schutz in
  // funken() greift dann zu Recht, deshalb hier eine Groesse vortaeuschen.
  const probeKarte = $('#resourceCards .resource');
  probeKarte.getBoundingClientRect = () => ({ left: 100, top: 100, width: 220, height: 120, right: 320, bottom: 220 });
  w2.AIU_JUICE.funken(probeKarte, '#d0a642', 12);
  check('Partikel erzeugt', w2.document.querySelectorAll('.juice-funke').length === 12, String(w2.document.querySelectorAll('.juice-funke').length));
  await wait(700);
  check('Partikel räumen sich auf', w2.document.querySelectorAll('.juice-funke').length === 0, String(w2.document.querySelectorAll('.juice-funke').length));

  // Klang bricht ohne AudioContext nicht ab
  let tonFehler = null;
  try { w2.AIU_SOUND.spiele('fanfare'); } catch (error) { tonFehler = error.message; }
  check('Klang ohne AudioContext unkritisch', tonFehler === null, tonFehler || '');

  // Stummschalter merkt sich den Zustand
  $('#soundToggle').click();
  await wait(60);
  check('Stummschalter gespeichert', w2.localStorage.getItem('kiu-v2-ton') === 'aus' && $('#soundToggle').getAttribute('aria-pressed') === 'false');
}

/* =================================================================
   Durchlauf 3: Kiosk-PC und Beamer-Tablet
   ================================================================= */
const w3 = await boot('?ui=all&kiosk=1&ton=aus&ansicht=beamer&leerlauf=7');
{
  const $ = sel => w3.document.querySelector(sel);
  check('Kioskbetrieb erkannt', w3.AIU_START.kiosk === true);
  check('Leerlaufzeit übernommen', w3.AIU_START.leerlaufMinuten === 7, String(w3.AIU_START.leerlaufMinuten));
  check('Ton per Startparameter stumm', w3.localStorage.getItem('kiu-v2-ton') === 'aus');
  check('Bühnenmodus aktiv', w3.document.body.classList.contains('buehne'));
  check('Ausstieg aus der Bühne vorhanden', !!$('#buehneVerlassen'));
  check('Bühne verlassen funktioniert', (() => { $('#buehneVerlassen').click(); return !w3.document.body.classList.contains('buehne'); })());

  // Rueckkehr zum Deck raeumt Fenster und Anmeldung ab
  w3.sessionStorage.setItem('kiu-v2-teacher-auth', '1');
  $('#missionModal')?.classList.add('open');
  w3.AIU_KIOSK.zurueckZumDeck();
  await wait(150);
  check('Rückkehr schließt das Missionsfenster', !$('#missionModal')?.classList.contains('open'));
  check('Rückkehr meldet die Kajüte ab', !w3.sessionStorage.getItem('kiu-v2-teacher-auth'));
  check('Rückkehr landet auf dem Deck', $('#view-deck')?.classList.contains('active'));
}

/* Ohne ui.stageMode darf die Beamer-Ansicht nicht greifen. */
const w4 = await boot('?ui=aus&ansicht=beamer');
check('Bühne ohne Schalter bleibt aus', !w4.document.body.classList.contains('buehne'));

console.log('\nSmoke-Test (Phase 1 bis 3 und Kioskbetrieb)\n' + '='.repeat(60));
let failed = 0;
for (const c of checks) {
  if (!c.ok) failed++;
  console.log(`${c.ok ? 'OK  ' : 'FEHL'} ${c.name}${c.detail ? '  [' + c.detail + ']' : ''}`);
}
const relevant = problems.filter(p => !/WebGL|canvas|not implemented|Could not parse CSS|Testfehler/i.test(p));
console.log('='.repeat(60));
console.log(`${checks.length - failed}/${checks.length} bestanden`);
if (relevant.length) console.log('\nMeldungen:\n' + relevant.slice(0, 8).join('\n'));
process.exit(failed ? 1 : 0);
