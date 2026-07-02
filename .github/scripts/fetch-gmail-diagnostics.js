#!/usr/bin/env node
'use strict';
// v5.12.6: IMAP-only mode — OAuth removed entirely
const fs=require('fs'),path=require('path');
const{fetchWithRetry}=require('./retry-helper');
const privacy=require('./privacy-redactor');
let eng=null;try{eng=require('./fp-research-engine')}catch{}
let imap=null;try{imap=require('./gmail-imap-reader')}catch(err){console.error('gmail-imap-reader load error:',err.message)}
const{extractFP:_vFP,extractFPWithBrands:_vFPB,extractPID:_vPID,isValidTuyaFP}=require('./fp-validator');
let KB=null;try{KB=require('./bug-knowledge-base')}catch{}
const SD=path.join(__dirname,'..','state');
const SF=path.join(SD,'diagnostics-state.json');
const RF=path.join(SD,'diagnostics-report.json');
const ROOT=path.join(__dirname,'..','..'),DD=path.join(ROOT,'drivers');
const DRY=process.env.DRY_RUN==='true';
const CI=process.env.CI==='true'||process.env.GITHUB_ACTIONS==='true';
const intEnv=(name,fallback)=>{const n=Number.parseInt(process.env[name]||'',10);return Number.isFinite(n)?n:fallback};
const boolEnv=(name,fallback=false)=>{const v=process.env[name];return v===undefined?fallback:/^(1|true|yes|on)$/i.test(String(v).trim())};
function argVal(argv,names){
  for(const name of names){
    const idx=argv.indexOf(name);
    if(idx!==-1&&argv[idx+1])return argv[idx+1];
    const pref=name+'=';
    const hit=argv.find(a=>a.startsWith(pref));
    if(hit)return hit.slice(pref.length);
  }
  return null;
}
function argFlag(argv,names){return names.some(name=>argv.includes(name))}
function boundedInt(value,fallback,min,max){
  const n=Number.parseInt(String(value||''),10);
  if(!Number.isFinite(n))return fallback;
  return Math.max(min,Math.min(max,n));
}
function parseFetchOptions(argv){
  const allHistory=argFlag(argv,['--all-history','--history'])||boolEnv('GMAIL_DIAG_ALL_HISTORY',false);
  const since=argVal(argv,['--since','--after'])||process.env.GMAIL_DIAG_SINCE||(allHistory?'2019-01-01':null);
  const until=argVal(argv,['--until','--before'])||process.env.GMAIL_DIAG_UNTIL||null;
  const maxFallback=allHistory?1000:100;
  const maxResults=boundedInt(argVal(argv,['--max-results','--max'])||process.env.GMAIL_DIAG_MAX_RESULTS,maxFallback,1,20000);
  const maxTotalResults=boundedInt(argVal(argv,['--max-total-results','--max-total'])||process.env.GMAIL_DIAG_MAX_TOTAL_RESULTS,maxResults,1,20000);
  const chunkDays=boundedInt(argVal(argv,['--chunk-days'])||process.env.GMAIL_DIAG_CHUNK_DAYS,0,0,3650);
  const reprocess=argFlag(argv,['--reprocess','--replay'])||boolEnv('GMAIL_DIAG_REPROCESS',false);
  const stateLimit=boundedInt(process.env.GMAIL_DIAG_STATE_LIMIT,allHistory?Math.max(5000,maxTotalResults):500,100,20000);
  const autoImplement=argFlag(argv,['--implement','--auto-implement'])||boolEnv('GMAIL_DIAG_AUTO_IMPLEMENT',false);
  return{allHistory,since,until,maxResults,maxTotalResults,chunkDays,reprocess,stateLimit,autoImplement};
}
const load=()=>{try{return JSON.parse(fs.readFileSync(SF,'utf8'))}catch{return{lastCheck:null,processed:[]}}};
const save=s=>{fs.mkdirSync(SD,{recursive:true});fs.writeFileSync(SF,JSON.stringify(s,null,2))};

