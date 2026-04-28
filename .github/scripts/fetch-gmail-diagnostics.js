#!/usr/bin/env node
'use strict';
// v5.12.6: IMAP-only mode  OAuth removed entirely
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const{fetchWithRetry}=require('./retry-helper');
let eng=null;try{eng=require('./fp-research-engine')}catch{}
let imap=null;try{imap=require('./gmail-imap-reader')}catch(err){console.error('gmail-imap-reader load error:',err.message)}
const{extractFP:_vFP,extractFPWithBrands:_vFPB,extractPID:_vPID,isValidTuyaFP}=require('./fp-validator');
let KB=null;try{KB=require('./bug-knowledge-base')}catch{}
const SD=path.join(__dirname,'..','state');
const SF=path.join(SD,'diagnostics-state.json');
const RF=path.join(SD,'diagnostics-report.json');
const ROOT=path.join(__dirname,'..','..'),DD=path.join(ROOT,'drivers');
const DRY=process.env.DRY_RUN==='true';
const load=()=>{try{return JSON.parse(fs.readFileSync(SF,'utf8'))}catch{return{lastCheck:null,processed:[]}}};
const save=s=>{fs.mkdirSync(SD,{recursive:true});fs.writeFileSync(SF,JSON.stringify(s,null,2))};

// === PII Sanitization: strip personal info, keep ONLY device data ===
function sanitize(text){
  if(!text)return'';
  let t=text;
  t=t.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,'[email]');
  t=t.replace(/([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}/g,'[mac]');
  t=t.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,'[ip]');
  t=t.replace(/([0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}/g,'[ipv6]');
  t=t.replace(/\b[a-f0-9]{32,}\b/gi, function(m){if(m.length===16)return m;return'[token]'});
  t=t.replace(/\+?\d[\d\s\-().]{8,}\d/g,'[phone]');
  t=t.replace(/\/(?:home|Users|user)\/[^\s/]+/gi,'[path]');
  t=t.replace(/C:\\Users\\[^\s\\]+/gi,'[path]');
  t=t.replace(/(?:dear|hi|hello|hey)\s+[A-Z][a-z]+/gi,'[greeting]');
  t=t.replace(/\n---+\n[\s\S]{0,500}$/,'');
  return t;
}
function sanitizeFrom(from){
  if(!from)return'unknown';
  if(from.includes('notifications@github.com'))return'github';
  if(from.includes('community.homey.app'))return'forum';
  if(from.includes('athom.com')||from.includes('homey.app'))return'homey_system';
  return'user';
}

// v5.13.0: Extract safe pseudo (username without PII) from email metadata
function extractSafePseudo(em){
  const p=em.pseudo||{};
  const email=em.from||'';
  
  // Create a persistent pseudonym from email
  const h=crypto.createHash('sha256').update(email.toLowerCase()).digest('hex').substring(0,12);
  const pseudonym=`user_${h}`;

  if(p.source==='github'&&p.username)return{source:'github',username:p.username,pseudonym};
  if(p.source==='forum'&&p.username)return{source:'forum',username:p.username,pseudonym};
  if(p.source==='homey_system')return{source:'homey_system',username:null,pseudonym:'system'};
  
  // User emails: only keep first name initial + last name initial
  if(p.displayName){
    const parts=p.displayName.split(/\s+/);
    if(parts.length>=2)return{source:'user',username:parts[0][0]+'.'+parts[parts.length-1][0]+'.',pseudonym};
    return{source:'user',username:parts[0].substring(0,3)+'...',pseudonym};
  }
  return{source:p.source||'unknown',username:null,pseudonym};
}

// Extract Tuya fingerprints from text
const exFP=t=>({mfr:_vFP(t),pid:_vPID(t)});

