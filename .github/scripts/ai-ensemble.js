'use strict';
const{PROJECT_RULES,ARCHITECTURE_SUMMARY}=require('./project-rules');
const ft=(u,o,ms)=>{ms=ms||25000;const c=new AbortController();const t=setTimeout(()=>c.abort(),ms);return fetch(u,{...o,signal:c.signal}).finally(()=>clearTimeout(t))};
const hd=k=>({'Content-Type':'application/json','Authorization':'Bearer '+k});

function provs(){
  const p=[];
  if(process.env.GROQ_API_KEY)p.push('groq');
  if(process.env.GH_PAT||process.env.GITHUB_TOKEN)p.push('github');
  if(process.env.OPENROUTER_API_KEY)p.push('openrouter');
  if(process.env.CEREBRAS_API_KEY)p.push('cerebras');
  return p;
}

async function qc(p,t,s,mx){
  const b=(m,sy,tx)=>JSON.stringify({model:m,messages:[{role:'system',content:sy},{role:'user',content:tx}],max_tokens:mx,temperature:0.3});
  try{
    let r;
    if(p==='groq')r=await ft('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:hd(process.env.GROQ_API_KEY),body:b('llama-3.3-70b-versatile',s.slice(0,8000),t.slice(0,12000))});
    else if(p==='github')r=await ft('https://models.inference.ai.azure.com/chat/completions',{method:'POST',headers:hd(process.env.GH_PAT||process.env.GITHUB_TOKEN),body:b('gpt-4o-mini',s.slice(0,5000),t.slice(0,12000))});
    else if(p==='openrouter')r=await ft('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:hd(process.env.OPENROUTER_API_KEY),body:b('meta-llama/llama-3.3-8b-instruct:free',s.slice(0,6000),t.slice(0,10000))});
    else if(p==='cerebras')r=await ft('https://api.cerebras.ai/v1/chat/completions',{method:'POST',headers:hd(process.env.CEREBRAS_API_KEY),body:b('llama-3.3-70b',s.slice(0,6000),t.slice(0,10000))});
    if(r&&r.ok){const d=await r.json();return d.choices?.[0]?.message?.content?.trim()||null}
  }catch(e){console.log('  [Ens] '+p+':',e.message)}
  return null;
}

module.exports={qc,provs,ft,hd};
