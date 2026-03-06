#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const{fetchWithRetry}=require('./retry-helper');
let eng=null;try{eng=require('./fp-research-engine')}catch{}
let imap=null;try{imap=require('./gmail-imap-reader')}catch{}
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
  // Strip email addresses
  t=t.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,'[email]');
  // Strip MAC addresses BEFORE IPv6 (IPv6 regex eats MACs)
  t=t.replace(/([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}/g,'[mac]');
  // Strip IP addresses
  t=t.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,'[ip]');
  // Strip IPv6
  t=t.replace(/([0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}/g,'[ipv6]');
  // Strip Homey IDs / tokens BEFORE phone (phone regex breaks long hex)
  t=t.replace(/\b[a-f0-9]{32,}\b/gi,function(m){
    if(m.length===16)return m;return'[token]';
  });
  // Strip phone numbers
  t=t.replace(/\+?\d[\d\s\-().]{8,}\d/g,'[phone]');
  // Strip file paths with usernames
  t=t.replace(/\/(?:home|Users|user)\/[^\s/]+/gi,'[path]');
  t=t.replace(/C:\\Users\\[^\s\\]+/gi,'[path]');
  // Strip "Dear X" / "Hi X" / "Hello X" patterns
  t=t.replace(/(?:dear|hi|hello|hey)\s+[A-Z][a-z]+/gi,'[greeting]');
  // Strip signatures (--- onwards at end)
  t=t.replace(/\n---+\n[\s\S]{0,500}$/,'');
  return t;
}
function sanitizeFrom(from){
  if(!from)return'unknown';
  // Keep only domain, strip personal name and email user
  if(from.includes('notifications@github.com'))return'github';
  if(from.includes('community.homey.app'))return'forum';
  if(from.includes('athom.com'))return'athom';
  return'user';
}

// Extract Tuya fingerprints from text
const exFP=t=>({
  mfr:[...new Set((t||'').match(/_T[A-Z][A-Za-z0-9]{3,5}_[a-z0-9]{4,16}/g)||[])],
  pid:[...new Set((t||'').match(/\bTS[0-9]{4}[A-Z]?\b/g)||[])]
});

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

// Gmail OAuth token refresh + health tracking
const HF=path.join(SD,'gmail-token-health.json');
function loadHealth(){try{return JSON.parse(fs.readFileSync(HF,'utf8'))}catch{return{checks:[],consecutiveFails:0}}}
function saveHealth(h){fs.mkdirSync(SD,{recursive:true});fs.writeFileSync(HF,JSON.stringify(h,null,2))}
function trackToken(ok,err){const h=loadHealth();h.checks=(h.checks||[]).slice(-9);h.checks.push({time:new Date().toISOString(),ok,err:err||null});if(ok){h.lastOk=new Date().toISOString();h.consecutiveFails=0}else{h.lastFail=new Date().toISOString();h.consecutiveFails=(h.consecutiveFails||0)+1}saveHealth(h)}

async function getToken(){
  const{GMAIL_CLIENT_ID:id,GMAIL_CLIENT_SECRET:s,GMAIL_REFRESH_TOKEN:r}=process.env;
  if(!id||!s||!r){console.log('Gmail credentials missing');return null;}
  const hc=loadHealth();if(hc.daysLeft!==undefined)console.log('Token age:',hc.daysOld+'d | Left:',hc.daysLeft+'d');
  const res=await fetchWithRetry('https://oauth2.googleapis.com/token',{method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:'client_id='+id+'&client_secret='+s+'&refresh_token='+r+'&grant_type=refresh_token'},{retries:3,label:'gmailToken'});
  if(!res.ok){const e=await res.text();console.error('Token refresh failed:',res.status,e);trackToken(false,res.status);if(e.includes('invalid_grant')){console.error('=== TOKEN EXPIRED (Testing mode 7-day limit) ===');console.error('PERMANENT FIX: Google Cloud Console > OAuth consent > PUBLISH APP');console.error('TEMP FIX: Regenerate at https://developers.google.com/oauthplayground');console.log('::error::Gmail token expired. Publish OAuth app to Production or regenerate.');}return null;}
  const j=await res.json();
  trackToken(true);
  console.log('Gmail token refreshed OK');
  if(j.refresh_token_expires_in)console.log('Refresh token expires in '+Math.round(j.refresh_token_expires_in/3600)+'h (Testing mode)');
  if(j.refresh_token){console.log('New refresh token received - writing for auto-rotation');fs.writeFileSync(path.join(SD,'_new_refresh_token.txt'),j.refresh_token);}
  return j.access_token;
}

