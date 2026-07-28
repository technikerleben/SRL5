/* ------------------------------------------------------------------
   Betrieb auf festen Geraeten: Kiosk-PC im Klassenraum und
   Lehrkraefte-Tablet am Beamer.

   Gesteuert wird ueber Startparameter in der Adresse, nicht ueber die
   Konfiguration – denn config.json gilt fuer alle Geraete gleichzeitig,
   und die beiden Geraete brauchen unterschiedliches Verhalten.

     ?kiosk=1          Rueckkehr zum Deck nach Untaetigkeit
     ?ton=aus          Ton dauerhaft stumm, ueberlebt ein zurueckgesetztes Profil
     ?ton=an           Ton dauerhaft an
     ?ansicht=beamer   Buehnenmodus: gross, ohne Bedienelemente
     ?leerlauf=6       Minuten bis zur Rueckkehr (Vorgabe 4)

   Beispiel fuer die Verknuepfung auf dem Kiosk-PC:
     https://srl-5.vercel.app/aiu/?kiosk=1&ton=aus
   Beispiel fuer das Tablet am Beamer:
     https://srl-5.vercel.app/aiu/?ansicht=beamer&ton=an
   ------------------------------------------------------------------ */
'use strict';

const AIU_START = (() => {
  let parameter;
  try { parameter = new URLSearchParams(location.search); } catch (fehler) { parameter = new URLSearchParams(); }
  const lesen = name => (parameter.get(name) || '').trim().toLowerCase();
  const zahl = (name, vorgabe) => {
    const wert = Number(lesen(name));
    return Number.isFinite(wert) && wert > 0 ? wert : vorgabe;
  };
  return {
    kiosk: ['1', 'ja', 'an', 'true'].includes(lesen('kiosk')),
    ton: lesen('ton'),
    beamer: lesen('ansicht') === 'beamer',
    leerlaufMinuten: zahl('leerlauf', 4)
  };
})();

const AIU_KIOSK = (() => {

  /* --- Buehnenmodus ------------------------------------------------
     Grosse Darstellung ohne Bedienelemente fuer die Leinwand.
     Setzt ui.stageMode voraus; ohne den Schalter passiert nichts. */
  function buehneAn() {
    if (!AIU_START.beamer) return false;
    if (typeof flag !== 'function' || !flag('stageMode')) {
      console.warn('Beamer-Ansicht angefordert, aber ui.stageMode ist aus.');
      return false;
    }
    return true;
  }

  function buehneEinrichten() {
    if (!buehneAn()) return;
    document.body.classList.add('buehne');
    /* Auf der Leinwand wird nichts bedient: Eingaben abfangen, damit ein
       versehentlicher Tipp nicht mitten in der Stunde ein Fenster oeffnet. */
    document.addEventListener('click', ereignis => {
      if (ereignis.target.closest('#buehneVerlassen')) return;
      ereignis.stopPropagation();
      ereignis.preventDefault();
    }, true);
    const ausstieg = document.createElement('button');
    ausstieg.id = 'buehneVerlassen';
    ausstieg.type = 'button';
    ausstieg.textContent = 'Beamer-Ansicht beenden';
    ausstieg.addEventListener('click', () => {
      document.body.classList.remove('buehne');
      ausstieg.remove();
      taktAnpassen();
    });
    document.body.appendChild(ausstieg);
    document.addEventListener('keydown', ereignis => {
      if (ereignis.key === 'Escape' && document.body.classList.contains('buehne')) ausstieg.click();
    });
    taktAnpassen();
  }

  /* --- Schnellerer Abgleich, solange die Leinwand laeuft ------------
     Fuenf Sekunden Verzoegerung fallen genau dann auf, wenn die Klasse
     gemeinsam auf die Leinwand schaut. */
  function taktAnpassen() {
    if (typeof AIU_SYNC === 'undefined' || !AIU_SYNC.enabled) return;
    const schnell = document.body.classList.contains('buehne');
    const takt = schnell ? 1500 : Math.max(2500, Number(aiuSyncConfig().pollIntervalMs) || 5000);
    if (AIU_KIOSK.aktuellerTakt === takt) return;
    AIU_KIOSK.aktuellerTakt = takt;
    if (AIU_SYNC.pollTimer) clearInterval(AIU_SYNC.pollTimer);
    AIU_SYNC.pollTimer = setInterval(syncRefreshRuntime, takt);
  }

  /* --- Rueckkehr zum Deck nach Untaetigkeit -------------------------
     Ohne Browserleiste gibt es keine Zurueck-Geste. Ein Kind, das ein
     Fenster nicht mehr schliesst, blockiert sonst das Geraet fuer alle. */
  let uhr = null;
  function leerlaufEinrichten() {
    if (!AIU_START.kiosk) return;
    const grenze = AIU_START.leerlaufMinuten * 60000;
    const zuruecksetzen = () => {
      clearTimeout(uhr);
      uhr = setTimeout(zurueckZumDeck, grenze);
    };
    ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach(art =>
      document.addEventListener(art, zuruecksetzen, { passive: true }));
    zuruecksetzen();
  }

  function zurueckZumDeck() {
    /* Offene Fenster schliessen, ohne den Beitrag heimlich abzuschicken. */
    document.querySelectorAll('.modal-wrap.open, .modal-backdrop.open').forEach(fenster => fenster.classList.remove('open'));
    ['#missionModal', '#pinModal'].forEach(auswahl => {
      const fenster = document.querySelector(auswahl);
      if (fenster) fenster.classList.remove('open');
    });
    try { sessionStorage.removeItem(LS_AUTH); } catch (fehler) {}
    if (typeof gotoView === 'function') gotoView('deck');
    uhr = setTimeout(zurueckZumDeck, AIU_START.leerlaufMinuten * 60000);
  }

  /* --- Ton per Startparameter ---------------------------------------
     Kiosk-Profile werden oft bei jedem Start zurueckgesetzt. Dann
     ueberlebt der Stummschalter im localStorage nicht. */
  function tonVorgeben() {
    if (!AIU_START.ton) return;
    const stumm = ['aus', 'off', 'stumm', '0'].includes(AIU_START.ton);
    try { localStorage.setItem('kiu-v2-ton', stumm ? 'aus' : 'an'); } catch (fehler) {}
  }

  function einrichten() {
    tonVorgeben();
    buehneEinrichten();
    leerlaufEinrichten();
  }

  return { einrichten, taktAnpassen, zurueckZumDeck, aktuellerTakt: 0 };
})();

if (typeof window !== 'undefined') { window.AIU_START = AIU_START; window.AIU_KIOSK = AIU_KIOSK; }

/* Der Ton muss vor dem ersten Zeichnen feststehen, alles Uebrige danach. */
AIU_KIOSK.einrichten();
if (typeof AIU_STORE !== 'undefined') {
  AIU_STORE.on('chapter', () => AIU_KIOSK.taktAnpassen(), 'Abgleichtakt');
}
