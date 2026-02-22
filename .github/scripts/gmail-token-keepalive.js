#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const SD=path.join(__dirname,'..','state');
const HF=path.join(SD,'gmail-token-health.json');
async function main(){
const{GMAIL_CLIENT_ID:id,GMAIL_CLIENT_SECRET:s,GMAIL_REFRESH_TOKEN:r}=process.env;
if(!id||!s||!r){console.log('Gmail creds missing');process.exit(0);}
fs.mkdirSync(SD,{recursive:true});
let health;try{health=JSON.parse(fs.readFileSync(HF,'utf8'))}catch{health={checks:[],lastOk:null}}
console.log('Refreshing Gmail token...');
const res=await fetch('https://oauth2.googleapis.com/token',{method:'POST',
headers:{'Content-Type':'application/x-www-form-urlencoded'},
body:'client_id='+id+'&client_secret='+s+'&refresh_token='+r+'&grant_type=refresh_token'});
const now=new Date().toISOString();
if(!res.ok){
const e=await res.text();
console.error('FAIL:',res.status,e);
health.checks.push({time:now,ok:false,err:res.status});
if(e.includes('invalid_grant'))console.error('TOKEN EXPIRED! Re-generate refresh token via OAuth Playground');
fs.writeFileSync(HF,JSON.stringify(health,null,2));
process.exit(1);
}
const j=await res.json();
console.log('OK: access_token expires in',j.expires_in+'s');
if(j.refresh_token_expires_in){
const h=Math.round(j.refresh_token_expires_in/3600);
console.log('WARNING: Testing mode — refresh token expires in',h+'h');
if(h<48)console.log('::warning::Gmail refresh token expires in '+h+'h! Publish OAuth consent screen to fix.');
}
if(j.refresh_token){
console.log('New refresh token received — saving for auto-rotation');
fs.writeFileSync(path.join(SD,'_new_refresh_token.txt'),j.refresh_token);
}
// Verify token works with a lightweight Gmail API call
try{
const v=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile',
{headers:{Authorization:'Bearer '+j.access_token}});
if(v.ok){const p=await v.json();console.log('Verified:',p.emailAddress,'('+p.messagesTotal+' msgs)');}
else console.warn('Gmail verify failed:',v.status);
}catch(e){console.warn('Gmail verify error:',e.message);}
health.lastOk=now;
health.checks=(health.checks||[]).concat({time:now,ok:true}).slice(-30);
health.testingMode=!!j.refresh_token_expires_in;
fs.writeFileSync(HF,JSON.stringify(health,null,2));
}
main().catch(e=>{console.error(e.message);process.exit(1);});
