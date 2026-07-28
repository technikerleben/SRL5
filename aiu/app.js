(async()=>{
  /* Reihenfolge ist wichtig: app-store.js stellt den Store bereit, bevor
     app-core.js seine Renderer anmeldet. Optionale Dateien duerfen fehlen,
     ohne dass die App abbricht. */
  const files=[
    {src:'app-store.js',required:true},
    {src:'vendor/supabase.js',required:false},
    {src:'app-core.js',required:true},
    {src:'config-loader.js',required:true},
    {src:'sync-config.js',required:false},
    {src:'app-sync.js',required:true},
    {src:'app-ship.js',required:false},
    {src:'app-gems.js',required:false},
    {src:'app-juice.js',required:false},
    {src:'app-input.js',required:true},
    {src:'app-teacher.js',required:true}
  ];
  for(const file of files){
    try{
      await new Promise((resolve,reject)=>{
        const script=document.createElement('script');
        script.src=file.src;
        script.onload=resolve;
        script.onerror=()=>reject(new Error(`${file.src} konnte nicht geladen werden`));
        document.head.appendChild(script);
      });
    }catch(error){
      if(file.required)throw error;
      console.warn(`${file.src} wurde uebersprungen`,error);
    }
  }
})().catch(error=>{
  console.error(error);
  alert('Die Begleit-App konnte nicht vollständig geladen werden.');
});
