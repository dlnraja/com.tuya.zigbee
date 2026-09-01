const fs = require('fs');
const path = require('path');
const dir = __dirname;
const b64 = fs.readFileSync(path.join(dir, 'cv-b64.txt'), 'utf8').trim();
const js = `(async()=>{
  const b64=${JSON.stringify(b64)};
  const bin=atob(b64);
  const bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
  const file=new File([bytes],'Dylan_RAJASEKARAM_LinkedIn_CV.pdf',{type:'application/pdf'});
  const dt=new DataTransfer();
  dt.items.add(file);
  const inp=document.querySelector('input[type=file]');
  if(!inp) return {ok:false,err:'no input'};
  try { inp.files = dt.files; } catch(e) { return {ok:false,err:String(e)}; }
  inp.dispatchEvent(new Event('input',{bubbles:true}));
  inp.dispatchEvent(new Event('change',{bubbles:true}));
  return {ok:true,name:inp.files[0]&&inp.files[0].name,size:inp.files[0]&&inp.files[0].size,filesLen:inp.files.length};
})()`;
fs.writeFileSync(path.join(dir, 'inject-cv.js'), js);
console.log('wrote inject-cv.js', js.length);
