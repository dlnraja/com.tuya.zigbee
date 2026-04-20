#!/usr/bin/env node
'use strict';
// v5.12.6: IMAP health checker  OAuth removed entirely
const fs=require('fs'),path=require('path');
const SD=path.join(__dirname,'..','state');
const HF=path.join(SD,'gmail-token-health.json');
let imap=null;try{imap=require('./gmail-imap-reader')}catch{}

async function main(){
  fs.mkdirSync(SD,{recursive:true});
  const now=new Date().toISOString();
  let health;try{health=JSON.parse(fs.readFileSync(HF,'utf8'))}catch{health={mode:'imap',checks:[],lastOk:null,consecutiveFails:0}}

  const e=process.env.GMAIL_EMAIL||process.env.HOMEY_EMAIL;
  const p=process.env.GMAIL_APP_PASSWORD||process.env.HOMEY_PASSWORD;

  if(!e||!p){
    console.error('IMAP credentials missing.');
    console.error('Setup (30 seconds):');
    console.error('  1. https://myaccount.google.com/apppasswords');
    console.error('  2. Generate App Password for Mail');
    console.error('  3. gh secret set GMAIL_EMAIL');
    console.error('  4. gh secret set GMAIL_APP_PASSWORD');
    console.log('::error::Set GMAIL_EMAIL + GMAIL_APP_PASSWORD for email diagnostics (see SECRETS.md)');
    health.mode='imap';health.checks=(health.checks||[]).concat({time:now,ok:false,err:'missing_creds'}).slice(-30);
    health.consecutiveFails=(health.consecutiveFails||0)+1;health.lastFail=now;
    fs.writeFileSync(HF,JSON.stringify(health,null,2));
    process.exit(0);
  }

  if(!imap){
    console.error('imapflow not installed. Run: npm install imapflow');
    health.checks=(health.checks||[]).concat({time:now,ok:false,err:'no_imapflow'}).slice(-30);
    health.consecutiveFails=(health.consecutiveFails||0)+1;health.lastFail=now;
    fs.writeFileSync(HF,JSON.stringify(health,null,2));
    process.exit(1);
  }

  console.log('IMAP health check  connecting as',e);
  try{
    const emails=await imap.readViaIMAP({maxResults:5});
    if(emails&&emails.length>=0){
      console.log('IMAP OK:',emails.length,'emails fetched (health check)');
      health.mode='imap';
      health.lastOk=now;
      health.consecutiveFails=0;
      health.emailsFetched=emails.length;
      health.checks=(health.checks||[]).concat({time:now,ok:true,mode:'imap',count:emails.length}).slice(-30);
      // Clear any old OAuth fields
      delete health.tokenSetDate;delete health.daysLeft;delete health.daysOld;
      delete health.expiryEstimate;delete health.testingMode;
      delete health.refreshTokenExpiresH;delete health.refreshTokenExpiresAt;
      console.log('IMAP health: OK (no token expiry, permanent)');
    } else {
      throw new Error('IMAP returned null  connection failed');
    }
  }catch(err){
    console.error('IMAP FAILED:',err.message);
    health.checks=(health.checks||[]).concat({time:now,ok:false,err:err.message}).slice(-30);
    health.consecutiveFails=(health.consecutiveFails||0)+1;health.lastFail=now;
    if(health.consecutiveFails>=3){
      console.log('::warning::IMAP has failed '+health.consecutiveFails+' times. Check GMAIL_APP_PASSWORD.');
      const alertF=path.join(SD,'_imap_alert.txt');
      if(!fs.existsSync(alertF)){
        fs.writeFileSync(alertF,'IMAP connection failed '+health.consecutiveFails+' times.\nLast error: '+err.message+'\n\nCheck:\n1. 2FA enabled on Google account\n2. App Password valid: https://myaccount.google.com/apppasswords\n3. gh secret set GMAIL_APP_PASSWORD with fresh password');
      }
    }
  }

  fs.writeFileSync(HF,JSON.stringify(health,null,2));
  console.log('Health saved. Mode: imap | Consecutive fails:',health.consecutiveFails);
}
main().catch(e=>{console.error(e.message);process.exit(1)});
