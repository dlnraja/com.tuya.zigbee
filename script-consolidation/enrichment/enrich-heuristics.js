#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const base='drivers'; if(!fs.existsSync(base))process.exit(0);
const ensure=(p,def)=>{ if(!fs.existsSync(p))fs.writeFileSync(p,JSON.stringify(def,null,2)); };
for(const d of fs.readdirSync(base,{withFileTypes:true})){
  if(!d.isDirectory())continue; const id=d.name,root=path.join(base,id);
  const metaPath=['driver.compose.json','driver.json'].map(f=>path.join(root,f)).find(f=>fs.existsSync(f));
  if(!metaPath)continue; let meta={}; try{meta=JSON.parse(fs.readFileSync(metaPath,'utf8'));}catch{}
  const evDir=path.join('evidence',id); fs.mkdirSync(evDir,{recursive:true});
  const caps=new Set([...(meta.capabilities||[])]);
  // Heuristique classe→caps
  switch(meta.class){
    case 'light': caps.add('onoff'); caps.add('dim'); break;
    case 'socket': caps.add('onoff'); break;
    case 'sensor': /* no-op default */ break;
    case 'windowcoverings': caps.add('windowcoverings_state'); break;
    case 'thermostat': caps.add('target_temperature'); caps.add('measure_temperature'); break;
  }
  const proposed=Array.from(caps);
  fs.writeFileSync(path.join(evDir,'capabilities.proposed.json'), JSON.stringify(proposed,null,2));
  if(!fs.existsSync(path.join(evDir,'reporting.json'))) fs.writeFileSync(path.join(evDir,'reporting.json'),'[]');
  if(!fs.existsSync(path.join(evDir,'notes.md'))) fs.writeFileSync(path.join(evDir,'notes.md'),`# Heuristic notes for ${id}\n`);
}
console.log('✅ heuristic proposals generated');
