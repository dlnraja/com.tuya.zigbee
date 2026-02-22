#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const SD=path.join(__dirname,'..','state');
async function main(){
const{GMAIL_CLIENT_ID:id,GMAIL_CLIENT_SECRET:s,GMAIL_REFRESH_TOKEN:r}=process.env;
if(!id||!s||!r){console.log('No creds');process.exit(0);}
const res=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'client_id='+id+'&client_secret='+s+'&refresh_token='+r+'&grant_type=refresh_token'});
if(!res.ok){console.error('FAIL:',res.status);process.exit(1);}
const j=await res.json();
console.log('OK:',j.expires_in+'s');
if(j.refresh_token){fs.mkdirSync(SD,{recursive:true});fs.writeFileSync(path.join(SD,'_new_refresh_token.txt'),j.refresh_token);console.log('NEW token saved');}
}
main().catch(e=>{console.error(e);process.exit(1);});
