#!/usr/bin/env node
'use strict';
const fs=require('fs'),p=require('path'),d='drivers';
const m={};
for(const dr of fs.readdirSync(d)){
  try{
    const j=JSON.parse(fs.readFileSync(p.join(d,dr,'driver.compose.json'),'utf8'));
    if(!j.zigbee)continue;
    const fps=j.zigbee.manufacturerName||[];
    const pids=j.zigbee.productId||[];
    for(const fp of fps)for(const pid of pids){
      const k=fp+'|'+pid;
      if(!m[k])m[k]=[];
      m[k].push(dr);
    }
  }catch{}
}
const c=Object.entries(m).filter(([,v])=>v.length>1);
console.log('FP collision check: '+Object.keys(m).length+' combos, '+c.length+' collisions');
for(const[k,v]of c.slice(0,20)){
  console.log('::warning::COLLISION '+k+' -> '+v.join(', '));
}
if(c.length>0){
  const sm=process.env.GITHUB_STEP_SUMMARY;
  if(sm){
    let md='## FP Collisions ('+c.length+')\n| FP | PID | Drivers |\n|---|---|---|\n';
    for(const[k,v]of c.slice(0,50)){
      const[fp,pid]=k.split('|');
      md+='| '+fp+' | '+pid+' | '+v.join(', ')+' |\n';
    }
    fs.appendFileSync(sm,md);
  }
}
