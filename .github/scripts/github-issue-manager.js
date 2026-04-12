#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const{callAI,callAIEnsemble,analyzeImage,getAIBudget,textSimilarity,isDuplicateContent,MAX_POST_SIZE,smartMergePost}=require('./ai-helper');
const{analyzeScreenshot,analyzeMultipleScreenshots,formatForAIContext}=require('./screenshot-analyzer');
const{loadFingerprints,findAllDrivers,extractMfrFromText,extractAllFP,resolveFingerprint,buildFullIndex}=require('./load-fingerprints');
const{investigate:investigateBug}=require('./bug-investigator');
const{detectFromGitHub,buildPromptContext,getResponseHints}=require('./user-profile-detector');
let _researchEngine=null;
function getResearch(){if(_researchEngine)return _researchEngine;try{_researchEngine=require('./fp-research-engine')}catch{_researchEngine=null}return _researchEngine}
const REPOS=(process.env.REPOS||'dlnraja/com.tuya.zigbee').split(',').map(s=>s.trim());
const OWN=REPOS[0];
const DRY=process.env.DRY_RUN==='true';
const GH='https://api.github.com';
const TOKEN=process.env.GH_PAT||process.env.GITHUB_TOKEN;
const STALE_DAYS=parseInt(process.env.STALE_DAYS||'30');
const MAX_ITEMS=parseInt(process.env.MAX_ITEMS||'100');
const INCLUDE_CLOSED=process.env.INCLUDE_CLOSED==='true';
const FORCE_REPROCESS=process.env.FORCE_REPROCESS==='true';
const STATE_F=path.join(__dirname,'..','state','issue-manager-state.json');
const REPORT_F=path.join(__dirname,'..','state','issue-manager-report.json');
const TAG='<!-- tuya-issue-manager -->';
const VERIFY_TAG='<!-- awaiting-verification -->';
const VERIFY_LABEL='awaiting-verification';
const VERIFY_DAYS=14;
const REPO_OWNER=process.env.GITHUB_REPOSITORY_OWNER||'dlnraja';
const OWNER_USERS=new Set([REPO_OWNER,'dlnraja','github-actions','github-actions[bot]','dependabot','dependabot[bot]','tuya-triage-bot','google-labs-jules','snyk-bot','renovate-bot']);
const{fetchWithRetry}=require('./retry-helper');
const{extractFP:_vFP,extractFPWithBrands:_vFPB,extractPID:_vPID,isValidTuyaFP,isConcatenatedFP}=require('./fp-validator');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const RATE_SLEEP=parseInt(process.env.RATE_LIMIT_SLEEP||'4000');
let appVer='?';try{appVer=JSON.parse(fs.readFileSync(path.join(__dirname,'..','..','app.json'),'utf8')).version}catch{}
const fps=loadFingerprints();
const hdrs=t=>({Accept:'application/vnd.github+json','User-Agent':'tuya-bot',...(t?{Authorization:'Bearer '+t}:{})});

// Load external sources + forum data for enrichment
function loadExtData(){try{return JSON.parse(fs.readFileSync(path.join(__dirname,'..','state','external-sources-data.json'),'utf8'))}catch{return null}}
function loadForumData(){try{return JSON.parse(fs.readFileSync(path.join(__dirname,'..','state','forum-activity-data.json'),'utf8'))}catch{return null}}
function findVariants(fp,ext){if(!ext||!ext.allDevices)return[];const pfx=fp.substring(0,fp.lastIndexOf('_'));return ext.allDevices.filter(d=>d.fp.startsWith(pfx)&&d.fp!==fp).slice(0,10)}
function findBugs(fp,ext){if(!ext||!ext.bugs)return[];return ext.bugs.filter(b=>b.fp===fp)}

// Cross-post to forum — DISABLED to stop spam (was causing 17+ edits to same post)
// GitHub issues are tracked on GitHub; forum is for user discussion only.
async function crossPostForum(msg){
  console.log('    [DISABLED] Forum cross-post skipped (anti-spam). Content:',msg.slice(0,100));
}

// Cross-post to other GitHub repo
async function crossPostGH(fromRepo,issueNum,msg,report){
  // v7.0.22: Disabled cross-post to legacy upstream
  return;
}

function loadState(){try{return JSON.parse(fs.readFileSync(STATE_F,'utf8'))}catch{return{processed:[],closed:[],labeled:[],lastRun:null}}}
function saveState(s){fs.mkdirSync(path.dirname(STATE_F),{recursive:true});fs.writeFileSync(STATE_F,JSON.stringify(s,null,2)+'\n')}

async function ghGet(ep){
  try{const r=await fetchWithRetry(GH+ep,{headers:hdrs(TOKEN)},{retries:3,label:'ghGet'});if(!r.ok)return null;return r.json()}catch{return null}
}
async function ghPost(ep,body){
  if(DRY){console.log('[DRY] POST',ep,JSON.stringify(body).slice(0,120));return{id:'dry'}}
  try{const r=await fetchWithRetry(GH+ep,{method:'POST',headers:hdrs(TOKEN),body:JSON.stringify(body)},{retries:3,label:'ghPost'});
    return r.ok?r.json():null}catch{return null}
}
async function ghPatch(ep,body){
  if(DRY){console.log('[DRY] PATCH',ep,JSON.stringify(body).slice(0,120));return true}
  try{const r=await fetchWithRetry(GH+ep,{method:'PATCH',headers:hdrs(TOKEN),body:JSON.stringify(body)},{retries:3,label:'ghPatch'});return r.ok}catch{return false}
}

