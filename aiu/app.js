(async()=>{
  const files=['app-core.js','config-loader.js','app-gems.js','app-input.js','app-teacher.js'];
  for(const src of files){
    await new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=src;
      script.onload=resolve;
      script.onerror=()=>reject(new Error(`${src} konnte nicht geladen werden`));
      document.head.appendChild(script);
    });
  }
})().catch(error=>{
  console.error(error);
  alert('Die Begleit-App konnte nicht vollständig geladen werden.');
});
