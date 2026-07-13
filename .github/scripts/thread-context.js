'use strict';
const{fetchWithRetry}=require('./retry-helper');
const FORUM='https://community.homey.app';
const strip=h=>(h||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();

async function fetchThreadContext(tid,firstNewPostNum,depth){
  depth=depth||parseInt(process.env.THREAD_CONTEXT_DEPTH||'30',10);
  try{
    const from=Math.max(1,firstNewPostNum-depth);
    const r=await fetchWithRetry(FORUM+'/t/'+tid+'/'+from+'.json',{},{retries:2,label:'threadCtx'});
    if(!r.ok)return[];
    const posts=((await r.json()).post_stream||{}).posts||[];
    const before=posts.filter(p=>p.post_number<firstNewPostNum).sort((a,b)=>a.post_number-b.post_number);
    const ownIdx=before.map((p,i)=>p.username==='dlnraja'?i:-1).filter(i=>i>=0);
    const startIdx=ownIdx.length?ownIdx[ownIdx.length-1]:Math.max(0,before.length-10);
    return before.slice(startIdx).map(p=>({num:p.post_number,user:p.username,text:strip(p.cooked||'').substring(0,800),isOwn:p.username==='dlnraja'}));
  }catch(e){console.log('ThreadCtx err:',e.message);return[]}
}

function formatThreadContext(ctx){
  if(!ctx||!ctx.length)return'';
  let s='## PREVIOUS CONVERSATION (what was already discussed)\n';
  for(const p of ctx){
    s+='#'+p.num+' '+(p.isOwn?'**[YOU] dlnraja**':'@'+p.user)+':\n'+p.text+'\n\n';
  }
  s+='IMPORTANT: Do NOT repeat what you already said above. Build on it. If user already got advice, follow up naturally.\n\n';
  return s;
}

module.exports={fetchThreadContext,formatThreadContext};

