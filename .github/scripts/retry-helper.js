'use strict';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function fetchWithRetry(url,opts={},ro={}){
  const{retries=3,baseDelay=1000,timeout=30000,label=''}=ro;
  for(let i=0;i<=retries;i++){
    try{
      const ac=new AbortController(),t=setTimeout(()=>ac.abort(),timeout);
      const r=await fetch(url,{...opts,signal:ac.signal});
      clearTimeout(t);
      if(r.ok||r.status===404||r.status===403||r.status===422)return r;
      if(i<retries&&(r.status===429||r.status>=500)){
        const d=baseDelay*2**i+Math.random()*500;
        console.log('  [retry'+(label?' '+label:'')+'] HTTP '+r.status+' wait '+Math.round(d)+'ms ('+(i+1)+'/'+retries+')');
        await sleep(d);continue;}
      return r;
    }catch(e){
      if(i<retries){const d=baseDelay*2**i+Math.random()*500;
        console.log('  [retry'+(label?' '+label:'')+'] '+e.name+' wait '+Math.round(d)+'ms ('+(i+1)+'/'+retries+')');
        await sleep(d);}
      else throw e;
    }
  }
}
async function retryAsync(fn,ro={}){
  const{retries=3,baseDelay=1000,label=''}=ro;
  for(let i=0;i<=retries;i++){
    try{return await fn();}catch(e){
      if(i<retries){const d=baseDelay*2**i+Math.random()*500;
        console.log('  [retry'+(label?' '+label:'')+'] '+(e.message||e)+' wait '+Math.round(d)+'ms');
        await sleep(d);}
      else throw e;
    }
  }
}
module.exports={fetchWithRetry,retryAsync,sleep};