// Build fingerprint->driver index from drivers
function buildIndex(){
  const idx=new Map(),pidx=new Map();
  if(!fs.existsSync(DD))return idx;
  for(const d of fs.readdirSync(DD)){
    const f=path.join(DD,d,'driver.compose.json');
    if(!fs.existsSync(f))continue;
    try{const j=JSON.parse(fs.readFileSync(f,'utf8'));
      for(const m of(j.zigbee?.manufacturerName||[])){if(!idx.has(m))idx.set(m,[]);if(!idx.get(m).includes(d))idx.get(m).push(d)}
      for(const p of(j.zigbee?.productId||[])){if(!pidx.has(p))pidx.set(p,[]);if(!pidx.get(p).includes(d))pidx.get(p).push(d)}
    }catch{}
  }
  idx.pidx=pidx;
  return idx;
}

// Classify email type
function classify(em){
  const t=(em.subj+' '+em.body).toLowerCase();
  // v5.13.0: Use crashData if available
  if(em.crashData&&em.crashData.stackTraces)return'crash_report';
  if(em.from.includes('notifications@github.com'))return'github';
  if(em.from.includes('community.homey.app'))return'forum_message';
  if(em.from.includes('athom.com'))return'homey_system';
  if(t.includes('interview'))return'interview';
  if(t.includes('diagnostic')||t.includes('diag report')||t.includes('debug log'))return'diagnostic';
  if(t.includes('crash')||t.includes('error')||t.includes('not working'))return'bug_report';
  if(t.includes('changelog')||t.includes('new version')||t.includes('update'))return'changelog';
  if(t.includes('pair')||t.includes('interview')||t.includes('device'))return'device_issue';
  return'general';
}

