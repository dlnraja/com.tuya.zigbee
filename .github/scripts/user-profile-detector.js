#!/usr/bin/env node
'use strict';

const { CLUSTERS } = require('../../lib/constants/ZigbeeConstants.js');

const fs=require('fs'),path=require('path');
const SD=path.join(__dirname,'..','state');
const PROFILE={DEV:'developer',POWER:'power-user',END:'end-user'};
let _exp=null;
function loadExp(){if(_exp)return _exp;try{_exp=JSON.parse(fs.readFileSync(path.join(SD,'expectations-ref.json'),'utf8'))}catch{_exp={userProfiles:[],pending:[]}}return _exp}
function detectFromGitHub(username,issueBody){
  const signals={hasInterview:false,hasJSON:false,hasClusters:false,hasDPref:false,hasCodeBlock:false,hasPR:false,mentionsZ2M:false,mentionsZHA:false};
  const t=(issueBody||'');
  signals.hasInterview=/endpointDescriptors|inputClusters|outputClusters/.test(t);
  signals.hasJSON=/^\s*\{[\s\S]{50,}\}/m.test(t);
  signals.hasClusters=/cluster\s*0x|cluster\s*\d{4,5}|CLUSTERS.TUYA_EF00|CLUSTERS.TUYA_EF00/i.test(t);
  signals.hasDPref=/\bDP\s*\d+|datapoint|tuya\s*DP/i.test(t);
  signals.hasCodeBlock=/```[\s\S]{20,}```/.test(t);
  signals.mentionsZ2M=/zigbee2mqtt|z2m/i.test(t);
  signals.mentionsZHA=/zha|zigpy/i.test(t);
  let score=0;
  if(signals.hasInterview)score+=2;
  if(signals.hasJSON)score+=1;
  if(signals.hasClusters)score+=3;
  if(signals.hasDPref)score+=3;
  if(signals.hasCodeBlock)score+=2;
  if(signals.mentionsZ2M)score+=1;
  if(signals.mentionsZHA)score+=2;
  const exp=loadExp();
  const known=exp.userProfiles?.find(u=>u.name?.toLowerCase()===username?.toLowerCase());
  const pending=exp.pending?.find(u=>u.user?.toLowerCase()===username?.toLowerCase());
  let profile=PROFILE.END;
  if(score>=5)profile=PROFILE.DEV;
  else if(score>=2)profile=PROFILE.POWER;
  return{profile,score,signals,known:known||null,pending:pending||null,isReturning:!!(known||pending)};
}
function detectFromForum(username,postText){
  const t=(postText||'');
  let score=0;
  if(/diagnostic\s*report|diag\s*id|[a-f0-9]{8}/i.test(t))score+=1;
  if(/interview|endpointDescriptors/i.test(t))score+=2;
  if(/cluster|CLUSTERS.TUYA_EF00|DP\s*\d+/i.test(t))score+=3;
  if(/re-?pair|remove\s+and\s+add/i.test(t))score+=1;
  if(/flow|trigger|condition|action/i.test(t))score+=1;
  const exp=loadExp();
  const known=exp.userProfiles?.find(u=>u.name?.toLowerCase()===username?.toLowerCase());
  const pending=exp.pending?.find(u=>u.user?.toLowerCase()===username?.toLowerCase());
  let profile=PROFILE.END;
  if(score>=4)profile=PROFILE.DEV;
  else if(score>=2)profile=PROFILE.POWER;
  return{profile,score,known:known||null,pending:pending||null,isReturning:!!(known||pending)};
}
function getResponseHints(det){
  const h={tone:'friendly',includeSteps:true,technicalDetail:false,mentionRepair:true,askDiag:true};
  if(det.profile===PROFILE.DEV){h.tone='peer';h.includeSteps=false;h.technicalDetail=true;h.askDiag=false}
  else if(det.profile===PROFILE.POWER){h.tone='concise';h.technicalDetail=false}
  if(det.isReturning&&det.pending){h.contextNote='Returning user with pending: '+det.pending.status+'  '+det.pending.note}
  if(det.isReturning&&det.known){h.contextNote='Known user ('+det.known.status+'). Last fix: v'+det.known.latestFix?.ver+'  '+det.known.latestFix?.fix}
  return h;
}
function buildPromptContext(det){
  let ctx='';
  ctx+='User profile: '+det.profile+(det.isReturning?' (RETURNING USER)':'')+'\n';
  if(det.profile===PROFILE.DEV)ctx+='This user is technical  talk peer-to-peer, skip basic steps, mention clusters/DPs if relevant.\n';
  else if(det.profile===PROFILE.POWER)ctx+='This user knows Homey well  be concise, skip obvious steps, focus on the fix.\n';
  else ctx+='This user may be non-technical  explain clearly with simple steps, be encouraging.\n';
  if(det.known)ctx+='KNOWN USER: '+det.known.name+' ('+det.known.status+'). Devices: '+det.known.devices+'. Last fix: v'+(det.known.latestFix?.ver||'?')+'\n';
  if(det.pending)ctx+='PENDING ISSUE: '+det.pending.device+' ('+det.pending.status+'): '+det.pending.note+'\n';
  return ctx;
}
module.exports={PROFILE,detectFromGitHub,detectFromForum,getResponseHints,buildPromptContext};
