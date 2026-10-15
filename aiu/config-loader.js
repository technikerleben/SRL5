async function loadConfig(){
  try{
    const baseResponse=await fetch('./config-base.json',{cache:'no-store'});
    if(!baseResponse.ok)throw new Error('Grundkonfiguration fehlt');
    const base=await baseResponse.json();
    const files=['weeks.json',base.map?.source||'startkarte.json'];
    const responses=await Promise.all(files.map(file=>fetch(`./${file}`,{cache:'no-store'})));
    if(responses.some(response=>!response.ok))throw new Error('Konfigurationsdatei fehlt');
    const [weeks,mapData]=await Promise.all(responses.map(response=>response.json()));
    CFG={...base,map:{...base.map,data:mapData},weeks:[...weeks].sort((a,b)=>a.number-b.number)};
  }catch(error){
    alert('Die Konfiguration der Begleit-App konnte nicht geladen werden. Bitte prüfe das Deployment.');
    throw error;
  }
}
