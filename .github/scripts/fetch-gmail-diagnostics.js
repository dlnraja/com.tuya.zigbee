#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const{fetchWithRetry}=require('./retry-helper');
const SD=path.join(__dirname,'..','state');
const SF=path.join(SD,'diagnostics-state.json');
const RF=path.join(SD,'diagnostics-report.json');
const ROOT=path.join(__dirname,'..','..'),DD=path.join(ROOT,'drivers');
const load=()=>{try{return JSON.parse(fs.readFileSync(SF,'utf8'))}catch{return{lastCheck:null,processed:[]}}};
const save=s=>{fs.mkdirSync(SD,{recursive:true});fs.writeFileSync(SF,JSON.stringify(s,null,2))};

// Extract Tuya fingerprints from text
const exFP=t=>({
  mfr:[...new Set((t||'').match(/_T[A-Z][A-Za-z0-9]{3,5}_[a-z0-9]{4,16}/g)||[])],
  pid:[...new Set((t||'').match(/\bTS[0-9]{4}[A-Z]?\b/g)||[])]
});

// Build fingerprint->driver index from drivers/
function buildIndex(){
  const idx=new Map();
  if(!fs.existsSync(DD))return idx;
  for(const d of fs.readdirSync(DD)){
    const f=path.join(DD,d,'driver.compose.json');
    if(!fs.existsSync(f))continue;
    const c=fs.readFileSync(f,'utf8');
    for(const m of(c.match(/"_T[A-Za-z0-9_]+"/g)||[]))
    {const k=m.replace(/"/g,'');if(!idx.has(k))idx.set(k,[]);if(!idx.get(k).includes(d))idx.get(k).push(d)}
  }
  return idx;
}

// Gmail OAuth token refresh
async function getToken(){
  const{GMAIL_CLIENT_ID:id,GMAIL_CLIENT_SECRET:s,GMAIL_REFRESH_TOKEN:r}=process.env;
  if(!id||!s||!r){console.log('Gmail credentials missing: need GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN');return null;}
  const res=await fetchWithRetry('https://oauth2.googleapis.com/token',{method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:'client_id='+id+'&client_secret='+s+'&refresh_token='+r+'&grant_type=refresh_token'},{retries:3,label:'gmailToken'});
  if(!res.ok){const e=await res.text();console.error('Token refresh failed:',res.status,e);if(e.includes('invalid_grant')){console.error('TOKEN EXPIRED (Testing mode 7-day limit). Re-generate at https://developers.google.com/oauthplayground');console.log('::warning::Gmail token expired. Diagnostics skipped this run.');}return null;}
  const j=await res.json();
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
];

async function searchAll(tk,after){
  const seen=new Set(),all=[];
  for(const q of SEARCH_QUERIES){
    const full=encodeURIComponent(q+' after:'+after);
    const msgs=(await gapi(tk,'messages?q='+full+'&maxResults=25'))?.messages||[];
    for(const m of msgs){if(!seen.has(m.id)){seen.add(m.id);all.push(m)}}
  }
  console.log('Found '+all.length+' unique emails across '+SEARCH_QUERIES.length+' queries');
  return all.slice(0,100); // cap at 100
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
  const matches=[];
  for(const mfr of diag.fps.mfr){
    const drivers=idx.get(mfr)||[];
    matches.push({fingerprint:mfr,supported:drivers.length>0,drivers});
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
    'Fingerprints found: '+JSON.stringify(diag.fps)+'\n'+
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

// Create GitHub issue for critical findings
async function mkIssue(title,body){
  const tk=process.env.GH_PAT||process.env.GITHUB_TOKEN;if(!tk)return null;
  const r=await fetchWithRetry('https://api.github.com/repos/dlnraja/com.tuya.zigbee/issues',{
    method:'POST',headers:{Authorization:'Bearer '+tk,Accept:'application/vnd.github+json','Content-Type':'application/json'},
    body:JSON.stringify({title:'[Diag] '+title.substring(0,80),body,labels:['diagnostic','auto-detected']})},{retries:2,label:'ghIssue'});
  return r.ok?r.json():null;
}

async function main(){
  const tk=await getToken();
  if(!tk){console.log('No Gmail token - set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN');process.exit(0)}
  const st=load(),idx=buildIndex(),res=[];
  const after=st.lastCheck?Math.floor(new Date(st.lastCheck).getTime()/1000):Math.floor(Date.now()/1000)-86400*3;
  const done=new Set(st.processed||[]);

  console.log('Driver index:',idx.size,'fingerprints across',new Set([...idx.values()].flat()).size,'drivers');
  console.log('Searching emails after:',new Date(after*1000).toISOString());

  for(const m of await searchAll(tk,after)){
    if(done.has(m.id))continue;
    const em=await getEmail(tk,m.id);if(!em)continue;
    const type=classify(em);
    const d=parse(em.body);
    const xref=crossRef(d,idx);
    const ghInfo=type==='github'?parseGitHub(em):null;

    // AI analysis for emails with fingerprints, errors, or GitHub issues
    const needsAI=d.fps.mfr.length>0||d.errs.length>0||(ghInfo&&ghInfo.isNew);
    const ai=needsAI?await aiAnalyze(d,em.subj,type,xref):null;

    const entry={id:m.id,type,subj:em.subj,from:em.from,date:em.date,
      fps:d.fps,errs:d.errs,devices:d.devNames,xref,ghInfo,ai,
      homeyVersion:d.homeyVersion,appVersion:d.appVersion};
    res.push(entry);
    done.add(m.id);
    console.log(' ['+type+'] '+em.subj.substring(0,60)+(d.fps.mfr.length?' FP:'+d.fps.mfr.join(','):''));

    // Create GitHub issue for critical/high severity
    if(ai&&(ai.severity==='critical'||ai.severity==='high')){
      const body='**Type:** '+type+'\n**From:** '+em.from+'\n**Subject:** '+em.subj+'\n\n'+
        '**Fingerprints:** '+JSON.stringify(d.fps)+'\n**Errors:** '+JSON.stringify(d.errs)+'\n'+
        '**Cross-ref:** '+(xref.length?xref.map(x=>x.fingerprint+(x.supported?' (supported: '+x.drivers.join(',')+')':' **NEW**')).join(', '):'none')+'\n\n'+
        '**AI Analysis:**\n- Severity: '+ai.severity+'\n- Summary: '+(ai.summary||'')+'\n- Root cause: '+(ai.rootCause||'')+'\n- Fix: '+(ai.fixSuggestion||'')+'\n- Needs new driver: '+(ai.needsNewDriver||false);
      await mkIssue(em.subj,body);
    }
  }

  st.lastCheck=new Date().toISOString();
  st.processed=[...done].slice(-500);
  save(st);
  fs.writeFileSync(RF,JSON.stringify({timestamp:st.lastCheck,count:res.length,
    byType:{forum_message:res.filter(r=>r.type==='forum_message').length,
      homey_system:res.filter(r=>r.type==='homey_system').length,
      interview:res.filter(r=>r.type==='interview').length,
      diagnostic:res.filter(r=>r.type==='diagnostic').length,
      bug_report:res.filter(r=>r.type==='bug_report').length,
      github:res.filter(r=>r.type==='github').length,
      changelog:res.filter(r=>r.type==='changelog').length,
      device_issue:res.filter(r=>r.type==='device_issue').length,
      general:res.filter(r=>r.type==='general').length},
    newFingerprints:res.flatMap(r=>(r.xref||[]).filter(x=>!x.supported).map(x=>x.fingerprint)).filter((v,i,a)=>a.indexOf(v)===i),
    diagnostics:res},null,2));
  console.log('Done:',res.length,'emails processed');
  const bt={};for(const r of res)bt[r.type]=(bt[r.type]||0)+1;
  console.log('By type:',JSON.stringify(bt));
}
main().catch(e=>{console.error(e.message);process.exit(1)});
