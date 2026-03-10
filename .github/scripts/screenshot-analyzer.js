'use strict';
const fs=require('fs'),path=require('path');
const{analyzeImage}=require('./ai-helper');

const PROMPTS={
  deep:`Analyze this screenshot from a Tuya/Zigbee smart home app. Extract ALL visible information as JSON:
{
  "app": "which app (Homey/Tuya Smart/SmartLife/Z2M/ZHA/other)",
  "fingerprints": ["_TZxxxx_xxx manufacturerNames if visible"],
  "productIds": ["TSxxxx if visible"],
  "deviceType": "sensor/switch/cover/thermostat/etc",
  "deviceName": "visible device name",
  "capabilities": ["list ALL visible sensor readings, controls, toggles"],
  "readings": {"capability": "value with unit"},
  "settings": ["visible settings/options"],
  "errors": ["any error messages or warnings"],
  "missingData": ["sensors showing no data or dashes"],
  "powerSource": "battery/mains/usb/unknown",
  "uiFeatures": ["special UI elements: graphs, schedules, scenes, etc"],
  "clusterInfo": ["any visible cluster IDs or DP numbers"],
  "firmwareInfo": "any visible firmware/version info",
  "competitorFeatures": ["features this app has that might be missing in our app"]
}
Return ONLY valid JSON. If not a smart home screenshot, return NULL.`,

  compare:`Analyze this screenshot of a Tuya/smart home app. Focus on:
1. What CAPABILITIES does this device show? (sensors, controls, readings)
2. What SETTINGS are available?
3. What UI FEATURES exist? (graphs, history, schedules, automation)
4. What DATA VALUES are shown with units?
5. Any features that a competing Homey app should implement?
Return JSON: {capabilities:[], settings:[], uiFeatures:[], readings:{}, recommendations:[]}`,

  error:`Analyze this screenshot for error information:
1. Error messages or warnings visible
2. Device status (online/offline/pairing)
3. Missing or broken data
4. Configuration issues
Return JSON: {errors:[], status:"", missingData:[], configIssues:[]}`,

  fingerprint:`Extract Tuya fingerprints (_TZxxxx_xxx, TSxxxx), device type, error messages from this image. Return JSON {fingerprints:[], deviceType:"", info:""} or NULL.`
};

function classifyScreenshot(context){
  if(!context)return'deep';
  const lc=(context||'').toLowerCase();
  if(/error|crash|bug|broken|not work/i.test(lc))return'error';
  if(/other app|tuya smart|smartlife|competitor|compare/i.test(lc))return'compare';
  if(/fingerprint|pair|interview|cluster/i.test(lc))return'fingerprint';
  return'deep';
}

async function analyzeScreenshot(imageUrl,context){
  const type=classifyScreenshot(context);
  const prompt=PROMPTS[type];
  const raw=await analyzeImage(imageUrl,prompt);
  if(!raw)return null;
  let parsed=null;
  try{
    const jsonMatch=raw.match(/\{[\s\S]*\}/);
    if(jsonMatch)parsed=JSON.parse(jsonMatch[0]);
  }catch{}
  return{
    raw,
    parsed,
    type,
    imageUrl,
    timestamp:new Date().toISOString()
  };
}

async function analyzeMultipleScreenshots(imageUrls,context){
  const results=[];
  for(const url of imageUrls.slice(0,5)){
    const r=await analyzeScreenshot(url,context);
    if(r)results.push(r);
  }
  return mergeAnalyses(results);
}

