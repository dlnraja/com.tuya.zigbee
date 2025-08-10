'use strict';
const fs=require('fs'),path=require('path'),glob=require('glob');
function generateAssets(){let c=0;const drivers=glob.sync('drivers/**/driver.json');
for(const d of drivers){try{const dir=path.dirname(d);const assets=path.join(dir,'assets');const icon=path.join(assets,'icon.svg');
if(!fs.existsSync(assets))fs.mkdirSync(assets,{recursive:true});
if(!fs.existsSync(icon)){const hex='#00AAFF';const svg=`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
<rect x="24" y="24" width="208" height="208" rx="32" fill="#f6f8fa" stroke="${hex}" stroke-width="8"/>
<path d="M72 96h112v64H72z" fill="none" stroke="${hex}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="96" cy="128" r="10" fill="${hex}"/><circle cx="160" cy="128" r="10" fill="${hex}"/>
</svg>`;fs.writeFileSync(icon,svg,'utf8');c++;console.log(`[assets] ${icon}`);}}catch(e){console.error(`[assets] error with ${d}:`,e.message);}}
console.log(`[assets] ${c} icons generated`);}
generateAssets();
