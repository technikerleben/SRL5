/* Individuelle Lernrückmeldung · Technik 5 · Handschmeichler
   Seite 1 = persönliche Kompetenzen, Stärken, Lernschritt und Note.
   Seite 2 = vollständiges Kompetenzraster und Punkteschlüssel.
   Aufbau übernommen aus d5ur1-wunschbriefe/apps/auswertung-lek1. */
(function () {
  const p=id=>document.getElementById(id);
  const skills={
    saegen:"genau sägen",
    raspeln:"eine runde Form raspeln",
    feilen:"Raspelspuren wegfeilen",
    schleifen:"glatt schleifen",
    form:"einen Handschmeichler gestalten, der gut in der Hand liegt"
  };
  const strengths={
    saegen:"Dein Sägeschnitt ist genau",
    raspeln:"Deine Rundungen sind gleichmäßig",
    feilen:"Die Raspelspuren sind sauber entfernt",
    schleifen:"Deine Oberfläche ist glatt",
    form:"Dein Handschmeichler liegt gut in der Hand"
  };
  const names=["Nicht vorhanden","In Ansätzen","Mindeststandard","Regelstandard","Leistungsstandard"];

  function printKey(){
    return gradeRanges().map(row=>
      '<div class="print-key-cell print-key-grade-'+row.n+'">'+
        '<strong>'+GRADE_NAMES[row.n]+'</strong>'+
        '<span>'+row.pct+' von 20 Punkten · '+row.lo+'–'+row.hi+' Punkte</span>'+
      '</div>'
    ).join("");
  }

  function renderRubricBack(root){
    root.querySelector("#printRubricGrid").innerHTML=CRITERIA.map(c=>
      '<article class="print-rubric-card">'+
        '<h3>'+escapeHtml(c.title)+'</h3>'+
        '<div class="print-rubric-desc">'+escapeHtml(c.desc)+'</div>'+
        c.levels.map((description,level)=>
          '<div class="print-rubric-row">'+
            '<span class="print-rubric-num print-level-'+level+'">'+level+'</span>'+
            '<span>'+escapeHtml(description)+'</span>'+
          '</div>'
        ).join("")+
        '<div class="print-rubric-plan">'+escapeHtml(c.plan)+'</div>'+
      '</article>'
    ).join("");
  }

  function renderPrint(child=current(),root=p("printSheet")){
    if(!child)return;
    const q=id=>root.querySelector('[id="'+id+'"]');
    const m=metrics(child);
    const rows=CRITERIA.map((criterion,index)=>({criterion,index,level:normLevel(child.levels[criterion.id])}));

    q("printName").textContent=child.name||"______________________";
    q("printClass").textContent=child.className||"";
    q("printDate").textContent=child.date?child.date.split("-").reverse().join("."):"__________";
    q("printToday").textContent=new Date().toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"});

    q("printRows").innerHTML=rows.map(row=>{
      let badge,pts;
      if(row.level===NB){badge='<span class="print-level-badge print-level-nb">Nicht beurteilbar</span>';pts="–"}
      else if(row.level===null){badge='<span class="print-level-badge print-level-extra">Noch offen</span>';pts="–"}
      else{badge='<span class="print-level-badge print-level-'+row.level+'">'+names[row.level]+'</span>';pts=row.level+" / 4"}
      return '<tr><td>'+escapeHtml(row.criterion.short)+'</td><td>'+badge+'</td><td>'+pts+'</td></tr>';
    }).join("");

    const numeric=rows.filter(r=>typeof r.level==="number");
    const positives=numeric.filter(r=>r.level>=2).sort((a,b)=>b.level-a.level||a.index-b.index);
    const messages=[];
    if(positives.length){
      messages.push("Du kannst schon "+skills[positives[0].criterion.id]+".");
      if(positives.length>=2)messages.push("Das gelingt dir gut: "+strengths[positives[1].criterion.id]+".");
      if(positives.length>=3)messages.push("Man sieht, dass du "+skills[positives[2].criterion.id]+" kannst.");
      if(positives.length<3)messages.push("Wir üben gemeinsam weiter. Jeder neue Schritt zählt.");
    }else{
      messages.push(numeric.some(r=>r.level===1)
        ? "Du hast erste Ansätze bei deinem Handschmeichler gezeigt."
        : "Wir schauen gemeinsam, wie dein nächstes Werkstück gelingt.");
      messages.push("Wir üben die wichtigen Schritte gemeinsam weiter.");
    }
    q("printStrengthsHeading").textContent=numeric.some(r=>r.level>=1)?"Das kannst du schon":"Deine nächsten Lernschritte";
    q("printStrengths").replaceChildren();
    messages.forEach(text=>{const node=document.createElement("p");node.textContent=text;q("printStrengths").appendChild(node)});

    const showTip=numeric.length>0&&(!m.complete||m.grade>2);
    q("printTip").classList.toggle("hidden",!showTip);
    const weakest=[...numeric].sort((a,b)=>a.level-b.level||a.index-b.index)[0];
    q("printTipText").textContent=showTip&&weakest?NEXT_STEPS[weakest.criterion.id]:"";

    q("printWarning").classList.toggle("hidden",!(m.complete&&m.grade>4));
    const comment=(child.teacherComment||"").trim();
    q("printCustom").classList.toggle("hidden",!comment);
    q("printCustom").textContent=comment?"Persönliche Rückmeldung: "+comment:"";

    if(m.complete){
      q("printFrontPoints").textContent=m.core+" von 20 Punkten";
      q("printFrontBonus").textContent="("+m.percent+" %)";
      q("printFrontGradeWrap").innerHTML='Diese Leistung entspricht der Note <strong>'+
        escapeHtml(GRADE_NAMES[m.grade].replace("("+m.grade+")","("+m.gradeDisplay+")"))+'</strong>.';
    }else{
      q("printFrontPoints").textContent=m.hasNb?"nicht beurteilbar":"Bewertung noch offen";
      q("printFrontBonus").textContent="";
      q("printFrontGradeWrap").textContent=m.hasNb
        ? "Es wird keine Gesamtpunktzahl und keine Note gebildet."
        : "Die Note folgt, sobald alle Kategorien eingestuft sind.";
    }

    renderRubricBack(root);
    q("printGradeKey").innerHTML=printKey();
  }

  let batchReady=false;
  const batchHost=p("printBatch");
  const template=p("printSheet");

  function clearBatch(){
    document.body.classList.remove("printing-batch");
    batchReady=false;
    batchHost.replaceChildren();
  }

  function buildBatch(){
    batchHost.replaceChildren();
    const sorted=[...students].sort((a,b)=>(a.name||"").localeCompare(b.name||"","de",{sensitivity:"base"}));
    for(const child of sorted){
      const copy=template.cloneNode(true);
      copy.removeAttribute("id");
      renderPrint(child,copy);
      for(const page of [...copy.children]){
        page.querySelectorAll("[id]").forEach(node=>node.removeAttribute("id"));
        batchHost.appendChild(page);
      }
    }
    batchReady=true;
    document.body.classList.add("printing-batch");
    return sorted.length;
  }

  p("printFeedback").onclick=()=>{
    if(!current())return;
    syncTop();
    clearBatch();
    renderPrint();
    window.print();
  };

  p("printAllFeedback").onclick=()=>{
    if(!students.length){alert("Es sind noch keine Rückmeldungen angelegt.");return}
    if(current())syncTop();
    buildBatch();
    window.print();
  };

  window.addEventListener("beforeprint",()=>{if(!batchReady)renderPrint()});
  window.addEventListener("afterprint",()=>{if(batchReady)clearBatch()});
})();
