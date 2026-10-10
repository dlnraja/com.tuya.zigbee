(function(){// Homey processor-risk audit (REA analysis 2026-10-10, docs/knowledge/REA_ANALYSIS.md). Warn-only, never exits non-zero.
// Homey processor-risk audit of a built app.json (additive, read-only)
const fs=require('fs');const p=process.argv[2]||'.homeybuild/app.json';
const a=JSON.parse(fs.readFileSync(p,'utf8'));const out=[];
const cards=[];
const add=(src,c)=>cards.push([src,c]);
for(const k of ['triggers','conditions','actions'])(a.flow?.[k]||[]).forEach(c=>add('app',c));
for(const d of a.drivers||[]){
  const mf=d.zigbee?.manufacturerName||[];const seen=new Set();
  for(const m of mf){if(seen.has(m))out.push(`DUP_MFR ${d.id} ${m}`);seen.add(m);
    if(typeof m!=='string'||!m.trim())out.push(`BAD_MFR ${d.id} ${JSON.stringify(m)}`);}
  if(!d.images?.small||!d.images?.large)out.push(`NO_IMAGES ${d.id}`);
  if(!d.name?.en)out.push(`NO_NAME_EN ${d.id}`);
  for(const u of d.firmwareUpdates?.updates||[])for(const f of u.files||[]){
    if(f.minHardwareVersion!=null&&f.maxHardwareVersion!=null&&f.minHardwareVersion>f.maxHardwareVersion)out.push(`OTA_HW_RANGE_EMPTY ${d.id} ${f.name} ${f.minHardwareVersion}>${f.maxHardwareVersion}`);
    if(f.minFileVersion!=null&&f.maxFileVersion!=null&&f.minFileVersion>f.maxFileVersion)out.push(`OTA_FILE_RANGE_EMPTY ${d.id} ${f.name}`);
    const fp=require('path').join(require('path').dirname(p),'drivers',d.id,'assets','firmware',f.name||'');
    if(!fs.existsSync(fp))out.push(`OTA_FILE_MISSING ${d.id} ${f.name}`);
    else if(fs.statSync(fp).size!==f.size)out.push(`OTA_SIZE_MISMATCH ${d.id} ${f.name}`);
  }
}
const ids=new Map();
for(const [src,c] of cards){
  const key=c.id;if(ids.has(key))out.push(`DUP_FLOW_ID ${key}`);ids.set(key,1);
  const argNames=new Set((c.args||[]).map(x=>x.name));
  for(const [lang,t] of Object.entries(c.titleFormatted||{})){
    for(const m of String(t).matchAll(/\[\[([^\]]+)\]\]/g)) if(!argNames.has(m[1])&&m[1]!=='device') out.push(`TF_UNKNOWN_ARG ${c.id} ${lang} ${m[1]}`);
    if(/\{[a-z_]+\}/i.test(t))out.push(`TF_CURLY ${c.id} ${lang}`);
  }
  for(const [lang,t] of Object.entries(c.title||{})) if(/\{[a-z_]+\}|\[\[/.test(t))out.push(`TITLE_PLACEHOLDER ${c.id} ${lang}`);
  for(const x of c.args||[]){ if(!x.name||!x.type)out.push(`ARG_INCOMPLETE ${c.id}`);
    if(x.type==='dropdown'&&!(x.values||[]).length)out.push(`DROPDOWN_EMPTY ${c.id} ${x.name}`);}
}
if(process.env.RAW){out.forEach(o=>console.log(o));return;}
console.log(JSON.stringify({bytes:fs.statSync(p).size,drivers:(a.drivers||[]).length,flowCards:cards.length,issues:out.length},null,0));
const g={};for(const o of out){const t=o.split(' ')[0];(g[t]=g[t]||[]).push(o)}
for(const [t,l] of Object.entries(g))console.log(t,l.length,'\n  '+l.slice(0,8).join('\n  '));
process.exitCode=0;})();
