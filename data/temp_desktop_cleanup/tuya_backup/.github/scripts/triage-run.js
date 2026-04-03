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
  const parts=found.map(([m,d])=>{
    const drivers=Array.isArray(d)?d:[d];
    return '`'+m+'` → **'+drivers[0]+'**';
  });
  const fpList=parts.length===1?parts[0]:parts.join(', ');
  return `Already in the [Universal Tuya Zigbee fork](https://github.com/dlnraja/com.tuya.zigbee) v${VER}: ${fpList}.\n\nGrab it here: https://homey.app/a/com.dlnraja.tuya.zigbee/test/\n\nRemove and re-pair after installing. If something's off, drop a diagnostic report ID on the [forum thread](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352).`;
}

function buildUnsupportedMsg(missing){
  return `\`${missing.join('`, `')}\` ${missing.length===1?'isn\'t':'aren\'t'} in the database yet — logged for the next release.\n\nA [device interview](https://tools.developer.homey.app) would help speed things up. Z2M/ZHA pages or [Blakadder](https://zigbee.blakadder.com) links are useful too.\n\nProgress updates on the [forum thread](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352).`;
}

function buildPRMsg(found,missing){
  let msg='Thanks for this.\n\n';
  if(found.length){
    const items=found.map(([m,d])=>'`'+m+'` ('+d+')').join(', ');
    msg+='Already in our fork v'+VER+': '+items+'.\n\n';
  }
  if(missing.length){
    msg+='New ones we\'ll pick up: `'+missing.join('`, `')+'`.\n\n';
  }
  msg+='Tracked in [dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee).';
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
  const alreadyTriaged=wasTriaged(it.number);
  if(alreadyTriaged){
    iTriaged++;
    // v5.11.47: Stale sweep — close already-triaged items where all FPs are supported
    const mfrs2=extractMfrFromText(`${it.title||''} ${it.body||''}`);
    const allSupp2=mfrs2.length>0&&mfrs2.every(m=>fps.has(m));
    if(allSupp2&&!DRY&&CAN_CLOSE){
      try{gh(`issue close ${it.number} -R ${REPO} -r "completed" -c "All fingerprints supported in v${VER}. Closing as resolved."`);iClosed++;console.log(`  [SWEEP] Closed #${it.number}`);}catch{}
    }
    continue;
  }
  const mfrs=extractMfrFromText(`${it.title||''} ${it.body||''}`);
  if(!mfrs.length)continue;
  const found=mfrs.filter(m=>fps.has(m)).map(m=>[m,findAllDrivers(m)]);
  const missing=mfrs.filter(m=>!fps.has(m));
  let msg='';
  if(found.length&&!missing.length) msg=buildSupportedMsg(found);
  else if(missing.length&&!found.length) msg=buildUnsupportedMsg(missing);
  else if(found.length&&missing.length){
    msg=buildSupportedMsg(found)+`\n\n---\n\`${missing.join('\`, \`')}\` ${missing.length===1?'isn\'t':'aren\'t'} in there yet — logged for next release.`;
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
  const alreadyTriaged2=wasTriaged(pr.number);
  if(alreadyTriaged2){
    pTriaged++;
    // v5.11.47: Stale sweep — close already-triaged PRs where all FPs supported
    const mfrs3=extractMfrFromText(`${pr.title||''} ${pr.body||''}`);
    const allSupp3=mfrs3.length>0&&mfrs3.every(m=>fps.has(m));
    if(allSupp3&&!DRY&&CAN_CLOSE){
      try{gh(`pr close ${pr.number} -R ${REPO} -c "All fingerprints integrated in v${VER}. Thanks!"`);pClosed++;console.log(`  [SWEEP] Closed PR #${pr.number}`);}catch{}
    }
    continue;
  }
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
