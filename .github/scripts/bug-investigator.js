#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..','..'),DDIR=path.join(ROOT,'drivers');
const{findAllDrivers}=require('./load-fingerprints');

function getCode(fp){
  const d=findAllDrivers(fp);if(!d.length)return null;
  const dd=path.join(DDIR,d[0]);let dev='',base='',compose='';
  try{dev=fs.readFileSync(path.join(dd,'device.js'),'utf8')}catch{}
  try{compose=fs.readFileSync(path.join(dd,'driver.compose.json'),'utf8')}catch{}
  const bm=dev.match(/require\(['"]([^'"]*(?:Unified|Base)[^'"]*)['"]\)/);
  if(bm)try{base=fs.readFileSync(path.resolve(dd,bm[1]+'.js'),'utf8')}catch{}
  return{driver:d[0],dev,base,compose};
}

function investigate(fp,text){
  const c=getCode(fp);
  if(!c)return{fp,driver:null,findings:['FP not found']};
  const t=(text||'').toLowerCase(),f=[];
  // Double-listener detection (like #110)
  const pL=(c.dev.match(/activePower/g)||[]).length+(c.base.match(/activePower/g)||[]).length;
  const vL=(c.dev.match(/rmsVoltage/g)||[]).length+(c.base.match(/rmsVoltage/g)||[]).length;
  if(pL>1)f.push('DOUBLE-LISTENER:activePower('+pL+' listeners)');
  if(vL>1)f.push('DOUBLE-LISTENER:rmsVoltage('+vL+' listeners)');
  if(c.dev.includes('divisor')&&c.base.includes('zclEnergyDivisors'))f.push('DIVISOR-CONFLICT:device vs base');
  // Missing energy poll
  if(t.match(/energy|kwh|meter/)&&!c.dev.includes('meterPoll')&&!c.dev.includes('seMetering'))f.push('NO-ENERGY-POLL');
  // Double temperature divisor
  if(t.match(/temp.*wrong|temp.*0\./)&&c.dev.includes('divisor: 10')&&c.base.includes('divisor'))f.push('DOUBLE-TEMP-DIV');
  // Mains device with battery
  if(t.match(/battery.*100|battery.*wrong/)&&c.dev.includes('mainsPowered'))f.push('MAINS-HAS-BATTERY');
  // Missing reporting config
  if(t.match(/not report|no update|stuck/)&&!c.dev.includes('configureReporting')&&!c.base.includes('configureReporting'))f.push('NO-ZCL-REPORTING');
  // v5.11.27: getData().manufacturerName bug  should use getSetting('zb_manufacturer_name') first
  if(c.dev.includes('getData()?.manufacturerName')&&!c.dev.includes("getSetting('zb_manufacturer_name')"))f.push('GETDATA-MFR-BUG:device uses getData() without getSetting fallback');
  // v5.11.27: Wrong settings key (zb_modelId instead of zb_model_id)
  if(c.dev.includes("zb_modelId")&&!c.dev.includes("zb_model_id"))f.push('WRONG-SETTINGS-KEY:zb_modelId should be zb_model_id');
  // v5.11.27: isTuyaDP variable used but not declared in scope
  if(c.dev.match(/\bisTuyaDP\b/)&&!c.dev.includes('const isTuyaDP')&&!c.dev.includes('let isTuyaDP'))f.push('ISTUYADP-SCOPE:variable used but not declared locally');
  // DP mapping mismatch
  const dpMatch=t.match(/dp\s*(\d+)/gi);
  if(dpMatch){
    dpMatch.forEach(dm=>{
      const n=dm.match(/\d+/)[0];
      if(!c.dev.includes("'"+n+"'")&&!c.dev.includes(n+':')&&!c.base.includes(n+':'))f.push('UNMAPPED-DP:'+n);
    });
  }
  // Extract zclEnergyDivisors if present
  let divs=null;
  const dm=c.dev.match(/zclEnergyDivisors[^{]*\{([^}]+)\}/);
  if(dm)divs=dm[1].trim();
  else{const bm2=c.base.match(/zclEnergyDivisors[^{]*\{([^}]+)\}/);if(bm2)divs=bm2[1].trim();}
  return{fp,driver:c.driver,findings:f,divisors:divs,hasDpMappings:c.dev.includes('dpMappings'),hasZcl:c.dev.includes('electricalMeasurement')||c.base.includes('electricalMeasurement')};
}

module.exports={investigate,getCode};
