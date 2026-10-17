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
  if (!window.crypto?.randomUUID || !window.crypto?.subtle) { try { Object.defineProperty(window, 'crypto', { value: globalThis.crypto, configurable: true }); } catch (e) {} }
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
    'app-sync.js', 'app-ship.js', 'app-gems.js', 'app-juice.js', 'app-kiosk.js', 'app-auth.js', 'app-input.js', 'app-landgang.js', 'app-truhe3d.js', 'app-teacher.js'];
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
  check('Wochenpunkte gezeichnet', w1.document.querySelectorAll('.week-dot').length === 8, String(w1.document.querySelectorAll('.week-dot').length));
  check('Reise hat acht Wochen', G('CFG').weeks.length === 8, String(G('CFG').weeks.length));
  check('Stapellauf öffnet alle Bereiche', ['werft','kartenraum','logbuch','antrieb','wissen','zusammenhalt','karte','rat'].every(k => G('CFG').weeks[0].unlocks.includes(k)));
  check('Phasenanzeige Stapellauf', text('#phaseLabel') === 'Stapellauf', text('#phaseLabel'));
  check('Wochenfokus in Woche 2 bis 4', ['antrieb','wissen','zusammenhalt'].every((k, i) => G('CFG').weeks[i + 1].focusResource === k));
  check('Routen schließen lückenlos an', G('CFG').weeks.slice(1).every((w, i) => !w.ort.route.length || w.ort.route[0] === G('CFG').weeks[i].ort.id));
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
  check('Hexfeld-IDs für alle Wochen vorhanden', G('CFG').weeks.every(w => w.ort && typeof w.ort.id === 'string'));
  check('Alle Wochenorte existieren auf der Startkarte', G('CFG').weeks.every(w => G('CFG').map.data.tiles.some(f => f.id === w.ort.id)));
  check('Alle Routenfelder existieren auf der Startkarte', G('CFG').weeks.flatMap(w => w.ort.route || []).every(id => G('CFG').map.data.tiles.some(f => f.id === id)));
  check('Startkarte eingebunden', G('CFG').map.image === 'startkarte.svg' && G('CFG').map.source === 'startkarte.json');
  check('Routenkarte nutzt dieselbe Startkarte', G('CFG').map.routeImage === 'startkarte.svg');
  check('Feste Route beginnt an der Hafenausfahrt', G('CFG').weeks[1].ort.route.join('|') === 'home|harbor-exit|first-sea');
  check('Keine scheinbare freie Zielwahl vor der Ausfahrt', !G('CFG').weeks[0].council.choices.some(x => /Leuchtturm|Grüne Insel|Nebelbucht/.test(x)));
  check('Alle Symbole im Sprite', w1.document.querySelectorAll('#icon-sprite symbol').length === 29, String(w1.document.querySelectorAll('#icon-sprite symbol').length));

  // Router und Sperren
  w1.gotoView('missionen');
  await wait(120);
  check('Ansichtswechsel Aufträge', $('#view-missionen')?.classList.contains('active') && w1.location.hash === '#/missionen');
  w1.gotoView('karte');
  await wait(120);
  check('Karte im Stapellauf erreichbar', w1.location.hash === '#/karte', w1.location.hash);

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
  check('SRL an: Schwerpunkt im Kopf', !$('#srlFocusChip')?.classList.contains('hidden') && ($('#srlFocusChip')?.textContent || '').includes('Ganzer Kreislauf'), $('#srlFocusChip')?.textContent);
  const labels = [...w2.document.querySelectorAll('#srlTabs .area-tab')].map(b => b.textContent);
  check('Wortlaut Planung/Durchführung/Reflexion', labels.join('|') === 'Alle Phasen|Planung|Durchführung|Reflexion', labels.join('|'));

  const planungTab = [...w2.document.querySelectorAll('#srlTabs .area-tab')].find(b => b.dataset.srl === 'planung');
  planungTab.onclick();
  await wait(120);
  const gezeigt = [...w2.document.querySelectorAll('.mission-card .srl-badge')].map(b => b.textContent);
  check('Phasenfilter greift', gezeigt.length === 0 || gezeigt.every(t => t === 'Planung'), gezeigt.join(','));

  G('runtime.week = 4');
  w2.AIU_STORE.emitSync(...w2.AIU_TOPICS);
  await wait(200);
  check('Reisekarte sichtbar', !$('#routeCard')?.classList.contains('hidden'));
  check('Startkarte statt leerem Designer sichtbar', $('#mapIframe')?.classList.contains('hidden') && !$('#mapFallback')?.classList.contains('hidden') && $('#mapImage')?.getAttribute('src') === 'startkarte.svg');
  check('Route gezeichnet', !!$('#routeCard polyline'));
  check('Nebelmaske vorhanden', !!$('#routeCard mask#nebelMaske'));
  const loecher = w2.document.querySelectorAll('#routeCard mask circle').length;
  check('Nur Start- und Routenfelder sind frei', loecher === 11, String(loecher));
  check('Aktuelle Position benannt', ($('#routeCard')?.textContent || '').includes('Bucht der Grünen Insel'));
  check('Fortschritt liegt auf der Startkarte', $('#routeCard image')?.getAttribute('href') === 'startkarte.svg');
  check('Positionsanzeige folgt der aktuellen Woche', ($('#mapPosition')?.textContent || '').includes('Bucht der Grünen Insel'));

  check('Schiffsthema hat Abonnenten', (w2.AIU_STORE?.topicsInUse() || []).includes('ship'));
  const hauptbereiche=[...w2.document.querySelectorAll('.ship-board [data-priority="primary"]')];
  check('Vier Hauptbereiche sind hervorgehoben', hauptbereiche.length===4, String(hauptbereiche.length));
  check('Kapitänskajüte ist nachgeordnet', $('#teacherHotspot')?.dataset.priority==='secondary');
  const ansichten=[...w2.document.querySelectorAll('[data-ship-scene]')];
  check('Umschalter hat beide Schiffsansichten', ansichten.length===2, String(ansichten.length));
  check('Schiffsansicht ist aktiv', ansichten[0]?.classList.contains('active')&&ansichten[0]?.getAttribute('aria-pressed')==='true');
  check('Steueransicht ist aktivierbar', ansichten[1]?.disabled===false&&ansichten[1]?.textContent.trim()==='Steuer'&&ansichten[1]?.dataset.shipScene==='./segelschiff-steuermann.html');
  ansichten[1].click();
  check('Steueransicht wird eingeschaltet', ansichten[1]?.classList.contains('active')&&ansichten[1]?.getAttribute('aria-pressed')==='true'&&w2.document.querySelector('.ship-scene-frame')?.getAttribute('src')==='./segelschiff-steuermann.html');
  check('Steueransicht nimmt Ziehgesten an', w2.document.querySelector('.ship-board')?.classList.contains('scene-interactive'));
  ansichten[0].click();
  check('Schiffsansicht bleibt umschaltbar', ansichten[0]?.classList.contains('active')&&!w2.document.querySelector('.ship-board')?.classList.contains('scene-interactive'));
  check('Klassenspiel ist korrekt benannt', $('#headerSub')?.textContent==='Ein Klassenspiel für die Otterklasse 5.3', $('#headerSub')?.textContent);

  /* ---- Kioskbetrieb: Startparameter werden erkannt ---- */
  check('Ohne Parameter kein Kioskbetrieb', w2.AIU_START.kiosk === false && w2.AIU_START.beamer === false);
  check('Bühnenmodus nicht aktiv', !w2.document.body.classList.contains('buehne'));

  /* ---- Phase 3 ---- */
  check('Spielgefühl an', w2.AIU_JUICE.an() === true && w2.AIU_SOUND.an() === true);
  check('Tonschalter sichtbar', $('#soundToggle')?.hidden === false);
  G('runtime.week = 1');
  w2.AIU_STORE.emitSync(...w2.AIU_TOPICS);
  await wait(120);
  check('Teaser in Woche 1 sichtbar', $('#teaserEntry')?.hidden === false);
  check('Teaser auch im Lehrkräftebereich vorhanden', !!$('#teacherTeaserOpen'));
  $('#teaserOpen').click();
  check('Teaser im Datenschutzmodus eingebettet', $('#teaserPlayerHost iframe')?.getAttribute('src')?.startsWith('https://www.youtube-nocookie.com/embed/E9rTkmztZA8'));
  $('#teaserClose').click();
  check('Schließen stoppt das Video', !$('#teaserModal')?.classList.contains('open') && !$('#teaserPlayerHost iframe'));
  Object.defineProperty(w2.navigator,'onLine',{configurable:true,value:false});
  $('#teacherTeaserOpen').click();
  check('Offline-Hinweis statt leerem Player', ($('#teaserPlayerHost')?.textContent||'').includes('Internetverbindung') && !$('#teaserPlayerHost iframe'));
  $('#teaserClose').click();
  Object.defineProperty(w2.navigator,'onLine',{configurable:true,value:true});
  G('runtime.week = 2');
  w2.AIU_STORE.emitSync(...w2.AIU_TOPICS);
  await wait(120);
  check('Große Teaser-Schaltfläche ab Woche 2 verborgen', $('#teaserEntry')?.hidden === true);

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
  check('Meilenstein meldet sich', $('#toast')?.classList.contains('erzaehlung') && meldung.includes('Segel'), meldung.slice(0, 60));
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
  w3.sessionStorage.setItem('kiu-v2-teacher-auth', String(Date.now() + 600000));
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