function toYmd(date){return date.toISOString().split('T')[0]}
function addDays(date,days){const d=new Date(date);d.setUTCDate(d.getUTCDate()+days);return d}
function buildFetchWindows(opts){
  if(!opts.chunkDays||!opts.since)return[{since:opts.since,until:opts.until||null}];
  const start=new Date(opts.since);
  const end=opts.until?new Date(opts.until):addDays(new Date(),1);
  if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start){
    return[{since:opts.since,until:opts.until||null}];
  }
  const windows=[];
  let cursor=start;
  while(cursor<end&&windows.length<100){
    const next=addDays(cursor,opts.chunkDays);
    const until=next<end?next:end;
    windows.push({since:toYmd(cursor),until:toYmd(until)});
    cursor=until;
  }
  return windows.length?windows:[{since:opts.since,until:opts.until||null}];
}

const ISSUE_CATEGORIES=[
  {id:'aggregate_error',label:'AggregateError / Zigbee startup',severity:'critical',re:/aggregateerror|empty manufacturername|manufacturername arrays?|zigbee initialization/i,checks:['npm run validate:mfr-empty','npm run check:athom','npm run precommit:full']},
  {id:'processing_failed',label:'Athom processing failed / publish',severity:'critical',re:/processing failed|publish failed|build failed|athom.*build|homey app validate|homey app publish/i,checks:['npm run check:yaml','npm run validate:publish','npm run diag:build']},
  {id:'missing_capability_listener',label:'Missing capability listener',severity:'high',re:/missing capability listener|capability listener|setable|settable/i,checks:['npm run check:flows','npm run check:voice','node scripts/PRE_COMMIT_CHECKS.js']},
  {id:'button_flow',label:'Button / flow trigger',severity:'high',re:/button|remote_button|virtual_button|button\.push|flow card|trigger card|flow trigger/i,checks:['npm run check:flows','node scripts/automation/audit-flowcards.js --json']},
  {id:'battery_unknown',label:'Battery reporting unknown',severity:'high',re:/battery|measure_battery|alarm_battery|powerconfiguration|question mark|\?\?|unknown battery/i,checks:['node scripts/ci/bug-hunter.js --json','node scripts/automation/validate-drivers.js --json']},
  {id:'runtime_crash',label:'Runtime crash / exception',severity:'high',re:/crash|uncaught|typeerror|cannot read|unhandled|heap|oom|allocation failed/i,checks:['node scripts/ci/bug-hunter.js --json','npm run check:timer-context']},
  {id:'security_privacy',label:'Security / privacy signal',severity:'critical',re:/token|secret|password|local[_ -]?key|privacy|leak/i,checks:['npm run security:diagnostics','npm run security-scan']}
];

// === PII Sanitization: strip personal info, keep ONLY device data ===
function sanitize(text){
  if(!text)return'';
  let t=privacy.redact(text);
  t=t.replace(/(?:dear|hi|hello|hey|regards|thanks|best)\s+([A-Z][a-z]+)/gi,'[greeting] [name]');
  t=t.replace(/\n---+\n[\s\S]{0,500}$/,'');
  t=t.replace(/\nBest regards,[\s\S]*$/i,'');
  t=t.replace(/\nSent from my .*$/i,'');
  return t;
}
function safeAlias(kind,value){
  const v=String(value||'').trim();
  return v.startsWith('[REDACTED_')?v:privacy.alias(kind,v);
}
function sanitizeFrom(from){
  if(!from)return'unknown';
  if(from.includes('notifications@github.com'))return'github';
  if(from.includes('community.homey.app'))return'forum';
  if(from.includes('athom.com')||from.includes('homey.app'))return'homey_system';
  if(from.startsWith('[REDACTED_'))return from;
  return safeAlias('sender',from);
}

// v5.13.0: Extract safe pseudo (username without PII) from email metadata
function extractSafePseudo(em){
  const p=em.pseudo||{};
  if(p.source==='github'&&p.username)return{source:'github',username:safeAlias('pseudo',p.username)};
  if(p.source==='forum'&&p.username)return{source:'forum',username:safeAlias('pseudo',p.username)};
  if(p.source==='homey_system')return{source:'homey_system',username:null};
  // User emails: only keep first name initial + last name initial
  if(p.displayName){
    const parts=p.displayName.split(/\s+/);
    return{source:'user',username:safeAlias('pseudo',p.displayName)};
  }
  return{source:p.source||'unknown',username:null};
}

// Extract Tuya fingerprints from text
const exFP=t=>({mfr:_vFP(t),pid:_vPID(t)});

