async function loadConfig(){
  try{
    const files=['config-base.json','weeks-01-05.json','weeks-06-10.json','weeks-11-15.json'];
    const responses=await Promise.all(files.map(file=>fetch(`./${file}`,{cache:'no-store'})));
    if(responses.some(response=>!response.ok))throw new Error('Konfigurationsdatei fehlt');
    const [base,w1,w2,w3]=await Promise.all(responses.map(response=>response.json()));
    CFG={...base,weeks:[...w1,...w2,...w3].sort((a,b)=>a.number-b.number)};
  }catch(error){
    alert('Die Konfiguration der Begleit-App konnte nicht geladen werden. Bitte prüfe das Deployment.');
    throw error;
  }
}
