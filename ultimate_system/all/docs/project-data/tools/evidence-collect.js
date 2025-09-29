#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const fetch = require('node-fetch');

async function main() {
  const OFFLINE=process.env.OFFLINE==='1'; 
  if(OFFLINE){
    console.log('OFFLINE=1 -> skip evidence collect');
    process.exit(0);
  }
  
  if(!fs.existsSync('matrices/driver_matrix.json')){
    console.error('matrix missing');
    process.exit(1);
  }
  
  const rows=JSON.parse(fs.readFileSync('matrices/driver_matrix.json','utf8'));
  
  function q(r){
    return [r.manufacturerName,r.modelId,r.productId,r.title,r.driver_id].filter(Boolean).join(' ');
  }
  
  function wrap(s){
    return s.replace(/\s+/g,' ').trim();
  }
  
  async function tryFetch(url){
    try{
      const r=await fetch(url,{timeout:12000}); 
      if(!r.ok)return null; 
      const t=await r.text(); 
      return t.slice(0,200000); 
    }catch{
      return null;
    }
  }
  
  for(const r of rows){
    const dir=path.join('evidence',r.driver_id); 
    fs.mkdirSync(dir,{recursive:true});
    
    const queries=[
      `https://www.google.com/search?q=${encodeURIComponent(`site:zigbee2mqtt.io "${q(r)}"`)}`,
      `https://www.google.com/search?q=${encodeURIComponent(`site:blakadder.com/zigbee "${q(r)}"`)}`,
      `https://www.google.com/search?q=${encodeURIComponent(`site:community.homey.app "${q(r)}"`)}`,
      `https://www.google.com/search?q=${encodeURIComponent(`site:github.com zigbee "${q(r)}"`)}`
    ];
    
    const sources=[]; 
    for(const u of queries){
      const html=await tryFetch(u); 
      if(html){
        sources.push({url:u, sample:wrap(html.slice(0,4000))});
      }
    }
    
    fs.writeFileSync(path.join(dir,'sources.json'), JSON.stringify(sources,null,2));
    fs.writeFileSync(path.join(dir,'fingerprints.json'),'[]'); 
    fs.writeFileSync(path.join(dir,'features.json'),'[]');
    fs.writeFileSync(path.join(dir,'clusters.json'),'[]'); 
    fs.writeFileSync(path.join(dir,'tuya_dpids.json'),'[]');
    fs.writeFileSync(path.join(dir,'reporting.json'),'[]'); 
    fs.writeFileSync(path.join(dir,'capabilities.proposed.json'),'[]');
    fs.writeFileSync(path.join(dir,'notes.md'),`# Notes for ${r.driver_id}\n\n- Queries seeded.\n`);
  }
  
  console.log('✅ evidence seeds created (sources.json with search pages)');
}

main().catch(console.error);
