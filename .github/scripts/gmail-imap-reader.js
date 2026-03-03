#!/usr/bin/env node
'use strict';
let ImapFlow;try{ImapFlow=require('imapflow').ImapFlow}catch{}
async function readViaIMAP(opts={}){
  if(!ImapFlow)return null;
  const e=opts.email||process.env.GMAIL_EMAIL,p=opts.password||process.env.GMAIL_APP_PASSWORD;
  if(!e||!p){console.log('[IMAP] GMAIL_EMAIL/GMAIL_APP_PASSWORD missing');return null}
  const since=(opts.afterDate||new Date(Date.now()-7*864e5)).toISOString().split('T')[0];
  console.log('[IMAP] Connecting as',e,'since',since);
  const c=new ImapFlow({host:'imap.gmail.com',port:993,secure:true,auth:{user:e,pass:p},logger:false});
  try{await c.connect();const lock=await c.getMailboxLock('[Gmail]/All Mail');const out=[];
    try{const uids=await c.search({since:new Date(since),or:[{subject:'tuya'},{subject:'zigbee'},{subject:'homey'},{subject:'diagnostic'},{subject:'_TZE200'},{from:'community.homey.app'},{from:'athom.com'},{from:'notifications@github.com'}]},{uid:true});
      const batch=uids.slice(-(opts.maxResults||200));
      console.log('[IMAP]',uids.length,'found, fetching',batch.length);
      for await(const m of c.fetch(batch,{envelope:true,bodyParts:['text']})){
        const body=(m.bodyParts?.get('text')||Buffer.alloc(0)).toString('utf8');
        out.push({id:'imap_'+m.uid,subj:m.envelope?.subject||'',from:m.envelope?.from?.[0]?.address||'',date:m.envelope?.date?.toISOString()||'',body,labels:[]});
      }
    }finally{lock.release()}
    await c.logout();console.log('[IMAP] OK:',out.length);return out;
  }catch(err){console.error('[IMAP]',err.message);try{await c.logout()}catch{};return null}
}
module.exports={readViaIMAP};
