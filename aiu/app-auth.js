/* Kapitänskajüte: Anmeldung mit Code, Sperre nach Fehlversuchen und
   automatische Abmeldung.

   Schutzniveau: Diese App läuft ohne eigenen Server. Der Code steht nur als
   PBKDF2-Hash in config-base.json; das hält Kinder zuverlässig fern, ist aber
   kein Schutz gegen technisch versierte Angriffe. Echter Schutz braucht eine
   serverseitige Prüfung (Supabase Auth, siehe README). */

const LS_PIN_LOCK = 'kiu-v2-pin-lock';
const PIN_FREIE_VERSUCHE = 3;
const PIN_SPERRE_START_S = 30;
const PIN_SPERRE_MAX_S = 300;

function authSettings() {
  return (typeof CFG !== 'undefined' && CFG?.app?.teacherAuth) || {};
}
function authMinutes() {
  return Number(authSettings().abmeldenNachMinuten) || 10;
}
function pinLength() {
  return Number(authSettings().stellen) || 7;
}

/* Sitzung: sessionStorage hält den Ablaufzeitpunkt, nicht nur einen Merker. */
function teacherAuthed() {
  let wert = null;
  try { wert = sessionStorage.getItem(LS_AUTH); } catch (e) { return false; }
  const bis = Number(wert);
  if (!wert || !Number.isFinite(bis) || bis < 1e12) return false;
  if (Date.now() > bis) {
    try { sessionStorage.removeItem(LS_AUTH); } catch (e) {}
    return false;
  }
  return true;
}
function teacherLogin() {
  try { sessionStorage.setItem(LS_AUTH, String(Date.now() + authMinutes() * 60000)); } catch (e) {}
}
function teacherLogout() {
  try { sessionStorage.removeItem(LS_AUTH); } catch (e) {}
}
function teacherTouch() {
  if (teacherAuthed()) teacherLogin();
}

/* Sperre nach Fehlversuchen, über Neuladen hinweg (localStorage). */
function pinLockRead() {
  try { return JSON.parse(localStorage.getItem(LS_PIN_LOCK)) || { fehler: 0, bis: 0 }; }
  catch (e) { return { fehler: 0, bis: 0 }; }
}
function pinLockWrite(lock) {
  try { localStorage.setItem(LS_PIN_LOCK, JSON.stringify(lock)); } catch (e) {}
}
function pinLockRemaining() {
  return Math.max(0, Math.ceil((pinLockRead().bis - Date.now()) / 1000));
}
function pinRegisterFailure() {
  const lock = pinLockRead();
  lock.fehler = (lock.fehler || 0) + 1;
  if (lock.fehler >= PIN_FREIE_VERSUCHE) {
    const stufe = lock.fehler - PIN_FREIE_VERSUCHE;
    const sekunden = Math.min(PIN_SPERRE_MAX_S, PIN_SPERRE_START_S * 2 ** stufe);
    lock.bis = Date.now() + sekunden * 1000;
  }
  pinLockWrite(lock);
  return pinLockRemaining();
}
function pinRegisterSuccess() {
  pinLockWrite({ fehler: 0, bis: 0 });
}

/* Prüfung über WebCrypto (PBKDF2-SHA256). */
function b64ToBytes(b64) {
  const s = atob(b64);
  return Uint8Array.from(s, c => c.charCodeAt(0));
}
async function pinCheck(code) {
  const a = authSettings();
  if (!a.hash || !a.salz) throw new Error('Kein Kajüten-Code eingerichtet.');
  const subtle = globalThis.crypto && globalThis.crypto.subtle;
  if (!subtle) throw new Error('Anmeldung nur über eine sichere Verbindung (https) möglich.');
  const key = await subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: b64ToBytes(a.salz), iterations: Number(a.iterationen) || 310000 },
    key, 256);
  const ist = new Uint8Array(bits), soll = b64ToBytes(a.hash);
  if (ist.length !== soll.length) return false;
  let diff = 0;
  for (let i = 0; i < ist.length; i++) diff |= ist[i] ^ soll[i];
  return diff === 0;
}

/* Automatische Abmeldung: Aktivität verlängert, eine Uhr prüft. */
function initAuthWatch() {
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
    document.addEventListener(ev, teacherTouch, { passive: true, capture: true }));
  setInterval(() => {
    let gespeichert = null;
    try { gespeichert = sessionStorage.getItem(LS_AUTH); } catch (e) {}
    if (gespeichert && !teacherAuthed()) {
      const inKajuete = document.querySelector('#view-lehrer')?.classList.contains('active');
      if (inKajuete && typeof gotoView === 'function') {
        gotoView('deck');
        if (typeof toast === 'function') toast('Die Kapitänskajüte wurde automatisch abgemeldet.');
      }
    }
  }, 15000);
}

initAuthWatch();