/* =================================================================
   Durchlauf 5: Kapitänskajüte (Code, Sperre, Ablauf)
   Der Test nutzt einen eigenen Prüfcode, nie den echten Code.
   ================================================================= */
{
  const { pbkdf2Sync, randomBytes } = await import('node:crypto');
  const base = JSON.parse(fs.readFileSync(path.join(ROOT, 'config-base.json'), 'utf8'));
  check('Kein Klartext-Code in der Konfiguration', !('teacherPin' in base.app) && !!base.app.teacherAuth?.hash);
  check('Code hat sieben Stellen', base.app.teacherAuth.stellen === 7);
  check('README nennt keinen Code', !/2468/.test(fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8')));

  const w5 = await boot('?ton=aus');
  const $ = sel => w5.document.querySelector(sel);
  const salz = randomBytes(16);
  const testAuth = { verfahren: 'PBKDF2-SHA256', iterationen: 1000, stellen: 7, salz: salz.toString('base64'),
    hash: pbkdf2Sync('1234567', salz, 1000, 32, 'sha256').toString('base64'), abmeldenNachMinuten: 10 };
  w5.eval(`CFG.app.teacherAuth = ${JSON.stringify(testAuth)}`);
  const tippe = async code => { for (const z of code) { w5.document.querySelector(`[data-pin="${z}"]`).click(); await wait(5); } await wait(250); };

  check('Kajüte ohne Anmeldung gesperrt', w5.teacherAuthed() === false);
  w5.gotoView('lehrer');
  await wait(80);
  check('Codefeld öffnet sich', $('#pinModal')?.classList.contains('open'));
  check('Sieben Codepunkte', w5.document.querySelectorAll('#pinDots .pin-dot').length === 7, String(w5.document.querySelectorAll('#pinDots .pin-dot').length));
  w5.sessionStorage.setItem('kiu-v2-teacher-auth', '1');
  check('Alter Merker öffnet nicht mehr', w5.teacherAuthed() === false);

  await tippe('7654321');
  check('Falscher Code wird abgelehnt', ($('#pinError')?.textContent || '').includes('Falsch') && !$('#view-lehrer')?.classList.contains('active'), $('#pinError')?.textContent);
  await tippe('7654321'); await tippe('7654321');
  await wait(800);
  check('Sperre nach drei Fehlversuchen', w5.pinLockRemaining() > 0 && ($('#pinError')?.textContent || '').includes('warten'), $('#pinError')?.textContent);
  await tippe('1234567');
  check('Während der Sperre keine Anmeldung', w5.teacherAuthed() === false);
  check('Sperre übersteht Neuladen', !!JSON.parse(w5.localStorage.getItem('kiu-v2-pin-lock') || '{}').bis);

  w5.localStorage.removeItem('kiu-v2-pin-lock');
  w5.openPin();
  await tippe('1234567');
  check('Richtiger Code öffnet die Kajüte', w5.teacherAuthed() === true && $('#view-lehrer')?.classList.contains('active'));
  check('Fehlversuche nach Erfolg zurückgesetzt', JSON.parse(w5.localStorage.getItem('kiu-v2-pin-lock') || '{}').fehler === 0);

  w5.sessionStorage.setItem('kiu-v2-teacher-auth', String(Date.now() - 1000));
  check('Abgelaufene Sitzung gilt als abgemeldet', w5.teacherAuthed() === false);
  w5.teacherLogin();
  $('#teacherLogout').click();
  await wait(80);
  check('Abmelden räumt die Sitzung', !w5.sessionStorage.getItem('kiu-v2-teacher-auth') && $('#view-deck')?.classList.contains('active'));
}

/* =================================================================
   Durchlauf 6: Landgangstruhe, Wochenvorrat und Einsätze
   ================================================================= */
{
  const w6 = await boot('?ton=aus');
  const $ = sel => w6.document.querySelector(sel);
  const G = expr => w6.eval(expr);
  w6.confirm = () => true;
  w6.teacherLogin();
  w6.gotoView('lehrer');
  await wait(200);
  check('Truhe auf dem Deck', !!$('#landgangCard')?.textContent.includes('Landgangstruhe'));
  check('Truhe startet leer', w6.lgSum(G('runtime.truhe')) === 0);
  check('Wochenvorrat ohne Ausbau 2/2/2', JSON.stringify(w6.lgWochenvorrat()) === JSON.stringify({ antrieb: 2, wissen: 2, zusammenhalt: 2 }));

  $('#lgBook').click(); await wait(250);
  check('Wochenvorrat eingebucht', G('runtime.resources.antrieb') === 2 && G('runtime.resources.wissen') === 2);
  check('Wochenvorrat nur einmal pro Woche', $('#lgBook')?.disabled === true);

  G('runtime.week = 2; runtime.resources.antrieb = 7');
  w6.AIU_STORE.emitSync(...w6.AIU_TOPICS); await wait(150);
  check('Meilenstein als Einsatz angeboten', [...$('#lgZweck').options].some(o => o.value === 'meilenstein-2-antrieb' && o.textContent.includes('Segel')));
  const vorher = G('runtime.resources.antrieb');
  $('#lgZweck').value = 'meilenstein-2-antrieb'; $('#lgSpend').click(); await wait(250);
  check('Ohne Zustimmung kein Einsatz', G('runtime.resources.antrieb') === vorher && w6.lgSum(G('runtime.truhe')) === 0);
  $('#lgZweck').value = 'meilenstein-2-antrieb'; $('#lgConsent').checked = true; $('#lgSpend').click(); await wait(250);
  check('Einsatz zieht nur die Kosten ab', G('runtime.resources.antrieb') === vorher - 6);
  check('Eingesetzte Steine liegen in der Truhe', G('runtime.truhe.antrieb') === 6);
  check('Segel ist gebaut', G('runtime.upgrades.segel') === true);
  check('Segel erhöht den Wochenvorrat auf 3 Antrieb', w6.lgWochenvorrat().antrieb === 3);
  check('Einsatz steht in der Liste', ($('#landgangCard')?.textContent || '').includes('Zusätzliches Segel'));

  G('runtime.resources.wissen = 1');
  w6.AIU_STORE.emitSync(...w6.AIU_TOPICS); await wait(120);
  $('#lgZweck').value = 'ausbau-kartenraum'; $('#lgConsent').checked = true; $('#lgSpend').click(); await wait(250);
  check('Zu wenige Steine: nichts passiert', G('runtime.resources.wissen') === 1 && !G('runtime.upgrades.kartenraum'));

  $('#lgZiel').value = 'spiele'; $('#lgZielSet').click(); await wait(250);
  check('Ziel festgelegt', G('runtime.landgangZiel') === 'spiele' && ($('#landgangCard')?.textContent || '').includes('Spielestunde'));
  check('Einlösen gesperrt, solange die Truhe nicht reicht', $('#lgRedeem')?.disabled === true);
  G("runtime.truhe = {antrieb: 20, wissen: 9, zusammenhalt: 5}");
  w6.AIU_STORE.emitSync(...w6.AIU_TOPICS); await wait(120);
  $('#lgRedeem').click(); await wait(250);
  check('Landgang eingelöst, Rest bleibt in der Truhe', w6.lgSum(G('runtime.truhe')) === 4 && G('runtime.landgaenge.length') === 1 && G('runtime.landgangZiel') === null);
  check('Ressourcen nie negativ', ['antrieb', 'wissen', 'zusammenhalt'].every(k => G(`runtime.resources.${k}`) >= 0));
}

console.log('\nSmoke-Test (Phase 1 bis 3, Kioskbetrieb, Kajüte und Landgang)\n' + '='.repeat(60));
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
