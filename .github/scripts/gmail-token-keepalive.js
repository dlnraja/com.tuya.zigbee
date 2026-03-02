#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const{fetchWithRetry}=require('./retry-helper');
const SD=path.join(__dirname,'..','state');
const HF=path.join(SD,'gmail-token-health.json');
const TESTING_DAYS=7;

function getTokenAge(h){
  if(!h.tokenSetDate)return{daysOld:null,daysLeft:null,expiry:null};
  const ms=Date.now()-new Date(h.tokenSetDate).getTime();
  const old=Math.floor(ms/864e5);
  return{daysOld:old,daysLeft:Math.max(0,TESTING_DAYS-old),
    expiry:new Date(new Date(h.tokenSetDate).getTime()+TESTING_DAYS*864e5).toISOString()};
}

// v5.11.27: Dedup — only create alert file if no recent alert (cooldown)
function shouldAlert(health,key,cooldownH){
  const last=health['_lastAlert_'+key];
  if(!last)return true;
  return(Date.now()-new Date(last).getTime())>(cooldownH||24)*3600*1000;
}
function markAlerted(health,key){health['_lastAlert_'+key]=new Date().toISOString();}

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
      console.error('=== TOKEN EXPIRED ===');
      console.error('STEP 1: Go to https://developers.google.com/oauthplayground');
      console.error('STEP 2: Click gear icon > check "Use your own OAuth credentials"');
      console.error('STEP 3: Paste Client ID + Secret > check "Auto-refresh the token"');
      console.error('STEP 4: Select Gmail API v1 > gmail.readonly > Authorize > Exchange');
      console.error('STEP 5: Copy Refresh Token > update GMAIL_REFRESH_TOKEN secret');
      console.error('PERMANENT: Publish OAuth app > https://console.cloud.google.com/apis/credentials/consent');
      console.log('::error::Gmail refresh token EXPIRED. Regenerate via OAuth Playground (see SECRETS.md).');
      health.tokenSetDate=null;health.daysLeft=0;health.expiryEstimate=null;
      if(shouldAlert(health,'expired')){
        fs.writeFileSync(path.join(SD,'_token_expired_alert.txt'),
          'Gmail refresh token expired at '+now+'.\n\n## Regenerate Token\n1. Go to https://developers.google.com/oauthplayground\n2. Click gear ⚙️ > check **Use your own OAuth credentials** > paste Client ID + Secret\n3. Check **Auto-refresh the token before it expires**\n4. Select Gmail API v1 > `gmail.readonly` > Authorize > Exchange\n5. Copy Refresh Token > update `GMAIL_REFRESH_TOKEN` secret\n\n## Permanent Fix\nPublish OAuth app: https://console.cloud.google.com/apis/credentials/consent\nTesting→Production = token never expires.');
        markAlerted(health,'expired');
      } else {
        console.log('Alert cooldown active — skipping duplicate alert file');
      }
    }
    health.consecutiveFails=(health.consecutiveFails||0)+1;
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
      if(shouldAlert(health,'expiring')){
        fs.writeFileSync(path.join(SD,'_token_expiring_alert.txt'),
          'Gmail token expires in '+h+'h at '+health.refreshTokenExpiresAt+
          '. FIX: Google Cloud Console > OAuth consent > PUBLISH APP (Testing→Production).');
        markAlerted(health,'expiring');
      }
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
    health.tokenSetDate=now; // Reset 7-day countdown
  }

  // Verify token with lightweight Gmail API call
  try{
    const v=await fetchWithRetry('https://gmail.googleapis.com/gmail/v1/users/me/profile',
      {headers:{Authorization:'Bearer '+j.access_token}},{retries:2,label:'gmailVerify'});
    if(v.ok){const p=await v.json();console.log('Verified:',p.emailAddress,'('+p.messagesTotal+' msgs)');}
    else console.warn('Gmail verify failed:',v.status);
  }catch(e){console.warn('Gmail verify error:',e.message);}

  health.lastOk=now;
  health.consecutiveFails=0;
  health.checks=(health.checks||[]).concat({time:now,ok:true}).slice(-30);
  health.testingMode=!!j.refresh_token_expires_in;
  if(!health.tokenSetDate)health.tokenSetDate=now;
  const age=getTokenAge(health);
  health.daysOld=age.daysOld;health.daysLeft=age.daysLeft;health.expiryEstimate=age.expiry;
  if(age.daysLeft!==null)console.log('Token age:',age.daysOld+'d | Left:',age.daysLeft+'d | Expiry:',age.expiry);
  if(age.daysLeft!==null&&age.daysLeft<=2&&age.daysLeft>0){
    console.log('::warning::Gmail token expires in '+age.daysLeft+'d! Rotate now via OAuth Playground.');
    if(shouldAlert(health,'expiring_proactive',12)){
      const msg='Gmail token expires in '+age.daysLeft+'d (~'+age.expiry+').\n\nRotate: https://developers.google.com/oauthplayground\nSee SECRETS.md for full steps.\nThen: gh secret set GMAIL_REFRESH_TOKEN';
      fs.writeFileSync(path.join(SD,'_token_expiring_alert.txt'),msg);
      markAlerted(health,'expiring_proactive');
    }
  }
  fs.writeFileSync(HF,JSON.stringify(health,null,2));
  console.log('Health saved. Testing mode:',health.testingMode);
}
main().catch(e=>{console.error(e.message);process.exit(1);});
