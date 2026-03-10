#!/usr/bin/env node
'use strict';
// v5.12.6: PRIMARY email reader via IMAP — credential fallback + better errors
let ImapFlow;try{ImapFlow=require('imapflow').ImapFlow}catch{}
const MBS=['INBOX','[Gmail]/All Mail','[Gmail]/Tous les messages'];

async function tryConnect(user,pass){
  const c=new ImapFlow({host:'imap.gmail.com',port:993,secure:true,auth:{user,pass},logger:false});
  await c.connect();
  return c;
}

async function readViaIMAP(opts={}){
  if(!ImapFlow)return null;
  // Build credential pairs to try
  const pairs=[];
  const ge=opts.email||process.env.GMAIL_EMAIL, gp=process.env.GMAIL_APP_PASSWORD;
  const he=process.env.HOMEY_EMAIL, hp=process.env.HOMEY_PASSWORD;
  if(ge&&gp)pairs.push([ge,gp]);
  if(he&&hp&&(he!==ge||hp!==gp))pairs.push([he,hp]);
  if(ge&&hp&&!pairs.find(p=>p[0]===ge&&p[1]===hp))pairs.push([ge,hp]);
  if(he&&gp&&!pairs.find(p=>p[0]===he&&p[1]===gp))pairs.push([he,gp]);
  if(!pairs.length){console.log('[IMAP] No credentials found');return null}
  const since=(opts.afterDate||new Date(Date.now()-7*864e5)).toISOString().split('T')[0];
  let c=null;
  for(const[u,p] of pairs){
    console.log('[IMAP] Trying',u,'since',since);
    try{c=await tryConnect(u,p);console.log('[IMAP] Auth OK as',u);break}
    catch(err){console.log('[IMAP] Auth FAIL for',u,'-',err.message,err.responseText||'');c=null}
  }
  if(!c){console.error('[IMAP] All credential pairs failed');return null}
  try{
    let lock=null;
    for(const mb of MBS){try{lock=await c.getMailboxLock(mb);console.log('[IMAP] Mailbox:',mb);break}catch(e2){console.log('[IMAP] Skip',mb,e2.message);lock=null}}
    if(!lock){await c.logout();return null}
    const out=[];
    try{
      const kws=['tuya','zigbee','homey','_TZE','_TZ3','TS0','diagnostic','fingerprint','device report'];
      const senders=['community.homey.app','athom.com','notifications@github.com','noreply@homey.app'];
      const seqSet=new Set();
      for(const kw of kws){try{(await c.search({since:new Date(since),subject:kw})).forEach(s=>seqSet.add(s))}catch{}}
      for(const fr of senders){try{(await c.search({since:new Date(since),from:fr})).forEach(s=>seqSet.add(s))}catch{}}
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
  }catch(err){console.error('[IMAP] ERROR:',err.message,err.code||'',err.responseText||'');try{await c.logout()}catch{};return null}
}
module.exports={readViaIMAP};
