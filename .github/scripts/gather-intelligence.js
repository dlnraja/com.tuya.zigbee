#!/usr/bin/env node
'use strict';
// v5.11.27: Gather Intelligence — collects ALL state data into a structured context
// for the forum responder's ONE reply. Includes: external sources, forks, PRs, issues,
// interviews, enrichment, pattern detection, GitHub activity, image analysis results.
const fs=require('fs'),path=require('path');
const SD=path.join(__dirname,'..','state');
const rj=f=>{try{return JSON.parse(fs.readFileSync(path.join(SD,f),'utf8'))}catch{return null}};

function gatherAll(){
  const ctx={};

  // 1. External sources (Z2M, ZHA, deCONZ, Blakadder, Hubitat)
  const ext=rj('external-sources-report.json');
  if(ext){
    ctx.externalSources={
      total:ext.totalExternal||0,
      supported:ext.supported||0,
      unsupported:ext.unsupported||0,
      sources:ext.sources||{},
      topUnsupported:(ext.topUnsupported||[]).slice(0,10).map(u=>({fp:u.fp,src:u.sources})),
      ai:ext.aiAnalysis?ext.aiAnalysis.substring(0,500):null
    };
  }

  // 2. GitHub PRs & Issues (JohanBendz + dlnraja)
  const gh=rj('github-scan-report.json');
  if(gh&&gh.findings){
    const openIssues=(gh.findings.issues||[]).filter(i=>i.state==='open').slice(0,8);
    const openPRs=(gh.findings.prs||[]).filter(p=>p.state==='open'&&!p.merged).slice(0,10);
    ctx.github={
      openIssues:openIssues.map(i=>({repo:i.repo,num:i.number,title:i.title,user:i.user,fps:i.newFPs||i.existingFPs?.map(f=>f.fp)||[]})),
      openPRs:openPRs.map(p=>({repo:p.repo,num:p.number,title:p.title,user:p.user,fps:p.fps||[]})),
      ai:gh.aiSummary?gh.aiSummary.substring(0,500):null
    };
  }

  // 3. Fork scan (new FPs from forks)
  const forks=rj('fork-scan-state.json');
  if(forks&&forks.newFPs){
    ctx.forkFingerprints=(Array.isArray(forks.newFPs)?forks.newFPs:[]).slice(0,10);
  }

  // 4. JohanBendz full scan
  const johan=rj('johan-full-scan.json');
  if(johan){
    ctx.johanBendz={
      allNewFPs:(johan.allNewFPs||[]).slice(0,10),
      summary:johan.summary?String(johan.summary).substring(0,400):null
    };
  }

  // 5. Enrichment (cross-reference with Z2M/ZHA device functionality)
  const enr=rj('enrichment-report.json');
  if(enr&&(enr.newDevices||enr.newDPs)){
    ctx.enrichment={newDevices:enr.newDevices||0,newDPs:enr.newDPs||0,details:enr.details?String(enr.details).substring(0,300):null};
  }

  // 6. Pattern detection (recurring issues)
  const pat=rj('pattern-data.json');
  if(pat&&pat.suggestions){
    ctx.patterns=pat.suggestions.slice(0,5).map(s=>({name:s.pattern,count:s.count,priority:s.priority,topFPs:(s.topFPs||[]).slice(0,3)}));
  }

  // 7. Recent interviews (device requests with details)
  const intSum=rj('interview-summary.json');
  if(intSum){
    ctx.interviews={
      total:intSum.totalInterviews||0,
      sources:intSum.sources||{},
      uniqueFPs:(intSum.uniqueFingerprints||[]).slice(0,15)
    };
  }

  // 8. Forum activity summary
  const fac=rj('forum-activity-report.json');
  if(fac){
    ctx.forumActivity={
      topics:fac.topicCount||0,
      activity:fac.activityCount||0,
      totalFPs:fac.totalFPs||0,
      unsupportedFPs:(fac.unsupportedFPs||[]).slice(0,10),
      ai:fac.aiAnalysis?fac.aiAnalysis.substring(0,500):null
    };
  }

  // 9. Nightly processor results
  const nightly=rj('nightly-report.json');
  if(nightly){
    ctx.nightly={version:nightly.appVersion,forum:nightly.forum||0,github:nightly.github||0};
  }

  // 10. Bot self-audit
  const audit=rj('bot-audit-report.md');
  if(audit) ctx.botAudit=audit.substring(0,300);

  // 11. Issue manager (recent responses)
  const ism=rj('issue-manager-report.json');
  if(ism){
    ctx.issueManager={responded:ism.responded||0,closed:ism.closed||0,labeled:ism.labeled||0,processed:ism.issuesProcessed||0};
  }

  // 12. Gmail diagnostics (user device reports via email)
  const gmail=rj('gmail-diagnostics-report.json');
  if(gmail){
    ctx.gmail={total:gmail.totalProcessed||0,newFPs:(gmail.newFingerprints||[]).slice(0,10),
      issues:(gmail.issues||[]).slice(0,5).map(i=>({subject:i.subject,fp:i.fingerprint,issue:i.issue}))};
  }

  // 13. Device diagnostics (crash logs, pairing failures)
  const diag=rj('device-diagnostics-report.json');
  if(diag){
    ctx.deviceDiag={total:diag.totalDevices||0,failures:diag.pairingFailures||0,
      crashes:(diag.crashes||[]).slice(0,5),topIssues:(diag.topIssues||[]).slice(0,5)};
  }

  // 14. Image analysis results (screenshots, device photos)
  const imgs=rj('image-analysis-report.json');
  if(imgs){
    ctx.images={total:imgs.totalAnalyzed||0,
      findings:(imgs.findings||[]).slice(0,5).map(f=>({url:f.url,result:String(f.result||'').substring(0,150)}))};
  }

  // 15. Monthly comprehensive report (AI summary)
  const monthly=rj('monthly-report.json');
  if(monthly&&monthly.aiSummary){
    ctx.monthlySummary=String(monthly.aiSummary).substring(0,500);
  }

  // 16. Forum PM scanner (private messages with device info)
  const pms=rj('forum-pm-report.json');
  if(pms){
    ctx.forumPMs={total:pms.totalScanned||0,newFPs:(pms.newFingerprints||[]).slice(0,10)};
  }

  // 17. Ecosystem scan
  const eco=rj("ecosystem-scan-report.json");
  if(eco){ctx.ecosystem={repos:Object.keys(eco.repos||{}).length,fps:(eco.allFPs||[]).slice(0,15),unsup:(eco.crossRef||[]).filter(x=>!x.supported).map(x=>x.fp).slice(0,10)}}

  return ctx;
}

