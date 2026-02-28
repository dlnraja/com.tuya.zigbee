#!/usr/bin/env node
'use strict';
const {execSync}=require('child_process');
const {loadFingerprints,findDriver,findAllDrivers,extractMfrFromText}=require('./load-fingerprints');
const {sleep}=require('./retry-helper');
const fs=require('fs');
const path=require('path');

const DRY=process.env.DRY_RUN==='true';
const REPO=process.env.TARGET_REPO||'JohanBendz/com.tuya.zigbee';
const CAN_CLOSE=REPO.startsWith('dlnraja/');
const VER=process.env.APP_VERSION||'latest';
const DRVC=process.env.DRIVER_COUNT||'138';
const FPC=process.env.FP_COUNT||'5579';
const TAG='<!-- tuya-triage-bot -->';
const os=require('os');
const SUMMARY=process.env.GITHUB_STEP_SUMMARY||(process.platform==='win32'?'NUL':'/dev/null');

function gh(c){return execSync(`gh ${c}`,{encoding:'utf8',timeout:60000,maxBuffer:50*1024*1024}).trim();}

function wasTriaged(num){
  try{return gh(`api repos/${REPO}/issues/${num}/comments --jq ".[].body"`).includes(TAG);}
  catch{return false;}
}

function postComment(num,body){
  if(DRY){console.log(`[DRY] #${num}: ${body.slice(0,100)}...`);return;}
  const tmpFile=path.join(os.tmpdir(),'_triage_msg.md');
  fs.writeFileSync(tmpFile,`${TAG}\n${body}`);
  try{gh(`issue comment ${num} -R ${REPO} -F "${tmpFile}"`);console.log(`Commented on ${REPO}#${num}`);}
  catch(e){console.log(`Skip comment ${REPO}#${num}: ${e.message.slice(0,80)}`);}
}

function buildSupportedMsg(found){
  const lines=found.map(([m,d])=>{
    const drivers=Array.isArray(d)?d:[d];
    return `- \`${m}\` -> **${drivers.join('**, **')}**${drivers.length>1?' (multi-productId)':''}`;
  }).join('\n');
  return `Hi! This device is **already supported** in the [Universal Tuya Zigbee fork](https://github.com/dlnraja/com.tuya.zigbee) v${VER} (${DRVC} drivers, ${FPC}+ fingerprints).\n\n${lines}\n\n**Install:** https://homey.app/a/com.dlnraja.tuya.zigbee/test/\n\nAfter installing, delete and re-pair your device. If issues persist, share a diagnostic report ID on the [test forum](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352).`;
}

function buildUnsupportedMsg(missing){
  return `Hi! The fingerprint(s) \`${missing.join('`, `')}\` are **not yet in our database**. We've logged them for the next release.\n\nTo speed up support, please provide:\n1. Device interview from https://tools.developer.homey.app\n2. Z2M/ZHA device page link\n3. Blakadder page (https://zigbee.blakadder.com)\n\n**Forum:** https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352`;
}

function buildPRMsg(found,missing){
  let msg=`Hi! Thanks for this PR.\n\n`;
  if(found.length){
    msg+=`**Already in our fork** (v${VER}):\n`;
    msg+=found.map(([m,d])=>`- \`${m}\` -> **${d}**`).join('\n')+'\n\n';
  }
  if(missing.length){
    msg+=`**New fingerprints we will add:**\n`;
    msg+=missing.map(m=>`- \`${m}\``).join('\n')+'\n\n';
  }
  msg+=`Tracked in [dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee).`;
  return msg;
}

// Main
async function main(){
const fps=loadFingerprints();
console.log(`Loaded ${fps.size} fingerprints. Scanning ${REPO}...`);
const summary=[];

// Issues
const issues=JSON.parse(gh(`issue list -R ${REPO} -s open -L 50 --json number,title,body`));
let iTriaged=0,iCommented=0,iClosed=0;
for(const it of issues){
  await sleep(400); // Rate-limit: 0.4s between API calls
  if(wasTriaged(it.number)){iTriaged++;continue;}
  const mfrs=extractMfrFromText(`${it.title||''} ${it.body||''}`);
  if(!mfrs.length)continue;
  const found=mfrs.filter(m=>fps.has(m)).map(m=>[m,findAllDrivers(m)]);
  const missing=mfrs.filter(m=>!fps.has(m));
  let msg='';
  if(found.length&&!missing.length) msg=buildSupportedMsg(found);
  else if(missing.length&&!found.length) msg=buildUnsupportedMsg(missing);
  else if(found.length&&missing.length){
    msg=buildSupportedMsg(found)+`\n\n---\n**Not yet supported:** \`${missing.join('`, `')}\` - logged for next release.`;
  }
  if(msg){postComment(it.number,msg);iCommented++;}
  // Auto-close if ALL FPs supported (only on own repo)
  if(found.length&&!missing.length&&!DRY&&CAN_CLOSE){
    try{gh(`issue close ${it.number} -R ${REPO} -r "not planned" -c "All fingerprints already supported in v${VER}."`);iClosed++;console.log(`  Closed #${it.number}`);}catch{}
  }
}

// PRs
const prs=JSON.parse(gh(`pr list -R ${REPO} -s open -L 30 --json number,title,body`));
let pTriaged=0,pCommented=0,pClosed=0;
for(const pr of prs){
  await sleep(400); // Rate-limit: 0.4s between API calls
  if(wasTriaged(pr.number)){pTriaged++;continue;}
  const mfrs=extractMfrFromText(`${pr.title||''} ${pr.body||''}`);
  if(!mfrs.length)continue;
  const found=mfrs.filter(m=>fps.has(m)).map(m=>[m,findAllDrivers(m)]);
  const missing=mfrs.filter(m=>!fps.has(m));
  if(found.length||missing.length){
    postComment(pr.number,buildPRMsg(found,missing));
    pCommented++;
  }
  // Auto-close PR if ALL FPs supported (only on own repo)
  if(found.length&&!missing.length&&!DRY&&CAN_CLOSE){
    try{gh(`pr close ${pr.number} -R ${REPO} -c "All fingerprints already integrated in v${VER}."`);pClosed++;console.log(`  Closed PR #${pr.number}`);}catch{}
  }
}

const report=`## ${REPO} Triage\n| Metric | Count |\n|--------|-------|\n| Open Issues | ${issues.length} |\n| Already triaged | ${iTriaged} |\n| New comments | ${iCommented} |\n| Issues closed | ${iClosed} |\n| Open PRs | ${prs.length} |\n| PR comments | ${pCommented} |\n| PRs closed | ${pClosed} |`;
console.log(report);
fs.appendFileSync(SUMMARY,report+'\n');
}
main().catch(e=>{console.error(e.message);process.exit(0)});
