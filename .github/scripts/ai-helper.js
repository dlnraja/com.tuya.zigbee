/**
 * AI Helper - Multi-provider with project rules injection
 * Chain (FREE TIERS): Gemini → GitHub Models → OpenAI(free) → Groq → Granite → Mistral(free) → OpenRouter → Cerebras → Together → ApiFreeLLM
 */
const fs=require('fs'),path=require('path');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const{PROJECT_RULES,ARCHITECTURE_SUMMARY}=require('./project-rules');
// Smart model routing: [id, model, complexity(0-3), rpm, rpd]
const GTIERS=[['pro25','gemini-2.5-pro',3,5,100],['flash25','gemini-2.5-flash',2,10,250],['flash20','gemini-2.0-flash',1,15,1500],['lite20','gemini-2.0-flash-lite',0,30,1500]];

// Circuit breaker: skip providers down recently
const _cb={};
function cbOk(n){const e=_cb[n];if(!e)return true;if(Date.now()-e.t>e.c){delete _cb[n];return true;}return false;}
function cbFail(n,ms){_cb[n]={t:Date.now(),c:ms||300000};}
// Fetch with timeout
function fetchT(url,opts,ms){ms=ms||30000;const ac=new AbortController();const tid=setTimeout(()=>ac.abort(),ms);opts=Object.assign({},opts,{signal:ac.signal});return fetch(url,opts).finally(()=>clearTimeout(tid));}
// Backoff with jitter
function backoff(attempt){return Math.min(2000*Math.pow(2,attempt)+Math.random()*1000,60000);}
const _rt={m:{},d:{},mt:0,dd:''};const _rtF=path.join(__dirname,'..','state','ai-rate-state.json');
function _rtLoad(){try{const j=JSON.parse(fs.readFileSync(_rtF,'utf8'));const td=new Date().toISOString().slice(0,10);if(j.dd===td){_rt.d=j.d||{};_rt.dd=td}}catch{}}
function _rtSave(){try{_rt.dd=new Date().toISOString().slice(0,10);fs.mkdirSync(path.dirname(_rtF),{recursive:true});fs.writeFileSync(_rtF,JSON.stringify(_rt))}catch{}}
function _rtTrack(id){const n=Date.now(),td=new Date().toISOString().slice(0,10);if(n-_rt.mt>60000){_rt.m={};_rt.mt=n}if(_rt.dd!==td){_rt.d={};_rt.dd=td}_rt.m[id]=(_rt.m[id]||0)+1;_rt.d[id]=(_rt.d[id]||0)+1;_rtSave()}
function _rtOk(t){const n=Date.now(),td=new Date().toISOString().slice(0,10);if(n-_rt.mt>60000)_rt.m={};if(_rt.dd!==td)_rt.d={};return(_rt.m[t[0]]||0)<t[3]-1&&(_rt.d[t[0]]||0)<Math.floor(t[4]*0.8)}
// RPM enforcement: wait if at limit instead of skipping
async function _rtWait(t){const id=t[0],rpm=t[3];const n=Date.now();if(n-_rt.mt>60000){_rt.m={};_rt.mt=n}const used=_rt.m[id]||0;if(used>=rpm-1){const wait=60000-(n-_rt.mt)+500;if(wait>0){console.log('  [RPM] '+id+' at '+used+'/'+rpm+' — waiting '+Math.round(wait/1000)+'s');await sleep(wait);_rt.m={};_rt.mt=Date.now()}}}
// Budget summary for end-of-run logging
function _rtBudget(){const lines=[];for(const t of GTIERS){const d=_rt.d[t[0]]||0;const pct=Math.round(d/t[4]*100);lines.push(t[0]+': '+d+'/'+t[4]+' ('+pct+'%)')}const oai=_rt.d['openai']||0;if(oai||process.env.OPENAI_API_KEY)lines.push('openai: '+oai+'/200 ('+Math.round(oai/200*100)+'%)');const mi=_rt.d['mistral']||0;if(mi||process.env.MISTRAL_API_KEY)lines.push('mistral: '+mi+'/30 ('+Math.round(mi/30*100)+'%)');return lines.join(' | ')}
function _estCx(text,sys,o){if(o.complexity!==undefined){const m={trivial:0,low:1,medium:2,high:3};return typeof o.complexity==='string'?(m[o.complexity]??1):o.complexity}const len=(text||'').length+(sys||'').length;const mt=o.maxTokens||2048;const lc=((text||'')+' '+(sys||'')).toLowerCase();if(mt>1500||len>6000)return 3;if(mt>768||len>3000||lc.includes('write a github comment'))return 2;if(mt>256||len>1000)return 1;return 0}
function _pickModels(cx){const cap=parseInt(process.env.GEMINI_MAX_TIER)||3;return GTIERS.filter(t=>t[2]<=cap&&_rtOk(t)&&cbOk('gemini-'+t[1])).sort((a,b)=>{const da=Math.abs(a[2]-cx),db=Math.abs(b[2]-cx);return da!==db?da-db:a[2]-b[2]})}