// Build fingerprint->driver index from drivers/
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
  const author=em.pseudo?.username?safeAlias('pseudo',em.pseudo.username):null;
  // Extract quoted issue body (first 500 chars of non-header content)
  const bodyExcerpt=sanitize(body.replace(/^[\s\S]*?(?:---\n|\n\n)/,'').substring(0,500));
  return privacy.redactObject({issueNum,action,fps,isNew:!!action&&action.toLowerCase()==='opened',repo,labels,author,bodyExcerpt});
}

// v5.13.0: Parse forum notification emails
function parseForum(em){
  const body=em.body||'';
  const topic=sanitize((em.subj.match(/(?:Re:\s*)?(.+)/)||[])[1]||em.subj);
  const author=em.pseudo?.username?safeAlias('pseudo',em.pseudo.username):null;
  const fps=exFP(body);
  // Extract device mentions and quoted content
  const quotedBlocks=(body.match(/>[^\n]+/g)||[]).map(q=>q.replace(/^>\s*/,'')).join(' ');
  const fpsFromQuotes=exFP(quotedBlocks);
  const allFps={mfr:[...new Set([...fps.mfr,...fpsFromQuotes.mfr])],pid:[...new Set([...fps.pid,...fpsFromQuotes.pid])]};
  return privacy.redactObject({topic:topic.substring(0,120),author,fps:allFps,bodyExcerpt:sanitize(body.substring(0,800))});
}

// v5.13.0: Parse Homey crash/system emails
function parseCrash(em){
  const body=em.body||'';
  const cd=em.crashData||{};
  const fps=exFP(body);
  return privacy.redactObject({fps,stackTraces:(cd.stackTraces||[]).map(sanitize),crashApp:cd.crashApp?sanitize(cd.crashApp):null,
    capabilities:cd.capabilities||[],clusters:cd.clusters||[],
    datapoints:cd.datapoints||[],zone:cd.zone||null,
    bodyExcerpt:sanitize(body.substring(0,1000))});
}

function normalizeErr(err){
  return sanitize(String(err||'').replace(/\s+/g,' ').trim()).substring(0,180);
}

function analyzeHistory(entries){
  const categories=new Map(),checks=new Map(),errors=new Map(),chronology=[];
  for(const r of entries){
    const text=[r.type,r.subj,(r.errs||[]).join(' '),r.crashInfo?.crashApp,(r.crashInfo?.stackTraces||[]).join(' ')].filter(Boolean).join(' ');
    const matched=[];
    for(const cat of ISSUE_CATEGORIES){
      if(cat.re.test(text)){
        matched.push(cat.id);
        if(!categories.has(cat.id))categories.set(cat.id,{id:cat.id,label:cat.label,severity:cat.severity,count:0,checks:cat.checks});
        categories.get(cat.id).count++;
        for(const check of cat.checks)checks.set(check,(checks.get(check)||0)+1);
      }
    }
    for(const e of(r.errs||[])){
      const n=normalizeErr(e);
      if(n)errors.set(n,(errors.get(n)||0)+1);
    }
    if(matched.length){
      chronology.push({date:r.date||'unknown',type:r.type,subj:r.subj,categories:matched,
        fps:r.fps,errors:(r.errs||[]).map(normalizeErr).filter(Boolean).slice(0,5)});
    }
  }
  const topCategories=[...categories.values()].sort((a,b)=>b.count-a.count||a.id.localeCompare(b.id));
  const topErrors=[...errors.entries()].sort((a,b)=>b[1]-a[1]).slice(0,25).map(([error,count])=>({error,count}));
  const recommendedChecks=[...checks.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))
    .map(([command,weight])=>({command,weight}));
  return privacy.redactObject({
    categories:topCategories,
    topErrors,
    recommendedChecks,
    chronology:chronology.sort((a,b)=>String(a.date).localeCompare(String(b.date))).slice(-200)
  });
}

// Rate limiter: AI is optional. CI/DRY runs prioritize deterministic crash extraction.
let _aiCalls=0,_aiSkipLogged=false;
const AI_MAX=Math.max(0,intEnv('GMAIL_DIAG_AI_MAX',(DRY||CI)?0:10));
const AI_RETRIES=Math.max(0,intEnv('GMAIL_DIAG_AI_RETRIES',AI_MAX>0?1:0));
const AI_TIMEOUT_MS=Math.max(1000,intEnv('GMAIL_DIAG_AI_TIMEOUT_MS',8000));
const delay=ms=>new Promise(r=>setTimeout(r,ms));