function extractFP(t){return _vFP(t);}
function extractImages(t){const u=[];const re=/!\[[^\]]*\]\(([^)]+)\)/g;let m;while((m=re.exec(t||''))!==null)u.push(m[1]);return u}
function extractLinks(t){return(t||'').match(/https?:\/\/[^\s)>"]+/g)||[]}
function daysSince(d){return Math.floor((Date.now()-new Date(d).getTime())/86400000)}
function wasProcessed(state,repo,num){if(FORCE_REPROCESS)return false;return state.processed.includes(repo+'#'+num)}
function markProcessed(state,repo,num){if(!state.processed.includes(repo+'#'+num))state.processed.push(repo+'#'+num)}

// Classify issue with AI
async function classifyIssue(issue,fpResults){
  const prompt='Classify this GitHub issue for a Zigbee device app. RULE: What a user reports is absolute truth — never contradict their observations, investigate instead. If user says device does not work, classify as bug_report even if FP is supported. Return ONLY a JSON object: {"type":"device_request|bug_report|feature|question|duplicate|stale|resolved","priority":"high|medium|low","shouldClose":true/false,"closeReason":"string or null","labels":["label1"],"summary":"one line"}';
  const text='Issue #'+issue.number+' by @'+(issue.user?.login||'?')+':\nTitle: '+issue.title+'\nBody: '+(issue.body||'').slice(0,1500)+'\nFingerprints: '+JSON.stringify(fpResults)+'\nDays since update: '+daysSince(issue.updated_at)+'\nState: '+issue.state;
  const ai=await callAI(text,prompt,{maxTokens:512,complexity:'low'});
  if(!ai)return null;
  try{const m=ai.text.match(/\{[\s\S]*\}/);return m?JSON.parse(m[0]):null}catch{return null}
}

// Generate personalized AI response (with variants + bugs)
async function generateResponse(issue,fpResults,classification,variants,bugs,imageCtx,bodyLinks,repo,bugFindings,researchResults){
  const ctx={appVersion:appVer,
    installUrl:'https://homey.app/a/com.dlnraja.tuya.zigbee/test/',
    forumUrl:'https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352',
    devTools:'https://tools.developer.homey.app',githubUrl:'https://github.com/dlnraja/com.tuya.zigbee',
    referenceDocs: ['docs/rules/DEVELOPMENT_RULES.md', 'docs/rules/CRITICAL_MISTAKES.md', 'https://apps.developer.homey.app/']};
  let prompt='You are Dylan, the Architect of Universal Tuya Zigbee "MAX Local Pro" (v'+appVer+'). Write a professional GitHub comment. Casual tone, say "I" naturally. ABSOLUTE RULE: What a user reports is truth — never contradict their observations, always investigate. Consult Homey SDK docs and local docs for technical advice. \n\n**v7 PRO-TIPS**:\n1. **Doctrine**: We are 100% **Local-Direct First**. \n2. **Shadow-Pulsar**: If cloud sync is asked, mention the safe opt-in mirroring.\n3. **SDK 3 Compliance**: All drivers are built to Athom industrial standards. \n4. **Multi-Gang**: If sub-device issues, user MUST delete and re-pair (Dot-Notation cache issue).\n5. **Logs**: If missing EC/VOC/Fertilizer data, ask for app logs for DP extraction.\n\nNO bot/automated/AI/scanning/pipeline/workflow references, NO signature footer.';
  let profileCtx='';try{const det=detectFromGitHub(issue.user?.login||'',issue.body||'');profileCtx=buildPromptContext(det)}catch{}
  prompt+='\n'+profileCtx+'Context: '+JSON.stringify(ctx);
  let text='Issue: '+issue.title+'\nBy: @'+(issue.user?.login||'?')+'\nBody: '+(issue.body||'').slice(0,2000)+'\nFP results: '+JSON.stringify(fpResults)+'\nClassification: '+JSON.stringify(classification)+'\nVariants from Z2M/ZHA/Blakadder: '+JSON.stringify(variants||[])+'\nAssociated bugs: '+JSON.stringify(bugs||[]);
  if(bugFindings&&bugFindings.length)text+='\nBug investigation findings: '+JSON.stringify(bugFindings.map(b=>({fp:b.fp,driver:b.driver,findings:b.findings,divisors:b.divisors})));
  if(researchResults&&researchResults.length)text+='\nFP Research results: '+JSON.stringify(researchResults.map(r=>({fp:r.fp,driver:r.driver,pid:r.pid,confidence:r.confidence,method:r.method,vendor:r.vendor,deviceType:r.deviceType})));
  if(imageCtx)text+='\nImage analysis: '+imageCtx;
  if(bodyLinks&&bodyLinks.length)text+='\nExternal refs: '+bodyLinks.join(', ');
  const ai=await callAIEnsemble(text,prompt,{maxTokens:1024,complexity:'medium'}).catch(()=>null)||await callAI(text,prompt,{maxTokens:1024,complexity:'medium'});
  return ai?TAG+'\n'+ai.text:null;
}

// v5.11.27: Fast-path — detect empty-template issues (no actual device data)
function isEmptyTemplate(issue){
  const t=(issue.title||'');
  return(t.includes('[Device name]')&&t.includes('[manufacturerName]'))||(t.includes('[manufacturerName]')&&t.includes('[modelId]')&&!/_T[A-Z]/.test(issue.body||''));
}

function hasUserSymptoms(b){if(!b)return false;const l=b.toLowerCase();return/doesn.?t.*work|stuck|wrong.*value|shows?.*(0|zero|wrong)|bug|error|issue|problem|broken|not.*updating|after.*(update|install)|missing.*capability|interview|diagnostic/.test(l);}

// v5.12.x: Fast-path with user profile awareness
function buildFastResponse(issue,fpResults,repo,allSupported){if(hasUserSymptoms(issue.body||issue.title))return null;
  const isUp=repo&&repo!==OWN;
  let det;try{det=detectFromGitHub(issue.user?.login||'',issue.body||'')}catch{det={profile:'end-user'}}
  let msg=TAG+'\n';
  if(allSupported&&fpResults.length){
    const driverList=fpResults.map(f=>'`'+f.fp+'` → **'+f.drivers.join(', ')+'**').join(', ');
    if(det.isReturning&&det.pending)msg+='Update: '+det.pending.note+'\n\n';
    msg+='The fingerprint(s) listed above are officially supported in the **v7.0 MAX Local Pro** build.\n\n';
    msg+='**Action Required**:\n1. Install the latest test version: https://homey.app/a/com.dlnraja.tuya.zigbee/test/\n2. **Remove and re-pair** your device (required to bind the new v7 architectural mixins).\n\n';
    msg+='If the device still behaves unexpectedly, please share a diagnostic report ID and a Developer Tools interview. We prioritize local-first stability.';
    if(isUp)msg+='\n\nMaintained Fork: https://github.com/dlnraja/com.tuya.zigbee';
    return msg;
  }
  return null;
}

// Process a single issue
async function processIssue(repo,issue,state,report,extData){
  const key=repo+'#'+issue.number;
  if(wasProcessed(state,repo,issue.number)){report.skipped++;return}
  const text=(issue.title||'')+' '+(issue.body||'');

  // Load index to cross-reference ALL known FPs
  const {allMfrs, allPids} = buildFullIndex();
  
  // Extract both Manufacturer Names and Product IDs
  const {mfr: foundMfrs, pid: foundPids} = extractAllFP(text, allMfrs, allPids);
  
  // Also keep old extraction for backward compatibility and loose matches
  const legacyMfrs=extractMfrFromText(text);
  const allMfrsList=[...new Set([...foundMfrs,...legacyMfrs.filter(m=>m.startsWith('_T'))])];
  const allPidsList=[...new Set(foundPids)];

  // Detect corrupted concatenated fingerprints (e.g. _TZ3000_zutizvykts0203)
  const corruptedFPs = allMfrsList.filter(m => isConcatenatedFP(m));
  if(corruptedFPs.length){
    console.log(`  [WARNING] Corrupted concatenation detected in issue text: ${corruptedFPs.join(', ')}`);
  }

  // Check which are supported using COMBINATION logic
  const fpResults = [];
  const foundPairs = new Set();
  
  if (allMfrsList.length && allPidsList.length) {
    // We have both: cross-reference them
    for (const m of allMfrsList) {
      for (const p of allPidsList) {
        if (corruptedFPs.includes(m)) continue; // skip corrupted
        const driver = resolveFingerprint(m, p);
        if (driver) {
          fpResults.push({fp: `${m} + ${p}`, supported: true, drivers: [driver]});
          foundPairs.add(m);
        } else {
          // If the combination isn't found, but the MFR exists in some driver, record it as unsupported combo
          const mfrDrivers = findAllDrivers(m);
          fpResults.push({fp: `${m} + ${p}`, supported: false, drivers: mfrDrivers});
        }
      }
    }
  } else {
    // Only have one or the other, fall back to individual checking (less accurate)
    for (const fp of allMfrsList) {
      if (corruptedFPs.includes(fp)) continue;
      const drivers = findAllDrivers(fp);
      fpResults.push({fp, supported: drivers.length>0, drivers});
    }
  }

  const allFPs = allMfrsList.filter(f => !corruptedFPs.includes(f));
  const newFPs=fpResults.filter(f=>!f.supported).map(f=>f.fp);
  const existingFPs=fpResults.filter(f=>f.supported);
  if(isEmptyTemplate(issue)){
    console.log('  #'+issue.number+' [EMPTY TEMPLATE] '+issue.title?.slice(0,60));
    const comments=await ghGet('/repos/'+repo+'/issues/'+issue.number+'/comments?per_page=5');
    const hasBot=comments&&comments.some(c=>(c.body||'').includes(TAG));
    if(!hasBot){
      await ghPost('/repos/'+repo+'/issues/'+issue.number+'/comments',{body:TAG+'\nThis issue was opened with an empty template (no device fingerprint provided). Please reopen with the actual device details from a Homey Developer Tools interview: https://tools.developer.homey.app'});
      report.responded++;
    }
    markProcessed(state,repo,issue.number);return;
  }

  // v5.11.27: Fast-path for fully-supported device requests (skip AI, save budget)
  if(allFPs.length>0&&newFPs.length===0&&!hasUserSymptoms(text)){
    const comments=await ghGet('/repos/'+repo+'/issues/'+issue.number+'/comments?per_page=10');
    const hasBot=comments&&comments.some(c=>(c.body||'').includes(TAG)||c.user?.login==='dlnraja');
    if(!hasBot){
      const fast=buildFastResponse(issue,fpResults,repo,true);
      if(fast){
        await ghPost('/repos/'+repo+'/issues/'+issue.number+'/comments',{body:fast});
        report.responded++;
        console.log('  #'+issue.number+' [FAST-SUPPORTED] '+allFPs.join(',')+' → '+existingFPs.map(f=>f.drivers[0]).join(','));
      }
    }else{
      console.log('  #'+issue.number+' [ALREADY TRIAGED] '+allFPs.join(','));
    }
    markProcessed(state,repo,issue.number);
    await sleep(RATE_SLEEP);return;
  }

  // v5.11.28: Research engine — deep classify new FPs before AI (saves budget)
  let researchResults=[];
  if(newFPs.length){
    const eng=getResearch();
    if(eng){
      for(const fp of newFPs.slice(0,5)){
        try{const r=await eng.researchFP(fp,{token:TOKEN});researchResults.push(r);
          if(r.driver&&r.confidence>=60)console.log('    [RESEARCH] '+fp+' => '+r.driver+' ('+r.confidence+'% '+r.method+')');
        }catch(e){console.log('    [RESEARCH-ERR] '+fp+': '+e.message)}
      }
    }
  }

  // Search variants and bugs from external sources
  const variants=[];const bugs=[];
  for(const fp of allFPs){
    const v=findVariants(fp,extData);if(v.length){variants.push({fp,variants:v});console.log('    Variants for '+fp+': '+v.length)}
    const b=findBugs(fp,extData);if(b.length){bugs.push(...b);console.log('    Bugs for '+fp+': '+b.length)}
  }

  // Classify with AI (only for issues that need it — new FPs or bugs)
  const classification=await classifyIssue(issue,fpResults);
  if(!classification){console.log('  Skip #'+issue.number+' (AI classify failed)');return}
  console.log('  #'+issue.number+' ['+classification.type+'/'+classification.priority+'] '+issue.title?.slice(0,60));

  // Track new fingerprints
  if(newFPs.length)report.newFingerprints.push(...newFPs.map(fp=>({fp,source:key,type:classification.type})));

  // Label the issue (own repo only)
  if(repo===OWN&&!state.labeled.includes(key)){
    const labels=classification.labels||[];
    if(classification.type==='device_request')labels.push('device-request');
    if(classification.type==='bug_report')labels.push('bug');
    if(newFPs.length)labels.push('new-fingerprint');
    if(labels.length){
      await ghPost('/repos/'+repo+'/issues/'+issue.number+'/labels',{labels:[...new Set(labels)]});
      state.labeled.push(key);
      console.log('    Labels:',labels.join(', '));
    }
  }

  // v5.11.26: Bug investigation — code-level analysis (like #110 double-divisor fix)
  let bugFindings=[];
  if(classification.type==='bug_report'&&existingFPs.length){
    for(const fp of existingFPs){
      try{
        const inv=investigateBug(fp.fp,text);
        if(inv&&inv.findings.length){bugFindings.push(inv);console.log('    BUG-INVEST '+fp.fp+': '+inv.findings.join(', '))}
      }catch(e){console.log('    BUG-INVEST err:',e.message)}
    }
    if(bugFindings.length)report.bugInvestigations=(report.bugInvestigations||0)+bugFindings.length;
  }

  // Analyze images in issue body
  const bodyImgs=extractImages(issue.body||'');
  let imageCtx='';
  if(bodyImgs.length){
    console.log('    Images:',bodyImgs.length);
    const sa=await analyzeScreenshot(bodyImgs[0],'github issue device');const ia=sa?formatForAIContext(sa):null;
    if(ia){imageCtx=ia;console.log('    Image:',ia.substring(0,80))}
  }
  // Analyze external links
  const bodyLinks=extractLinks(issue.body||'').filter(l=>l.includes('zigbee2mqtt')||l.includes('blakadder')||l.includes('zigpy'));
  // Check comments for extra FPs and images
  const comments=await ghGet('/repos/'+repo+'/issues/'+issue.number+'/comments?per_page=30');
  const hasBot=comments&&comments.some(c=>(c.body||'').includes(TAG)||c.user?.login==='dlnraja');
  if(comments&&Array.isArray(comments))for(const c of comments){
    if((c.body||'').includes(TAG))continue;
    const commentMfrs=extractFP(c.body||'');const commentPids=_vPID(c.body||'');
    for(const fp of commentMfrs){if(!allFPs.includes(fp))allFPs.push(fp);
      if(commentPids.length){for(const p of commentPids){const dr=resolveFingerprint(fp,p);if(dr){fpResults.push({fp:`${fp} + ${p}`,supported:true,drivers:[dr]})}else{const d=findAllDrivers(fp);fpResults.push({fp:`${fp} + ${p}`,supported:false,drivers:d})}}}
      else{const d=findAllDrivers(fp);fpResults.push({fp,supported:d.length>0,drivers:d})}}
    if(!imageCtx){const ci=extractImages(c.body||'');if(ci.length){const sa2=await analyzeScreenshot(ci[0],'github comment');imageCtx=sa2?formatForAIContext(sa2):''}}
  }

  // Respond if not already responded (SILENT for external repos as per Autonomous Engine Reimplementation mandate)
  if(!hasBot){
    if (repo !== OWN) {
      console.log(`  [SILENT-TRIAGE] Analysis complete for #${issue.number} on ${repo}. Skipping public comment.`);
      markProcessed(state,repo,issue.number);
      return;
    }
    const response=await generateResponse(issue,fpResults,classification,variants,bugs,imageCtx,bodyLinks,repo,bugFindings,researchResults);
    if(response){
      const posted=await ghPost('/repos/'+repo+'/issues/'+issue.number+'/comments',{body:response});
      if(posted){
        console.log('    Responded');report.responded++;
        // Cross-post to forum for device requests
        if(classification.type==='device_request'||newFPs.length){
          const forumMsg='**GitHub #'+issue.number+'** — '+issue.title+'\nFPs: '+allFPs.map(f=>'`'+f+'`').join(', ')+(variants.length?' | Variants: '+variants.flatMap(v=>v.variants).slice(0,5).map(v=>v.fp).join(', '):'')+'\n[View issue](https://github.com/'+repo+'/issues/'+issue.number+')';
          await crossPostForum(forumMsg);
        }
        // Cross-ref to other repo
        await crossPostGH(repo,issue.number,issue.title,report);
      }
    }
    await sleep(RATE_SLEEP);
  }

  // Close stale/resolved issues (OWN repo only — forks are read-only sources)
  if(repo===OWN&&classification.shouldClose&&issue.state==='open'&&classification.type!=='bug_report'){
    const age=daysSince(issue.updated_at);
    if(age>=STALE_DAYS||classification.type==='resolved'||classification.type==='duplicate'){
      const reason=classification.closeReason||'Auto-closed: '+(age>=STALE_DAYS?'inactive >'+STALE_DAYS+' days':classification.type);
      let verifyBody=TAG+'\n'+reason+'\n\n**Please confirm** this is resolved. If no reply in 14 days, this will be auto-closed.';
      await ghPost('/repos/'+repo+'/issues/'+issue.number+'/comments',{body:verifyBody});
      await ghPost('/repos/'+repo+'/issues/'+issue.number+'/labels',{labels:['awaiting-verification']});
      console.log('    VERIFY-REQUESTED:',reason)
    }
  }

  // v5.11.26: Auto-close if last comment is from owner/bots (OWN repo only)
  if(repo===OWN&&issue.state==='open'&&!state.closed.includes(key)&&comments&&Array.isArray(comments)&&comments.length){
    const last=comments[comments.length-1];
    const lastUser=last?.user?.login||'';
    const lastBody=(last?.body||'').toLowerCase();
    const isOwner=OWNER_USERS.has(lastUser);
    const allSupp=allFPs.length>0&&!newFPs.length;
    const isBugIssue=classification&&classification.type==='bug_report';
    const hasClose=lastBody.includes('closing')||lastBody.includes('fingerprint')||lastBody.includes('install test')||lastBody.includes('all fp');
    if(isOwner&&((!isBugIssue&&allSupp)||hasClose)){
      const reason='Triaged by '+lastUser+(allSupp?' — all FPs found in v'+appVer:' — addressed');
      await ghPost('/repos/'+repo+'/issues/'+issue.number+'/labels',{labels:['awaiting-verification']});
      console.log('    VERIFY-REQUESTED (owner):',reason)
    }
  }

  markProcessed(state,repo,issue.number);
}

// Process a single PR
async function processPR(repo,pr,state,report,extData){
  const key=repo+'#PR'+pr.number;
  if(wasProcessed(state,repo,'PR'+pr.number))return;
  const text=(pr.title||'')+' '+(pr.body||'');
  const {allMfrs: idxMfrs, allPids: idxPids} = buildFullIndex();
  const {mfr: prMfrs, pid: prPids} = extractAllFP(text, idxMfrs, idxPids);
  const allFPs=[...prMfrs];
  if(!allFPs.length&&!prPids.length&&!text.toLowerCase().match(/fix|bug|feature|driver|sensor|switch/))return;

  const fpResults=[];
  if(prMfrs.length&&prPids.length){
    for(const m of prMfrs){for(const p of prPids){
      const dr=resolveFingerprint(m,p);
      if(dr)fpResults.push({fp:`${m} + ${p}`,supported:true,drivers:[dr]});
      else{const d=findAllDrivers(m);fpResults.push({fp:`${m} + ${p}`,supported:false,drivers:d})}
    }}
  }else{
    for(const fp of allFPs){const d=findAllDrivers(fp);fpResults.push({fp,supported:d.length>0,drivers:d})}
  }
  const newFPs=fpResults.filter(f=>!f.supported).map(f=>f.fp);

  console.log('  PR#'+pr.number+' ['+pr.state+'] '+pr.title?.slice(0,60)+' FPs:'+allFPs.length);
  if(newFPs.length)report.newFingerprints.push(...newFPs.map(fp=>({fp,source:key,type:'pr'})));

  // Check if already responded
  const comments=await ghGet('/repos/'+repo+'/issues/'+pr.number+'/comments?per_page=20');
  const hasBot=comments&&comments.some(c=>(c.body||'').includes(TAG));

  if(!hasBot){
    const isUp=repo!==OWN;
    if (isUp) {
      console.log(`  [SILENT-TRIAGE-PR] Analysis complete for PR #${pr.number} on ${repo}. Skipping public comment.`);
      markProcessed(state,repo,'PR'+pr.number);
      return;
    }
    let msg=TAG+'\n';
    if(isUp){
      msg+='Hi! 👋 Thanks for this contribution.\n\n';
      msg+='These fingerprints have been **integrated into [dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee)** — the actively maintained Universal Tuya Zigbee fork (v'+appVer+', '+fps.size+'+ fingerprints).\n\n';
    }else{
      msg+='Thanks for the PR!\n\n';
    }
    if(fpResults.filter(f=>f.supported).length)msg+='**Fingerprint(s) found** in v'+appVer+':\n'+fpResults.filter(f=>f.supported).map(f=>'- `'+f.fp+'` → **'+f.drivers.join(', ')+'**').join('\n')+'\n\n';
    if(newFPs.length)msg+='**New** — will integrate:\n'+newFPs.map(fp=>'- `'+fp+'`').join('\n')+'\n\n';
    if(isUp){
      msg+='**Install the test version:** https://homey.app/a/com.dlnraja.tuya.zigbee/test/\n';
      msg+='After installing, remove and re-pair your device so it picks up the correct driver.\n\n';
      msg+='**Community forum:** https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352\n';
      msg+='For future device requests or bug reports, please use the [dlnraja repo](https://github.com/dlnraja/com.tuya.zigbee/issues) or the forum thread.';
    }else{
      msg+='[Test version](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) · [Forum](https://community.homey.app/t/140352)';
    }
    await ghPost('/repos/'+repo+'/issues/'+pr.number+'/comments',{body:msg});
    report.responded++;
    console.log('    Responded to PR');
  }

  // Upstream PRs: respond only, never close (read-only source)
  // Closing is handled by staleSweep on OWN repo only

  // v5.11.26: Auto-close PR if last comment is from owner/bots (OWN repo only)
  if(repo===OWN&&pr.state==='open'&&!state.closed.includes(key)&&comments&&Array.isArray(comments)&&comments.length){
    const last=comments[comments.length-1];
    const lastUser=last?.user?.login||'';
    const lastBody=(last?.body||'').toLowerCase();
    const isOwner=OWNER_USERS.has(lastUser);
    const allSupp=allFPs.length>0&&!newFPs.length;
    const hasClose=lastBody.includes('closing')||lastBody.includes('fingerprint')||lastBody.includes('found in v')||lastBody.includes('all fp');
    if(isOwner&&(allSupp||hasClose)){
      await ghPost('/repos/'+repo+'/issues/'+pr.number+'/labels',{labels:['awaiting-verification']});
      console.log('    PR VERIFY-REQUESTED:',lastUser)
    }
  }

  markProcessed(state,repo,'PR'+pr.number);
  await sleep(Math.max(RATE_SLEEP-1000,2000));
}

// v5.11.47: Stale Sweep — re-check open items already processed for closing (no AI needed)
// IMPORTANT: Only close on OWN repo (dlnraja). Forks/upstream are read-only sources.
async function staleSweep(repo,items,isPR,state,report){
  if(repo!==OWN){console.log('  [SWEEP] Skip '+repo+' (read-only source, no closing)');return 0}
  let swept=0;
  for(const item of items){
    if(item.state!=='open')continue;
    const key=repo+'#'+(isPR?'PR':'')+item.number;
    if(state.closed.includes(key))continue;
    const age=daysSince(item.updated_at);
    const text=(item.title||'')+' '+(item.body||'');
    const {allMfrs:swMfrs,allPids:swPids}=buildFullIndex();
    const {mfr:sMfrs,pid:sPids}=extractAllFP(text,swMfrs,swPids);
    const allFPs=[...sMfrs];
    let allSupp=false;
    if(sMfrs.length&&sPids.length){allSupp=sMfrs.every(m=>sPids.some(p=>resolveFingerprint(m,p)))}
    else if(allFPs.length){allSupp=allFPs.every(fp=>findAllDrivers(fp).length>0)}

    const issueAuthor = item.user?.login || '';
    const isAuthorOwner = OWNER_USERS.has(issueAuthor);

    // Check if we already commented
    const comments=await ghGet('/repos/'+repo+'/issues/'+item.number+'/comments?per_page=10');
    const hasBot=comments&&comments.some(c=>(c.body||'').includes(TAG));
    if(!hasBot && !isAuthorOwner)continue; // Only sweep items we already responded to, unless they are ours

    let shouldClose=false;let reason='';
    
    // Evaluate User Confirmation
    let userConfirmed = false;
    if(comments&&comments.length){
      // Look for a comment from a non-owner that confirms it works
      const userComments = comments.filter(c => !OWNER_USERS.has(c.user?.login));
      if(userComments.length) {
        const lastUserComment = (userComments[userComments.length-1].body||'').toLowerCase();
        if(lastUserComment.includes('works')||lastUserComment.includes('working')||lastUserComment.includes('confirmed')||lastUserComment.includes('fixed')||lastUserComment.includes('perfect')) {
          userConfirmed = true;
        }
      }
    }

    // New Rules requested by User: 
    // ONLY close automatically WITHOUT confirmation if the PR/Issue was CREATED by dlnraja or the bot.
    // If created by a regular user, it MUST wait for userConfirmed.
    
    if (isAuthorOwner) {
      // It's our own bot/owner issue. Close it if it's been handled or has 'awaiting-verification'
      const hasVerifyLabel=item.labels&&item.labels.some(l=>(l.name||l)==='awaiting-verification');
      if (allSupp || hasVerifyLabel) {
        shouldClose=true; reason='Auto-closed owner/bot issue after processing';
      } else if (age >= 7) {
        shouldClose=true; reason='Auto-closed old owner/bot task';
      }
    } else {
      // It's a user issue. Wait for confirmation.
      if (userConfirmed) {
        shouldClose=true; reason='User confirmed fix';
      }
    }

    if(shouldClose){
      if(DRY){console.log('  [DRY-SWEEP] Would close',key,':',reason);swept++;continue}
      
      let humanReason = reason;
      if(reason.includes('User confirmed fix')) humanReason = "Glad to hear it's working! I'll close this now.";
      else if(reason.includes('Auto-closed owner')) humanReason = "Closing this automated task as it has been processed and deployed into our universal/hybrid fallbacks.";
      else humanReason = "Closing this tracking item.";
      
      const closeBody=TAG+'\n'+humanReason+' Feel free to drop a new comment or reopen if you run into any more issues or need further help! 👋';
      
      await ghPost('/repos/'+repo+'/issues/'+item.number+'/comments',{body:closeBody});
      const endpoint=isPR?'/repos/'+repo+'/pulls/'+item.number:'/repos/'+repo+'/issues/'+item.number;
      const patchBody=isPR?{state:'closed'}:{state:'closed',state_reason:'completed'};
      const ok=await ghPatch(endpoint,patchBody);
      
      if(ok){
        state.closed.push(key);
        report.closed++;
        swept++;
        console.log('  [SWEEP] CLOSED',key,':',reason);
      }
      else console.log('  [SWEEP] CLOSE FAILED',key,'(no perms?)');
      
      await sleep(RATE_SLEEP);
    }
  }
  return swept;
}

// Update project docs based on findings
async function updateProjectDocs(report){
  if(!report.newFingerprints.length&&!report.responded)return;
  const docsDir=path.join(__dirname,'..','..','docs');
  fs.mkdirSync(docsDir,{recursive:true});

  // Update USER_DEVICE_EXPECTATIONS
  const udeFile=path.join(docsDir,'rules','USER_DEVICE_EXPECTATIONS.md');
  if(report.newFingerprints.length){
    let udeContent='';
    try{udeContent=fs.readFileSync(udeFile,'utf8')}catch{udeContent='# User Device Expectations\n\n'}
    const newSection='\n\n## Auto-discovered from GitHub ('+new Date().toISOString().split('T')[0]+')\n\n| Fingerprint | Source | Type |\n|---|---|---|\n'+
      report.newFingerprints.slice(0,50).map(f=>'| '+f.fp+' | '+f.source+' | '+f.type+' |').join('\n')+'\n';
    if(!udeContent.includes(report.newFingerprints[0]?.fp)){
      fs.writeFileSync(udeFile,udeContent+newSection);
      console.log('Updated USER_DEVICE_EXPECTATIONS with',report.newFingerprints.length,'new FPs');
    }
  }

  // Generate evolution report with AI
  if(report.responded>0||report.closed>0||report.newFingerprints.length>0){
    const prompt='Generate a concise project evolution summary (max 200 words) based on GitHub issue/PR management results. Focus on: new devices discovered, issues resolved, action items.';
    const ai=await callAI(JSON.stringify({responded:report.responded,closed:report.closed,newFPs:report.newFingerprints.length,
      topFPs:report.newFingerprints.slice(0,10),issuesProcessed:report.issuesProcessed,prsProcessed:report.prsProcessed},null,2),prompt,{maxTokens:512,complexity:'low'});
    if(ai)report.evolutionSummary=ai.text;
  }
}

async function main(){
  if(!TOKEN){console.error('GH_PAT/GITHUB_TOKEN required');process.exit(0)}
  const state=loadState();
  const report={timestamp:new Date().toISOString(),appVersion:appVer,responded:0,closed:0,labeled:0,
    issuesProcessed:0,prsProcessed:0,skipped:0,newFingerprints:[],evolutionSummary:null};

  console.log('=== GitHub Issue & PR Manager ===');
  const extData=loadExtData();
  const forumData=loadForumData();
  console.log('Mode:',DRY?'DRY RUN':'LIVE','| Repos:',REPOS.join(', '),'| FPs:',fps.size,'| Stale:',STALE_DAYS+'d','| Max:',MAX_ITEMS,'| Closed:',INCLUDE_CLOSED);
  console.log('ExtData:',extData?'loaded ('+((extData.allDevices||[]).length)+' devices)':'none','| ForumData:',forumData?'loaded':'none');

  for(const repo of REPOS){
    console.log('\n== '+repo+' ==');

    // Fetch ALL open issues (paginated)
    let allIssues=[];
    for(let page=1;page<=10;page++){
      const batch=await ghGet('/repos/'+repo+'/issues?state=open&sort=updated&direction=desc&per_page=100&page='+page);
      if(!batch||!batch.length)break;
      allIssues.push(...batch);
      if(batch.length<100)break;
      await sleep(500);
    }
    // Also fetch recently closed if requested
    if(INCLUDE_CLOSED){
      for(let page=1;page<=3;page++){
        const batch=await ghGet('/repos/'+repo+'/issues?state=closed&sort=updated&direction=desc&per_page=100&page='+page);
        if(!batch||!batch.length)break;
        allIssues.push(...batch);
        if(batch.length<100)break;
        await sleep(500);
      }
    }
    const realIssues=allIssues.filter(i=>!i.pull_request);
    console.log('Issues found:',realIssues.length,'(processing up to',MAX_ITEMS+')');

    let batchCount=0;
    for(const iss of realIssues.slice(0,MAX_ITEMS)){
      await processIssue(repo,iss,state,report,extData);
      report.issuesProcessed++;
      batchCount++;
      // Extra pause every 10 items to stay within RPM limits
      if(batchCount%10===0){console.log('  [Rate] Pausing after',batchCount,'items...');await sleep(15000)}
    }
    await sleep(5000);

    const allPRs=[];
    for(let page=1;page<=5;page++){
      const batch=await ghGet('/repos/'+repo+'/pulls?state=open&sort=updated&direction=desc&per_page=100&page='+page);
      if(!batch||!batch.length)break;
      allPRs.push(...batch);
      if(batch.length<100)break;
      await sleep(500);
    }
    // Also fetch recently closed PRs for re-opening check
    const closedPRs=await ghGet('/repos/'+repo+'/pulls?state=closed&sort=updated&direction=desc&per_page=30')||[];

    console.log('PRs found: open='+allPRs.length+', closed-recent='+closedPRs.length);

    let prBatch=0;
    for(const pr of allPRs.slice(0,MAX_ITEMS)){
      await processPR(repo,pr,state,report,extData);
      report.prsProcessed++;
      prBatch++;
      if(prBatch%10===0){console.log('  [Rate] Pausing after',prBatch,'PRs...');await sleep(15000)}
    }
    await sleep(5000);

    // v5.13.5: Auto-Reopen logic for closed items where someone responded
    console.log('\n  == Re-open Check: '+repo+' ==');
    for(const item of [...realIssues.filter(i=>i.state==='closed'), ...closedPRs]){
      const key=repo+'#'+(item.pull_request?'PR':'')+item.number;
      const comments=await ghGet('/repos/'+repo+'/issues/'+item.number+'/comments?per_page=5&sort=created&direction=desc');
      if(comments && comments.length){
        const last=comments[0];
        const lastUser=last.user?.login||'';
        const isBot=OWNER_USERS.has(lastUser);
        if(!isBot && daysSince(last.created_at) < 7){
          // Non-bot user commented recently on a closed item
          console.log(`  [RE-OPEN] Detected activity on ${key} by @${lastUser}`);
          if(!DRY){
            const endpoint='/repos/'+repo+'/issues/'+item.number;
            const ok=await ghPatch(endpoint,{state:'open'});
            if(ok){
               await ghPost(endpoint+'/comments',{body:TAG+'\nRe-opening this automatically because @'+lastUser+' just posted a comment. Looking into it! 👋'});
               console.log(`    Successfully re-opened ${key}`);
            }
          }
        }
      }
    }

    // v5.11.47: Stale Sweep — close open items we already responded to
    console.log('\n  == Stale Sweep: '+repo+' ==');
    const issueSweep=await staleSweep(repo,realIssues,false,state,report);
    const prSweep=await staleSweep(repo,allPRs,true,state,report);
    console.log('  Sweep closed:',issueSweep,'issues,',prSweep,'PRs');
  }

  // Update project docs
  console.log('\n== Updating project docs ==');
  await updateProjectDocs(report);

  // Save state & report
  state.lastRun=new Date().toISOString();
  // Keep state manageable
  if(state.processed.length>500)state.processed=state.processed.slice(-300);
  if(state.closed.length>200)state.closed=state.closed.slice(-100);
  if(state.labeled.length>200)state.labeled=state.labeled.slice(-100);
  saveState(state);
  fs.writeFileSync(REPORT_F,JSON.stringify(report,null,2)+'\n');

  // Summary
  console.log('\n=== Results ===');
  console.log('Issues processed:',report.issuesProcessed);
  console.log('PRs processed:',report.prsProcessed);
  console.log('Skipped (already done):',report.skipped);
  console.log('Responded:',report.responded);
  console.log('Closed (total):',report.closed);
  console.log('New FPs found:',report.newFingerprints.length);
  console.log('Bug investigations:',(report.bugInvestigations||0));
  console.log('State: processed='+state.processed.length+', closed='+state.closed.length);
  try{console.log('AI Budget:',getAIBudget())}catch{}

  if(process.env.GITHUB_STEP_SUMMARY){
    let md='## GitHub Issue & PR Manager\n| Metric | Count |\n|---|---|\n';
    md+='| Issues processed | '+report.issuesProcessed+' |\n';
    md+='| PRs processed | '+report.prsProcessed+' |\n';
    md+='| Responded | '+report.responded+' |\n';
    md+='| Closed (stale/resolved) | '+report.closed+' |\n';
    md+='| New fingerprints | '+report.newFingerprints.length+' |\n';
    md+='| Bug investigations | '+(report.bugInvestigations||0)+' |\n';
    if(report.evolutionSummary)md+='\n### Evolution Summary\n'+report.evolutionSummary+'\n';
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md);
  }
}

main().catch(e=>{console.error('Fatal:',e.message);process.exit(1)});