async function gapi(tk,ep,retries=2){
  for(let i=0;i<=retries;i++){
    const r=await fetchWithRetry('https://gmail.googleapis.com/gmail/v1/users/me/'+ep,
      {headers:{Authorization:'Bearer '+tk}},{retries:0,label:'gmailAPI'});
    if(r.ok)return r.json();
    if(r.status===429||r.status>=500){await new Promise(ok=>setTimeout(ok,1000*(i+1)));continue;}
    if(i===retries)console.error('Gmail API error:',r.status,ep.substring(0,40));
    return null;
  }
  return null;
}

// Multi-query Gmail search: ALL Homey-related emails
const SEARCH_QUERIES=[
  // 1. Forum notifications (private + public messages)
  '(from:community.homey.app)',
  // 2. Homey system notifications (crash reports, diagnostics)
  '(from:noreply@athom.com OR from:homey.app)',
  // 3. Homey diagnostic reports, crash logs, interviews
  '(homey AND (diagnostic OR crash OR "app log" OR interview OR "debug log" OR "diag report"))',
  // 4. Tuya/Zigbee device issues from users
  '(tuya AND (zigbee OR wifi OR device OR switch OR sensor OR "not working" OR "not pairing"))',
  // 5. GitHub notifications (issues, PRs, actions)
  '(from:notifications@github.com AND (com.tuya.zigbee OR dlnraja OR "universal tuya" OR JohanBendz))',
  // 6. Fingerprint patterns in emails (device reports)
  '("_TZE200" OR "_TZE204" OR "_TZE284" OR "_TZ3000" OR "_TZ3210" OR "TS0601" OR "TS0001" OR "TS0002")',
  // 7. Homey community / app store
  '(homey AND (changelog OR "new version" OR update OR "app store" OR "test version"))',
  // 8. Homey device-specific terms
  '(homey AND (zigbee OR "device offline" OR interview OR pair OR "re-pair" OR "device report"))',
  // 9. Athom account / Homey app emails
  '(from:athom.com OR subject:homey OR subject:athom)',
  // 10. Tuya WiFi specific
  '("tuya wifi" OR "smart life" OR "tuya smart" OR "tuya cloud")',
  // 11. Private messages from forum users (direct notifications)
  '(from:community.homey.app AND ("private message" OR "direct message" OR "mentioned you"))',
  // 12. Homey device reports and re-pair requests
  '(homey AND ("device report" OR "re-pair" OR repaired OR "added device" OR "removed device"))',
  // 13. App crash and error notifications
  '(homey AND ("app crashed" OR "app error" OR "uncaught" OR "stack trace" OR "ENOMEM"))',
  // 14. Zigbee2MQTT and ZHA cross-reference (alternative platforms)
  '("zigbee2mqtt" OR "z2m" OR "ZHA" OR "deconz" AND (tuya OR "_TZ" OR "_TZE"))',
];

async function searchAll(tk,after){
  const seen=new Set(),all=[];
  for(const q of SEARCH_QUERIES){
    const full=encodeURIComponent(q+' after:'+after);
    const msgs=(await gapi(tk,'messages?q='+full+'&maxResults=50'))?.messages||[];
    for(const m of msgs){if(!seen.has(m.id)){seen.add(m.id);all.push(m)}}
  }
  console.log('Found '+all.length+' unique emails across '+SEARCH_QUERIES.length+' queries');
  return all.slice(0,200); // cap at 200 for comprehensive analysis
}

