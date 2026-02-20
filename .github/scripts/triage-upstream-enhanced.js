#!/usr/bin/env node
'use strict';
const{execSync}=require('child_process');
const{loadFingerprints,findAllDrivers,extractMfrFromText}=require('./load-fingerprints');
const fs=require('fs'),path=require('path'),os=require('os');
const DRY=process.env.DRY_RUN==='true';
const REPO=process.env.TARGET_REPO||'JohanBendz/com.tuya.zigbee';
const VER=process.env.APP_VERSION||'latest';
const DRVC=process.env.DRIVER_COUNT||'138';
const FPC=process.env.FP_COUNT||'5500';
const TAG='<!-- tuya-triage-bot -->';
const SCAN_FORKS=process.env.SCAN_FORKS==='true';
const SF=process.env.GITHUB_STEP_SUMMARY||'/dev/null';
const APP='https://homey.app/a/com.dlnraja.tuya.zigbee/test/';
const FORUM='https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352';
const DEV='https://tools.developer.homey.app';
const GH='https://github.com/dlnraja/com.tuya.zigbee';

function gh(c){return execSync(`gh ${c}`,{encoding:'utf8',timeout:60000,maxBuffer:50*1024*1024}).trim();}
function wasTriaged(n){try{return gh(`api repos/${REPO}/issues/${n}/comments --jq ".[].body"`).includes(TAG);}catch{return false;}}
function post(n,body){
  if(DRY){console.log(`[DRY] #${n}: ${body.slice(0,120)}...`);return;}
  const f=path.join(os.tmpdir(),'_triage.md');
  fs.writeFileSync(f,`${TAG}\n${body}`);
  gh(`issue comment ${n} -R ${REPO} -F "${f}"`);
  console.log(`Commented on ${REPO}#${n}`);
}

function supportedMsg(found){
  const lines=found.map(([m,d])=>`| \`${m}\` | **${[].concat(d).join(', ')}** |`).join('\n');
  return [
    `Hi! This device is **already supported** in [Universal Tuya Zigbee](${GH}) **v${VER}** (${DRVC} drivers, ${FPC}+ fingerprints).`,
    '',
    '| Fingerprint | Driver(s) |',
    '|---|---|',
    lines,
    '',
    '### :inbox_tray: Install',
    `- **[Homey App Store](${APP})**`,
    '- After installing, **remove and re-pair** your device.',
    '',
    '### :beetle: Having issues after install?',
    `1. Open **[Homey Developer Tools](${DEV})**`,
    '2. Select your device > **Interview** > copy the full JSON output',
    '3. Go to device settings > **Diagnostics** > copy the report ID',
    `4. Post both on our **[Forum](${FORUM})** or open an **[Issue](${GH}/issues)**`,
    '',
    '### :link: Links',
    `- [Forum](${FORUM}) | [GitHub](${GH}) | [Report Issue](${GH}/issues)`,
  ].join('\n');
}

function unsupportedMsg(missing){
  return [
    `Hi! The fingerprint(s) \`${missing.join('\`, \`')}\` are **not yet in our database**. Logged for the next release.`,
    '',
    '### :mag: To speed up support, please provide:',
    `1. **Device Interview** from [Developer Tools](${DEV}) (select device > Interview)`,
    '2. **Zigbee2MQTT** device page link if available',
    '3. **Blakadder** page: https://zigbee.blakadder.com',
    '4. **Product link** (AliExpress, Amazon, manufacturer)',
    '',
    '### :inbox_tray: Try our fork (may already work with similar devices)',
    `- **[Install](${APP})** | **[Forum](${FORUM})** | **[GitHub](${GH})**`,
  ].join('\n');
}

function prMsg(found,missing){
  let msg=`Hi! Thanks for this PR. It has been tracked in [Universal Tuya Zigbee](${GH}) **v${VER}**.\n\n`;
  if(found.length){
    msg+=`**Already in our fork:**\n`;
    msg+=found.map(([m,d])=>`- \`${m}\` -> **${[].concat(d).join(', ')}**`).join('\n')+'\n\n';
  }
  if(missing.length){
    msg+=`**New fingerprints we will integrate:**\n`;
    msg+=missing.map(m=>`- \`${m}\``).join('\n')+'\n\n';
  }
  msg+=[
    '### :inbox_tray: Install our fork',
    `- **[Homey App Store](${APP})** (${DRVC} drivers, ${FPC}+ fingerprints)`,
    `- **[Forum](${FORUM})** | **[GitHub](${GH})**`,
    '',
    '> :bulb: For faster integration, please also open a PR/issue at',
    `> ${GH}/issues`,
  ].join('\n');
  return msg;
}

