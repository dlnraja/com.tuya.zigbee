#!/usr/bin/env node
const fs=require('fs'),path=require('path'),sharp=require('sharp');
const D=path.join(__dirname,'..','drivers'),BG={r:255,g:255,b:255,alpha:1};
const S=[{n:'small.png',s:75},{n:'large.png',s:500},{n:'xlarge.png',s:1000}];
const CHECK=process.argv.includes('--check');
let ok=0,er=0;
(async()=>{
const dirs=fs.readdirSync(D).filter(d=>fs.statSync(path.join(D,d)).isDirectory());
console.log(dirs.length+' drivers'+(CHECK? ' (check mode )':''))      ;
for(const d of dirs){
const svg=path.join(D,d,'assets','icon.svg');
const img=path.join(D,d,'assets','images');
if(!fs.existsSync(svg))continue;
if(CHECK){
  try{for(const{n,s}of S){const m=await sharp(path.join(img,n)).metadata();
    if(m.width!==s||m.height!==s){er++;console.log('BAD '+d+'/'+n+': '+m.width+'x'+m.height);}else ok++;
  }}catch(e){er++;console.log('MISSING '+d+': '+e.message);}
}else{
  if(!fs.existsSync(img))fs.mkdirSync(img,{recursive:true});
  try{const b=fs.readFileSync(svg);
  for(const{n,s}of S)await sharp(b).resize(s,s,{fit:'contain',background:BG}).png({compressionLevel:9}).toFile(path.join(img,n));
  ok++;
  }catch(e){er++;console.log('ERR '+d+': '+e.message);}
}}
console.log('Done: '+ok+' ok, '+er+' errors');
if(er>0)process.exit(1);
})();
