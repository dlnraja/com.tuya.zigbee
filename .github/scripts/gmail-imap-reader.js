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
      const kws=['tuya','zigbee','homey','_TZE','_TZ3','TS0','diagnostic'];
      const senders=['community.homey.app','athom.com','notifications@github.com'];
      const seqSet=new Set();
      for(const kw of kws){try{(await c.search({since:new Date(since),subject:kw})).forEach(s=>seqSet.add(s))}catch{}}
      for(const fr of senders){try{(await c.search({since:new Date(since),from:fr})).forEach(s=>seqSet.add(s))}catch{}}
      const seqs=[...seqSet].sort((a,b)=>b-a).slice(0,30);
      console.log('[IMAP]',seqSet.size,'relevant msgs, fetching',seqs.length);
      if(seqs.length>0){
        const range=seqs.join(',');
        for await(const m of c.fetch(range,{envelope:true})){
          try{
            const subj=m.envelope?.subject||'';
            const from=m.envelope?.from?.[0]?.address||'';
            const date=m.envelope?.date?.toISOString()||'';
            const uid=m.uid||m.seq||out.length+1;
            out.push({id:'imap_'+uid,subj,from,date,body:subj,labels:[]});
          }catch(fe){console.log('[IMAP] skip:',fe.message)}
        }
      }
      console.log('[IMAP] fetched',out.length);
    }finally{lock.release()}
    await c.logout();console.log('[IMAP] OK:',out.length);return out;
  }catch(err){console.error('[IMAP] ERROR:',err.message,err.code||'');try{await c.logout()}catch{};return null}
}
module.exports={readViaIMAP};