// Parse email for diagnostic data
function parse(t){
  const fps=exFP(t),errs=[],devNames=[];
  [/Error:?\s*(.{10,80})/gi,/TypeError:?\s*(.{10,60})/gi,/Cannot\s+(.{10,60})/gi,/FATAL:?\s*(.{10,80})/gi,
   /Missing Capability Listener:?\s*(.{5,40})/gi,/Invalid Flow Card ID:?\s*(.{5,60})/gi,
   /UNSUPPORTED_ATTRIBUTE:?\s*(.{5,40})/gi,/ZCL.*error:?\s*(.{10,60})/gi]
    .forEach(p=>{let m;while((m=p.exec(t)))errs.push(m[1].trim())});
  const dn=t.match(/(?:device|driver)[:\s]+["']?([a-z0-9_-]{3,30})["']?/gi)||[];
  dn.forEach(d=>{const m=d.match(/[:\s]+["']?([a-z0-9_-]{3,30})["']?$/i);if(m)devNames.push(m[1])});
  const rid=(t.match(/(?:report.?id[:\s]+)?([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i)||t.match(/report.?id[:\s]+([a-f0-9-]{8,})/i)||[])[1]||null;
  const hv=(t.match(/homey.?(?:firmware|version|fw)[:\s]+([0-9.]{3,12})/i)||[])[1]||null;
  const av=(t.match(/(?:app|tuya).?version[:\s]+([0-9.]{3,12})/i)||[])[1]||null;
  // v5.13.1: KB pattern matching for known bugs
  let kbMatch=null;
  if(KB){const res=KB.getResolution(t);if(res)kbMatch={id:res.id,fix:res.fix,severity:res.severity||'medium'}}
  // v5.13.1: Extract DPs, clusters, capabilities
  const dps=(t.match(/\bDP\s*:?\s*(\d{1,3})\b/gi)||[]).map(d=>d.replace(/\D/g,''));
  const clusters=(t.match(/\bcluster\s*:?\s*(0x[0-9a-f]{4}|\d{4,5})\b/gi)||[]).map(cl=>cl.replace(/cluster\s*:?\s*/i,''));
  const caps=(t.match(/\b(onoff|dim|measure_power|measure_temperature|measure_humidity|measure_battery|meter_power|alarm_[a-z_]+|measure_[a-z_]+|button\.push)\b/g)||[]);
  return{fps,errs:[...new Set(errs)].slice(0,15),devNames:[...new Set(devNames)],rid,homeyVersion:hv,appVersion:av,
    kbMatch,dps:[...new Set(dps)],clusters:[...new Set(clusters)],caps:[...new Set(caps)]};
}

// Cross-reference fingerprints with driver index
function crossRef(diag,idx){
  const matches=[],pidx=idx.pidx||new Map();
  for(const mfr of diag.fps.mfr){
    const drivers=idx.get(mfr)||[];
    const entry={fingerprint:mfr,type:'mfr',supported:drivers.length>0,drivers};
    // v5.13.1: Protocol detection per FP
    if(KB){const proto=KB.detectProtocol(mfr,'');entry.protocol=proto.type||'unknown';entry.requires=proto.requires||[]}
    // v5.13.1: Multi-driver conflict detection
    if(drivers.length>1)entry.conflict=true;
    matches.push(entry);
  }
  for(const pid of diag.fps.pid){
    const drivers=pidx.get(pid)||[];
    matches.push({fingerprint:pid,type:'pid',supported:drivers.length>0,drivers,multiDriver:drivers.length>1});
  }
  return matches;
}

// v5.13.1: Deep cross-reference across all data sources
function deepCrossRef(diag,idx,allEntries){
  const fpMentions=new Map();
  for(const entry of allEntries){
    for(const x of(entry.xref||[])){
      if(!fpMentions.has(x.fingerprint))fpMentions.set(x.fingerprint,{count:0,sources:[],types:new Set(),pseudos:new Set()});
      const m=fpMentions.get(x.fingerprint);
      m.count++;m.sources.push(entry.from);m.types.add(entry.type);
      if(entry.pseudo?.username)m.pseudos.add(entry.pseudo.username);
    }
  }
  // Priority score: more mentions + more sources + unsupported = higher priority
  for(const[fp,data] of fpMentions){
    data.priority=data.count*2+data.types.size*3+data.pseudos.size+(data.sources.includes('github')?5:0);
  }
  return fpMentions;
}

// Parse GitHub notification emails
function parseGitHub(em){
  const body=em.body||'';
  const issueNum=(em.subj.match(/#(\d+)/)||[])[1]||null;
  const action=(body.match(/(?:opened|closed|commented|merged|pushed|assigned|labeled)/i)||[])[0]||null;
  const fps=exFP(body);
  // v5.13.0: Extract more GitHub context
  const repo=(em.subj.match(/([\w-]+\/[\w.-]+)/)||[])[1]||null;
  const labels=(body.match(/label[s]?:\s*([^\n]+)/i)||[])[1]||null;
  const author=em.pseudo?.username||null;
  // Extract quoted issue body (first 500 chars of non-header content)
  const bodyExcerpt=body.replace(/^[\s\S]*?(?:---\n|\n\n)/,'').substring(0,500);
  return{issueNum,action,fps,isNew:!!action&&action.toLowerCase()==='opened',repo,labels,author,bodyExcerpt};
}

// v5.13.0: Parse forum notification emails
function parseForum(em){
  const body=em.body||'';
  const topic=(em.subj.match(/(?:Re:\s*)?(.+)/)||[])[1]||em.subj;
  const author=em.pseudo?.username||null;
  const fps=exFP(body);
  // Extract device mentions and quoted content
  const quotedBlocks=(body.match(/>[^\n]+/g)||[]).map(q=>q.replace(/^>\s*/,'')).join(' ');
  const fpsFromQuotes=exFP(quotedBlocks);
  const allFps={mfr:[...new Set([...fps.mfr,...fpsFromQuotes.mfr])],pid:[...new Set([...fps.pid,...fpsFromQuotes.pid])]};
  return{topic:topic.substring(0,120),author,fps:allFps,bodyExcerpt:body.substring(0,800)};
}

// v5.13.0: Parse Homey crash/system emails
function parseCrash(em){
  const body=em.body||'';
  const cd=em.crashData||{};
  const fps=exFP(body);
  return{fps,stackTraces:cd.stackTraces||[],crashApp:cd.crashApp||null,
    capabilities:cd.capabilities||[],clusters:cd.clusters||[],
    datapoints:cd.datapoints||[],zone:cd.zone||null,
    bodyExcerpt:body.substring(0,1000)};
}

// Rate limiter: 4s between Gemini calls (max 15 RPM), cap 10/run
let _aiCalls=0;const AI_MAX=10;
const delay=ms=>new Promise(r=>setTimeout(r,ms));

// Gemini AI analysis
async function aiAnalyze(diag,subj,type,xref,bodyExcerpt){
  const gk=process.env.GOOGLE_API_KEY;if(!gk)return null;
  if(++_aiCalls>AI_MAX){console.log('AI quota guard: skip ('+_aiCalls+'/'+AI_MAX+')');return null;}
  if(_aiCalls>1)await delay(4000);
  const prompt='Analyze this Homey Zigbee email (type: '+type+').\n'+
    'Subject: '+subj+'\n'+
    'Fingerprints (mfr+pid pairs): '+JSON.stringify(diag.fps)+'\n'+
    'Errors: '+JSON.stringify(diag.errs)+'\n'+
    'Device names: '+JSON.stringify(diag.devNames)+'\n'+
    'Cross-ref: '+JSON.stringify(xref)+'\n'+
    'Homey version: '+(diag.homeyVersion||'unknown')+'\n'+
    'App version: '+(diag.appVersion||'unknown')+'\n'+
    'Body excerpt: '+(bodyExcerpt||'(none)')+'\n\n'+
    'Return JSON: {severity:"critical"|"high"|"medium"|"low",summary:string,'+
    'deviceType:string,rootCause:string,fixSuggestion:string,needsNewDriver:boolean}';
  try{
    const r=await fetchWithRetry('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key='+gk,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({contents:[{parts:[{text:prompt}]}],
        generationConfig:{temperature:0.1,maxOutputTokens:600}})},{retries:2,label:'geminiAI'});
    if(!r.ok)return null;
    const d=await r.json();const t=d.candidates?.[0]?.content?.parts?.[0]?.text;
    if(!t)return null;const j=t.match(/\{[\s\S]*\}/);
    return j?JSON.parse(j[0]):{severity:'low',summary:t.substring(0,200)};
  }catch{return null}
}

// Dedup  check for existing open issue with similar title before creating
let _openIssuesCache=null;
async function getOpenIssues(tk){
  if(_openIssuesCache)return _openIssuesCache;
  try{
    const r=await fetchWithRetry('https://api.github.com/repos/dlnraja/com.tuya.zigbee/issues?state=open&per_page=100&labels=diagnostic,auto-detected',
      {headers:{Authorization:'Bearer '+tk,Accept:'application/vnd.github+json'}},{retries:2,label:'ghIssList'});
    _openIssuesCache=r.ok?await r.json():[];
  }catch{_openIssuesCache=[];}
  return _openIssuesCache;
}

// Create GitHub issue for critical findings (with dedup)
async function mkIssue(title,body){
  const tk=process.env.GH_PAT||process.env.GITHUB_TOKEN;if(!tk)return null;
  const shortTitle='[Diag] '+title.substring(0,80);
  const open=await getOpenIssues(tk);
  const key=title.toLowerCase().replace(/[^a-z0-9]/g,'').substring(0,40);
  if(open.some(i=>i.title.toLowerCase().replace(/[^a-z0-9]/g,'').substring(0,40)===key)){
    console.log('  Skipping duplicate issue:',shortTitle.substring(0,50));return null;
  }
  const r=await fetchWithRetry('https://api.github.com/repos/dlnraja/com.tuya.zigbee/issues',{
    method:'POST',headers:{Authorization:'Bearer '+tk,Accept:'application/vnd.github+json','Content-Type':'application/json'},
    body:JSON.stringify({title:shortTitle,body,labels:['diagnostic','auto-detected']})},{retries:2,label:'ghIssue'});
  if(r.ok){const j=await r.json();_openIssuesCache?.push(j);return j;}
  return null;
}

// === Deep research + auto-add FPs from emails ===
function addToDriver(driver,fp,pid){
  if(DRY){console.log('  [DRY] Would add',fp||'','pid:',pid||'','->',driver);return false}
  const f=path.join(DD,driver,'driver.compose.json');
  try{const d=JSON.parse(fs.readFileSync(f,'utf8'));let ch=false;
    if(fp&&!d.zigbee.manufacturerName.includes(fp)){d.zigbee.manufacturerName.push(fp);d.zigbee.manufacturerName.sort();ch=true}
    if(pid&&!d.zigbee.productId.includes(pid)){d.zigbee.productId.push(pid);d.zigbee.productId.sort();ch=true}
    if(ch){fs.writeFileSync(f,JSON.stringify(d,null,2)+'\n');return true}
  }catch(e){console.log('  [ADD-ERR]',e.message)}
  return false;
}

async function researchAndImplement(allNewFPs,idx){
  if(!eng)return{researched:0,added:0,details:[]};
  const engIdx=eng.buildDriverIndex();
  let researched=0,added=0;const details=[];
  for(const fp of allNewFPs.slice(0,40)){
    const r=await eng.researchFP(fp,{index:engIdx});
    researched++;
    if(!r.driver||r.confidence<50)continue;
    const vars=eng.generateVariants(fp);
    if(addToDriver(r.driver,fp,r.pid||null)){added++;details.push({fp,driver:r.driver,pid:r.pid,confidence:r.confidence})}
    for(const v of vars){
      const vr=await eng.researchFP(v,{index:engIdx});
      if(vr.driver===r.driver&&vr.confidence>=40){
        if(addToDriver(r.driver,v,vr.pid||null)){added++;details.push({fp:v,driver:r.driver,pid:vr.pid,variant:true})}
      }
    }
  }
  return{researched,added,details};
}

async function main(){
  // v5.12.6: IMAP-only  no OAuth, no token expiry, permanent
  const e=process.env.GMAIL_EMAIL||process.env.HOMEY_EMAIL;
  const p=process.env.GMAIL_APP_PASSWORD||process.env.HOMEY_PASSWORD;
  if(!e||!p){console.error('IMAP credentials missing. Set GMAIL_EMAIL + GMAIL_APP_PASSWORD (see SECRETS.md)');process.exit(1)}
  if(!imap){console.error('gmail-imap-reader not available. npm install imapflow');process.exit(1)}
  console.log('IMAP-only mode  connecting as',e);
  const emails=await imap.readViaIMAP();
  if(!emails||!emails.length){console.log('No emails retrieved via IMAP');process.exit(0)}
  console.log('IMAP OK:',emails.length,'emails');

  // Track IMAP health (replaces old OAuth health tracking)
  const HF=path.join(SD,'gmail-token-health.json');
  try{
    const h={mode:'imap',lastOk:new Date().toISOString(),consecutiveFails:0,emailsFetched:emails.length,
      checks:[{time:new Date().toISOString(),ok:true,mode:'imap'}]};
    fs.mkdirSync(SD,{recursive:true});fs.writeFileSync(HF,JSON.stringify(h,null,2));
  }catch{}

  const st=load(),idx=buildIndex(),res=[];
  const done=new Set(st.processed||[]);
  const pidx=idx.pidx||new Map();
  console.log('Driver index:',idx.size,'mfrs +',pidx.size,'pids across',new Set([...idx.values(),...pidx.values()].flat()).size,'drivers');
  const allNewFPs=new Set();

  // v5.13.0: Pseudo tracking for cross-referencing
  const pseudoMap=new Map(); // username -> [{type, subj, date, fps}]

  for(const em of emails){
    if(done.has(em.id))continue;
    const type=classify(em);
    const d=parse(em.body);
    const xref=crossRef(d,idx);
    const ghInfo=type==='github'?parseGitHub(em):null;
    const forumInfo=type==='forum_message'?parseForum(em):null;
    const crashInfo=(type==='crash_report'||type==='bug_report')?parseCrash(em):null;

    // v5.13.0: Extract body excerpt for AI (sanitized, max 600 chars)
    const bodyExcerpt=sanitize((em.body||'').substring(0,600));

    const needsAI=d.fps.mfr.length>0||d.errs.length>0||(ghInfo&&ghInfo.isNew)||crashInfo;
    const ai=needsAI?await aiAnalyze(d,em.subj,type,xref,bodyExcerpt):null;

    for(const fp of d.fps.mfr){if(!idx.has(fp))allNewFPs.add(fp)}
    for(const p of d.fps.pid){if(!pidx.has(p))allNewFPs.add(p)}
    // v5.13.0: Also collect FPs from forum quotes and crash data
    if(forumInfo){for(const fp of forumInfo.fps.mfr){if(!idx.has(fp))allNewFPs.add(fp)}}

    const safeFrom=sanitizeFrom(em.from);
    const safeSubj=sanitize(em.subj);
    const safePseudo=extractSafePseudo(em);

    // v5.13.0: Track pseudo across emails
    if(safePseudo.username){
      if(!pseudoMap.has(safePseudo.username))pseudoMap.set(safePseudo.username,[]);
      pseudoMap.get(safePseudo.username).push({type,subj:safeSubj,date:em.date,fps:d.fps});
    }

    const entry={id:em.id,type,subj:safeSubj,from:safeFrom,date:em.date,
      pseudo:safePseudo,
      fps:d.fps,errs:d.errs.map(e=>sanitize(e)),devices:d.devNames,xref,
      ghInfo,forumInfo:forumInfo?{topic:forumInfo.topic,author:forumInfo.author,fps:forumInfo.fps}:null,
      crashInfo:crashInfo?{stackTraces:(crashInfo.stackTraces||[]).map(s=>sanitize(s)),
        crashApp:crashInfo.crashApp,capabilities:crashInfo.capabilities,clusters:crashInfo.clusters}:null,
      ai,homeyVersion:d.homeyVersion,appVersion:d.appVersion,
      bodyLength:em.bodyLength||0,contentType:em.contentType||'unknown'};
    res.push(entry);
    done.add(em.id);
    console.log(' ['+type+'] '+em.subj.substring(0,60)+(d.fps.mfr.length?' FP:'+d.fps.mfr.join(','):'')+
      (safePseudo.username?' @'+safePseudo.username:''));

    if(ai&&(ai.severity==='critical'||ai.severity==='high')){
      const issBody='**Type:** '+type+'\n**From:** '+safeFrom+'\n\n'+
        '**Fingerprints:** '+JSON.stringify(d.fps)+'\n**Errors:** '+JSON.stringify(d.errs.map(e=>sanitize(e)))+'\n'+
        '**Cross-ref:** '+(xref.length?xref.map(x=>x.fingerprint+(x.supported?' (supported: '+x.drivers.join(',')+')':' **NEW**')).join(', '):'none')+'\n\n'+
        '**AI Analysis:**\n- Severity: '+ai.severity+'\n- Summary: '+(ai.summary||'')+'\n- Root cause: '+(ai.rootCause||'')+'\n- Fix: '+(ai.fixSuggestion||'')+'\n- Needs new driver: '+(ai.needsNewDriver||false);
      await mkIssue(safeSubj,issBody);
    }
  }

  // Deep research new FPs from emails (filter garbage first)
  const newFPList=[...allNewFPs].filter(fp=>isValidTuyaFP(fp));
  let impl={researched:0,added:0,details:[]};
  if(newFPList.length>0){
    console.log('\n=== Deep Research: '+newFPList.length+' new FPs ===');
    impl=await researchAndImplement(newFPList,idx);
    console.log('Researched:',impl.researched,'Added:',impl.added);
  }

  st.lastCheck=new Date().toISOString();
  st.processed=[...done].slice(-500);
  save(st);
  const newFPs=res.flatMap(r=>(r.xref||[]).filter(x=>!x.supported).map(x=>x.fingerprint)).filter((v,i,a)=>a.indexOf(v)===i);
  const bt={};for(const r of res)bt[r.type]=(bt[r.type]||0)+1;
  fs.writeFileSync(RF,JSON.stringify({timestamp:st.lastCheck,count:res.length,
    byType:bt,newFingerprints:newFPs,deepResearch:impl,diagnostics:res},null,2));
  console.log('Done:',res.length,'emails |',newFPs.length,'new FPs |',impl.added,'auto-added');
  console.log('By type:',JSON.stringify(bt));

    // v5.13.0: YAML cross-reference output for deep diagnostics
  const YF=path.join(SD,'diagnostics-crossref.yml');
  try{
    let yml='# Diagnostics Cross-Reference (auto-generated)\n';
    yml+='# Generated: '+st.lastCheck+'\n';
    yml+='# Emails processed: '+res.length+'\n\n';

    // v5.13.1: Priority-ranked fingerprint cross-ref with protocol + KB + actions
    yml+='fingerprints:\n';
    const fpSeen=new Map();
    for(const r of res){
      for(const x of(r.xref||[])){
        if(!fpSeen.has(x.fingerprint))fpSeen.set(x.fingerprint,{supported:x.supported,drivers:x.drivers,
          protocol:x.protocol||'unknown',requires:x.requires||[],conflict:x.conflict||false,
          emails:[],pseudos:[],types:new Set(),kbMatches:[]});
        const e=fpSeen.get(x.fingerprint);
        e.emails.push({type:r.type,date:r.date,subj:r.subj});
        e.types.add(r.type);
        if(r.pseudo&&r.pseudo.username&&!e.pseudos.includes(r.pseudo.username))e.pseudos.push(r.pseudo.username);
        if(r.kbMatch)e.kbMatches.push(r.kbMatch);
      }
    }
    // Compute priority score and sort
    const fpRanked=[...fpSeen.entries()].map(([fp,data])=>{
      let score=data.emails.length*2+data.types.size*3+data.pseudos.size*2;
      if(!data.supported)score+=10;
      if(data.conflict)score+=5;
      if(data.types.has('github'))score+=5;
      if(data.types.has('diagnostic'))score+=3;
      if(data.kbMatches.length)score+=4;
      data.priority=score;
      return[fp,data];
    }).sort((a,b)=>b[1].priority-a[1].priority);
    for(const[fp,data] of fpRanked){
      yml+='  '+fp+':\n';
      yml+='    priority: '+data.priority+'\n';
      yml+='    supported: '+data.supported+'\n';
      yml+='    protocol: '+data.protocol+'\n';
      if(data.conflict)yml+='    conflict: true  # Same FP in multiple drivers!\n';
      if(data.drivers.length)yml+='    drivers: ['+data.drivers.join(', ')+']\n';
      if(data.requires.length)yml+='    requires: ['+data.requires.join(', ')+']\n';
      yml+='    mentions: '+data.emails.length+'\n';
      yml+='    source_types: ['+[...data.types].join(', ')+']\n';
      if(data.pseudos.length)yml+='    reporters: ['+data.pseudos.join(', ')+']\n';
      if(data.kbMatches.length){yml+='    known_fix: "'+data.kbMatches[0].fix.replace(/"/g,"'")+'"\n';yml+='    kb_severity: '+data.kbMatches[0].severity+'\n';}
      // Actionable suggestion
      if(!data.supported)yml+='    action: "Add to driver via enrichment-scanner or manual fingerprint addition"\n';
      else if(data.conflict)yml+='    action: "Verify productId mapping - ensure correct driver match"\n';
      else if(data.kbMatches.length)yml+='    action: "Apply known fix: '+data.kbMatches[0].fix.replace(/"/g,"'").substring(0,80)+'"\n';
      yml+='    sources:\n';
      for(const e of data.emails.slice(0,5)){yml+='      - type: '+e.type+'\n        date: '+(e.date||'unknown')+'\n'}
    }

    // v5.13.1: User cross-ref with activity scoring
    yml+='\nusers:\n';
    const userRanked=[...pseudoMap.entries()].map(([user,entries])=>{
      const uFps=new Set();const uTypes=new Set();const uErrs=new Set();
      entries.forEach(e=>{(e.fps?.mfr||[]).forEach(f=>uFps.add(f));uTypes.add(e.type)});
      // Find errors from this user's emails
      for(const r of res){if(r.pseudo?.username===user)(r.errs||[]).forEach(e=>uErrs.add(e))}
      const score=entries.length*2+uFps.size*3+uTypes.size+(uErrs.size?2:0);
      return[user,{entries,fps:uFps,types:uTypes,errs:uErrs,score}];
    }).sort((a,b)=>b[1].score-a[1].score);
    for(const[user,data] of userRanked){
      yml+='  '+user+':\n';
      yml+='    activity_score: '+data.score+'\n';
      yml+='    emails: '+data.entries.length+'\n';
      if(data.fps.size)yml+='    fingerprints: ['+[...data.fps].join(', ')+']\n';
      yml+='    types: ['+[...data.types].join(', ')+']\n';
      if(data.errs.size)yml+='    has_errors: true\n';
      yml+='    latest: '+(data.entries[data.entries.length-1]?.date||'unknown')+'\n';
    }

    // Error patterns
    const errMap=new Map();
    for(const r of res){for(const e of(r.errs||[])){errMap.set(e,(errMap.get(e)||0)+1)}}
    if(errMap.size){
      yml+='\nerror_patterns:\n';
      for(const[err,cnt] of[...errMap].sort((a,b)=>b[1]-a[1]).slice(0,20)){
        yml+='  - count: '+cnt+'\n    error: "'+err.replace(/"/g,"'")+'"\n';
      }
    }

    // v5.13.1: KB matches summary
    const kbResults=res.filter(r=>r.kbMatch);
    if(kbResults.length){
      yml+='\nknown_bug_matches:\n';
      const kbGroups=new Map();
      for(const r of kbResults){
        const id=r.kbMatch.id||'unknown';
        if(!kbGroups.has(id))kbGroups.set(id,{fix:r.kbMatch.fix,severity:r.kbMatch.severity,count:0,fps:[]});
        kbGroups.get(id).count++;
        (r.fps?.mfr||[]).forEach(fp=>{if(!kbGroups.get(id).fps.includes(fp))kbGroups.get(id).fps.push(fp)});
      }
      for(const[id,data] of kbGroups){
        yml+='  '+id+':\n';
        yml+='    severity: '+data.severity+'\n';
        yml+='    occurrences: '+data.count+'\n';
        yml+='    fix: "'+data.fix.replace(/"/g,"'")+'"\n';
        if(data.fps.length)yml+='    affected_fps: ['+data.fps.join(', ')+']\n';
      }
    }

    // v5.13.1: Protocol distribution
    const protoMap=new Map();
    for(const[fp,data] of fpRanked){
      const p=data.protocol||'unknown';
      protoMap.set(p,(protoMap.get(p)||0)+1);
    }
    if(protoMap.size){
      yml+='\nprotocol_distribution:\n';
      for(const[proto,cnt] of protoMap){yml+='  '+proto+': '+cnt+'\n'}
    }

    // AI insights summary
    const aiResults=res.filter(r=>r.ai);
    if(aiResults.length){
      yml+='\nai_insights:\n';
      for(const r of aiResults){
        yml+='  - severity: '+(r.ai.severity||'unknown')+'\n';
        yml+='    summary: "'+(r.ai.summary||'').replace(/"/g,"'")+'"\n';
        if(r.ai.rootCause)yml+='    root_cause: "'+(r.ai.rootCause||'').replace(/"/g,"'")+'"\n';
        if(r.ai.fixSuggestion)yml+='    fix: "'+(r.ai.fixSuggestion||'').replace(/"/g,"'")+'"\n';
      }
    }

    fs.writeFileSync(YF,yml);
    console.log('YAML cross-ref:',fpSeen.size,'fps,',pseudoMap.size,'users,',errMap.size,'error patterns');
  }catch(ye){console.log('YAML output error:',ye.message)}

if(process.env.GITHUB_STEP_SUMMARY){
    let sm='## Gmail Diagnostics (IMAP)\n| Metric | Count |\n|---|---|\n';
    sm+='| Emails | '+res.length+' |\n| New FPs | '+newFPs.length+' |\n';
    sm+='| Researched | '+impl.researched+' |\n| Auto-added | '+impl.added+' |\n';
    if(newFPs.length)sm+='\n**New FPs:** '+newFPs.map(f=>'`'+f+'`').join(', ')+'\n';
    if(impl.details.length)sm+='\n**Implemented:**\n'+impl.details.map(d=>'- `'+d.fp+'` -> '+d.driver).join('\n')+'\n';
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,sm);
  }
}
main().catch(e=>{console.error(e.message);process.exit(1)});
