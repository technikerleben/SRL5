/* Kleiner Zustandsspeicher der Begleit-App.
   Zweck: gezielte Teilaktualisierungen statt Neuaufbau der gesamten Oberflaeche.
   Wird als erste Datei geladen und hat bewusst keine Abhaengigkeiten. */
'use strict';

const AIU_TOPICS = ['chapter', 'locks', 'resources', 'missions', 'map', 'logbook', 'council', 'upgrades', 'session', 'teacher', 'ship'];

const AIU_STORE = (() => {
  const handlers = new Map();
  const beforeHooks = [];
  const pending = new Set();
  let scheduled = false;
  let flushing = false;

  function on(topic, handler, label = '') {
    if (!AIU_TOPICS.includes(topic)) {
      console.warn(`AIU_STORE: unbekanntes Thema "${topic}"`);
      return () => {};
    }
    if (!handlers.has(topic)) handlers.set(topic, []);
    const entry = { handler, label: label || handler.name || 'anonym' };
    handlers.get(topic).push(entry);
    return () => {
      const list = handlers.get(topic) || [];
      const index = list.indexOf(entry);
      if (index >= 0) list.splice(index, 1);
    };
  }

  function before(hook) {
    beforeHooks.push(hook);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    const run = () => { scheduled = false; flush(); };
    const visible = typeof document === 'undefined' || !document.hidden;
    if (visible && typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
    else setTimeout(run, 0);
  }

  /* Ein Fehler in einem Renderer darf niemals die uebrigen Bereiche mitreissen. */
  function runSafely(entry, topic) {
    try {
      const result = entry.handler();
      if (result && typeof result.catch === 'function') {
        result.catch(error => console.error(`AIU_STORE: "${entry.label}" (${topic}) fehlgeschlagen`, error));
      }
    } catch (error) {
      console.error(`AIU_STORE: "${entry.label}" (${topic}) fehlgeschlagen`, error);
    }
  }

  function flush() {
    if (flushing || !pending.size) return;
    flushing = true;
    const topics = [...pending];
    pending.clear();
    try {
      beforeHooks.forEach(hook => {
        try { hook(topics); } catch (error) { console.error('AIU_STORE: Vorbereitung fehlgeschlagen', error); }
      });
      topics.forEach(topic => (handlers.get(topic) || []).forEach(entry => runSafely(entry, topic)));
    } finally {
      flushing = false;
    }
    if (pending.size) schedule();
  }

  /* Sammelt Themen und aktualisiert gebuendelt im naechsten Frame. */
  function emit(...topics) {
    topics.flat().filter(Boolean).forEach(topic => pending.add(topic));
    if (pending.size) schedule();
    return pending.size;
  }

  /* Sofortige Aktualisierung, z. B. beim ersten Aufbau nach dem Start. */
  function emitSync(...topics) {
    topics.flat().filter(Boolean).forEach(topic => pending.add(topic));
    flush();
  }

  function topicsInUse() {
    return AIU_TOPICS.filter(topic => (handlers.get(topic) || []).length > 0);
  }

  return { on, before, emit, emitSync, topics: AIU_TOPICS, topicsInUse };
})();

if (typeof window !== 'undefined') {
  window.AIU_STORE = AIU_STORE;
  window.AIU_TOPICS = AIU_TOPICS;
}
