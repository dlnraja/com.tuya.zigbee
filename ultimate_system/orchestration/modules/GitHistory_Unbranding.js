#!/usr/bin/env node
// Build/augment unbranding base from recent git history (text-only, no keys)
const fs=require('fs');const path=require('path');const{execSync}=require('child_process');
const ROOT=path.resolve(__dirname,'../../..');const STATE=path.join(ROOT,'ultimate_system','orchestration','state');
const OUT=path.join(STATE,'unbranding_index.json');const BACKLOG=parseInt(process.env.GH_BACKLOG||'30',10);
function j(p){try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch{return null}}function w(p,o){fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(o,null,2),'utf8')}
function git(c){return execSync(c,{cwd:ROOT,stdio:['ignore','pipe','pipe']}).toString('utf8').trim()}
function commits(n){try{return git(`git rev-list --max-count=${n} HEAD`).split(/\r?\n/).filter(Boolean)}catch{return[]}}
function listFiles(sha){try{return git(`git ls-tree -r --name-only ${sha}`).split(/\r?\n/).filter(f=>/^drivers\/[^/]+\/driver\.compose\.json$/.test(f))}catch{return[]}}
function show(sha,f){try{return execSync(`git show ${sha}:"${f}"`,{cwd:ROOT,stdio:['ignore','pipe','pipe']}).toString('utf8')}catch{return null}}
function uniq(a){return Array.from(new Set(a))}
function main(){const base=j(OUT)||{manufacturers:{},productIds:{},metrics:{}};let files=0,mset=new Set(),pset=new Set();
for(const sha of commits(BACKLOG))for(const f of listFiles(sha)){const t=show(sha,f);if(!t)continue;let m;try{m=JSON.parse(t)}catch{continue}if(!m||!m.zigbee)continue;files++;const d=f.split('/')[1];
const mfgs=Array.isArray(m.zigbee.manufacturerName)?m.zigbee.manufacturerName:(m.zigbee.manufacturerName?[m.zigbee.manufacturerName]:[]);
const pids=Array.isArray(m.zigbee.productId)?m.zigbee.productId:[];
for(const mn of mfgs){const k=String(mn).trim();if(!k)continue;mset.add(k);base.manufacturers[k]=base.manufacturers[k]||{productIds:[],drivers:[],categories:[]};
const psetM=new Set(base.manufacturers[k].productIds);pids.forEach(p=>{const P=String(p).trim().toUpperCase();if(P){pset.add(P);psetM.add(P)}});
base.manufacturers[k].productIds=Array.from(psetM);const dset=new Set(base.manufacturers[k].drivers);dset.add(d);base.manufacturers[k].drivers=Array.from(dset)}
for(const p of pids){const P=String(p).trim().toUpperCase();if(!P)continue;base.productIds[P]=base.productIds[P]||{manufacturers:[],drivers:[],categories:[]};
const mm=new Set(base.productIds[P].manufacturers);mfgs.forEach(mn=>{const k=String(mn).trim();if(k)mm.add(k)});base.productIds[P].manufacturers=Array.from(mm);
const dd=new Set(base.productIds[P].drivers);dd.add(d);base.productIds[P].drivers=Array.from(dd)}}
base.metrics.gitHistoryFiles=files;base.metrics.gitHistoryCommits=(base.metrics.gitHistoryCommits||0)+commits(BACKLOG).length;
w(OUT,base);console.log('✅ Git history unbranding updated:',path.relative(ROOT,OUT));}
if(require.main===module)main();
