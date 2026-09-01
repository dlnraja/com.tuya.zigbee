(async()=>{
  const b64=window.__cvB64;
  if(!b64||b64.length<1000) return {ok:false,err:'missing b64',len:(b64&&b64.length)||0};
  const bin=atob(b64);
  const bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
  const file=new File([bytes],'Dylan_RAJASEKARAM_LinkedIn_CV.pdf',{type:'application/pdf'});
  const dt=new DataTransfer();
  dt.items.add(file);
  const inp=document.querySelector('input[type=file]');
  if(!inp) return {ok:false,err:'no input'};
  try { inp.files = dt.files; } catch(e) { return {ok:false,err:'assign:'+String(e)}; }
  inp.dispatchEvent(new Event('input',{bubbles:true}));
  inp.dispatchEvent(new Event('change',{bubbles:true}));
  return {ok:true,name:inp.files[0]&&inp.files[0].name,size:inp.files[0]&&inp.files[0].size};
})()
