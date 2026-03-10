#!/usr/bin/env node
'use strict';
const fs=require('fs'),p=require('path'),SD=p.join(__dirname,'..','state');
const load=f=>{try{return JSON.parse(fs.readFileSync(p.join(SD,f),'utf8'))}catch{return null}};
const exp=load('expectations-ref.json');
const forum=load('forum-activity-report.json');
const gh=load('github-scan-report.json');
const report={ts:new Date().toISOString(),correlations:[],actionable:[]};
if(exp&&exp.pending)for(const u of exp.pending){
  if(u.status==='NEEDS FP'||u.status==='NEEDS DIAG')report.actionable.push({user:u.user,device:u.device,status:u.status});
}
console.log('Cross-ref:',report.correlations.length,'correlations,',report.actionable.length,'actionable');
fs.mkdirSync(SD,{recursive:true});
fs.writeFileSync(p.join(SD,'cross-ref-report.json'),JSON.stringify(report,null,2));
