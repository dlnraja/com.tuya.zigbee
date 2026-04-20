#!/usr/bin/env node
'use strict';
const fs=require('fs'),p=require('path'),SD=p.join(__dirname,'..','state');
const load=f=>{try{return JSON.parse(fs.readFileSync(p.join(SD,f),'utf8'))}catch{return null}};
const exp=load('expectations-ref.json'),forum=load('forum-activity-report.json');
const gh=load('github-scan-report.json'),diag=load('diagnostics-report.json');
const crossref=load('device-crossref.json'),enrichment=load('enrichment-report.json');
const fpConflicts=load('fingerprint-conflicts.json');
const report={ts:new Date().toISOString(),correlations:[],actionable:[],resolved:[],patterns:[]};

// --- ADVANCED 5-SOURCE CROSS-REFERENCING INJECTION ---
// Cross-references diagnostics, forum, expectations, github, AND external Zigbee sources
if (diag && Array.isArray(diag.processed)) {
    for (const d of diag.processed) {
        if (!d.ai_cross_ref) continue;
        let confidence = 0;
        let matchedSources = 0;
        if (JSON.stringify(forum || {}).includes(d.id)) matchedSources++;
        if (JSON.stringify(gh || {}).includes(d.id)) matchedSources++;
        if (d.ai_cross_ref.known_z2m_quirks) matchedSources++;
        if (d.ai_cross_ref.suggested_driver) matchedSources++;
        if (matchedSources >= 2) {
           report.correlations.push({
               type: 'deep_5_source_match',
               diag_id: d.id,
               driver: d.ai_cross_ref.suggested_driver,
               z2m_quirk: d.ai_cross_ref.known_z2m_quirks,
               inferred: d.ai_cross_ref.inferred_device_type,
               confidence: matchedSources * 20
           });
        }
    }
}

if(exp&&exp.pending)for(const u of exp.pending){
  if(['NEEDS FP','NEEDS DIAG','NEW BUG'].includes(u.status))
    report.actionable.push({user:u.user,device:u.device,status:u.status,note:u.note||''});
}
if(crossref&&crossref.resolved)report.resolved=crossref.resolved;
if(crossref&&crossref.pending)for(const p2 of crossref.pending){
  if(!report.actionable.find(a=>a.user===p2.user))report.actionable.push(p2);
}
if(forum&&forum.unsupportedFPs&&diag){
  for(const fp of forum.unsupportedFPs){
    if(JSON.stringify(diag).includes(fp))report.correlations.push({type:'forum+diag',fp});
  }
}
if(exp&&exp.patterns)for(const pat of exp.patterns){
  if(pat.count>=3)report.patterns.push(pat);
}
if(fpConflicts&&Array.isArray(fpConflicts)){
  for(const c of fpConflicts.slice(0,10))report.correlations.push({type:'fp_conflict',fp:c.fp||c.manufacturerName});
}
// v5.13.3: Flow card handler audit
const DD=p.join(__dirname,'..','..','drivers');
report.flowAudit=[];report.mainsBatteryIssues=[];
try{for(const dir of fs.readdirSync(DD)){
  const ff=p.join(DD,dir,'driver.flow.compose.json'),df=p.join(DD,dir,'driver.js');
  if(fs.existsSync(ff)){try{
    const flow=JSON.parse(fs.readFileSync(ff,'utf8')),drv=fs.readFileSync(df,'utf8');
    const acts=(flow.actions||[]).length;
    if(acts>0&&!drv.includes('registerRunListener')&&!drv.includes('_registerFlowCards'))
      report.flowAudit.push({driver:dir,actions:acts});
  }catch{}}
  const devf=p.join(DD,dir,'device.js');
  if(fs.existsSync(devf)){const c=fs.readFileSync(devf,'utf8');
    if(c.includes('mainsPowered')&&c.includes('return true')){
      const dc=p.join(DD,dir,'driver.compose.json');
      if(fs.existsSync(dc)){const j=JSON.parse(fs.readFileSync(dc,'utf8'));
        if((j.capabilities||[]).includes('measure_battery')&&!c.includes('removeCapability'))
          report.mainsBatteryIssues.push(dir);
      }
    }
  }
}}catch{}
console.log('Cross-ref:',report.correlations.length,'corr,',report.actionable.length,'actionable,',report.resolved.length,'resolved,',report.flowAudit.length,'flow issues,',report.mainsBatteryIssues.length,'mains-battery issues');
fs.mkdirSync(SD,{recursive:true});
fs.writeFileSync(p.join(SD,'cross-ref-report.json'),JSON.stringify(report,null,2));
