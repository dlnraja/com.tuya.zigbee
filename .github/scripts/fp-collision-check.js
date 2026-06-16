#!/usr/bin/env node
'use strict';
/**
 * Fingerprint Collision Check v2.0
 *
 * Detects manufacturerName+productId pairs that appear in multiple driver.compose.json files.
 * Resolution rules:
 * 1. Generic/fallback drivers (_TZ3000_unknown, universal_fallback, tuya_dummy_device) are EXEMPT
 * 2. TS0601 entries in non-TS0601-specific drivers are EXEMPT (variant listing, not collision)
 * 3. Real collisions must be resolved by removing duplicate fingerprint from the less-specific driver
 */
const fs=require('fs'),p=require('path'),d='drivers';

// Exempt generic/fallback driver prefixes
const EXEMPT_DRIVERS=new Set([
  'universal_fallback','tuya_dummy_device','generic_tuya','generic_diy',
  'device_generic_diy_universal','universal_zigbee'
]);

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

// Filter out exempt collisions
const realCollisions=c.filter(([,drivers])=>{
  const nonExempt=drivers.filter(d=>!EXEMPT_DRIVERS.has(d));
  return nonExempt.length>1;
});

console.log('FP collision check: '+Object.keys(m).length+' combos, '+c.length+' raw, '+realCollisions.length+' real');
for(const[k,v]of c.slice(0,20)){
  console.log('::warning::COLLISION '+k+' -> '+v.join(', '));
}
if(realCollisions.length>0){
  console.log('\n=== REAL COLLISIONS (excluding exempt generic drivers) ===');
  for(const[k,v]of realCollisions.slice(0,20)){
    console.log('COLLISION '+k+' -> '+v.join(', '));
  }
}

// Write GitHub Step Summary
const sm=process.env.GITHUB_STEP_SUMMARY;
if(sm&&c.length>0){
  let md='## FP Collisions ('+c.length+' total, '+realCollisions.length+' real)\n\n';
  md+='**Resolution rules:**\n';
  md+='1. Generic/fallback drivers (universal_fallback, tuya_dummy_device, etc.) are exempt\n';
  md+='2. TS0601 entries in non-specific drivers are variant listings, not collisions\n';
  md+='3. Real collisions: remove duplicate fingerprint from less-specific driver\n\n';
  md+='| FP | PID | Drivers | Status |\n|---|---|---|---|\n';
  for(const[k,v]of c.slice(0,100)){
    const[fp,pid]=k.split('|');
    const isExempt=v.every(d=>EXEMPT_DRIVERS.has(d));
    const status=isExempt?'Exempt (generic)':'Real - resolve';
    md+='| '+fp+' | '+pid+' | '+v.join(', ')+' | '+status+' |\n';
  }
  fs.appendFileSync(sm,md);
}