async function callAI(text,sysPrompt,opts={}){
  const maxTokens=opts.maxTokens||2048;
  // Inject project rules + architecture into system prompt
  const archContext=ARCHITECTURE_SUMMARY?'\n\n---\n'+ARCHITECTURE_SUMMARY:'';
  const fullSysPrompt=PROJECT_RULES+archContext+'\n\n'+sysPrompt;
  // Smart Gemini routing by complexity
  const gemKey=process.env.GOOGLE_API_KEY;
  if(gemKey){
    _rtLoad();const cx=_estCx(text,sysPrompt,opts);const tiers=_pickModels(cx);
    if(tiers.length)console.log('  [AI] cx='+cx+' try=['+tiers.map(t=>t[0]).join(',')+']');
    for(const tier of tiers){
      const model=tier[1];
      await _rtWait(tier);
      for(let retry=0;retry<3;retry++){
        if(retry>0)await sleep(backoff(retry));
        try{
          const r=await fetchT('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent?key='+gemKey,{
            method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({systemInstruction:{parts:[{text:fullSysPrompt}]},contents:[{parts:[{text}]}],
              generationConfig:{temperature:0.2,maxOutputTokens:maxTokens}})});
          if(r.ok){const d=await r.json();const t=d.candidates?.[0]?.content?.parts?.[0]?.text;if(t){_rtTrack(tier[0]);return{text:t.trim(),model}}}
          if(r.status===429){console.log('  Gemini '+model+' 429, backoff...');if(retry>=2)cbFail('gemini-'+model,120000);continue}
          if(r.status>=500){cbFail('gemini-'+model,60000);break}
          break;
        }catch(e){if(e.name==='AbortError')console.log('  Gemini '+model+' timeout');cbFail('gemini-'+model,60000);break}
      }
    }
  }
  // GitHub Models (free via GITHUB_TOKEN - models.inference.ai.azure.com)
  const ghToken=process.env.GH_PAT||process.env.GITHUB_TOKEN;
  if(ghToken){
    const ghModels=['gpt-4o-mini','Mistral-small-2503','Meta-Llama-3.1-8B-Instruct'];
    // Truncate system prompt for GitHub Models (8k token limit ~24k chars)
    const ghSys=fullSysPrompt.length>6000?sysPrompt.substring(0,5000)+'...(truncated)':fullSysPrompt;
    const ghText=text.length>12000?text.substring(0,12000)+'...(truncated)':text;
    for(const model of ghModels){
      if(!cbOk('gh-'+model))continue;
      try{
        console.log('  Trying GitHub Models ('+model+')...');
        const r=await fetchT('https://models.inference.ai.azure.com/chat/completions',{
          method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+ghToken},
          body:JSON.stringify({model,messages:[{role:'system',content:ghSys},{role:'user',content:ghText}],max_tokens:maxTokens,temperature:0.2})});
        if(r.ok){const d=await r.json();const t=d.choices?.[0]?.message?.content;if(t)return{text:t.trim(),model:'gh-'+model}}
        if(r.status===429){console.log('  GitHub Models '+model+' 429, backoff...');await sleep(backoff(1));continue}
        else{const e=await r.text().catch(()=>'');console.log('  GitHub Models '+model+' failed:',r.status,e.substring(0,150))}
      }catch(e){console.log('  GitHub Models '+model+' error:',e.message);cbFail('gh-'+model,60000)}
    }
  }
  // OpenAI FREE TIER: gpt-3.5-turbo — 3 RPM, 200 RPD, 40K TPM, cap tokens to 500
  const oaiKey=process.env.OPENAI_API_KEY;
  if(oaiKey&&cbOk('openai')){
    const oaiRpd=200,oaiRpm=3,oaiMax=Math.min(maxTokens,500);
    const oaiUsed=_rt.d['openai']||0,oaiMin=_rt.m['openai']||0;
    if(oaiUsed<oaiRpd&&oaiMin<oaiRpm){
      console.log('  Trying OpenAI free (gpt-3.5-turbo, '+oaiUsed+'/'+oaiRpd+' daily)...');
      try{
        const r=await fetchT('https://api.openai.com/v1/chat/completions',{
          method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+oaiKey},
          body:JSON.stringify({model:'gpt-3.5-turbo',messages:[{role:'system',content:fullSysPrompt.substring(0,4000)},{role:'user',content:text.substring(0,8000)}],max_tokens:oaiMax,temperature:0.2})});
        if(r.ok){const d=await r.json();const t=d.choices?.[0]?.message?.content;if(t){_rtTrack('openai');return{text:t.trim(),model:'openai-gpt35-free'}}}
        if(r.status===429){console.log('  OpenAI 429 rate limit');cbFail('openai',300000)}
        else if(r.status===402||r.status===403){console.log('  OpenAI free tier exhausted');cbFail('openai',3600000)}
        else{const e=await r.text().catch(()=>'');console.log('  OpenAI failed:',r.status,e.substring(0,150))}
      }catch(e){console.log('  OpenAI error:',e.message);cbFail('openai',120000)}
    }else console.log('  OpenAI free limit ('+oaiUsed+'/'+oaiRpd+' daily, '+oaiMin+'/'+oaiRpm+' rpm)');
  }
  // Fallback to Groq (free, fast inference)
  const groqKey=process.env.GROQ_API_KEY;
  if(groqKey){
    console.log('  Falling back to Groq...');
    try{
      const r=await fetchT('https://api.groq.com/openai/v1/chat/completions',{
        method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+groqKey},
        body:JSON.stringify({model:'llama-3.3-70b-versatile',messages:[{role:'system',content:fullSysPrompt},{role:'user',content:text}],max_tokens:maxTokens,temperature:0.2})});
      if(r.ok){const d=await r.json();const t=d.choices?.[0]?.message?.content;if(t)return{text:t.trim(),model:'llama-3.3-70b-groq'}}
      else console.log('  Groq failed:',r.status);
    }catch(e){console.log('  Groq error:',e.message)}
  }
  // Fallback to IBM Granite via HuggingFace (free)
  const hfKey=process.env.HF_TOKEN;
  if(hfKey){
    console.log('  Falling back to IBM Granite (HuggingFace)...');
    try{
      const r=await fetchT('https://router.huggingface.co/v1/chat/completions',{
        method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+hfKey},
        body:JSON.stringify({model:'ibm-granite/granite-3.3-8b-instruct',messages:[{role:'system',content:fullSysPrompt},{role:'user',content:text}],max_tokens:maxTokens,temperature:0.2})});
      if(r.ok){const d=await r.json();const t=d.choices?.[0]?.message?.content;if(t)return{text:t.trim(),model:'granite-3.3-8b'}}
      else{const e=await r.text().catch(()=>'');console.log('  Granite failed:',r.status,e.substring(0,150))}
    }catch(e){console.log('  Granite error:',e.message)}
  }
  // Mistral FREE TIER: open-mistral-nemo — 1 RPM, 30 RPD, cap tokens to 500
  const miKey=process.env.MISTRAL_API_KEY;
  if(miKey&&cbOk('mistral')){
    const miRpd=30,miRpm=1,miMax=Math.min(maxTokens,500);
    const miUsed=_rt.d['mistral']||0,miMin=_rt.m['mistral']||0;
    if(miUsed<miRpd&&miMin<miRpm){
      console.log('  Trying Mistral free (nemo, '+miUsed+'/'+miRpd+' daily)...');
      try{
        const r=await fetchT('https://api.mistral.ai/v1/chat/completions',{
          method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+miKey},
          body:JSON.stringify({model:'open-mistral-nemo',messages:[{role:'system',content:fullSysPrompt.substring(0,4000)},{role:'user',content:text.substring(0,8000)}],max_tokens:miMax,temperature:0.2})});
        if(r.ok){const d=await r.json();const t=d.choices?.[0]?.message?.content;if(t){_rtTrack('mistral');return{text:t.trim(),model:'mistral-nemo-free'}}}
        if(r.status===429){console.log('  Mistral 429 rate limit');cbFail('mistral',300000)}
        else if(r.status===402||r.status===403){console.log('  Mistral free tier exhausted');cbFail('mistral',3600000)}
        else{const e=await r.text().catch(()=>'');console.log('  Mistral failed:',r.status,e.substring(0,150))}
      }catch(e){console.log('  Mistral error:',e.message);cbFail('mistral',120000)}
    }else console.log('  Mistral free limit ('+miUsed+'/'+miRpd+' daily, '+miMin+'/'+miRpm+' rpm)');
  }
  // Fallback to OpenRouter (free models)
  const orKey=process.env.OPENROUTER_API_KEY;
  if(orKey){
    console.log('  Falling back to OpenRouter...');
    try{
      const r=await fetchT('https://openrouter.ai/api/v1/chat/completions',{
        method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+orKey},
        body:JSON.stringify({model:'meta-llama/llama-3.3-8b-instruct:free',messages:[{role:'system',content:fullSysPrompt},{role:'user',content:text}],max_tokens:maxTokens,temperature:0.2})});
      if(r.ok){const d=await r.json();const t=d.choices?.[0]?.message?.content;if(t)return{text:t.trim(),model:'openrouter-free'}}
      else console.log('  OpenRouter failed:',r.status);
    }catch(e){console.log('  OpenRouter error:',e.message)}
  }
  // Fallback to Cerebras (free, fast inference)
  const cerebrasKey=process.env.CEREBRAS_API_KEY;
  if(cerebrasKey&&cbOk('cerebras')){
    console.log('  Falling back to Cerebras...');
    try{
      const r=await fetchT('https://api.cerebras.ai/v1/chat/completions',{
        method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+cerebrasKey},
        body:JSON.stringify({model:'llama-3.3-70b',messages:[{role:'system',content:fullSysPrompt},{role:'user',content:text}],max_tokens:maxTokens,temperature:0.2})});
      if(r.ok){const d=await r.json();const t=d.choices?.[0]?.message?.content;if(t)return{text:t.trim(),model:'cerebras-llama70b'}}
      else{console.log('  Cerebras failed:',r.status);cbFail('cerebras',120000)}
    }catch(e){console.log('  Cerebras error:',e.message);cbFail('cerebras',60000)}
  }
  // Fallback to Together.ai (free tier)
  const togetherKey=process.env.TOGETHER_API_KEY;
  if(togetherKey&&cbOk('together')){
    console.log('  Falling back to Together.ai...');
    try{
      const r=await fetchT('https://api.together.xyz/v1/chat/completions',{
        method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+togetherKey},
        body:JSON.stringify({model:'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',messages:[{role:'system',content:fullSysPrompt},{role:'user',content:text}],max_tokens:maxTokens,temperature:0.2})});
      if(r.ok){const d=await r.json();const t=d.choices?.[0]?.message?.content;if(t)return{text:t.trim(),model:'together-llama70b'}}
      else{console.log('  Together failed:',r.status);cbFail('together',120000)}
    }catch(e){console.log('  Together error:',e.message);cbFail('together',60000)}
  }
  // Fallback to ApiFreeLLM (free, unlimited)
  const aflKey=process.env.APIFREELLM_KEY;
  if(aflKey){
    console.log('  Falling back to ApiFreeLLM...');
    try{
      const r=await fetchT('https://apifreellm.com/api/v1/chat',{
        method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+aflKey},
        body:JSON.stringify({message:fullSysPrompt+'\n\n---\nUser message:\n'+text})});
      if(r.ok){const d=await r.json();if(d.success&&d.response)return{text:d.response.trim(),model:'apifreellm'}}
      else{console.log('  ApiFreeLLM failed:',r.status)}
    }catch(e){console.log('  ApiFreeLLM error:',e.message)}
  }
  console.log('  All AI failed, using local regex fallback');
  return localFallback(text);
}

