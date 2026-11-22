#!/usr/bin/env node
// P3389 (t1023u): wrap every drivers/*/device.js body in lazyDeviceClass() so the class body and the
// libs it requires run on first use, not at app start. Source text and exports are unchanged; bare
// re-exports of another device.js stay as they are (the target is lazy). Idempotent.
// usage: node scripts/maintenance/p3389-lazy-device-entries.js [root] [--check]
'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv.slice(2).find(a=>!a.startsWith('--'))||'.');const check=process.argv.includes('--check');
const MARK='// P3389 lazy device class';
const res={wrapped:[],already:[],skipped:[]};
for(const id of fs.readdirSync(path.join(root,'drivers')).sort()){
  const f=path.join(root,'drivers',id,'device.js'); if(!fs.existsSync(f)) continue;
  let s=fs.readFileSync(f,'utf8');
  if(s.includes(MARK)){res.already.push(id);continue;}
  const lines=s.split('\n');
  const exp=lines.map((l,i)=>[l,i]).filter(([l])=>/module\.exports|(^|[^.\w])exports\./.test(l));
  const MAIN=/^module\.exports\s*=\s*\S.*;\s*$/;
  const main=exp.filter(([l])=>MAIN.test(l));
  const extra=exp.filter(([l])=>!MAIN.test(l));
  // a bare re-export of another (already lazy) device.js stays as is
  if(main.length===1&&!extra.length&&/^module\.exports\s*=\s*require\(\s*['"][^'"]+['"]\s*\)\s*;\s*$/.test(main[0][0])){res.skipped.push(id);continue;}
  const extraOk=extra.every(([l,i])=>/^module\.exports\.[A-Za-z_$][\w$]*\s*=\s*[^;]+;\s*$/.test(l) && main.length===1 && i>main[0][1]);
  if(main.length!==1||!extraOk||/^\s*(import|export)\s/m.test(s)){res.skipped.push(id);continue;}
  // strip leading 'use strict' (outer file keeps it)
  let head='';let bodyStart=0;
  if(/^\s*['"]use strict['"];?\s*$/.test(lines[0])){bodyStart=1;}
  const body=lines.slice(bodyStart);
  while(body.length&&body[body.length-1].trim()==='') body.pop();
  const out=["'use strict';",
   MARK+' (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)',
   "require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {",
   ...body,
   'return module.exports;',
   '});',''].join('\n');
  res.wrapped.push(id);
  if(!check) fs.writeFileSync(f,out);
}
console.log(JSON.stringify({wrapped:res.wrapped.length,already:res.already.length,skipped:res.skipped}));
if(check&&res.wrapped.length){process.exitCode=1;}