function mergeAnalyses(results){
  if(!results.length)return null;
  const merged={
    fingerprints:new Set(),
    productIds:new Set(),
    capabilities:new Set(),
    readings:{},
    settings:new Set(),
    errors:[],
    missingData:[],
    uiFeatures:new Set(),
    competitorFeatures:new Set(),
    deviceType:null,
    deviceName:null,
    app:null,
    powerSource:null,
    analyses:results
  };
  for(const r of results){
    const p=r.parsed;if(!p)continue;
    if(p.fingerprints)p.fingerprints.forEach(f=>merged.fingerprints.add(f));
    if(p.productIds)p.productIds.forEach(f=>merged.productIds.add(f));
    if(p.capabilities)p.capabilities.forEach(f=>merged.capabilities.add(f));
    if(p.settings)p.settings.forEach(f=>merged.settings.add(f));
    if(p.uiFeatures)p.uiFeatures.forEach(f=>merged.uiFeatures.add(f));
    if(p.competitorFeatures)p.competitorFeatures.forEach(f=>merged.competitorFeatures.add(f));
    if(p.readings)Object.assign(merged.readings,p.readings);
    if(p.errors)merged.errors.push(...p.errors);
    if(p.missingData)merged.missingData.push(...p.missingData);
    if(p.deviceType&&!merged.deviceType)merged.deviceType=p.deviceType;
    if(p.deviceName&&!merged.deviceName)merged.deviceName=p.deviceName;
    if(p.app&&!merged.app)merged.app=p.app;
    if(p.powerSource&&p.powerSource!=='unknown')merged.powerSource=p.powerSource;
  }
  const toArr=s=>[...s];
  return{
    fingerprints:toArr(merged.fingerprints),
    productIds:toArr(merged.productIds),
    capabilities:toArr(merged.capabilities),
    readings:merged.readings,
    settings:toArr(merged.settings),
    errors:[...new Set(merged.errors)],
    missingData:[...new Set(merged.missingData)],
    uiFeatures:toArr(merged.uiFeatures),
    competitorFeatures:toArr(merged.competitorFeatures),
    deviceType:merged.deviceType,
    deviceName:merged.deviceName,
    app:merged.app,
    powerSource:merged.powerSource,
    imageCount:results.length
  };
}

function formatForAIContext(analysis){
  if(!analysis)return'';
  const parts=['[Screenshot Analysis]'];
  if(analysis.app)parts.push('App: '+analysis.app);
  if(analysis.deviceType)parts.push('Device: '+(analysis.deviceName||'')+' ('+analysis.deviceType+')');
  if(analysis.fingerprints?.length)parts.push('Fingerprints: '+analysis.fingerprints.join(', '));
  if(analysis.productIds?.length)parts.push('Product IDs: '+analysis.productIds.join(', '));
  if(analysis.capabilities?.length)parts.push('Visible capabilities: '+analysis.capabilities.join(', '));
  if(Object.keys(analysis.readings||{}).length)parts.push('Readings: '+JSON.stringify(analysis.readings));
  if(analysis.settings?.length)parts.push('Settings: '+analysis.settings.join(', '));
  if(analysis.errors?.length)parts.push('Errors: '+analysis.errors.join('; '));
  if(analysis.missingData?.length)parts.push('Missing data: '+analysis.missingData.join(', '));
  if(analysis.powerSource)parts.push('Power: '+analysis.powerSource);
  if(analysis.competitorFeatures?.length)parts.push('Competitor features to consider: '+analysis.competitorFeatures.join(', '));
  if(analysis.uiFeatures?.length)parts.push('UI features: '+analysis.uiFeatures.join(', '));
  return parts.join('\n');
}

function generateDriverRecommendations(analysis){
  if(!analysis)return[];
  const recs=[];
  if(analysis.powerSource==='mains'||analysis.powerSource==='usb'){
    recs.push({type:'power',msg:'Device is mains/USB powered - ensure mainsPowered=true and no battery capability'});
  }
  const capMap={
    'co2':'measure_co2','pm2.5':'measure_pm25','pm25':'measure_pm25',
    'voc':'measure_voc','hcho':'measure_formaldehyde','formaldehyde':'measure_formaldehyde',
    'temperature':'measure_temperature','humidity':'measure_humidity',
    'illuminance':'measure_luminance','lux':'measure_luminance',
    'soil moisture':'measure_humidity','conductivity':'measure_conductivity'
  };
  for(const cap of(analysis.capabilities||[])){
    const lc=cap.toLowerCase();
    for(const[key,homey]of Object.entries(capMap)){
      if(lc.includes(key))recs.push({type:'capability',msg:'Ensure '+homey+' capability exists for: '+cap});
    }
  }
  if(analysis.missingData?.length){
    recs.push({type:'data',msg:'Missing data for: '+analysis.missingData.join(', ')+' - check DP mappings'});
  }
  if(analysis.errors?.length){
    recs.push({type:'error',msg:'Errors detected: '+analysis.errors.join('; ')});
  }
  return recs;
}

module.exports={
  analyzeScreenshot,
  analyzeMultipleScreenshots,
  formatForAIContext,
  generateDriverRecommendations,
  classifyScreenshot,
  PROMPTS
};
