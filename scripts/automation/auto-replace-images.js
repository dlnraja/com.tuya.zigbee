#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),https=require('https');
const sharp=require('sharp'),crypto=require('crypto');
const ROOT=path.join(__dirname,'..','..'),DDIR=path.join(ROOT,'drivers');
const DRY=process.argv.includes('--dry-run');
const FORCE=process.argv.includes('--force');
const ONLY=(process.argv.find(a=>a.startsWith('--driver='))||'').replace('--driver=','');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const PLACEHOLDER='4d8ae85e868f286990f6def84299f111';
function md5(buf){return crypto.createHash('md5').update(buf).digest('hex');}
var COPY={wifi_plug:'plug_smart',wifi_switch:'switch_1gang',wifi_switch_2gang:'switch_2gang',wifi_switch_3gang:'switch_3gang',wifi_switch_4gang:'switch_4gang',wifi_power_strip:'switch_wall_5gang',wifi_siren:'siren',wifi_water_valve:'water_valve_smart',wifi_pet_feeder:'pet_feeder',wifi_robot_vacuum:'plug_smart',wifi_generic:'switch_1gang',switch_plug_1:'plug_smart',diy_custom_zigbee:'zigbee_repeater',wifi_sonoff_basicr4:'module_mini_switch',wifi_sonoff_dualr3:'switch_2gang',wifi_sonoff_micro:'module_mini_switch',wifi_sonoff_minir3:'module_mini_switch',wifi_sonoff_minir4:'module_mini_switch',wifi_sonoff_smate2:'module_mini_switch',wifi_sonoff_tx_1ch:'switch_1gang',wifi_sonoff_tx_2ch:'switch_2gang',wifi_sonoff_tx_3ch:'switch_3gang',wifi_sonoff_pow_elite:'plug_energy_monitor',wifi_sonoff_thr316d:'climate_sensor',wifi_ewelink_bulb:'bulb_rgbw',wifi_ewelink_dimmer:'dimmer_wall_1gang',wifi_ewelink_fan:'switch_1gang',wifi_ewelink_led:'bulb_rgbw',wifi_ewelink_plug:'plug_smart',wifi_ewelink_pow:'plug_energy_monitor',wifi_ewelink_switch:'switch_1gang',wifi_ewelink_switch_2ch:'switch_2gang',wifi_ewelink_switch_4ch:'switch_4gang',wifi_ewelink_th:'climate_sensor',wifi_dimmer:'dimmer_wall_1gang',wifi_cover:'curtain_motor',wifi_thermostat:'thermostat_tuya_dp',wifi_light:'bulb_rgbw',wifi_ir_remote:'ir_blaster',wifi_sensor:'climate_sensor',wifi_air_quality:'climate_sensor',wifi_led_strip:'led_controller_dimmable',wifi_door_lock:'switch_1gang',wifi_heater:'switch_1gang',wifi_humidifier:'switch_1gang',wifi_dehumidifier:'switch_1gang',wifi_air_purifier:'switch_1gang',wifi_doorbell:'switch_1gang',wifi_garage_door:'switch_1gang',wifi_fan:'switch_1gang'};
var Z2M={module_mini_switch:'ZBMINI',dimmer_wall_1gang:'TS0601_dimmer',thermostat_tuya_dp:'TS0601_thermostat',curtain_motor:'TS130F',radiator_valve:'TV01-ZB',water_valve_garden:'TS0049',plug_energy_monitor:'TS011F_plug_1',radiator_controller:'TRVZB',smart_rcbo:'TS0601_rcbo',ir_blaster:'ZB-IR01',switch_1gang:'TS0001',switch_2gang:'TS0002',switch_3gang:'TS0003',switch_4gang:'TS0004',switch_dimmer_1gang:'TS0012',curtain_motor_tilt:'TS0601_cover',shutter_roller_controller:'3RSB015BZ',switch_wall_5gang:'TS0044',switch_wall_6gang:'TS0044',switch_wall_7gang:'TS0044',switch_wall_8gang:'TS0044',din_rail_meter:'TS0601_din',climate_sensor:'TS0201',motion_sensor:'TS0202',contact_sensor:'TS0203',gas_detector:'TS0204',smoke_detector_advanced:'TS0205',siren:'TS0216',illuminance_sensor:'TS0222',soil_sensor:'ZG-303Z',presence_sensor_radar:'ZG-204ZL',presence_sensor_ceiling:'ZG-204ZM',power_meter:'AB3257001NJ',ir_remote:'ZB-IR01'};