// Gemini AI analysis
async function aiAnalyze(diag,subj,type,xref,bodyExcerpt){
  const gk=process.env.GOOGLE_API_KEY;if(!gk)return null;
  if(AI_MAX<=0){
    if(!_aiSkipLogged){console.log('AI analysis disabled for this diagnostics run');_aiSkipLogged=true}
    return null;
  }
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
        generationConfig:{temperature:0.1,maxOutputTokens:600}})},{retries:AI_RETRIES,label:'geminiAI',timeout:AI_TIMEOUT_MS,maxDelay:15000});
    if(!r.ok)return null;
    const d=await r.json();const t=d.candidates?.[0]?.content?.parts?.[0]?.text;
    if(!t)return null;const j=t.match(/\{[\s\S]*\}/);
    return j?JSON.parse(j[0]):{severity:'low',summary:t.substring(0,200)};
  }catch{return null}
}

// Dedup — check for existing open issue with similar title before creating
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
  title=sanitize(title);body=sanitize(body);
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
  const fetchOptions=parseFetchOptions(process.argv.slice(2));
  // v5.12.6: IMAP-only — no OAuth, no token expiry, permanent
  const e=process.env.GMAIL_EMAIL||process.env.HOMEY_EMAIL;
  const p=process.env.GMAIL_APP_PASSWORD||process.env.HOMEY_PASSWORD;
  if(!e||!p){console.error('IMAP credentials missing. Set GMAIL_EMAIL + GMAIL_APP_PASSWORD (see SECRETS.md)');process.exit(1)}
  if(!imap){console.error('gmail-imap-reader not available. npm install imapflow');process.exit(1)}
  console.log('IMAP-only mode — connecting as',safeAlias('account',e));
  console.log('Diagnostics fetch options:',JSON.stringify({mode:fetchOptions.allHistory?'all-history':'recent',
    since:fetchOptions.since||'rolling-30-days',until:fetchOptions.until||'now',
    maxResults:fetchOptions.maxResults,maxTotalResults:fetchOptions.maxTotalResults,
    chunkDays:fetchOptions.chunkDays,
    reprocess:fetchOptions.reprocess,autoImplement:fetchOptions.autoImplement}));
  const windows=buildFetchWindows(fetchOptions);
  const emails=[],seenEmailIds=new Set();
  let imapConnectionFailed=false;
  for(const win of windows){
    if(emails.length>=fetchOptions.maxTotalResults)break;
    console.log('IMAP window:',JSON.stringify(win));
    const batch=await imap.readViaIMAP({afterDate:win.since,untilDate:win.until,
      maxResults:fetchOptions.maxResults,allHistory:fetchOptions.allHistory});
    if(batch===null){
      imapConnectionFailed=true;
      continue;
    }
    if(!Array.isArray(batch)){
      imapConnectionFailed=true;
      console.error('IMAP returned an invalid response; refusing to treat this as an empty mailbox');
      continue;
    }
    for(const em of batch){
      if(seenEmailIds.has(em.id))continue;
      seenEmailIds.add(em.id);
      emails.push(em);
      if(emails.length>=fetchOptions.maxTotalResults)break;
    }
  }
  if(imapConnectionFailed&&!emails.length){
    console.error('::error::IMAP connection failed before diagnostics could be fetched. Refresh GMAIL_EMAIL/GMAIL_APP_PASSWORD secrets, then rerun Gmail Diagnostics.');
    process.exit(1);
  }
  if(imapConnectionFailed){
    console.log('::warning::At least one IMAP window failed, but diagnostics were fetched from another window.');
  }
  if(!emails||!emails.length){console.log('No emails retrieved via IMAP');process.exit(0)}
  console.log('IMAP OK:',emails.length,'emails across',windows.length,'window(s)');

  // Track IMAP health (replaces old OAuth health tracking)
  const HF=path.join(SD,'gmail-token-health.json');
  try{
    const h={mode:'imap',lastOk:new Date().toISOString(),consecutiveFails:0,emailsFetched:emails.length,
      checks:[{time:new Date().toISOString(),ok:true,mode:'imap',windows:windows.length}]};
    const safeHealth=privacy.redactObject(h);privacy.assertNoLeaks(safeHealth,HF);
    fs.mkdirSync(SD,{recursive:true});fs.writeFileSync(HF,JSON.stringify(safeHealth,null,2));
  }catch{}

  const st=load(),idx=buildIndex(),res=[];
  const done=new Set(fetchOptions.reprocess?[]:(st.processed||[]));
  const pidx=idx.pidx||new Map();
  console.log('Driver index:',idx.size,'mfrs +',pidx.size,'pids across',new Set([...idx.values(),...pidx.values()].flat()).size,'drivers');
  const allNewFPs=new Set();
  let skippedAlreadyProcessed=0;

  // v5.13.0: Pseudo tracking for cross-referencing
  const pseudoMap=new Map(); // username -> [{type, subj, date, fps}]

  for(const em of emails){
    if(done.has(em.id)){skippedAlreadyProcessed++;continue}
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

    const safeAI=ai?privacy.redactObject(ai):null;
    const entry=privacy.redactObject({id:em.id,type,subj:safeSubj,from:safeFrom,date:em.date,
      pseudo:safePseudo,
      fps:d.fps,errs:d.errs.map(e=>sanitize(e)),devices:d.devNames.map(n=>safeAlias('device',n)),xref,
      ghInfo,forumInfo:forumInfo?{topic:forumInfo.topic,author:forumInfo.author,fps:forumInfo.fps}:null,
      crashInfo:crashInfo?{stackTraces:(crashInfo.stackTraces||[]).map(s=>sanitize(s)),
        crashApp:crashInfo.crashApp,capabilities:crashInfo.capabilities,clusters:crashInfo.clusters}:null,
      kbMatch:d.kbMatch,
      ai:safeAI,homeyVersion:d.homeyVersion,appVersion:d.appVersion,
      bodyLength:em.bodyLength||0,contentType:em.contentType||'unknown'});
    res.push(entry);
    done.add(em.id);
    console.log(' ['+type+'] '+safeSubj.substring(0,60)+(d.fps.mfr.length?' FP:'+d.fps.mfr.join(','):'')+
      (safePseudo.username?' @'+safePseudo.username:''));

    if(ai&&(ai.severity==='critical'||ai.severity==='high')){
      const issBody='**Type:** '+type+'\n**From:** '+safeFrom+'\n\n'+
        '**Fingerprints:** '+JSON.stringify(d.fps)+'\n**Errors:** '+JSON.stringify(d.errs.map(e=>sanitize(e)))+'\n'+
        '**Cross-ref:** '+(xref.length?xref.map(x=>x.fingerprint+(x.supported?' (supported: '+x.drivers.join(',')+')':' **NEW**')).join(', '):'none')+'\n\n'+
        '**AI Analysis:**\n- Severity: '+safeAI.severity+'\n- Summary: '+(safeAI.summary||'')+'\n- Root cause: '+(safeAI.rootCause||'')+'\n- Fix: '+(safeAI.fixSuggestion||'')+'\n- Needs new driver: '+(safeAI.needsNewDriver||false);
      await mkIssue(safeSubj,issBody);
    }
  }

  // Deep research new FPs from emails (filter garbage first)
  const newFPList=[...allNewFPs].filter(fp=>isValidTuyaFP(fp));
  let impl={researched:0,added:0,details:[],autoImplement:fetchOptions.autoImplement};
  if(newFPList.length>0&&fetchOptions.autoImplement){
    console.log('\n=== Deep Research: '+newFPList.length+' new FPs ===');
    impl=await researchAndImplement(newFPList,idx);
    impl.autoImplement=true;
    console.log('Researched:',impl.researched,'Added:',impl.added);
  }else if(newFPList.length>0){
    impl.skipped='auto implementation disabled; rerun with --implement or GMAIL_DIAG_AUTO_IMPLEMENT=true';
    console.log('Deep research candidates:',newFPList.length,'(auto implementation disabled)');
  }

  st.lastCheck=new Date().toISOString();
  st.processed=[...done].slice(-fetchOptions.stateLimit);
  save(st);
  const newFPs=res.flatMap(r=>(r.xref||[]).filter(x=>!x.supported).map(x=>x.fingerprint)).filter((v,i,a)=>a.indexOf(v)===i);
  const bt={};for(const r of res)bt[r.type]=(bt[r.type]||0)+1;
  const history=analyzeHistory(res);
  const report=privacy.redactObject({timestamp:st.lastCheck,count:res.length,
    run:{mode:fetchOptions.allHistory?'all-history':'recent',since:fetchOptions.since||'rolling-30-days',
      until:fetchOptions.until||'now',chunkDays:fetchOptions.chunkDays,maxTotalResults:fetchOptions.maxTotalResults,
      maxResults:fetchOptions.maxResults,reprocess:fetchOptions.reprocess,stateLimit:fetchOptions.stateLimit,
      fetched:emails.length,skippedAlreadyProcessed},
    byType:bt,newFingerprints:newFPs,history,deepResearch:impl,diagnostics:res});
  privacy.assertNoLeaks(report,RF);
  fs.writeFileSync(RF,JSON.stringify(report,null,2));
  console.log('Done:',res.length,'emails |',newFPs.length,'new FPs |',impl.added,'auto-added');
  console.log('By type:',JSON.stringify(bt));

    // v5.13.0: YAML cross-reference output for deep diagnostics
  const YF=path.join(SD,'diagnostics-crossref.yml');
  try{
    let yml='# Diagnostics Cross-Reference (auto-generated)\n';
    yml+='# Generated: '+st.lastCheck+'\n';
    yml+='# Emails processed: '+res.length+'\n\n';
    yml+='run:\n';
    yml+='  mode: '+(fetchOptions.allHistory?'all-history':'recent')+'\n';
    yml+='  since: '+(fetchOptions.since||'rolling-30-days')+'\n';
    yml+='  until: '+(fetchOptions.until||'now')+'\n';
    yml+='  max_results: '+fetchOptions.maxResults+'\n';
    yml+='  max_total_results: '+fetchOptions.maxTotalResults+'\n';
    yml+='  chunk_days: '+fetchOptions.chunkDays+'\n';
    yml+='  reprocess: '+fetchOptions.reprocess+'\n';
    yml+='  skipped_already_processed: '+skippedAlreadyProcessed+'\n\n';

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

    if(history.categories.length){
      yml+='\ndiagnostic_categories:\n';
      for(const c of history.categories){
        yml+='  - id: '+c.id+'\n';
        yml+='    label: "'+c.label.replace(/"/g,"'")+'"\n';
        yml+='    severity: '+c.severity+'\n';
        yml+='    count: '+c.count+'\n';
        yml+='    checks: ['+c.checks.map(x=>'"'+x.replace(/"/g,"'")+'"').join(', ')+']\n';
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

    yml=sanitize(yml);
    privacy.assertNoLeaks(yml,YF);
    fs.writeFileSync(YF,yml);
    console.log('YAML cross-ref:',fpSeen.size,'fps,',pseudoMap.size,'users,',errMap.size,'error patterns');
  }catch(ye){console.log('YAML output error:',ye.message)}

if(process.env.GITHUB_STEP_SUMMARY){
    let sm='## Gmail Diagnostics (IMAP)\n| Metric | Count |\n|---|---|\n';
    sm+='| Emails | '+res.length+' |\n| New FPs | '+newFPs.length+' |\n';
    sm+='| Skipped already processed | '+skippedAlreadyProcessed+' |\n';
    sm+='| Researched | '+impl.researched+' |\n| Auto-added | '+impl.added+' |\n';
    if(history.categories.length){
      sm+='\n**Diagnostic categories:**\n'+history.categories.slice(0,8).map(c=>'- '+c.label+': '+c.count+' ('+c.severity+')').join('\n')+'\n';
    }
    if(history.recommendedChecks.length){
      sm+='\n**Recommended checks:**\n'+history.recommendedChecks.slice(0,8).map(c=>'- `'+c.command+'`').join('\n')+'\n';
    }
    if(newFPs.length)sm+='\n**New FPs:** '+newFPs.map(f=>'`'+f+'`').join(', ')+'\n';
    if(impl.details.length)sm+='\n**Implemented:**\n'+impl.details.map(d=>'- `'+d.fp+'` -> '+d.driver).join('\n')+'\n';
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,sm);
  }
}
main().catch(e=>{console.error(e.message);process.exit(1)});
