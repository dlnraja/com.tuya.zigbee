'use strict';
/** Lazy, size-bounded reader of data/kb/couples.json (built by scripts/kb). Research-only; never loaded by the app. */
const fs=require('fs'),path=require('path');
const FILE=path.join(__dirname,'../../../data/kb/couples.json');const MAX=8*1024*1024;let cache;
const CONF={zhc:0.9,z2m:0.9,zha:0.85,deconz:0.85,johan:0.7,ota:0.6};
function load(file=FILE){if(cache!==undefined&&file===FILE)return cache;let r=null;try{if(fs.statSync(file).size<=MAX)r=JSON.parse(fs.readFileSync(file,'utf8'));}catch{r=null;}if(file===FILE)cache=r;return r;}
/** -> records compatible with ref-index ({src,url,mfrs,pids,text,conf,commit}) */
function records(file){const j=load(file);if(!j)return[];const o=[];
 for(const [k,refs] of Object.entries(j.couples)){const [m,p]=k.split('|');for(const [src,model,url] of refs)o.push({src:'kb:'+src,file:model||'',url,mfrs:[m],pids:[p],couples:[[m,p]],text:String(model||'').toLowerCase(),conf:CONF[src]||0.5,commit:(j.sources[src]||{}).commit||null});}
 return o;}
module.exports={load,records,CONF,_reset:()=>{cache=undefined;}};
