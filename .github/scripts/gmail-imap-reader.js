#!/usr/bin/env node
'use strict';
// v5.11.99: PRIMARY email reader via IMAP (replaces Gmail OAuth)
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
      const kws=['tuya','zigbee','homey','_TZE','_TZ3','TS0','diagnostic','fingerprint','device report'];
      const senders=['community.homey.app','athom.com','notifications@github.com','dylan.rajasekaram@gmail.com','noreply@homey.app'];
      const seqSet=new Set();
      for(const kw of kws){try{(await c.search({since:new Date(since),subject:kw})).forEach(s=>seqSet.add(s))}catch{}}
      for(const fr of senders){try{(await c.search({since:new Date(since),from:fr})).forEach(s=>seqSet.add(s))}catch{}}
      // Also search body text for key Tuya patterns (catches forwarded/redirected emails)
      for(const bk of ['_TZE200','_TZE204','_TZE284','_TZ3000','TS0601','diagnostic report','Homey']){try{(await c.search({since:new Date(since),body:bk})).forEach(s=>seqSet.add(s))}catch{}}
      const seqs=[...seqSet].sort((a,b)=>b-a).slice(0,opts.maxResults||200);
      console.log('[IMAP]',seqSet.size,'relevant msgs, fetching',seqs.length);
      if(seqs.length>0){
        const range=seqs.join(',');
        for await(const m of c.fetch(range,{envelope:true,source:true})){
          try{
            const subj=m.envelope?.subject||'';
            const from=m.envelope?.from?.[0]?.address||'';
            const date=m.envelope?.date?.toISOString()||'';
            const uid=m.uid||m.seq||out.length+1;
            let body=subj;
            if(m.source){try{const raw=m.source.toString('utf8');const parts=raw.split(/\r?\n\r?\n/);if(parts.length>1)body=parts.slice(1).join('\n').substring(0,8000)}catch{}}
            out.push({id:'imap_'+uid,subj,from,date,body,labels:[]});
          }catch(fe){console.log('[IMAP] skip:',fe.message)}
        }
      }
      console.log('[IMAP] fetched',out.length);
    }finally{lock.release()}
    await c.logout();console.log('[IMAP] OK:',out.length);return out;
  }catch(err){console.error('[IMAP] ERROR:',err.message,err.code||'');try{await c.logout()}catch{};return null}
}
module.exports={readViaIMAP};
