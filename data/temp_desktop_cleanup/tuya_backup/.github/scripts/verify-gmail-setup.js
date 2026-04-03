#!/usr/bin/env node
'use strict';
async function main(){
  const{GMAIL_CLIENT_ID:cid,GMAIL_CLIENT_SECRET:cs,GMAIL_REFRESH_TOKEN:rt}=process.env;
  console.log('=== Gmail OAuth Verifier ===');
  if(!cid||!cs||!rt){console.log('MISSING secrets. See SECRETS.md');process.exit(1)}
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:'client_id='+cid+'&client_secret='+cs+'&refresh_token='+rt+'&grant_type=refresh_token'});
  if(!r.ok){const e=await r.text();console.log('FAIL:',r.status,e);
    console.log('\nRegenerate at https://developers.google.com/oauthplayground');
    console.log('Scope: gmail.readonly | Check: own credentials + auto-refresh');
    process.exit(1)}
  const j=await r.json();
  console.log('Token OK, expires in',j.expires_in+'s');
  if(j.refresh_token_expires_in)console.log('WARNING: Testing mode! Publish app.');
  else console.log('Production mode: token permanent');
  const v=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile',
    {headers:{Authorization:'Bearer '+j.access_token}});
  if(v.ok){const p=await v.json();console.log('Gmail:',p.emailAddress,p.messagesTotal+'msgs')}
  else console.log('Gmail API fail:',v.status);
}
main().catch(e=>{console.error(e.message);process.exit(1)});
