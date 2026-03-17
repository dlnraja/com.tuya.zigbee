#!/usr/bin/env node
"use strict";
const fs=require("fs"),path=require("path");
const{fetchWithRetry}=require("./retry-helper");
const KB=require("./bug-knowledge-base");
let _profileDetector=null;
function getProfileDetector(){if(_profileDetector)return _profileDetector;try{_profileDetector=require("./user-profile-detector")}catch{_profileDetector=null}return _profileDetector}
const SD=path.join(__dirname,"..","state");
const DD=path.join(__dirname,"..","..","drivers");
const DRY=process.env.DRY_RUN==="true";
const TOKEN=process.env.GH_PAT||process.env.GITHUB_TOKEN;
const GH="https://api.github.com";
const OWN="dlnraja/com.tuya.zigbee";
const UP="JohanBendz/com.tuya.zigbee";
const TAG="<!-- diag-resolver -->";
const SF=path.join(SD,"resolver-state.json");
const RF=path.join(SD,"resolver-report.json");
let appVer="?";try{appVer=require("../../app.json").version}catch{}
const{extractFP:_vFP,extractFPWithBrands:_vFPB,extractPID:_vPID,isValidTuyaFP}=require("./fp-validator");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const hdrs=t=>({Accept:"application/vnd.github+json","User-Agent":"tuya-resolver",...(t?{Authorization:"Bearer "+t}:{})});
const loadJ=f=>{try{return JSON.parse(fs.readFileSync(f,"utf8"))}catch{return null}};
const loadSt=()=>loadJ(SF)||{resolved:[],commented:[],lastRun:null};
const saveSt=s=>{fs.mkdirSync(SD,{recursive:true});fs.writeFileSync(SF,JSON.stringify(s,null,2))};
const exFP=_vFP;
const exPID=t=>[...new Set((t||"").match(/\bTS[0-9]{4}[A-Z]?\b/g)||[])];
const SYM=[
{id:"volt",rx:/voltage.*(wrong|high|2\d{3})/i,fix:"Voltage divisor fixed — update+re-pair"},
{id:"temp",rx:/temp.*(null|missing|stuck)/i,fix:"DP mapping fixed — update+re-pair"},
{id:"ring",rx:/ring.*(wrong|value)|alarm.*(wrong|stuck)/i,fix:"Alarm DP updated — re-pair"},
{id:"energy",rx:/power.*(wrong|crazy)|kwh.*(wrong)/i,fix:"Energy divisor fixed — re-pair"},
{id:"zero",rx:/stuck.*(0|zero)/i,fix:"Remove+re-pair device"},
{id:"invert",rx:/invert|reversed|wrong.*(open|closed)/i,fix:"Check Invert in device settings"},
...KB.CRITICAL_PATTERNS.map(p=>({id:p.id,rx:p.rx,fix:p.fix}))
];
const detectSym=t=>SYM.filter(s=>s.rx.test(t||""));
function detectProtocol(text,driver){
const matches=KB.PROTOCOL_PATTERNS.filter(p=>p.rx.test(text||"")).map(p=>p.protocol);
if(matches.includes("hybrid"))return"hybrid";
if(matches.includes("tuya_dp")&&matches.includes("ias"))return"hybrid";
if(matches.includes("tuya_dp"))return"tuya_dp";
if(matches.includes("ias"))return"ias";
if(matches.includes("zcl_only"))return"zcl";
if(driver&&driver.includes("radar"))return"hybrid";
if(driver&&driver.includes("presence"))return"hybrid";
return"unknown";
}
function buildIdx(){
const idx=new Map();if(!fs.existsSync(DD))return idx;
for(const d of fs.readdirSync(DD)){
const f=path.join(DD,d,"driver.compose.json");if(!fs.existsSync(f))continue;
try{const c=JSON.parse(fs.readFileSync(f,"utf8"));
for(const m of(c.zigbee?.manufacturerName||[]))idx.set(m,(idx.get(m)||[]).concat(d).filter((v,i,a)=>a.indexOf(v)===i));
for(const p of(c.zigbee?.productId||[])){const k="pid:"+p;idx.set(k,(idx.get(k)||[]).concat(d).filter((v,i,a)=>a.indexOf(v)===i))}
}catch{}
}return idx;
}
async function ghGet(ep){
try{const r=await fetchWithRetry(GH+ep,{headers:hdrs(TOKEN)},{retries:2,label:"ghGet"});return r.ok?r.json():null}catch{return null}
}
async function ghPost(ep,body){
if(DRY){console.log("[DRY] POST",ep.slice(0,60));return{id:"dry"}}
try{const r=await fetchWithRetry(GH+ep,{method:"POST",headers:{...hdrs(TOKEN),"Content-Type":"application/json"},body:JSON.stringify(body)},{retries:2,label:"ghPost"});return r.ok?r.json():null}catch{return null}
}
async function ghPatch(ep,body){
if(DRY){console.log("[DRY] PATCH",ep.slice(0,60));return true}
try{const r=await fetchWithRetry(GH+ep,{method:"PATCH",headers:{...hdrs(TOKEN),"Content-Type":"application/json"},body:JSON.stringify(body)},{retries:2,label:"ghPatch"});return r.ok}catch{return false}
}
function collectDiagFPs(){
const all=new Map();
const gd=loadJ(path.join(SD,"diagnostics-report.json"));
if(gd&&gd.diagnostics){for(const d of gd.diagnostics){for(const fp of(d.fps&&d.fps.mfr||[]))all.set(fp,{source:"gmail",date:d.date,type:d.type,protocol:detectProtocol(d.stderr||d.stdout||"",d.driver)})}}
const hd=loadJ(path.join(SD,"homey-device-report.json"));
if(hd&&hd.devices){for(const d of hd.devices){if(d.manufacturerName&&d.manufacturerName.startsWith("_T"))all.set(d.manufacturerName,{source:"homey",pid:d.modelId,driver:d.driver,protocol:detectProtocol("",d.driver)})}}
const fa=loadJ(path.join(SD,"forum-activity-data.json"));
if(fa&&fa.recentPosts){for(const p of fa.recentPosts){for(const fp of exFP(p.excerpt||p.text||""))all.set(fp,{source:"forum",user:p.username,date:p.createdAt||p.date,protocol:detectProtocol(p.excerpt||p.text||"")})}}
const ps=loadJ(path.join(SD,"pr-issue-scan.json"));
if(ps&&ps.prs){for(const pr of ps.prs){for(const fp of(pr.fps||[]))all.set(fp,{source:"pr",num:pr.number,repo:pr.repo||UP,protocol:detectProtocol(pr.body||pr.title||"")})}}
if(ps&&ps.issues){for(const iss of ps.issues){for(const fp of(iss.fps||[]))all.set(fp,{source:"issue",num:iss.number,repo:iss.repo||UP,protocol:detectProtocol(iss.body||iss.title||"")})}}
return all;
}
const _cache={};
async function fetchOpen(repo,type){
const k=repo+type;if(_cache[k])return _cache[k];
const items=[];
for(let pg=1;pg<=3;pg++){
const ep="/repos/"+repo+"/"+(type==="pr"?"pulls":"issues")+"?state=open&per_page=50&page="+pg;
const d=await ghGet(ep);if(!d||!d.length)break;
items.push(...d);await sleep(1000);
}
_cache[k]=items;return items;
}
function buildComment(fpResults,isPR,isDelay,syms=[],issueUser="",protocol="unknown"){
const pd=getProfileDetector();
let profileNote="";
if(pd&&issueUser){try{const det=pd.detectFromGitHub(issueUser,"");if(det.isReturning&&det.pending)profileNote="\n> **Your pending issue:** "+det.pending.note+"\n"}catch{}}
const drvList=fpResults.map(f=>"`"+f.fp+"` -> **"+f.drivers.join(", ")+"**").join("\n- ");
let protocolNote="";
if(protocol==="hybrid")protocolNote="\n> **Protocol:** Hybrid device (IAS Zone + Tuya DP). Magic packet timing and enrollment crucial.\n";
else if(protocol==="tuya_dp")protocolNote="\n> **Protocol:** Tuya DP (cluster 0xEF00). Ensure DP listeners active.\n";
else if(protocol==="ias")protocolNote="\n> **Protocol:** IAS Zone. Enrollment and zone listeners required.\n";
return TAG+"\n### Auto-resolved by Diagnostic Resolver\n\n"+profileNote+
"All fingerprints in this "+(isPR?"PR":"issue")+" are already supported in **Universal Tuya Zigbee v"+appVer+"**:\n- "+drvList+"\n\n"+
"**Install:** https://homey.app/a/com.dlnraja.tuya.zigbee/test/\n"+
"Remove and re-pair your device after installing.\n\n"+
protocolNote+
(fpResults.some(f=>f.drivers.length>1)?"> Note: Some fingerprints map to multiple drivers — the correct driver is determined by the **productId** (e.g. TS0001, TS0002).\n\n":"")+
(isDelay?"> **Delay fix (v5.11.99+):** Devices now send dataQuery immediately on init. Update and re-pair to fix.\n\n":"")+
(syms.length?"\n**Detected issues:**\n"+syms.map(s=>"- "+s.fix).join("\n")+"\n\n":"")+
"**Troubleshooting:** https://github.com/"+OWN+"/wiki/Troubleshooting\n";
}
async function main(){
console.log("Diagnostic Auto-Resolver (Enhanced Multi-Protocol) v"+appVer);
const idx=buildIdx();console.log("Indexed "+idx.size+" fingerprints/productIds");
const st=loadSt();
const report={timestamp:new Date().toISOString(),processed:0,commented:0,closed:0,protocols:{},errors:[]};
for(const repo of[OWN,UP]){
const issues=await fetchOpen(repo,"issue");
for(const iss of issues){
if(st.commented.includes(iss.id))continue;
const txt=iss.title+" "+iss.body;
const fps=exFP(txt);const pids=exPID(txt);
if(!fps.length&&!pids.length)continue;
const proto=detectProtocol(txt,null);
report.protocols[proto]=(report.protocols[proto]||0)+1;
const resolution=KB.getResolution(txt);
if(resolution){
console.log("KB match:",resolution.id,"for issue",iss.number);
const comment=TAG+"\n### "+resolution.fix+"\n\n"+(resolution.action?"**Action:** "+resolution.action+"\n\n":"")+"**Version:** v"+appVer+"\n";
await ghPost("/repos/"+repo+"/issues/"+iss.number+"/comments",{body:comment});
st.commented.push(iss.id);report.commented++;
}
const results=fps.map(fp=>({fp,drivers:idx.get(fp)||[]})).filter(r=>r.drivers.length);
if(results.length===fps.length&&results.every(r=>r.drivers.length)){
const syms=detectSym(txt);
const cmt=buildComment(results,false,txt.includes("delay"),syms,iss.user?.login||"",proto);
await ghPost("/repos/"+repo+"/issues/"+iss.number+"/comments",{body:cmt});
st.commented.push(iss.id);report.commented++;
}
report.processed++;
}
}
saveSt({...st,lastRun:new Date().toISOString()});
fs.writeFileSync(RF,JSON.stringify(report,null,2));
console.log("Report:",report);
}
if(require.main===module)main().catch(e=>{console.error(e);process.exit(1)});
module.exports={buildIdx,detectProtocol,detectSym};