function localFallback(text){
  const m=text.match(/_T[A-Z]\w{3,5}_[a-z0-9]{4,16}/g)||[];
  const p=text.match(/\bTS[0-9]{4}[A-Z]?\b/g)||[];
  if(!m.length&&!p.length)return null;
  const fps=[...new Set(m)].map(f=>'`'+f+'`').join(', ');
  const pids=[...new Set(p)].map(f=>'`'+f+'`').join(', ');
  let r='Fingerprints found: '+(fps||'none');
  if(pids)r+='\nProduct IDs: '+pids;
  return{text:r,model:'local-regex'};
}

async function analyzeImage(imageUrl,prompt){
  let b64;try{b64=await fetchImageBase64(imageUrl)}catch(e){console.log('  Img fetch fail:',e.message);return null}
  // Gemini Vision
  const gemKey=process.env.GOOGLE_API_KEY;
  if(gemKey){
    const vModels=['gemini-2.5-flash','gemini-2.0-flash'];
    for(const vm of vModels){if(!cbOk('gemini-v-'+vm))continue;
    for(let i=0;i<2;i++){if(i)await sleep(backoff(i));try{
      const r=await fetchT('https://generativelanguage.googleapis.com/v1beta/models/'+vm+':generateContent?key='+gemKey,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({contents:[{parts:[{text:prompt},{inlineData:{mimeType:'image/jpeg',data:b64}}]}],
          generationConfig:{temperature:0.2,maxOutputTokens:1024}})});
      if(r.ok){const d=await r.json();return d.candidates?.[0]?.content?.parts?.[0]?.text?.trim()||null}
    }catch{cbFail('gemini-v-'+vm,60000)}}
    }
  }
  // OpenAI Vision FREE TIER (shares daily quota with text calls)
  const oaiK=process.env.OPENAI_API_KEY;
  if(oaiK&&cbOk('openai')&&(_rt.d['openai']||0)<200){
    try{
      const r=await fetchT('https://api.openai.com/v1/chat/completions',{
        method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+oaiK},
        body:JSON.stringify({model:'gpt-4o-mini',messages:[{role:'user',content:[{type:'text',text:prompt},{type:'image_url',image_url:{url:imageUrl}}]}],max_tokens:512})});
      if(r.ok){const d=await r.json();const t=d.choices?.[0]?.message?.content?.trim();if(t){_rtTrack('openai');return t}}
      else if(r.status===402||r.status===403)cbFail('openai',3600000);
    }catch{cbFail('openai',120000)}
  }
  // GitHub Models Vision fallback
  const ght=process.env.GH_PAT||process.env.GITHUB_TOKEN;
  if(ght&&cbOk('gh-vision')){
    try{
      const r=await fetchT('https://models.inference.ai.azure.com/chat/completions',{
        method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+ght},
        body:JSON.stringify({model:'gpt-4o-mini',messages:[{role:'user',content:[{type:'text',text:prompt},{type:'image_url',image_url:{url:imageUrl}}]}],max_tokens:1024})});
      if(r.ok){const d=await r.json();const t=d.choices?.[0]?.message?.content?.trim();if(t)return t}
      else cbFail('gh-vision',120000);
    }catch{cbFail('gh-vision',60000)}
  }
  return null;
}

