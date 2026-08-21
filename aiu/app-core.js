'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const LS_RUNTIME='kiu-v2-runtime', LS_AUTH='kiu-v2-teacher-auth';
let CFG=null, runtime=null, currentWeek=null, currentMission=null, currentOutput='text', mediaBlob=null, mediaRecorder=null, mediaChunks=[], drawCtx=null;
const OUTPUT={text:['✍️','Text'],drawing:['🎨','Zeichnung'],photo:['📷','Foto'],audio:['🎙️','Audio']};
const AREA={werft:['🔨','Werft'],kartenraum:['🗺️','Kartenraum'],logbuch:['📖','Logbuch']};
const RES_COLOR={antrieb:'#2f7a55',wissen:'#2876a3',zusammenhalt:'#d46e2a'};
/* Feature-Schalter aus config-base.json (ui.*). Fehlt der Block, bleibt alles aus.
   Per Adresszeile uebersteuerbar, ohne die Konfiguration anzufassen:
     ?ui=all                 alles einschalten (zum Gegenlesen)
     ?ui=icons,srlPhases     einzelne Schalter einschalten
     ?ui=aus                 alles abschalten (Notausstieg im Unterricht)
   Der gespeicherte Spielstand bleibt in allen Faellen unberuehrt. */
const AIU_FLAG_OVERRIDE=(()=>{try{const raw=new URLSearchParams(location.search).get('ui');if(!raw)return null;const wert=raw.trim().toLowerCase();if(wert==='all')return 'all';if(['aus','off','none','0'].includes(wert))return 'aus';return raw.split(',').map(x=>x.trim()).filter(Boolean)}catch(error){return null}})();
function flag(name){if(AIU_FLAG_OVERRIDE==='aus')return false;if(AIU_FLAG_OVERRIDE==='all')return true;if(Array.isArray(AIU_FLAG_OVERRIDE)&&AIU_FLAG_OVERRIDE.includes(name))return true;try{return !!(CFG&&CFG.ui&&CFG.ui[name])}catch(error){return false}}
/* Zuordnung Emoji -> Symbol aus dem Sprite in index.html. */
const ICONS={'⚓':'anchor','📌':'board','🗺':'map','📖':'book','🗣':'speech','💎':'gem','🚪':'door','🧭':'compass','🌿':'leaf','📜':'scroll','🤝':'hands','✍':'pen','🎨':'brush','📷':'camera','🎙':'mic','🔨':'hammer','✨':'sparkle','🔒':'lock','⏱':'clock','🛶':'boat','🔭':'spyglass','📦':'crate','🔑':'key','📍':'marker','✓':'check','🟢':'check','☁':'cloud','💻':'device','⚠':'warning'};
function icon(name,cls=''){return `<svg class="ico ${cls}" aria-hidden="true"><use href="#ico-${name}"></use></svg>`}
/* Liefert das Symbol, solange ui.icons an ist – sonst unveraendert das Emoji. */
function sym(value,cls=''){const raw=String(value==null?'':value).replace(/\uFE0F/g,'').trim();if(!flag('icons'))return String(value==null?'':value);const name=ICONS[raw];return name?icon(name,cls):String(value==null?'':value)}
/* Fest im HTML stehende Emoji ersetzen und die Webschriften aktivieren. */
function ersetzeFuehrendesEmoji(element){
  if(!element||element.dataset.iconDone)return;
  for(const knoten of [...element.childNodes]){
    if(knoten.nodeType!==3)continue;
    const roh=knoten.textContent.replace(/^\s+/,'');
    const treffer=Object.keys(ICONS).find(zeichen=>roh.startsWith(zeichen));
    if(!treffer)continue;
    const huelle=document.createElement('span');
    huelle.innerHTML=sym(treffer);
    knoten.textContent=roh.slice(treffer.length).replace(/^\uFE0F/,'');
    element.insertBefore(huelle,knoten);
    element.dataset.iconDone='1';
    return;
  }
}
function applyStaticIcons(){
  if(!flag('icons'))return;
  document.body.classList.add('schriften');
  document.querySelectorAll('.nav-btn span,.hs-icon').forEach(element=>{
    if(element.dataset.iconDone)return;
    const replaced=sym(element.textContent);
    if(replaced!==element.textContent){element.innerHTML=replaced;element.dataset.iconDone='1'}
  });
  ['#newPlaceBtn','#quickLogBtn','.teacher-key','#pinModal h2','#stamp','[data-logprompt]']
    .forEach(auswahl=>document.querySelectorAll(auswahl).forEach(ersetzeFuehrendesEmoji));
}
const SRL_LABEL={planung:'Planung',durchfuehrung:'Durchführung',reflexion:'Reflexion',zyklus:'Ganzer Kreislauf'};
let srlFilter='all';
function esc(v=''){const d=document.createElement('div');d.textContent=String(v);return d.innerHTML}
function clone(v){return JSON.parse(JSON.stringify(v))}
function toast(t){if(typeof AIU_JUICE!=='undefined'&&AIU_JUICE.an()){AIU_JUICE.meldung(t);return}const e=$('#toast');e.classList.remove('erzaehlung');e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2200)}
function formatDate(v){try{return new Date(v).toLocaleDateString('de-DE',{day:'numeric',month:'long',year:'numeric'})}catch{return v}}
function download(name,content,type='application/json'){const b=content instanceof Blob?content:new Blob([content],{type});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
async function loadConfig(){try{const r=await fetch('./config.json',{cache:'no-store'});if(!r.ok)throw 0;CFG=await r.json()}catch(e){alert('config.json konnte nicht geladen werden. Bitte prüfe das Deployment.');throw e}}
function defaultRuntime(){return{week:CFG.game.currentWeek,resources:Object.fromEntries(Object.entries(CFG.resources).map(([k,v])=>[k,v.value])),studentUntil:0,councilOpen:false,votes:{},upgrades:Object.fromEntries(CFG.shipUpgrades.map(x=>[x.id,!!x.unlocked])),localLogbook:[]}}
function loadRuntime(){try{runtime={...defaultRuntime(),...JSON.parse(localStorage.getItem(LS_RUNTIME)||'{}')}}catch{runtime=defaultRuntime()}saveRuntimeLocal()}
function saveRuntimeLocal(){localStorage.setItem(LS_RUNTIME,JSON.stringify(runtime))}
function week(){return CFG.weeks.find(w=>w.number===Number(runtime.week))||CFG.weeks[0]}
function unlocked(key){return week().unlocks.includes(key)}
function studentOpen(){return runtime.studentUntil>Date.now()}
let lastSessionOpen=null;
function updateSession(){const remaining=Math.max(0,runtime.studentUntil-Date.now());const mins=Math.ceil(remaining/60000);const open=remaining>0;['#sessionPill','#missionSessionPill'].forEach(s=>{const e=$(s);if(!e)return;e.innerHTML=open?`${sym('🟢')} Beiträge offen · ${mins} Min.`:`${sym('🔒')} Beiträge geschlossen`;e.classList.toggle('open',open)});const teacherText=$('#sessionTeacherText');if(teacherText)teacherText.textContent=open?`Schülerzugang noch etwa ${mins} Minuten geöffnet.`:'Beiträge sind geschlossen.';if(!open&&runtime.studentUntil){runtime.studentUntil=0;saveRuntimeLocal();if(typeof syncSaveRuntime==='function')syncSaveRuntime(runtime).catch(()=>{})}if(lastSessionOpen!==null&&lastSessionOpen!==open)AIU_STORE.emit('missions');lastSessionOpen=open}
/* Router ueber die History-API: Zurueck-Geste und Deep Links funktionieren. */
const AIU_VIEWS=['deck','missionen','karte','logbuch','rat','ausbau','lehrer'];
function viewFromHash(){const raw=String(location.hash||'').replace(/^#\/?/,'').trim();return AIU_VIEWS.includes(raw)?raw:'deck'}
function viewAllowed(name){if(name==='lehrer')return !!sessionStorage.getItem(LS_AUTH);if(['deck','ausbau'].includes(name))return true;return unlocked(name)}
function applyView(name){if(typeof AIU_SOUND!=='undefined')AIU_SOUND.spiele('knarren');$$('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${name}`));$$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===name));window.scrollTo({top:0,behavior:'smooth'});if(name==='lehrer')AIU_STORE.emit('teacher');if(name==='rat')AIU_STORE.emit('council');if(name==='logbuch')AIU_STORE.emit('logbook')}
function gotoView(name,options={}){if(!AIU_VIEWS.includes(name))name='deck';if(name==='lehrer'&&!sessionStorage.getItem(LS_AUTH)){openPin();return}if(!viewAllowed(name)){toast('Dieser Bereich ist noch verschlossen.');return}applyView(name);if(options.silent)return;const url=`#/${name}`;try{if(options.replace)history.replaceState({view:name},'',url);else if(location.hash!==url)history.pushState({view:name},'',url)}catch(error){location.hash=url}}
function initRouter(){window.addEventListener('popstate',()=>{const target=viewFromHash();if(!viewAllowed(target)){applyView('deck');try{history.replaceState({view:'deck'},'','#/deck')}catch(error){}return}applyView(target)});const start=viewFromHash();if(start!=='deck'&&viewAllowed(start))gotoView(start,{replace:true});else{applyView('deck');try{history.replaceState({view:'deck'},'','#/deck')}catch(error){}}}
function renderChapter(){const emblem=$('#headerEmblem');if(flag('icons'))emblem.innerHTML=sym(CFG.ship.emblem);else emblem.textContent=CFG.ship.emblem;applyStaticIcons();$('#headerShip').textContent=CFG.ship.name;$('#headerSub').textContent=`${CFG.app.subtitle} für die ${CFG.school.className}`;$('#headerWeek').textContent=`Woche ${currentWeek.number} · ${currentWeek.short}`;$('#headerPosition').textContent=CFG.ship.position;$('#phaseLabel').textContent=currentWeek.phase==='einfuehrung'?`Einführung ${currentWeek.number} von 6`:`Etappe ${currentWeek.number}`;$('#chapterTitle').textContent=currentWeek.chapter;$('#chapterStory').textContent=currentWeek.story;$('#routineTitle').textContent=currentWeek.routine.title;$('#routineText').textContent=currentWeek.routine.text;$('#unlockTitle').textContent=currentWeek.new_unlock;renderSrlFocus();$('#unlockText').textContent=currentWeek.number<6?'Weitere Bereiche werden in den nächsten Wochen sichtbar.':'Das vollständige Spielsystem ist aktiv.';renderWeekDots()}
/* render() bleibt als vollstaendige Aktualisierung erhalten und laeuft nun ueber den Store. */
function render(){AIU_STORE.emit(...AIU_TOPICS)}
function renderNow(){AIU_STORE.emitSync(...AIU_TOPICS)}
/* Welche Bereiche muessen nach einer Aenderung am Spielstand neu gezeichnet werden? */
function runtimeTopics(previous,next){const changed=new Set();const before=previous||{},after=next||{};const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);if(Number(before.week)!==Number(after.week))return [...AIU_TOPICS];if(!same(before.resources,after.resources))['resources','upgrades'].forEach(t=>changed.add(t));if(!same(before.upgrades,after.upgrades))['upgrades','ship'].forEach(t=>changed.add(t));if(before.studentUntil!==after.studentUntil)['session','missions'].forEach(t=>changed.add(t));if(before.councilOpen!==after.councilOpen)['council','teacher'].forEach(t=>changed.add(t));if(!same(before.votes,after.votes))changed.add('council');if(!same(before.localLogbook,after.localLogbook))changed.add('logbook');return [...changed]}
function renderWeekDots(){const max=currentWeek.phase==='einfuehrung'?6:15;$('#weekDots').innerHTML=Array.from({length:max},(_,i)=>`<span class="week-dot ${i+1<currentWeek.number?'done':i+1===currentWeek.number?'now':''}"></span>`).join('')}
function renderLocks(){$$('.hotspot[data-go],.nav-btn').forEach(b=>{const k=b.dataset.go||b.dataset.view;b.classList.toggle('locked',!unlocked(k)&&k!=='deck')});$('#resourceHotspot').classList.toggle('locked',!['antrieb','wissen','zusammenhalt'].some(unlocked));$('#resourceHotspot').onclick=()=>{document.querySelector('#gemsSection').scrollIntoView({behavior:'smooth',block:'center'})};$('#teacherHotspot').onclick=()=>gotoView('lehrer')}
function renderResources(){const keys=['antrieb','wissen','zusammenhalt'];$('#resourceCards').innerHTML=keys.map(k=>{const r=CFG.resources[k],val=Number(runtime.resources[k]||0),is=unlocked(k),mil=currentWeek.milestones?.[k],pct=Math.min(100,val/r.maximum*100);let stones='';for(let i=0;i<Math.min(val,20);i++)stones+=`<span class="stone" style="background:${RES_COLOR[k]}"></span>`;return `<article class="card resource ${is?'':'locked'}" style="opacity:${is?1:.48}"><div class="row spread"><h3>${sym(r.icon)} ${r.label}</h3><span>${is?'':sym('🔒')}</span></div><div class="resource-value" style="color:${RES_COLOR[k]}">${is?val:'–'}</div><div class="bar"><div style="width:${is?pct:0}%;background:${RES_COLOR[k]}"></div></div><div class="res-stones">${is?stones:''}</div><p class="small muted">${mil?`${mil.target} benötigt: ${esc(mil.reward)}`:is?'Gemeinsamer Fortschritt der Besatzung.':'Wird in einer Einführungswoche geöffnet.'}</p></article>`}).join('')}
/* Schwerpunkt der Woche als Chip im Kapitelkopf. */
function renderSrlFocus(){const chip=$('#srlFocusChip');if(!chip)return;const focus=currentWeek.srlFokus;const show=flag('srlPhases')&&!!focus;chip.classList.toggle('hidden',!show);if(!show)return;chip.className=`srl-chip ${focus}`;chip.textContent=`Schwerpunkt: ${SRL_LABEL[focus]||focus}`}
function srlBadge(phase){if(!flag('srlPhases')||!phase||!SRL_LABEL[phase])return '';return `<span class="srl-badge ${phase}">${SRL_LABEL[phase]}</span>`}
function renderMissions(filter='all'){const areas=[['all','✨','Alle'],...Object.entries(AREA).map(([k,v])=>[k,...v])];$('#areaTabs').innerHTML=areas.map(([k,ic,n])=>`<button class="area-tab ${filter===k?'active':''}" data-area="${k}">${sym(ic)} ${n}</button>`).join('');$$('#areaTabs .area-tab').forEach(b=>b.onclick=()=>renderMissions(b.dataset.area));
  const srlHost=$('#srlTabs');const srlOn=flag('srlPhases');
  if(srlHost){srlHost.classList.toggle('hidden',!srlOn);
    if(srlOn){const phases=[['all','Alle Phasen'],['planung','Planung'],['durchfuehrung','Durchführung'],['reflexion','Reflexion']];
      srlHost.innerHTML=phases.map(([key,label])=>`<button class="area-tab ${key} ${srlFilter===key?'active':''}" data-srl="${key}">${label}</button>`).join('');
      $$('#srlTabs .area-tab').forEach(b=>b.onclick=()=>{srlFilter=b.dataset.srl;renderMissions(filter)})}}
  const ms=currentWeek.missions.filter(m=>(filter==='all'||m.area===filter)&&(!srlOn||srlFilter==='all'||m.srl===srlFilter)&&unlocked(m.area==='werft'?'missionen':m.area));
  $('#missionGrid').innerHTML=ms.length?ms.map(m=>`<article class="card mission-card"><div class="row spread"><span class="tag ${m.resource}">${sym(CFG.resources[m.resource]?.icon||'✨')} ${esc(m.resource)}</span><span class="small muted">${sym('⏱')} ${esc(m.time)}</span></div>${srlBadge(m.srl)}<h3>${sym(AREA[m.area]?.[0]||'📌')} ${esc(m.title)}</h3><p>${esc(m.task)}</p><div class="output-icons">${m.outputs.map(o=>sym(OUTPUT[o]?.[0]||'')).join(' ')}</div><button class="primary" data-mission="${m.id}">${studentOpen()?'Mission öffnen':'Mission ansehen'}</button></article>`).join(''):`<article class="card card-pad"><p>${srlOn&&srlFilter!=='all'?'In dieser Phase gibt es diese Woche keine Mission.':'In diesem Bereich gibt es diese Woche noch keine Mission.'}</p></article>`;
  $$('[data-mission]').forEach(b=>b.onclick=()=>openMission(b.dataset.mission))}
/* Die Route nutzt dieselben Hexfeld-IDs wie Startkarte und Kartendesigner. */
function renderRouteMap(){const card=$('#routeCard');if(!card)return;
  const orte=(CFG.weeks||[]).filter(w=>w.ort&&w.ort.id);
  const felder=CFG.map?.data?.tiles||[];
  const feldIndex=Object.fromEntries(felder.map(feld=>[feld.id,feld]));
  const punkt=id=>{const feld=feldIndex[id];if(!feld)return null;return{x:173.20508075688772*(Number(feld.q)+Number(feld.r)/2),y:150*Number(feld.r)}};
  const show=flag('mapRoute')&&orte.length>0&&felder.length>0;
  card.classList.toggle('hidden',!show);
  if(!show){card.innerHTML='';return}
  const jetzt=Number(runtime.week)||1;
  const aktiveWochen=orte.filter(w=>w.number<=jetzt);
  const aktuell=aktiveWochen[aktiveWochen.length-1]||orte[0];
  const routenIds=aktiveWochen.flatMap(w=>w.ort.route||[]).filter((id,index,alle)=>punkt(id)&&(!index||id!==alle[index-1]));
  const besuchtIds=new Set(felder.filter(feld=>feld.besucht).map(feld=>feld.id));
  routenIds.forEach(id=>besuchtIds.add(id));
  aktiveWochen.forEach(w=>besuchtIds.add(w.ort.id));
  const punkte=routenIds.map(id=>{const p=punkt(id);return`${p.x},${p.y}`}).join(' ');
  const loecher=[...besuchtIds].map(id=>{const p=punkt(id);return p?`<circle cx="${p.x}" cy="${p.y}" r="125" fill="black"/>`:''}).join('');
  const linie=routenIds.length>1?`<polyline points="${punkte}" fill="none" stroke="#173f5f" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="20 16"/>`:'';
  const marken=aktiveWochen.map(w=>{const p=punkt(w.ort.id);if(!p)return'';const hier=w.number===aktuell.number;
    return `<g><circle cx="${p.x}" cy="${p.y}" r="${hier?20:13}" fill="${hier?'#d0a642':'#173f5f'}" stroke="#f7f2e7" stroke-width="5"/>`+
      `<text x="${p.x}" y="${p.y-30}" text-anchor="middle" font-size="27" font-weight="700" fill="#173f5f" stroke="#f7f2e7" stroke-width="7" paint-order="stroke">${esc(w.ort.name)}</text></g>`}).join('');
  card.innerHTML=`<h3>Unsere Reise</h3><p class="small muted">Woche ${jetzt} von ${orte.length} · ${esc(aktuell.ort.name)}</p>
    <svg class="route-map" viewBox="-683.0127018922193 -700 2059 1550" role="img" aria-label="Startkarte mit der bisher zurückgelegten Route">
      <defs><mask id="nebelMaske" maskUnits="userSpaceOnUse" x="-683.0127018922193" y="-700" width="2059" height="1550"><rect x="-683.0127018922193" y="-700" width="2059" height="1550" fill="white"/>${loecher}</mask></defs>
      <image href="${esc(CFG.map.routeImage||CFG.map.image||'startkarte.svg')}" x="-683.0127018922193" y="-700" width="2059" height="1550"/>
      <rect x="-683.0127018922193" y="-700" width="2059" height="1550" fill="#dfe7ea" opacity=".9" mask="url(#nebelMaske)"/>
      ${linie}${marken}
    </svg>
    <div class="route-legend"><span><i style="background:#d0a642"></i>hier sind wir</span><span><i style="background:#173f5f"></i>besuchte Orte</span><span><i style="background:#dfe7ea;border:1px solid #c6ced1"></i>noch im Nebel</span></div>`}
function renderMap(){renderRouteMap();const map=CFG.map;$('#mapExternal').href=map.editorUrl;$('#mapImage').src=map.image;$('#mapCaption').textContent=map.caption;$('#mapPosition').textContent=currentWeek.ort?.name||CFG.ship.position;$('#mapWeekStory').textContent=currentWeek.story;$('#mapIdeas').innerHTML=(currentWeek.council?.choices||[]).map(x=>`<div class="location-item">${sym('📍')} ${esc(x)}</div>`).join('');const iframe=$('#mapIframe'),fallback=$('#mapFallback');if(map.viewerUrl){iframe.src=map.viewerUrl;iframe.classList.remove('hidden');fallback.classList.add('hidden')}else{iframe.classList.add('hidden');fallback.classList.remove('hidden')}}
function renderLogbook(){const all=[...CFG.logbook,...runtime.localLogbook].sort((a,b)=>String(b.date).localeCompare(String(a.date)));$('#logbookList').innerHTML=all.map(e=>`<article class="log-entry ${e.local?'local':''}"><div class="eyebrow">${formatDate(e.date)} · Woche ${e.week||'–'}</div><h3>${esc(e.title||'Logbucheintrag')}</h3><p>${esc(e.text)}</p>${e.author?`<div class="small muted">Beitrag von ${esc(e.author)}</div>`:''}</article>`).join('')}
async function renderCouncil(){const c=currentWeek.council||{title:'Besatzungsrat',description:'',choices:[]};$('#councilTitle').textContent=c.title;$('#councilDescription').textContent=c.description;let results=Array(c.choices.length).fill(0);try{results=await syncVoteCounts(currentWeek.number,c.choices.length)}catch(error){console.warn(error)}const total=results.reduce((a,b)=>a+b,0);$('#councilState').innerHTML=runtime.councilOpen?'<span class="session-pill open">🟢 Abstimmung geöffnet</span>':`<span class="session-pill">🔒 Abstimmung geschlossen${total?` · ${total} Stimmen`:''}</span>`;$('#councilOptions').innerHTML=c.choices.map((x,i)=>`<button class="vote-card" data-vote="${i}" ${runtime.councilOpen&&studentOpen()?'':'disabled'}>${esc(x)}${!runtime.councilOpen&&total?`<div class="vote-count">${results[i]}</div>`:''}</button>`).join('');$$('[data-vote]').forEach(b=>b.onclick=()=>castVote(Number(b.dataset.vote)));renderShortlist()}
async function renderShortlist(){const list=(await dbAll()).filter(x=>x.status==='shortlist'&&x.week===currentWeek.number);$('#shortlist').innerHTML=list.length?list.map(x=>`<article class="card submission"><strong>${esc(x.missionTitle)}</strong><p>${esc(x.text||'Bild-, Zeichen- oder Audiobeitrag')}</p><span class="small muted">${esc(x.author||'ohne Namen')}</span></article>`).join(''):'<p class="muted">Noch keine Fundstücke markiert.</p>'}

/* Anmeldung der Bereiche am Store. Reihenfolge entspricht dem bisherigen render(). */
AIU_STORE.before(() => { if (CFG) currentWeek = week(); });
/* Bewusst als Pfeilfunktionen: renderUpgrades stammt aus app-input.js und ist
   zum Zeitpunkt der Anmeldung noch nicht geladen. */
AIU_STORE.on('chapter', () => renderChapter(), 'Kapitel und Kopfzeile');
AIU_STORE.on('locks', () => renderLocks(), 'Schloesser');
AIU_STORE.on('resources', () => renderResources(), 'Ressourcenkarten');
AIU_STORE.on('missions', () => renderMissions(), 'Missionen');
AIU_STORE.on('map', () => renderMap(), 'Karte');
AIU_STORE.on('logbook', () => renderLogbook(), 'Logbuch');
AIU_STORE.on('council', () => renderCouncil(), 'Besatzungsrat');
AIU_STORE.on('upgrades', () => renderUpgrades(), 'Ausbauten');
AIU_STORE.on('session', () => updateSession(), 'Schuelerzugang');
