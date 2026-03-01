#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const{fetchWithRetry}=require('./retry-helper');
const SD=path.join(__dirname,'..','state');
const HF=path.join(SD,'gmail-token-health.json');

async function main(){
  const{GMAIL_CLIENT_ID:id,GMAIL_CLIENT_SECRET:s,GMAIL_REFRESH_TOKEN:r}=process.env;
  if(!id||!s||!r){console.log('Gmail creds missing');process.exit(0);}
  fs.mkdirSync(SD,{recursive:true});
  let health;try{health=JSON.parse(fs.readFileSync(HF,'utf8'))}catch{health={checks:[],lastOk:null}}

  console.log('Refreshing Gmail token...');
  const res=await fetchWithRetry('https://oauth2.googleapis.com/token',{method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:'client_id='+id+'&client_secret='+s+'&refresh_token='+r+'&grant_type=refresh_token'},{retries:3,label:'gmailToken'});
  const now=new Date().toISOString();

  if(!res.ok){
    const e=await res.text();
    console.error('FAIL:',res.status,e);
    health.checks.push({time:now,ok:false,err:res.status});
    health.lastFail=now;
    if(e.includes('invalid_grant')){
      console.error('=== TOKEN EXPIRED (Testing mode 7-day limit) ===');
      console.error('PERMANENT FIX: Google Cloud Console > OAuth consent > PUBLISH APP');
      console.error('  URL: https://console.cloud.google.com/apis/credentials/consent');
      console.error('TEMP FIX: Regenerate at https://developers.google.com/oauthplayground');
      console.log('::error::Gmail refresh token EXPIRED. Publish OAuth app to Production mode.');
      fs.writeFileSync(path.join(SD,'_token_expired_alert.txt'),
        'Gmail refresh token expired at '+now+'.\n\nFIX: Google Cloud Console > OAuth consent screen > PUBLISH APP (Testing→Production).\nOR: Regenerate token at OAuth Playground and update GMAIL_REFRESH_TOKEN secret.');
    }
    fs.writeFileSync(HF,JSON.stringify(health,null,2));
    process.exit(0);
  }

  const j=await res.json();
  console.log('OK: access_token expires in',j.expires_in+'s');

  // Testing mode detection + early warning
  if(j.refresh_token_expires_in){
    const h=Math.round(j.refresh_token_expires_in/3600);
    health.refreshTokenExpiresH=h;
    health.refreshTokenExpiresAt=new Date(Date.now()+j.refresh_token_expires_in*1000).toISOString();
    console.log('⚠ TESTING MODE: refresh token expires in',h+'h ('+health.refreshTokenExpiresAt+')');
    console.log('  To fix permanently: Google Cloud Console > OAuth consent > PUBLISH APP');
    if(h<72){
      console.log('::warning::Gmail refresh token expires in '+h+'h! Publish OAuth app or regenerate token.');
      fs.writeFileSync(path.join(SD,'_token_expiring_alert.txt'),
        'Gmail token expires in '+h+'h at '+health.refreshTokenExpiresAt+
        '. FIX: Google Cloud Console > OAuth consent > PUBLISH APP (Testing→Production).');
    }
  } else {
    console.log('✓ Production mode: refresh token does not expire');
    health.refreshTokenExpiresH=null;
  }

  // Capture new refresh token if Google returns one
  if(j.refresh_token){
    console.log('New refresh token received! Saving for auto-rotation...');
    fs.writeFileSync(path.join(SD,'_new_refresh_token.txt'),j.refresh_token);
    health.lastTokenRotation=now;
  }

  // Verify token with lightweight Gmail API call
  try{
    const v=await fetchWithRetry('https://gmail.googleapis.com/gmail/v1/users/me/profile',
      {headers:{Authorization:'Bearer '+j.access_token}},{retries:2,label:'gmailVerify'});
    if(v.ok){const p=await v.json();console.log('Verified:',p.emailAddress,'('+p.messagesTotal+' msgs)');}
    else console.warn('Gmail verify failed:',v.status);
  }catch(e){console.warn('Gmail verify error:',e.message);}

  health.lastOk=now;
  health.checks=(health.checks||[]).concat({time:now,ok:true}).slice(-30);
  health.testingMode=!!j.refresh_token_expires_in;
  fs.writeFileSync(HF,JSON.stringify(health,null,2));
  console.log('Health saved. Testing mode:',health.testingMode);
}
main().catch(e=>{console.error(e.message);process.exit(1);});