async function fetchImageBase64(url){
  const r=await fetchT(url,{},15000);if(!r.ok)throw new Error('HTTP '+r.status);
  const buf=await r.arrayBuffer();return Buffer.from(buf).toString('base64');
}

function textSimilarity(a,b){if(!a||!b)return 0;const wa=new Set(a.toLowerCase().split(/\s+/)),wb=new Set(b.toLowerCase().split(/\s+/));let i=0;for(const w of wa)if(wb.has(w))i++;return i/Math.max(1,(wa.size+wb.size-i))}

async function callAIEnsemble(text,sysPrompt,opts={}){
  const{qc,provs}=require('./ai-ensemble');
  const ps=provs().slice(0,3);
  if(ps.length<2)return callAI(text,sysPrompt,opts);
  console.log('  [Ens] '+ps.join(','));
  const sys=PROJECT_RULES+(ARCHITECTURE_SUMMARY?'\n---\n'+ARCHITECTURE_SUMMARY:'')+'\n\n'+sysPrompt;
  const mt=Math.min(opts.maxTokens||2048,1500);
  const res=await Promise.allSettled(ps.map(p=>qc(p,text,sys,mt)));
  const ans=res.map((r,i)=>({p:ps[i],t:r.status==='fulfilled'?r.value:null})).filter(a=>a.t&&a.t.length>20);
  if(!ans.length)return callAI(text,sysPrompt,opts);
  if(ans.length===1)return{text:ans[0].t,model:'ens-'+ans[0].p};
  const mp='Synthesize these '+ans.length+' opinions into ONE best answer (Dylan voice, max 300w):\n\n'+ans.map((a,i)=>'['+a.p+']:\n'+a.t).join('\n---\n');
  const m=await callAI(mp,'Merge AI answers.',{maxTokens:mt,complexity:'low'});
  return m||{text:ans[0].t,model:'ens-'+ans[0].p};
}

module.exports={callAI,callAIEnsemble,analyzeImage,sleep,localFallback,getAIBudget:_rtBudget,textSimilarity};
