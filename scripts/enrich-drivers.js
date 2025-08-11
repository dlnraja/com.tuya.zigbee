'use strict';
const fs=require('fs'),fsp=require('fs/promises'),path=require('path');
const APPLY=process.argv.includes('--apply');const ROOT=process.cwd();const TMP=path.join(ROOT,'.tmp_tuya_zip_work');const DRV=path.join(ROOT,'drivers');const BK=[path.join(ROOT,'.backup')].filter(fs.existsSync);
function listCompose(root){const out=[];if(!fs.existsSync(root))return out;const st=[root];while(st.length){const cur=st.pop();let s;try{s=fs.statSync(cur);}catch{continue;}if(s.isDirectory()){for(const e of fs.readdirSync(cur)){const p=path.join(cur,e);try{const ss=fs.statSync(p);if(ss.isDirectory())st.push(p);else if(ss.isFile()&&/driver(\.compose)?\.json$/i.test(p))out.push(p);}catch{}}}}return out;}
function j(p){try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}}
function A(v){return Array.isArray(v)?v:(v?[v]:[]);}function M(a,b){return Array.from(new Set([...(A(a)),...(A(b))].filter(Boolean)));}
(function(){
  const src=[]; if(fs.existsSync(TMP)){for(const d of fs.readdirSync(TMP,{withFileTypes:true})){if(!d.isDirectory())continue;const dir=path.join(TMP,d.name);for(const f of listCompose(dir))src.push({file:f,obj:j(f)});}}
  for(const b of BK){for(const f of listCompose(b))src.push({file:f,obj:j(f)});}
  const repo=[]; if(fs.existsSync(DRV)){const st=[DRV];while(st.length){const cur=st.pop();let s;try{s=fs.statSync(cur);}catch{continue;}if(s.isDirectory()){for(const e of fs.readdirSync(cur)){const p=path.join(cur,e);try{const ss=fs.statSync(p);if(ss.isDirectory())st.push(p);else if(ss.isFile()&&/driver(\.compose)?\.json$/i.test(p)){const comp=['driver.compose.json','driver.json'].map(n=>path.join(cur,n)).find(p=>fs.existsSync(p));if(comp)repo.push({dir:cur,compose:comp,obj:j(comp)});}}catch{}}}}}
  if(!src.length){console.log('[enrich] nothing to merge');return;}

  let merges=0,created=0,icons=0;
  for(const s of src){
    const o=s.obj||{};const z=o.zigbee||{};
    const mans=A(o.manufacturerName||z.manufacturerName), mods=A(o.modelId||z.modelId||o.productId), caps=A(o.capabilities);

    // cible approximative → reorg placera correctement ensuite (cat/vendor/model/domain plus tard)
    let target=null,score=-1;
    for(const r of repo){
      const R=A(r.obj?.capabilities),S=caps; const c=[...new Set(R)].filter(x=>new Set(S).has(x)).length;
      const m1=String(r.obj?.zigbee?.manufacturerName||'').toLowerCase().includes(String(mans[0]||'').toLowerCase())?1:0;
      const m2=String(r.obj?.zigbee?.modelId||'').toLowerCase().includes(String(mods[0]||'').toLowerCase())?1:0;
      const sc=c*2+m1+m2; if(sc>score){score=sc;target=r;}
    }
    if(!target){
      const id=(mods[0]||mans[0]||'device').toLowerCase().replace(/[^a-z0-9._-]+/g,'-'); const dir=path.join(DRV,id);
      fs.mkdirSync(dir,{recursive:true});
      const comp=path.join(dir,'driver.compose.json'); const dev=path.join(dir,'device.js');
      if(!fs.existsSync(comp))fs.writeFileSync(comp,JSON.stringify({id,name:{en:id,fr:id},capabilities:[],zigbee:{}},null,2));
      if(!fs.existsSync(dev))fs.writeFileSync(dev,`'use strict';\nconst { ZigBeeDevice } = require('homey-zigbeedriver');\nclass Device extends ZigBeeDevice{async onNodeInit(){this.log('init');}}\nmodule.exports = Device;\n`);
      target={dir,compose:comp,obj:j(comp)}; repo.push(target); created++;
    }
    const obj=j(target.compose)||{id:path.basename(target.dir),name:{en:'Device',fr:'Appareil'},capabilities:[],zigbee:{}};
    const before=JSON.stringify(obj);
    obj.name=(typeof obj.name==='string')?{en:obj.name,fr:obj.name}:(obj.name||{en:'Device',fr:'Appareil'});
    obj.capabilities=M(obj.capabilities,caps);
    obj.zigbee=obj.zigbee||{};
    obj.zigbee.manufacturerName=M(obj.zigbee.manufacturerName,mans);
    obj.zigbee.modelId=M(obj.zigbee.modelId,mods);
    if(JSON.stringify(obj)!==before){fs.writeFileSync(target.compose,JSON.stringify(obj,null,2));merges++;}
    const assets=path.join(target.dir,'assets'),icon=path.join(assets,'icon.svg');if(!fs.existsSync(assets))fs.mkdirSync(assets,{recursive:true});
    if(!fs.existsSync(icon)){const hex='#00AAFF';fs.writeFileSync(icon,`<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">\n<rect x="24" y="24" width="208" height="208" rx="32" fill="#f6f8fa" stroke="${hex}" stroke-width="8"/>\n<path d="M72 96h112v64H72z" fill="none" stroke="${hex}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>\n<circle cx="96" cy="128" r="10" fill="${hex}"/><circle cx="160" cy="128" r="10" fill="${hex}"/>\n</svg>`,'utf8');icons++;}
  }
  try{fsp.appendFile(path.join(process.cwd(),'CHANGELOG_AUTO.md'),`\n## Auto-merge ${new Date().toISOString()}\nmerged:${merges} created:${created} icons:${icons}\n`);}catch{}
  console.log(`[enrich] merged:${merges} created:${created} icons:${icons}`);
})();
