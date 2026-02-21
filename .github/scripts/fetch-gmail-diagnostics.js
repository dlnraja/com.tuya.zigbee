#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const SD=path.join(__dirname,'..','state');
const SF=path.join(SD,'diagnostics-state.json');
const RF=path.join(SD,'diagnostics-report.json');
const ROOT=path.join(__dirname,'..','..'),DD=path.join(ROOT,'drivers');
const load=()=>{try{return JSON.parse(fs.readFileSync(SF,'utf8'))}catch{return{lastCheck:null,processed:[]}}};
const save=s=>{fs.mkdirSync(SD,{recursive:true});fs.writeFileSync(SF,JSON.stringify(s,null,2))};
const exFP=t=>({mfr:[...new Set((t||'').match(/_T[A-Z][A-Za-z0-9]{3,5}_[a-z0-9]{4,16}/g)||[])],pid:[...new Set((t||'').match(/\bTS[0-9]{4}[A-Z]?\b/g)||[])]});

function buildIndex(){const idx=new Map();if(!fs.existsSync(DD))return idx;
for(const d of fs.readdirSync(DD)){const f=path.join(DD,d,'driver.compose.json');
if(!fs.existsSync(f))continue;const c=fs.readFileSync(f,'utf8');
for(const m of(c.match(/"_T[A-Za-z0-9_]+"/g)||[]))
{const k=m.replace(/"/g,'');if(!idx.has(k))idx.set(k,[]);if(!idx.get(k).includes(d))idx.get(k).push(d)}}
return idx}

async function getToken(){
const{GMAIL_CLIENT_ID:id,GMAIL_CLIENT_SECRET:s,GMAIL_REFRESH_TOKEN:r}=process.env;
if(!id||!s||!r)return null;
const res=await fetch('https://oauth2.googleapis.com/token',{method:'POST',
headers:{'Content-Type':'application/x-www-form-urlencoded'},
body:'client_id='+id+'&client_secret='+s+'&refresh_token='+r+'&grant_type=refresh_token'});
if(!res.ok)return null;return(await res.json()).access_token}

async function gapi(tk,ep){
const r=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/'+ep,{headers:{Authorization:'Bearer '+tk}});
return r.ok?r.json():null}

async function search(tk,after){
const q=encodeURIComponent('(diagnostic OR tuya OR zigbee) after:'+after);
return(await gapi(tk,'messages?q='+q+'&maxResults=20'))?.messages||[]}

async function getEmail(tk,id){
const msg=await gapi(tk,'messages/'+id+'?format=full');if(!msg)return null;
const h=msg.payload?.headers||[];let body='';
function ex(p){if(p.mimeType==='text/plain'&&p.body?.data)body+=Buffer.from(p.body.data,'base64url').toString('utf8');if(p.parts)p.parts.forEach(ex)}
ex(msg.payload||{});
return{id,subj:h.find(x=>x.name==='Subject')?.value||'',from:h.find(x=>x.name==='From')?.value||'',date:h.find(x=>x.name==='Date')?.value||'',body}}

function parse(t){
const fps=exFP(t),errs=[];
[/Error:?\s*(.{10,80})/gi,/TypeError:?\s*(.{10,60})/gi].forEach(p=>{let m;while((m=p.exec(t)))errs.push(m[1].trim())});
return{fps,errs:[...new Set(errs)].slice(0,15),rid:(t.match(/report.?id[:\s]+([a-f0-9-]{8,})/i)||[])[1]||null}}

async function aiAnalyze(diag,subj){
const gk=process.env.GOOGLE_API_KEY;if(!gk)return null;
try{const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key='+gk,{
method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify({contents:[{parts:[{text:'Analyze Homey Zigbee diagnostic. Subject:'+subj+' FPs:'+JSON.stringify(diag.fps)+' Errors:'+JSON.stringify(diag.errs)+'. Return JSON:{severity,summary,fixSuggestion}'}]}],
generationConfig:{temperature:0.1,maxOutputTokens:512}})});
if(!r.ok)return null;const d=await r.json();const t=d.candidates?.[0]?.content?.parts?.[0]?.text;
if(!t)return null;const j=t.match(/\{[\s\S]*\}/);
return j?JSON.parse(j[0]):{severity:'low',summary:t.substring(0,200)}}catch{return null}}

async function mkIssue(title,body){
const tk=process.env.GITHUB_TOKEN||process.env.GH_PAT;if(!tk)return null;
const r=await fetch('https://api.github.com/repos/dlnraja/com.tuya.zigbee/issues',{
method:'POST',headers:{Authorization:'Bearer '+tk,Accept:'application/vnd.github+json','Content-Type':'application/json'},
body:JSON.stringify({title,body,labels:['diagnostic','auto-detected']})});
return r.ok?r.json():null}

async function main(){
const tk=await getToken();
if(!tk){console.log('No token');process.exit(0)}
const st=load(),idx=buildIndex(),res=[];
const after=st.lastCheck?Math.floor(new Date(st.lastCheck).getTime()/1000):Math.floor(Date.now()/1000)-86400;
const done=new Set(st.processed||[]);
for(const m of await search(tk,after)){
if(done.has(m.id))continue;
const em=await getEmail(tk,m.id);if(!em)continue;
const d=parse(em.body);
const ai=d.fps.mfr.length?await aiAnalyze(d,em.subj):null;
res.push({id:m.id,subj:em.subj,fps:d.fps,errs:d.errs,ai});
done.add(m.id);
if(ai&&ai.severity==='critical')await mkIssue('[Diag] '+em.subj.substring(0,60),'Auto: '+JSON.stringify(ai))}
st.lastCheck=new Date().toISOString();
st.processed=[...done].slice(-500);
save(st);
fs.writeFileSync(RF,JSON.stringify({timestamp:st.lastCheck,count:res.length,diagnostics:res},null,2));
console.log('Done:',res.length)}
main().catch(e=>{console.error(e.message);process.exit(1)});