async function getEmail(tk,id){
  const msg=await gapi(tk,'messages/'+id+'?format=full');if(!msg)return null;
  const h=msg.payload?.headers||[];let body='';
  function ex(p){
    if(p.mimeType==='text/plain'&&p.body?.data)body+=Buffer.from(p.body.data,'base64url').toString('utf8');
    if(p.parts)p.parts.forEach(ex);
  }
  ex(msg.payload||{});
  return{
    id,
    subj:h.find(x=>x.name==='Subject')?.value||'',
    from:h.find(x=>x.name==='From')?.value||'',
    date:h.find(x=>x.name==='Date')?.value||'',
    body,
    labels:msg.labelIds||[]
  };
}

// Classify email type
function classify(em){
  const t=(em.subj+' '+em.body).toLowerCase();
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
  // Errors
  [/Error:?\s*(.{10,80})/gi,/TypeError:?\s*(.{10,60})/gi,/Cannot\s+(.{10,60})/gi,/FATAL:?\s*(.{10,80})/gi]
    .forEach(p=>{let m;while((m=p.exec(t)))errs.push(m[1].trim())});
  // Homey device names
  const dn=t.match(/(?:device|driver)[:\s]+["']?([a-z0-9_-]{3,30})["']?/gi)||[];
  dn.forEach(d=>{const m=d.match(/[:\s]+["']?([a-z0-9_-]{3,30})["']?$/i);if(m)devNames.push(m[1])});
  // Report ID
  const rid=(t.match(/report.?id[:\s]+([a-f0-9-]{8,})/i)||[])[1]||null;
  // Homey version
  const hv=(t.match(/homey.?(?:firmware|version|fw)[:\s]+([0-9.]{3,12})/i)||[])[1]||null;
  // App version
  const av=(t.match(/(?:app|tuya).?version[:\s]+([0-9.]{3,12})/i)||[])[1]||null;
  return{fps,errs:[...new Set(errs)].slice(0,15),devNames:[...new Set(devNames)],rid,homeyVersion:hv,appVersion:av};
}

// Cross-reference fingerprints with driver index
function crossRef(diag,idx){
  const matches=[],pidx=idx.pidx||new Map();
  for(const mfr of diag.fps.mfr){
    const drivers=idx.get(mfr)||[];
    matches.push({fingerprint:mfr,type:'mfr',supported:drivers.length>0,drivers});
  }
  for(const pid of diag.fps.pid){
    const drivers=pidx.get(pid)||[];
    matches.push({fingerprint:pid,type:'pid',supported:drivers.length>0,drivers});
  }
  return matches;
}

// Parse GitHub notification emails
function parseGitHub(em){
  const body=em.body||'';
  const issueNum=(em.subj.match(/#(\d+)/)||[])[1]||null;
  const action=(body.match(/(?:opened|closed|commented|merged|pushed)/i)||[])[0]||null;
  const fps=exFP(body);
  return{issueNum,action,fps,isNew:!!action&&action.toLowerCase()==='opened'};
}

// Rate limiter: 4s between Gemini calls (max 15 RPM), cap 10/run (safe for 1500 RPD)
let _aiCalls=0;const AI_MAX=10;
const delay=ms=>new Promise(r=>setTimeout(r,ms));

// Gemini AI analysis
async function aiAnalyze(diag,subj,type,xref){
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
    'App version: '+(diag.appVersion||'unknown')+'\n\n'+
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

// v5.11.27: Dedup — check for existing open issue with similar title before creating
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
  // Dedup: skip if similar open issue exists
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
  if(DRY){console.log('  [DRY] Would add',fp||'','pid:',pid||'','→',driver);return false}
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
    // Add main FP
    if(addToDriver(r.driver,fp,r.pid||null)){added++;details.push({fp,driver:r.driver,pid:r.pid,confidence:r.confidence})}
    // Add confirmed variants
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
  // v5.11.99: IMAP-primary — no OAuth token expiry issues
  let imapEmails=null,tk=null;
  const hasIMAP=!!(process.env.GMAIL_APP_PASSWORD||process.env.HOMEY_PASSWORD);
  if(imap&&hasIMAP){
    console.log('IMAP-primary mode');
    imapEmails=await imap.readViaIMAP();
    if(imapEmails)console.log('IMAP OK:',imapEmails.length,'emails');
  }
  if(!imapEmails){
    console.log('IMAP unavailable — trying OAuth fallback...');
    tk=await getToken();
    if(!tk){console.log('No email access. Set GMAIL_APP_PASSWORD for IMAP (see SECRETS.md)');process.exit(0)}
  }
  const st=load(),idx=buildIndex(),res=[];
  const after=st.lastCheck?Math.floor(new Date(st.lastCheck).getTime()/1000):Math.floor(Date.now()/1000)-86400*7;
  const done=new Set(st.processed||[]);

  const pidx=idx.pidx||new Map();
  console.log('Driver index:',idx.size,'mfrs +',pidx.size,'pids across',new Set([...idx.values(),...pidx.values()].flat()).size,'drivers');
  console.log('Searching emails after:',new Date(after*1000).toISOString());
  const allNewFPs=new Set();

  // Use IMAP emails directly or fetch via OAuth API
  const emailList=imapEmails||await searchAll(tk,after);
  for(const m of emailList){
    if(done.has(m.id))continue;
    const em=imapEmails?m:await getEmail(tk,m.id);if(!em)continue;
    const type=classify(em);
    const d=parse(em.body);
    const xref=crossRef(d,idx);
    const ghInfo=type==='github'?parseGitHub(em):null;

    // AI analysis for emails with fingerprints, errors, or GitHub issues
    const needsAI=d.fps.mfr.length>0||d.errs.length>0||(ghInfo&&ghInfo.isNew);
    const ai=needsAI?await aiAnalyze(d,em.subj,type,xref):null;

    // Track new FPs for deep research (mfr + pid)
    for(const fp of d.fps.mfr){if(!idx.has(fp))allNewFPs.add(fp)}
    for(const p of d.fps.pid){if(!pidx.has(p))allNewFPs.add(p)}

    // === SANITIZE: strip PII before storing ===
    const safeFrom=sanitizeFrom(em.from);
    const safeSubj=sanitize(em.subj);

    const entry={id:m.id,type,subj:safeSubj,from:safeFrom,date:em.date,
      fps:d.fps,errs:d.errs.map(e=>sanitize(e)),devices:d.devNames,xref,ghInfo,ai,
      homeyVersion:d.homeyVersion,appVersion:d.appVersion};
    res.push(entry);
    done.add(m.id);
    console.log(' ['+type+'] '+em.subj.substring(0,60)+(d.fps.mfr.length?' FP:'+d.fps.mfr.join(','):''));

    // Create GitHub issue for critical/high severity
    if(ai&&(ai.severity==='critical'||ai.severity==='high')){
      const issBody='**Type:** '+type+'\n**From:** '+safeFrom+'\n\n'+
        '**Fingerprints:** '+JSON.stringify(d.fps)+'\n**Errors:** '+JSON.stringify(d.errs.map(e=>sanitize(e)))+'\n'+
        '**Cross-ref:** '+(xref.length?xref.map(x=>x.fingerprint+(x.supported?' (supported: '+x.drivers.join(',')+')':' **NEW**')).join(', '):'none')+'\n\n'+
        '**AI Analysis:**\n- Severity: '+ai.severity+'\n- Summary: '+(ai.summary||'')+'\n- Root cause: '+(ai.rootCause||'')+'\n- Fix: '+(ai.fixSuggestion||'')+'\n- Needs new driver: '+(ai.needsNewDriver||false);
      await mkIssue(safeSubj,issBody);
    }
  }

  // Deep research new FPs from emails
  const newFPList=[...allNewFPs];
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

  // GitHub step summary
  if(process.env.GITHUB_STEP_SUMMARY){
    let sm='## Gmail Diagnostics\n| Metric | Count |\n|---|---|\n';
    sm+='| Emails | '+res.length+' |\n| New FPs | '+newFPs.length+' |\n';
    sm+='| Researched | '+impl.researched+' |\n| Auto-added | '+impl.added+' |\n';
    if(newFPs.length)sm+='\n**New FPs:** '+newFPs.map(f=>'`'+f+'`').join(', ')+'\n';
    if(impl.details.length)sm+='\n**Implemented:**\n'+impl.details.map(d=>'- `'+d.fp+'` -> '+d.driver).join('\n')+'\n';
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,sm);
  }
}
main().catch(e=>{console.error(e.message);process.exit(1)});
