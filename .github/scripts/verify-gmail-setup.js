#!/usr/bin/env node
'use strict';
// v5.12.6: IMAP verifier  OAuth removed
async function main(){
  const e=process.env.GMAIL_EMAIL||process.env.HOMEY_EMAIL;
  const p=process.env.GMAIL_APP_PASSWORD||process.env.HOMEY_PASSWORD;
  console.log('=== Gmail IMAP Verifier ===');
  if(!e||!p){
    console.log('MISSING: GMAIL_EMAIL + GMAIL_APP_PASSWORD');
    console.log('Setup:');
    console.log('  1. https://myaccount.google.com/apppasswords');
    console.log('  2. Generate App Password for Mail');
    console.log('  3. gh secret set GMAIL_EMAIL');
    console.log('  4. gh secret set GMAIL_APP_PASSWORD');
    process.exit(1);
  }
  let imap;
  try{imap=require('./gmail-imap-reader')}catch(err){
    console.log('FAIL: gmail-imap-reader not loadable:',err.message);
    console.log('Run: npm install imapflow');
    process.exit(1);
  }
  console.log('Connecting as',e,'...');
  const emails=await imap.readViaIMAP({maxResults:5});
  if(!emails){
    console.log('FAIL: IMAP returned null  check credentials or 2FA');
    console.log('  App Password: https://myaccount.google.com/apppasswords');
    console.log('  2FA required: https://myaccount.google.com/signinoptions/two-step-verification');
    process.exit(1);
  }
  console.log('OK: IMAP connected, fetched',emails.length,'emails');
  if(emails.length>0){
    console.log('Latest:',emails[0].subj?.substring(0,80));
    console.log('From:',emails[0].from);
    console.log('Date:',emails[0].date);
  }
  console.log('\nIMAP is working. No token expiry  permanent.');
}
main().catch(e=>{console.error(e.message);process.exit(1)});
