/* ------------------------------------------------------------------
   Phase 3 – Spielgefühl.
   Alles hier haengt an ui.juice (Bewegung, Partikel, Haptik) oder
   ui.sound (Klang). Ohne beide Schalter veraendert diese Datei nichts.
   Ruhige Variante: prefers-reduced-motion bekommt keine abgeschaltete,
   sondern eine eigene, ruhige Rueckmeldung – die Information bleibt.
   ------------------------------------------------------------------ */
'use strict';

const AIU_JUICE = (() => {
  function ruhig() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (fehler) { return false; }
  }
  function an() { return typeof flag === 'function' && flag('juice'); }

  /* Zahlen laufen hoch statt zu springen. */
  function zaehleHoch(element, von, bis, dauer = 700) {
    if (!element) return;
    if (!an() || ruhig() || von === bis) { element.textContent = String(bis); return; }
    const start = performance.now();
    element.textContent = String(von);
    function schritt(jetzt) {
      const t = Math.min(1, (jetzt - start) / dauer);
      const weich = 1 - Math.pow(1 - t, 3);
      element.textContent = String(Math.round(von + (bis - von) * weich));
      if (t < 1) requestAnimationFrame(schritt);
      else element.textContent = String(bis);
    }
    requestAnimationFrame(schritt);
  }

  /* Partikel am Ort eines Elements. Ruhige Variante: ein einzelner
     weicher Lichtschein statt fliegender Teilchen. */
  function funken(element, farbe = '#d0a642', anzahl = 14) {
    if (!element || !an()) return;
    const feld = element.getBoundingClientRect();
    if (!feld.width) return;
    const x = feld.left + feld.width / 2;
    const y = feld.top + feld.height / 2;

    if (ruhig()) { schein(element, farbe); return; }
    const kannAnimieren = typeof document.createElement('span').animate === 'function';

    for (let i = 0; i < anzahl; i++) {
      const teil = document.createElement('span');
      teil.className = 'juice-funke';
      teil.style.cssText = `left:${x}px;top:${y}px;background:${farbe}`;
      document.body.appendChild(teil);
      if (!kannAnimieren) { setTimeout(() => teil.remove(), 500); continue; }
      const winkel = (i / anzahl) * Math.PI * 2 + Math.random() * 0.5;
      const weite = 42 + Math.random() * 58;
      teil.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(winkel) * weite}px), calc(-50% + ${Math.sin(winkel) * weite}px)) scale(0.2)`, opacity: 0 }
      ], { duration: 620 + Math.random() * 260, easing: 'cubic-bezier(.2,.7,.3,1)' })
        .addEventListener('finish', () => teil.remove());
    }
  }

  /* Kurzer Lichtakzent auf einer Karte. */
  function schein(element, farbe = '#d0a642') {
    if (!element || !an() || typeof element.animate !== 'function') return;
    element.animate([
      { boxShadow: `0 0 0 0 ${farbe}00` },
      { boxShadow: `0 0 26px 6px ${farbe}` },
      { boxShadow: `0 0 0 0 ${farbe}00` }
    ], { duration: ruhig() ? 1200 : 900, easing: 'ease-out' });
  }

  function haptik(muster) {
    if (!an()) return;
    try { if (navigator.vibrate) navigator.vibrate(muster); } catch (fehler) {}
  }

  /* Erzaehlerische Einblendung statt nuechterner Meldung. */
  function meldung(text, symbol = '📜') {
    const feld = document.getElementById('toast');
    if (!feld) return;
    if (!an()) { feld.textContent = text; feld.classList.add('show'); setTimeout(() => feld.classList.remove('show'), 2200); return; }
    feld.classList.add('erzaehlung');
    feld.innerHTML = `${typeof sym === 'function' ? sym(symbol) : ''}<span>${text}</span>`;
    feld.classList.add('show');
    clearTimeout(meldung.uhr);
    meldung.uhr = setTimeout(() => feld.classList.remove('show'), 2800);
  }

  return { an, ruhig, zaehleHoch, funken, schein, haptik, meldung };
})();

/* ------------------------------------------------------------------
   Klang. Bewusst vollstaendig synthetisiert: keine Audiodateien, damit
   offline nichts fehlen kann und der Cache klein bleibt.
   Der Ton startet erst nach der ersten Nutzergeste (Vorgabe von iOS)
   und laesst sich jederzeit stummschalten.
   ------------------------------------------------------------------ */
const AIU_SOUND = (() => {
  const SPEICHER = 'kiu-v2-ton';
  let kontext = null, summe = null, meer = null, gestartet = false;
  let stumm = false;
  try { stumm = localStorage.getItem(SPEICHER) === 'aus'; } catch (fehler) {}

  function an() { return typeof flag === 'function' && flag('sound'); }

  function bereit() {
    if (kontext) return kontext;
    const Konstruktor = window.AudioContext || window.webkitAudioContext;
    if (!Konstruktor) return null;
    kontext = new Konstruktor();
    summe = kontext.createGain();
    summe.gain.value = stumm ? 0 : 0.55;
    summe.connect(kontext.destination);
    return kontext;
  }

  function rauschen(dauer = 2) {
    const laenge = Math.floor(kontext.sampleRate * dauer);
    const puffer = kontext.createBuffer(1, laenge, kontext.sampleRate);
    const daten = puffer.getChannelData(0);
    let letzter = 0;
    for (let i = 0; i < laenge; i++) {
      const weiss = Math.random() * 2 - 1;
      letzter = (letzter + 0.02 * weiss) / 1.02;
      daten[i] = letzter * 3.5;
    }
    return puffer;
  }

  /* Wellen: braunes Rauschen durch ein langsam wanderndes Tiefpassfilter. */
  function meerStarten() {
    if (meer || !kontext) return;
    const quelle = kontext.createBufferSource();
    quelle.buffer = rauschen(4);
    quelle.loop = true;
    const filter = kontext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const bewegung = kontext.createOscillator();
    bewegung.frequency.value = 0.07;
    const tiefe = kontext.createGain();
    tiefe.gain.value = 180;
    bewegung.connect(tiefe).connect(filter.frequency);
    const lautstaerke = kontext.createGain();
    lautstaerke.gain.value = 0.05;
    quelle.connect(filter).connect(lautstaerke).connect(summe);
    quelle.start();
    bewegung.start();
    meer = { quelle, bewegung };
  }

  function ton(frequenz, dauer, art = 'triangle', spitze = 0.25, verstimmung = 0) {
    if (!kontext) return;
    const jetzt = kontext.currentTime;
    const oszillator = kontext.createOscillator();
    const huelle = kontext.createGain();
    oszillator.type = art;
    oszillator.frequency.setValueAtTime(frequenz, jetzt);
    if (verstimmung) oszillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequenz + verstimmung), jetzt + dauer);
    huelle.gain.setValueAtTime(0.0001, jetzt);
    huelle.gain.exponentialRampToValueAtTime(spitze, jetzt + 0.012);
    huelle.gain.exponentialRampToValueAtTime(0.0001, jetzt + dauer);
    oszillator.connect(huelle).connect(summe);
    oszillator.start(jetzt);
    oszillator.stop(jetzt + dauer + 0.05);
  }

  function knacken(dauer = 0.16, mitte = 220, guete = 6, spitze = 0.18) {
    if (!kontext) return;
    const jetzt = kontext.currentTime;
    const quelle = kontext.createBufferSource();
    quelle.buffer = rauschen(0.4);
    const filter = kontext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(mitte, jetzt);
    filter.frequency.exponentialRampToValueAtTime(mitte * 0.65, jetzt + dauer);
    filter.Q.value = guete;
    const huelle = kontext.createGain();
    huelle.gain.setValueAtTime(spitze, jetzt);
    huelle.gain.exponentialRampToValueAtTime(0.0001, jetzt + dauer);
    quelle.connect(filter).connect(huelle).connect(summe);
    quelle.start(jetzt);
    quelle.stop(jetzt + dauer + 0.05);
  }

  const KLAENGE = {
    stein() { ton(880, 0.28, 'triangle', 0.22, -240); knacken(0.05, 2600, 3, 0.05); },
    knarren() { knacken(0.22, 190, 7, 0.14); },
    stempel() { ton(130, 0.22, 'sine', 0.32, -50); knacken(0.07, 900, 2, 0.12); },
    fanfare() {
      [[523.25, 0], [659.25, 0.11], [783.99, 0.22], [1046.5, 0.34]].forEach(([hz, verzug]) => {
        setTimeout(() => ton(hz, 0.42, 'triangle', 0.2), verzug * 1000);
      });
    },
    meilenstein() {
      [[659.25, 0], [880, 0.13]].forEach(([hz, verzug]) => setTimeout(() => ton(hz, 0.5, 'sine', 0.22), verzug * 1000));
    }
  };

  function spiele(name) {
    if (!an() || stumm || !gestartet || !kontext) return;
    const klang = KLAENGE[name];
    if (!klang) return;
    try { klang(); } catch (fehler) { console.warn('Klang fehlgeschlagen', fehler); }
  }

  function knopfZeichnen() {
    const knopf = document.getElementById('soundToggle');
    if (!knopf) return;
    knopf.hidden = !an();
    knopf.setAttribute('aria-pressed', String(!stumm));
    knopf.title = stumm ? 'Ton einschalten' : 'Ton ausschalten';
    knopf.innerHTML = stumm ? '🔇' : '🔊';
    knopf.classList.toggle('aus', stumm);
  }

  function umschalten() {
    stumm = !stumm;
    try { localStorage.setItem(SPEICHER, stumm ? 'aus' : 'an'); } catch (fehler) {}
    if (summe) summe.gain.value = stumm ? 0 : 0.55;
    if (!stumm) starten();
    knopfZeichnen();
  }

  /* Erst nach einer Nutzergeste – sonst blockiert iOS die Wiedergabe. */
  function starten() {
    if (!an() || stumm) return;
    const ktx = bereit();
    if (!ktx) return;
    if (ktx.state === 'suspended') ktx.resume().catch(() => {});
    gestartet = true;
    meerStarten();
  }

  function einrichten() {
    knopfZeichnen();
    const knopf = document.getElementById('soundToggle');
    if (knopf && !knopf.dataset.gebunden) {
      knopf.dataset.gebunden = '1';
      knopf.addEventListener('click', ereignis => { ereignis.stopPropagation(); umschalten(); });
    }
    if (einrichten.gebunden) return;
    einrichten.gebunden = true;
    const einmal = () => { starten(); document.removeEventListener('pointerdown', einmal); document.removeEventListener('keydown', einmal); };
    document.addEventListener('pointerdown', einmal);
    document.addEventListener('keydown', einmal);
  }

  return { spiele, einrichten, umschalten, knopfZeichnen, an };
})();

if (typeof window !== 'undefined') { window.AIU_JUICE = AIU_JUICE; window.AIU_SOUND = AIU_SOUND; }

/* ------------------------------------------------------------------
   Anbindung an den Store. Diese Abonnements werden nach denen aus
   app-core.js angemeldet und laufen daher nach dem Neuzeichnen.
   ------------------------------------------------------------------ */
(function verbindeSpielgefuehl() {
  if (typeof AIU_STORE === 'undefined') return;

  let letzteWerte = null;
  let letzteAusbauten = null;
  let letzteMeilensteine = {};

  AIU_STORE.on('resources', () => {
    const schluessel = ['antrieb', 'wissen', 'zusammenhalt'];
    const jetzt = {};
    schluessel.forEach(k => { jetzt[k] = Number(runtime?.resources?.[k] || 0); });

    document.querySelectorAll('#resourceCards .resource').forEach((karte, index) => {
      const k = schluessel[index];
      if (!k) return;
      const anzeige = karte.querySelector('.resource-value');
      if (!anzeige || anzeige.textContent === '–') return;
      const vorher = letzteWerte ? letzteWerte[k] : jetzt[k];
      if (vorher !== jetzt[k]) AIU_JUICE.zaehleHoch(anzeige, vorher, jetzt[k]);
      /* Merkstrich im Fortschrittsbalken, damit die Schwelle auch ohne 3D sichtbar ist. */
      const ziel = currentWeek?.milestones?.[k]?.target;
      const balken = karte.querySelector('.bar');
      if (balken && ziel && !balken.querySelector('.bar-mark')) {
        const marke = document.createElement('i');
        marke.className = 'bar-mark';
        marke.style.left = `${Math.min(100, ziel / CFG.resources[k].maximum * 100)}%`;
        marke.title = `Meilenstein bei ${ziel}`;
        balken.appendChild(marke);
      }
    });

    if (letzteWerte) {
      const gestiegen = schluessel.filter(k => jetzt[k] > letzteWerte[k]);
      if (gestiegen.length) {
        AIU_SOUND.spiele('stein');
        AIU_JUICE.haptik(18);
      }
      /* Meilenstein erreicht: eigene Rueckmeldung, einmal je Woche und Ressource. */
      gestiegen.forEach(k => {
        const stein = currentWeek?.milestones?.[k];
        const merker = `${currentWeek?.number}-${k}`;
        if (!stein || letzteMeilensteine[merker]) return;
        if (letzteWerte[k] < stein.target && jetzt[k] >= stein.target) {
          letzteMeilensteine[merker] = true;
          const karte = document.querySelectorAll('#resourceCards .resource')[schluessel.indexOf(k)];
          AIU_JUICE.funken(karte, RES_COLOR[k], 20);
          AIU_JUICE.schein(karte, RES_COLOR[k]);
          AIU_SOUND.spiele('meilenstein');
          AIU_JUICE.haptik([25, 40, 25]);
          AIU_JUICE.meldung(stein.reward, '✨');
        }
      });
    }
    letzteWerte = jetzt;
  }, 'Spielgefühl Ressourcen');

  AIU_STORE.on('upgrades', () => {
    const jetzt = { ...(runtime?.upgrades || {}) };
    if (letzteAusbauten) {
      const neu = Object.keys(jetzt).filter(id => jetzt[id] && !letzteAusbauten[id]);
      if (neu.length) {
        AIU_SOUND.spiele('fanfare');
        AIU_JUICE.haptik([20, 60, 30]);
        const titel = (CFG.shipUpgrades || []).find(u => u.id === neu[0]);
        if (titel) AIU_JUICE.meldung(`${titel.title} ist jetzt an Bord.`, '✨');
        const karten = [...document.querySelectorAll('#upgradeGrid .upgrade')];
        neu.forEach(id => {
          const index = (CFG.shipUpgrades || []).findIndex(u => u.id === id);
          const karte = karten[index];
          if (!karte) return;
          AIU_JUICE.funken(karte, '#d0a642', 18);
          AIU_JUICE.schein(karte);
        });
      }
    }
    letzteAusbauten = jetzt;
  }, 'Spielgefühl Ausbauten');

  AIU_STORE.on('chapter', () => AIU_SOUND.einrichten(), 'Tonschalter');
})();
