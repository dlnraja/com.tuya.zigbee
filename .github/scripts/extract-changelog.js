#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..','..');
const ver=process.argv[2]||JSON.parse(fs.readFileSync(path.join(ROOT,'app.json'),'utf8')).version;
function fromMd(){
  const f=path.join(ROOT,'CHANGELOG.md');
  if(!fs.existsSync(f))return null;
  const c=fs.readFileSync(f,'utf8');
  const re=new RegExp('## \\[?'+ver.replace(/\./g,'\\.')+'\\]?[^\n]*\n([\\s\\S]*?)(?=\n## |\n---\n|$)');
  const m=c.match(re);if(!m||!m[1].trim())return null;
  const md=m[1].trim();
  const lines=md.split('\n').filter(l=>l.startsWith('- ')).map(l=>l.replace(/^- \*\*(.+?)\*\*.*/, '$1').replace(/^- /,''));
  return{md,oneLiner:'v'+ver+': '+lines.slice(0,5).join(', ')};
}
function fromJson(){
  const f=path.join(ROOT,'.homeychangelog.json');
  if(!fs.existsSync(f))return null;
  try{const cl=JSON.parse(fs.readFileSync(f,'utf8'));
    if(cl[ver]&&cl[ver].en)return{md:cl[ver].en,oneLiner:cl[ver].en};
    const k=Object.keys(cl).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}));
    if(k[0]&&cl[k[0]].en)return{md:cl[k[0]].en,oneLiner:cl[k[0]].en};
  }catch{}return null;
}
function fromGit(){
  try{const{execSync}=require('child_process');
    const log=execSync('git log -10 --pretty=format:%s --no-merges',{cwd:ROOT,encoding:'utf8'}).trim();
    const lines=log.split('\n').filter(Boolean).slice(0,5);
    return{md:lines.map(l=>'- '+l).join('\n'),oneLiner:'v'+ver+': '+lines[0]};
  }catch{}return null;
}
const r=fromMd()||fromJson()||fromGit()||{md:'Bug fixes and improvements',oneLiner:'v'+ver+': Bug fixes and improvements'};
const homey=(r.oneLiner||r.md).substring(0,400);
console.log(JSON.stringify({homeyText:homey,markdownText:r.md,oneLiner:r.oneLiner}));