/**
 * Format intelligence into a concise context string for the AI prompt.
 * Max ~3000 chars — 16 sources cross-referenced.
 */
function formatForAI(ctx){
  let s='## INTELLIGENCE CONTEXT (cross-referenced device data)\n\n';

  if(ctx.externalSources){
    const e=ctx.externalSources;
    s+='### External DBs (Z2M/ZHA/deCONZ)\n';
    s+='Known: '+e.total+' devices | Supported: '+e.supported+' | New: '+e.unsupported+'\n';
    if(e.topUnsupported?.length)s+='Top new: '+e.topUnsupported.map(u=>'`'+u.fp+'` ('+u.src.join(',')+')').join(', ')+'\n';
    s+='\n';
  }

  if(ctx.github){
    s+='### GitHub Activity\n';
    if(ctx.github.openPRs?.length)s+='Open PRs: '+ctx.github.openPRs.map(p=>'[#'+p.num+']('+p.repo+') '+p.title.substring(0,40)).join(' | ')+'\n';
    if(ctx.github.openIssues?.length)s+='Open issues: '+ctx.github.openIssues.map(i=>'#'+i.num+' '+i.title.substring(0,30)).join(' | ')+'\n';
    s+='\n';
  }

  if(ctx.interviews){
    s+='### Device Interviews: '+ctx.interviews.total+' ('+Object.entries(ctx.interviews.sources).map(([k,v])=>k+':'+v).join(', ')+')\n';
    if(ctx.interviews.uniqueFPs?.length)s+='FPs: '+ctx.interviews.uniqueFPs.slice(0,8).map(f=>'`'+f+'`').join(', ')+'\n';
    s+='\n';
  }

  if(ctx.forumActivity){
    s+='### Forum: '+ctx.forumActivity.totalFPs+' FPs tracked, '+ctx.forumActivity.activity+' activities\n';
    if(ctx.forumActivity.unsupportedFPs?.length)s+='Unsupported: '+ctx.forumActivity.unsupportedFPs.slice(0,6).map(f=>'`'+f+'`').join(', ')+'\n';
    s+='\n';
  }

  if(ctx.patterns?.length){
    s+='### Recurring Patterns\n';
    for(const p of ctx.patterns)s+='- '+p.name+': '+p.count+' reports ('+p.priority+')\n';
    s+='\n';
  }

  if(ctx.johanBendz){
    const jSum=typeof ctx.johanBendz.summary==='string'?ctx.johanBendz.summary:JSON.stringify(ctx.johanBendz.summary||'').substring(0,200);
    const jFPs=(ctx.johanBendz.allNewFPs||[]).filter(f=>f.fp&&f.fp.length>6).map(f=>'`'+f.fp+'`').join(', ');
    if(jSum||jFPs)s+='### JohanBendz Fork\n'+(jFPs?'New FPs: '+jFPs+'\n':'')+(jSum&&typeof jSum==='string'&&jSum.length>5?jSum.substring(0,200)+'\n':'')+'\n';
  }

  if(ctx.gmail&&(ctx.gmail.total||ctx.gmail.newFPs?.length)){
    s+='### User Reports: '+ctx.gmail.total+' device reports received\n';
    if(ctx.gmail.newFPs?.length)s+='New FPs: '+ctx.gmail.newFPs.slice(0,6).map(f=>'`'+f+'`').join(', ')+'\n';
    s+='\n';
  }

  if(ctx.deviceDiag&&(ctx.deviceDiag.total||ctx.deviceDiag.failures)){
    s+='### Device Status: '+ctx.deviceDiag.total+' devices, '+ctx.deviceDiag.failures+' failures\n';
    if(ctx.deviceDiag.topIssues?.length)s+='Top: '+ctx.deviceDiag.topIssues.slice(0,3).map(i=>String(i.issue||i).substring(0,60)).join(' | ')+'\n';
    s+='\n';
  }

  if(ctx.images&&ctx.images.total){
    s+='### Image Context: '+ctx.images.total+' images reviewed\n';
    s+='\n';
  }

  if(ctx.forumPMs&&(ctx.forumPMs.total||ctx.forumPMs.newFPs?.length)){
    s+='### Forum PMs: '+ctx.forumPMs.total+' reviewed\n';
    if(ctx.forumPMs.newFPs?.length)s+='New FPs: '+ctx.forumPMs.newFPs.slice(0,6).map(f=>'`'+f+'`').join(', ')+'\n';
    s+='\n';
  }

  if(ctx.ecosystem){
    s+="### Ecosystem: "+ctx.ecosystem.repos+" repos scanned\n";
    if(ctx.ecosystem.fps&&ctx.ecosystem.fps.length)s+="FPs: "+ctx.ecosystem.fps.slice(0,8).map(f=>"`"+f+"`").join(", ")+"\n";
    if(ctx.ecosystem.unsup&&ctx.ecosystem.unsup.length)s+="Unsupported: "+ctx.ecosystem.unsup.slice(0,6).map(f=>"`"+f+"`").join(", ")+"\n";
    s+="\n";
  }

  return s;
}

if(require.main===module){
  const ctx=gatherAll();
  console.log(formatForAI(ctx));
  console.log('\n--- Raw stats ---');
  for(const[k,v]of Object.entries(ctx)){
    if(typeof v==='object'&&!Array.isArray(v))console.log(k+':',JSON.stringify(v).substring(0,120));
    else console.log(k+':',Array.isArray(v)?v.length+' items':v);
  }
}

module.exports={gatherAll,formatForAI};
