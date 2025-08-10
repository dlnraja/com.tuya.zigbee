'use strict';
const fs=require('fs'),path=require('path'),glob=require('glob');
function ingest(){const tmp=path.join(process.cwd(),'tmp-ingest');if(!fs.existsSync(tmp))fs.mkdirSync(tmp,{recursive:true});
const sources=['drivers/**/*.zip','backups/**/*.zip','downloads/**/*.zip','*.zip'];let c=0;
for(const pattern of sources){const files=glob.sync(pattern);for(const f of files){try{
const name=path.basename(f,'.zip');const target=path.join(tmp,name);if(!fs.existsSync(target))fs.mkdirSync(target,{recursive:true});
// Extract logic would go here - for now just copy
fs.copyFileSync(f,path.join(target,name+'.zip'));c++;console.log(`[ingest] ${f} → ${target}`);
}catch(e){console.error(`[ingest] error with ${f}:`,e.message);}}}
console.log(`[ingest] ${c} sources processed to ${tmp}`);}
ingest();
