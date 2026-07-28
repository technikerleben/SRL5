async function loadConfig(){
  try{
    const baseResponse=await fetch('./config-base.json',{cache:'no-store'});
    if(!baseResponse.ok)throw new Error('Grundkonfiguration fehlt');
    const base=await baseResponse.json();
    const files=['weeks-01-05.json','weeks-06-10.json','weeks-11-15.json',base.map?.source||'startkarte.json'];
    const responses=await Promise.all(files.map(file=>fetch(`./${file}`,{cache:'no-store'})));
    if(responses.some(response=>!response.ok))throw new Error('Konfigurationsdatei fehlt');
    const [w1,w2,w3,mapData]=await Promise.all(responses.map(response=>response.json()));
    CFG={...base,map:{...base.map,data:mapData},weeks:[...w1,...w2,...w3].sort((a,b)=>a.number-b.number)};
  }catch(error){
    alert('Die Konfiguration der Begleit-App konnte nicht geladen werden. Bitte prüfe das Deployment.');
    throw error;
  }
}