function download(url){
  return new Promise((ok)=>{
    https.get(url,{headers:{'User-Agent':'tuya-img/1.0'}},res=>{
      if(res.statusCode>=300&&res.statusCode<400&&res.headers.location){
        return download(res.headers.location).then(ok);
      }
      if(res.statusCode!==200){res.resume();return ok(null);}
      const ch=[];
      res.on('data',c=>ch.push(c));
      res.on('end',()=>ok(Buffer.concat(ch)));
    }).on('error',()=>ok(null));
  });
}

async function resize(buf,size){
  return sharp(buf).resize(size,size,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
}

async function fetchImg(model){
  var base='https://www.zigbee2mqtt.io/images/devices/';
  var buf=await download(base+encodeURIComponent(model)+'.png');
  if(buf&&buf.length>1000)return buf;
  return null;
}

function getPIDs(drv){
  var f=path.join(DDIR,drv,'driver.compose.json');
  try{var j=JSON.parse(fs.readFileSync(f,'utf8'));
  return(j.zigbee&&j.zigbee.productId)||[];}catch{return[];}
}
function isPlaceholder(drv){
  var f=path.join(DDIR,drv,'assets','images','large.png');
  if(!fs.existsSync(f))return true;
  return md5(fs.readFileSync(f))===PLACEHOLDER;
}
function rankPIDs(pids){
  var s=[],g=[];
  for(var i=0;i<pids.length;i++){
    if(/^TS\d{3,5}$/.test(pids[i]))g.push(pids[i]);
    else s.push(pids[i]);}
  return s.concat(g);}

async function processDriver(drv){
  var imgDir=path.join(DDIR,drv,'assets','images');
  var lp=path.join(imgDir,'large.png'),sp=path.join(imgDir,'small.png');
  if(!isPlaceholder(drv)&&!FORCE)return{drv,s:'skip',r:'custom'};
  if(COPY[drv]){var sf=path.join(DDIR,COPY[drv],'assets','images','large.png');
    if(fs.existsSync(sf)&&md5(fs.readFileSync(sf))!==PLACEHOLDER){
      if(DRY)return{drv,s:'dry',r:'copy<-'+COPY[drv]};
      var sb=fs.readFileSync(sf);fs.mkdirSync(imgDir,{recursive:true});
      fs.writeFileSync(lp,sb);var ssm=path.join(DDIR,COPY[drv],'assets','images','small.png');
      if(fs.existsSync(ssm))fs.writeFileSync(sp,fs.readFileSync(ssm));
      return{drv,s:'ok',r:'copy<-'+COPY[drv]};}}
  var pids=rankPIDs(getPIDs(drv));
  if(Z2M[drv])pids.unshift(Z2M[drv]);
  if(!pids.length)return{drv,s:'miss',r:'no PIDs, no fallback'};
  var buf=null,mod=null;
  for(var i=0;i<Math.min(pids.length,8);i++){
    buf=await fetchImg(pids[i]);
    if(buf){mod=pids[i];break;}
    await sleep(400);}
  if(!buf)return{drv,s:'miss',r:pids.slice(0,3).join(',')};
  if(DRY)return{drv,s:'dry',r:mod+' '+Math.round(buf.length/1024)+'KB'};
  fs.mkdirSync(imgDir,{recursive:true});
  var lg=await resize(buf,500),sm=await resize(buf,75);
  fs.writeFileSync(lp,lg);fs.writeFileSync(sp,sm);
  return{drv,s:'ok',r:mod+' L:'+lg.length+' S:'+sm.length};
}

async function main(){
  console.log('=== Auto-Replace Images ===');
  var all=fs.readdirSync(DDIR).filter(d=>fs.statSync(path.join(DDIR,d)).isDirectory()&&fs.existsSync(path.join(DDIR,d,'driver.compose.json'))).sort();
  if(ONLY)all=all.filter(d=>d.includes(ONLY));
  var dirs=[...all.filter(d=>!COPY[d]),...all.filter(d=>!!COPY[d])];
  var res={ok:0,skip:0,miss:0,dry:0,err:0};
  for(var d of dirs){try{var r=await processDriver(d);res[r.s]=(res[r.s]||0)+1;console.log('['+r.s+']',d,r.r);if(r.s==='ok')await sleep(500);}catch(e){res.err++;console.log('[!]',d,e.message);}}
  console.log('Done:',JSON.stringify(res));}
main().catch(e=>{console.error(e);process.exit(1);});
