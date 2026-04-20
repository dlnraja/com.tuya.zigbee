#!/usr/bin/env node
'use strict';
// v5.12.7: Scan Tuya ecosystem repos for FPs, PRs, issues, code patterns
const{execSync}=require('child_process');
const fs=require('fs'),path=require('path');
const SD=path.join(__dirname,'..','state');
const gh=c=>{try{return execSync('gh '+c,{encoding:'utf8',maxBuffer:10*1024*1024}).trim()}catch{return null}};
const ECO=[
  {repo:'JohanBendz/com.tuya.zigbee',cat:'Zigbee',scan:['issues','prs','forks']},
  {repo:'Drenso/com.tuya2',cat:'Cloud/WiFi',scan:['prs','issues']},
  {repo:'jurgenheine/com.tuya.cloud',cat:'Cloud',scan:['issues']},
  {repo:'heszegi/com.heszi.ledvance-wifi',cat:'WiFi Local',scan:['issues']},
  {repo:'rebtor/nl.rebtor.tuya',cat:'WiFi Local',scan:[]},
  {repo:'Drenso/athombv-node-homey-zigbeedriver',cat:'Lib',scan:[]},
  {repo:'Drenso/ewelink-api-next',cat:'Lib',scan:[]}
];
const FP_RE=/_T[A-Z][A-Z0-9]{1,3}_[a-z0-9]{6,10}/g;
function scanPRs(repo){const r=gh('pr list -R '+repo+' --limit 20 --state all --json number,title,state,updatedAt');if(!r)return[];try{return JSON.parse(r)}catch{return[]}}
function scanIssues(repo){const r=gh('issue list -R '+repo+' --limit 20 --state open --json number,title,state,labels');if(!r)return[];try{return JSON.parse(r)}catch{return[]}}
function scanForks(repo){const r=gh('api "repos/'+repo+'/forks?per_page=30&sort=newest" --jq ".[].full_name"');if(!r)return[];return r.split('\n').filter(Boolean)}
function extractFPs(text){return[...new Set((text.match(FP_RE)||[]))]}
async function main(){
  console.log('=== Tuya Ecosystem Scanner v5.12.7 ===');
  const report={timestamp:new Date().toISOString(),repos:{},allFPs:[],crossRef:[]};
  for(const src of ECO){
    console.log('\nScanning',src.repo,'['+src.cat+']...');
    const entry={cat:src.cat,prs:[],issues:[],forks:[],fps:[]};
    if(src.scan.includes('prs')){entry.prs=scanPRs(src.repo);console.log('  PRs:',entry.prs.length);entry.fps.push(...extractFPs(entry.prs.map(p=>p.title).join(' ')))}
    if(src.scan.includes('issues')){entry.issues=scanIssues(src.repo);console.log('  Issues:',entry.issues.length);entry.fps.push(...extractFPs(entry.issues.map(i=>i.title).join(' ')))}
    if(src.scan.includes('forks')){entry.forks=scanForks(src.repo);console.log('  Forks:',entry.forks.length)}
    entry.fps=[...new Set(entry.fps)];
    if(entry.fps.length)console.log('  FPs:',entry.fps.join(', '));
    report.repos[src.repo]=entry;
    report.allFPs.push(...entry.fps);
  }
  report.allFPs=[...new Set(report.allFPs)];
  // Cross-ref with our drivers
  try{
    const{findAllDrivers}=require('./load-fingerprints');
    for(const fp of report.allFPs){
      const d=findAllDrivers(fp);
      report.crossRef.push({fp,supported:d.length>0,drivers:d});
    }
    const unsup=report.crossRef.filter(c=>!c.supported);
    console.log('\n=== Cross-ref:',report.allFPs.length,'FPs,',unsup.length,'unsupported ===');
    if(unsup.length)console.log('Unsupported:',unsup.map(u=>u.fp).join(', '));
  }catch(e){console.log('Cross-ref skip:',e.message)}
  fs.mkdirSync(SD,{recursive:true});
  fs.writeFileSync(path.join(SD,'ecosystem-scan-report.json'),JSON.stringify(report,null,2));
  console.log('\nDone. Saved ecosystem-scan-report.json');
}
main().catch(e=>{console.error(e);process.exit(1)});
