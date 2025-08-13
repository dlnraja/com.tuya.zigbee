'use strict';
const fs=require('fs'),path=require('path');
function* jsFiles(root){const st=[root];while(st.length){const cur=st.pop();let s;try {s=fs.statSync(cur);}} catch (error) {continue;}if(s.isDirectory()){for(const e of fs.readdirSync(cur,{withFileTypes:true})){if(e.name==='node_modules'||e.name==='.homeybuild'||e.name==='.git') continue;const p=path.join(cur,e.name);if(e.isDirectory()) st.push(p);else if(e.isFile()&&/\.m?js$/i.test(e.name)) yield p;}}}}
function migrateFile(file){let src=fs.readFileSync(file,'utf8');const before=src;
  src=src.replace(/require\(\s*['"]homey-meshdriver['"]\s*\)/g,"require('homey-zigbeedriver')");
  const hasOnMesh=/onMeshInit\s*\(/.test(src), hasOnNode=/onNodeInit\s*\(/.test(src);
  if(hasOnMesh&&!hasOnNode){src=src.replace(/class\s+([A-Za-z0-9_]+)\s+extends\s+([A-Za-z0-9_]+)/,(m)=>`${m}\n  async onNodeInit(args){ try { if (typeof this.onMeshInit==='function') await this.onMeshInit(); } catch(e){ this.error&&this.error('onNodeInit wrapper',e); } }\n`);}
  if(src!==before){fs.writeFileSync(file,src);console.log('[migrate] updated',path.relative(process.cwd(),file));return true;}return false;}
(function(){const root=path.join(process.cwd(),'drivers');if(!fs.existsSync(root)){console.log('[migrate] drivers/ not found');return;}let changed=0;for(const f of jsFiles(root)){try {const t=fs.readFileSync(f,'utf8');if(/homey-meshdriver/.test(t)){if(migrateFile(f))changed++;}}} catch (error) {}}console.log(`[migrate] done, files changed: ${changed}`);})();