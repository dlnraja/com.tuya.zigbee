#!/usr/bin/env node
'use strict';
let ImapFlow;try{ImapFlow=require('imapflow').ImapFlow}catch{}
const MBS=['INBOX','[Gmail]/All Mail','[Gmail]/Tous les messages'];
async function readViaIMAP(opts={}){
  if(!ImapFlow)return null;
  const e=opts.email||process.env.GMAIL_EMAIL||process.env.HOMEY_EMAIL;
  const p=opts.password||process.env.GMAIL_APP_PASSWORD||process.env.HOMEY_PASSWORD;
  if(!e||!p){console.log('[IMAP] Need email+password');return null}
  const since=(opts.afterDate||new Date(Date.now()-7*864e5)).toISOString().split('T')[0];
  console.log('[IMAP] Connecting as',e,'since',since);
  const c=new ImapFlow({host:'imap.gmail.com',port:993,secure:true,auth:{user:e,pass:p},logger:false});
  try{
    await c.connect();console.log('[IMAP] Auth OK');
    let lock=null;
    for(const mb of MBS){try{lock=await c.getMailboxLock(mb);console.log('[IMAP] Mailbox:',mb);break}catch(e2){console.log('[IMAP] Skip',mb,e2.message);lock=null}}
    if(!lock){await c.logout();return null}
    const out=[];
    try{
      const uids=await c.search({since:new Date(since)},{uid:true});
      const batch=uids.slice(-(opts.maxResults||200));
      console.log('[IMAP]',uids.length,'total,',batch.length,'fetching');
      for await(const m of c.fetch(batch,{uid:true,envelope:true,source:true})){
        const body=(m.source||Buffer.alloc(0)).toString('utf8').substring(0,10000);
        out.push({id:'imap_'+m.uid,subj:m.envelope?.subject||'',from:m.envelope?.from?.[0]?.address||'',date:m.envelope?.date?.toISOString()||'',body,labels:[]});
      }
    }finally{lock.release()}
    await c.logout();console.log('[IMAP] OK:',out.length);return out;
  }catch(err){console.error('[IMAP] ERROR:',err.message,err.code||'');try{await c.logout()}catch{};return null}
}
module.exports={readViaIMAP};
