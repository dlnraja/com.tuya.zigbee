'use strict';
const fs=require('fs'),path=require('path');
const ft=(u,o,ms)=>{ms=ms||25000;const c=new AbortController();const t=setTimeout(()=>c.abort(),ms);return fetch(u,{...o,signal:c.signal}).finally(()=>clearTimeout(t))};
const hd=k=>({'Content-Type':'application/json','Authorization':'Bearer '+k});
// Zero-billing: shared rate state with ai-helper.js
const _rtF=path.join(__dirname,'..','state','ai-rate-state.json');
const _CAP={deepseek:100,mistral:30,together:200,kimi:50};
function _budgetOk(id){try{const j=JSON.parse(fs.readFileSync(_rtF,'utf8'));if(j.dd!==new Date().toISOString().slice(0,10))return true;return(j.d?.[id]||0)<(_CAP[id]||500)}catch{return true}}
// Provider profiles: strengths per task type (0=bad,3=best), arch for diversity
const P={
  deepseek:{k:'DEEPSEEK_API_KEY',url:'https://api.deepseek.com/chat/completions',m:'deepseek-chat',arch:'deepseek',sl:12000,tl:24000,s:{analyze:3,generate:3,classify:2,merge:3,lookup:2,code:3,reasoning:3}},
  groq:{k:'GROQ_API_KEY',url:'https://api.groq.com/openai/v1/chat/completions',m:'llama-3.3-70b-versatile',arch:'llama70b',sl:8000,tl:12000,s:{analyze:3,generate:3,classify:2,merge:2,lookup:1,code:2,reasoning:2}},
  github:{k:'_GH',url:'https://models.inference.ai.azure.com/chat/completions',m:'gpt-4o-mini',arch:'gpt',sl:5000,tl:12000,s:{classify:3,generate:3,analyze:2,merge:2,lookup:2,code:3,reasoning:2}},
  cerebras:{k:'CEREBRAS_API_KEY',url:'https://api.cerebras.ai/v1/chat/completions',m:'llama-3.3-70b',arch:'llama70b-cb',sl:6000,tl:10000,s:{analyze:3,generate:2,classify:2,merge:3,lookup:1,code:2,reasoning:2}},
  openrouter:{k:'OPENROUTER_API_KEY',url:'https://openrouter.ai/api/v1/chat/completions',m:'meta-llama/llama-3.3-8b-instruct:free',arch:'llama8b',sl:6000,tl:10000,s:{classify:2,lookup:2,merge:2,generate:1,analyze:1}},
  mistral:{k:'MISTRAL_API_KEY',url:'https://api.mistral.ai/v1/chat/completions',m:'open-mistral-nemo',arch:'mistral',sl:6000,tl:10000,s:{analyze:2,generate:2,classify:3,merge:2,lookup:2,code:2,reasoning:1}},
  together:{k:'TOGETHER_API_KEY',url:'https://api.together.xyz/v1/chat/completions',m:'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',arch:'llama70b-tg',sl:6000,tl:10000,s:{analyze:2,generate:3,classify:2,merge:2,lookup:1}},
  kimi:{k:'KIMI_API_KEY',url:'https://api.moonshot.cn/v1/chat/completions',m:'moonshot-v1-8k',arch:'kimi',sl:6000,tl:6000,s:{analyze:2,generate:2,classify:2,merge:2,lookup:1,code:1,reasoning:2}},
};
function _gk(p){if(p.k==='_GH')return process.env.GH_PAT||process.env.GITHUB_TOKEN;return process.env[p.k]}
// Get available providers sorted by strength for a task type
function provs(taskType){
  const tt=taskType||'generate';
  return Object.entries(P).filter(([,v])=>_gk(v)).sort((a,b)=>(b[1].s[tt]||0)-(a[1].s[tt]||0)).map(([k])=>k);
}
// Pick diverse providers: avoid same architecture, prefer high-strength
function pickForTask(taskType,count){
  const tt=taskType||'generate';const avail=provs(tt);
  if(avail.length<=count)return avail;
  const picked=[];const archs=new Set();
  for(const name of avail){if(picked.length>=count)break;const pr=P[name];if(archs.has(pr.arch)&&picked.length>0)continue;picked.push(name);archs.add(pr.arch)}
  while(picked.length<count&&picked.length<avail.length){const next=avail.find(n=>!picked.includes(n));if(next)picked.push(next);else break}
  return picked;
}

// Profile-driven quick call: uses P profiles for model/url/limits
async function qc(name,t,s,mx){
  const pr=P[name];if(!pr)return null;
  const key=_gk(pr);if(!key)return null;
  if(!_budgetOk(name)){console.log('  [Ens] '+name+' daily cap reached — skipping (zero billing)');return null}
  const body=JSON.stringify({model:pr.m,messages:[{role:'system',content:s.slice(0,pr.sl)},{role:'user',content:t.slice(0,pr.tl)}],max_tokens:mx,temperature:0.3});
  try{
    const r=await ft(pr.url,{method:'POST',headers:hd(key),body});
    if(r&&r.ok){const d=await r.json();return d.choices?.[0]?.message?.content?.trim()||null}
    if(r)console.log('  [Ens] '+name+': HTTP '+r.status);
  }catch(e){console.log('  [Ens] '+name+':',e.message)}
  return null;
}

module.exports={qc,provs,pickForTask,ft,hd,P};