// Main
const fps=loadFingerprints();
console.log(`Loaded ${fps.size} fingerprints. Scanning ${REPO}...`);
let iTriaged=0,iCommented=0,pTriaged=0,pCommented=0;
const newFps=[];

// Issues
const issues=JSON.parse(gh(`issue list -R ${REPO} -s open -L 50 --json number,title,body`));
for(const it of issues){
  if(wasTriaged(it.number)){iTriaged++;continue;}
  const mfrs=extractMfrFromText(`${it.title||''} ${it.body||''}`);
  if(!mfrs.length)continue;
  const found=mfrs.filter(m=>fps.has(m)).map(m=>[m,findAllDrivers(m)]);
  const missing=mfrs.filter(m=>!fps.has(m));
  missing.forEach(m=>newFps.push({fp:m,source:`${REPO}#${it.number}`,type:'issue'}));
  let msg='';
  if(found.length&&!missing.length) msg=supportedMsg(found);
  else if(missing.length&&!found.length) msg=unsupportedMsg(missing);
  else if(found.length&&missing.length) msg=supportedMsg(found)+'\n\n---\n\n'+unsupportedMsg(missing);
  if(msg){post(it.number,msg);iCommented++;}
}

// PRs
const prs=JSON.parse(gh(`pr list -R ${REPO} -s open -L 30 --json number,title,body`));
for(const pr of prs){
  if(wasTriaged(pr.number)){pTriaged++;continue;}
  const mfrs=extractMfrFromText(`${pr.title||''} ${pr.body||''}`);
  if(!mfrs.length)continue;
  const found=mfrs.filter(m=>fps.has(m)).map(m=>[m,findAllDrivers(m)]);
  const missing=mfrs.filter(m=>!fps.has(m));
  missing.forEach(m=>newFps.push({fp:m,source:`${REPO}#${pr.number}`,type:'pr'}));
  if(found.length||missing.length){post(pr.number,prMsg(found,missing));pCommented++;}
}

// Scan forks if enabled
if(SCAN_FORKS){
  console.log('Scanning forks...');
  let forks=[];
  try{forks=JSON.parse(gh(`api repos/${REPO}/forks --paginate --jq "[.[].full_name]"`));}catch(e){console.error('Forks:',e.message);}
  for(const fork of forks.slice(0,30)){
    try{
      const fi=JSON.parse(gh(`issue list -R ${fork} -s open -L 10 --json number,title,body`));
      for(const it of fi){
        const mfrs=extractMfrFromText(`${it.title||''} ${it.body||''}`);
        if(!mfrs.length)continue;
        const found=mfrs.filter(m=>fps.has(m));
        const missing=mfrs.filter(m=>!fps.has(m));
        if(found.length||missing.length){
          const ORIG_REPO=REPO;
          // Post redirect comment on fork
          const msg=`Hi! This device request has been tracked in [Universal Tuya Zigbee](${GH}) **v${VER}**.\n\nPlease install from [Homey App Store](${APP}) and report issues on our [Forum](${FORUM}) or [GitHub](${GH}/issues).`;
          if(!DRY){
            try{
              const f=path.join(os.tmpdir(),'_triage_fork.md');
              fs.writeFileSync(f,`${TAG}\n${msg}`);
              gh(`issue comment ${it.number} -R ${fork} -F "${f}"`);
              console.log(`Commented on ${fork}#${it.number}`);
            }catch(e){console.log(`Skip ${fork}#${it.number}: ${e.message.slice(0,60)}`);}
          }
          missing.forEach(m=>newFps.push({fp:m,source:`${fork}#${it.number}`,type:'fork-issue'}));
        }
      }
    }catch(e){console.log(`Fork ${fork}: ${e.message.slice(0,60)}`);}
  }
}

// Save new FPs for downstream
if(newFps.length){
  fs.writeFileSync('/tmp/upstream_new_fps.json',JSON.stringify(newFps,null,2));
}

// Summary
const report=[
  `## Upstream Triage: ${REPO}`,
  `| Metric | Count |`,
  `|--------|-------|`,
  `| Open issues | ${issues.length} |`,
  `| Already triaged | ${iTriaged} |`,
  `| New issue comments | ${iCommented} |`,
  `| Open PRs | ${prs.length} |`,
  `| PR comments | ${pCommented} |`,
  `| New fingerprints found | ${newFps.length} |`,
].join('\n');
console.log(report);
fs.appendFileSync(SF,report+'\n');
