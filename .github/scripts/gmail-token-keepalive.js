#!/usr/bin/env node
'use strict';
// v5.13.3: Gmail auth health checker - IMAP primary with OAuth fallback.
const fs=require('fs'),path=require('path');
const privacy=require('./privacy-redactor');
const SD=path.join(__dirname,'..','state');
const HF=path.join(SD,'gmail-token-health.json');
const ALERT=path.join(SD,'_gmail_alert.txt');
let imap=null;try{imap=require('./gmail-imap-reader')}catch{}
let oauth=null;try{oauth=require('./gmail-oauth-reader')}catch{}

function readHealth(){
  try{return JSON.parse(fs.readFileSync(HF,'utf8'))}catch{return{mode:'gmail',checks:[],lastOk:null,consecutiveFails:0}}
}

function boolEnv(name,fallback=false){
  const v=process.env[name];
  const s=String(v||'').trim();
  return v===undefined||s===''?fallback:/^(1|true|yes|on)$/i.test(s);
}

function hasImapCredentials(){
  const email=String(process.env.GMAIL_EMAIL||process.env.HOMEY_EMAIL||'').trim();
  const password=String(process.env.GMAIL_APP_PASSWORD||process.env.HOMEY_PASSWORD||'').trim();
  return Boolean(email&&password);
}

function hasOAuthCredentials(){
  return Boolean(oauth&&oauth.hasOAuthCredentials&&oauth.hasOAuthCredentials());
}

function safeWriteJson(file,obj){
  const safe=privacy.redactObject(obj);
  privacy.assertNoLeaks(safe,file);
  fs.writeFileSync(file,JSON.stringify(safe,null,2));
}

function appendCheck(health,check){
  health.checks=(health.checks||[]).concat(privacy.redactObject(check)).slice(-30);
}

function writeAlert(health,imapResult,oauthResult){
  const lines=[
    'Gmail diagnostics authentication failed '+health.consecutiveFails+' consecutive time(s).',
    'IMAP: '+imapResult.code,
    'OAuth: '+oauthResult.code,
    '',
    'Refresh GitHub Actions secrets:',
    '1. GMAIL_EMAIL',
    '2. GMAIL_APP_PASSWORD from https://myaccount.google.com/apppasswords',
    '3. GMAIL_REFRESH_TOKEN if OAuth fallback is still used',
    '',
    'No secret values were written to this report.'
  ];
  const alert=privacy.redact(lines.join('\n'));
  privacy.assertNoLeaks(alert,ALERT);
  fs.writeFileSync(ALERT,alert);
}

async function tryImap(){
  if(!hasImapCredentials())return{ok:false,mode:'imap',code:'missing_imap_credentials',message:'GMAIL_EMAIL/GMAIL_APP_PASSWORD not configured'};
  if(!imap)return{ok:false,mode:'imap',code:'imap_reader_unavailable',message:'gmail-imap-reader unavailable'};
  const email=String(process.env.GMAIL_EMAIL||process.env.HOMEY_EMAIL||'').trim();
  console.log('IMAP health check - connecting as',privacy.alias('account',email));
  try{
    const emails=await imap.readViaIMAP({maxResults:5});
    if(Array.isArray(emails))return{ok:true,mode:'imap',count:emails.length};
    return{ok:false,mode:'imap',code:'imap_null_response',message:'IMAP returned no response'};
  }catch(err){
    return{ok:false,mode:'imap',code:'imap_read_failed',message:privacy.redact(err.message)};
  }
}

async function tryOAuth(){
  if(!hasOAuthCredentials())return{ok:false,mode:'oauth',code:'missing_oauth_credentials',message:'Gmail OAuth secrets not configured'};
  console.log('OAuth health check - using refresh-token fallback');
  try{
    const emails=await oauth.readViaOAuth({maxResults:5});
    if(Array.isArray(emails))return{ok:true,mode:'oauth',count:emails.length};
    return{ok:false,mode:'oauth',code:'oauth_null_response',message:'OAuth returned no response'};
  }catch(err){
    return{ok:false,mode:'oauth',code:'oauth_read_failed',message:privacy.redact(err.message)};
  }
}

async function main(){
  fs.mkdirSync(SD,{recursive:true});
  const now=new Date().toISOString();
  const health=readHealth();
  const strict=boolEnv('GMAIL_HEALTH_STRICT',boolEnv('GMAIL_DIAG_REQUIRE_ACCESS',false));

  const imapResult=await tryImap();
  if(imapResult.ok){
    console.log('IMAP OK:',imapResult.count,'emails fetched (health check)');
    health.mode='imap';
    health.lastOk=now;
    health.consecutiveFails=0;
    health.emailsFetched=imapResult.count;
    health.requiresSecretRefresh=false;
    health.action='none';
    delete health.lastFail;
    appendCheck(health,{time:now,ok:true,mode:'imap',count:imapResult.count});
    safeWriteJson(HF,health);
    console.log('Health saved. Mode: imap | Consecutive fails:',health.consecutiveFails);
    return;
  }

  console.log('::warning::IMAP health failed: '+imapResult.code);
  const oauthResult=await tryOAuth();
  if(oauthResult.ok){
    console.log('OAuth OK:',oauthResult.count,'emails fetched (health check)');
    health.mode='oauth';
    health.lastOk=now;
    health.lastImapFail=now;
    health.consecutiveFails=0;
    health.emailsFetched=oauthResult.count;
    health.requiresSecretRefresh=imapResult.code!=='missing_imap_credentials';
    health.action=health.requiresSecretRefresh?'refresh_imap_app_password':'none';
    appendCheck(health,{time:now,ok:true,mode:'oauth',count:oauthResult.count,imapFallbackReason:imapResult.code});
    safeWriteJson(HF,health);
    console.log('Health saved. Mode: oauth fallback | Consecutive fails:',health.consecutiveFails);
    return;
  }

  console.error('Gmail auth health failed. IMAP:',imapResult.code,'OAuth:',oauthResult.code);
  health.mode='imap+oauth';
  health.lastFail=now;
  health.consecutiveFails=(Number(health.consecutiveFails)||0)+1;
  health.requiresSecretRefresh=true;
  health.action='refresh_gmail_actions_secrets';
  health.errorCode=oauthResult.code==='missing_oauth_credentials'?imapResult.code:'gmail_auth_failed';
  appendCheck(health,{time:now,ok:false,mode:'imap+oauth',imap:imapResult.code,oauth:oauthResult.code});
  safeWriteJson(HF,health);
  if(health.consecutiveFails>=3)writeAlert(health,imapResult,oauthResult);
  const message='Gmail diagnostics authentication failed. Refresh GMAIL_EMAIL/GMAIL_APP_PASSWORD and GMAIL_REFRESH_TOKEN secrets.';
  if(strict){
    console.log('::error::'+message);
    process.exitCode=1;
    return;
  }
  console.log('::warning::'+message+' Continuing because GMAIL_HEALTH_STRICT is false.');
}

main()
  .then(()=>{if(process.exitCode)setImmediate(()=>process.exit(process.exitCode))})
  .catch(e=>{
    console.error(privacy.redact(e.message));
    process.exitCode=1;
    setImmediate(()=>process.exit(process.exitCode));
  });
