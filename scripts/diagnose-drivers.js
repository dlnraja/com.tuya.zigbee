'use strict';
const fs=require('fs'),path=require('path');
const ROOT=process.cwd(),DRV=path.join(ROOT,'drivers');const STRICT=process.argv.includes('--strict');const FIX=process.argv.includes('--fix');const FIX_ASSETS=process.argv.includes('--fix-assets');
function j(p){try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}}
function* composeFiles(d){if(!fs.existsSync(d))return;const st=[d];while(st.length){const c=st.pop();let s;try{s=fs.statSync(c);}catch{continue;}if(s.isDirectory()){const es=fs.readdirSync(c,{withFileTypes:true});const comp=['driver.compose.json','driver.json'].map(n=>path.join(c,n)).find(p=>fs.existsSync(p));if(comp)yield comp;for(const e of es)if(e.isDirectory())st.push(path.join(c,e.name));}}}
(function(){
  const issues=[]; let fixed=0;
  for(const f of composeFiles(DRV)){
    const dir=path.dirname(f); const o=j(f)||{};
    const parts=path.relative(DRV,dir).split(path.sep);
    if(parts.length<4){issues.push({type:'layout',file:f,msg:'wrong depth'});}
    if(!o.id) { issues.push({type:'id',file:f,msg:'missing id'}); if(FIX){o.id=parts.slice(-3).join('-');} }
    if(typeof o.name==='string' && FIX){ o.name={en:o.name,fr:o.name}; }
    if(o.capabilities && !Array.isArray(o.capabilities) && FIX){ o.capabilities=[o.capabilities]; }
    const assets=path.join(dir,'assets'); const icon=path.join(assets,'icon.svg');
    if(FIX_ASSETS){ if(!fs.existsSync(assets))fs.mkdirSync(assets,{recursive:true}); if(!fs.existsSync(icon)) fs.writeFileSync(icon,`<svg xmlns="http://www.w3.org/2000/svg"><rect width="256" height="256" fill="#f6f8fa"/></svg>`); }
    if(FIX){ fs.writeFileSync(f,JSON.stringify(o,null,2)); fixed++; }
  }
  fs.writeFileSync(path.join(ROOT,'diagnose-report.json'),JSON.stringify({issues,fixed,strict:STRICT},null,2));
  console.log(`[diagnose] issues=${issues.length} fixed=${fixed} (strict=${STRICT})`);
  if(STRICT && issues.length){ process.exitCode=1; }
})();