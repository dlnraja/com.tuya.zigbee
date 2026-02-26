/**
 * AI Helper - Multi-provider with project rules injection
 * Chain: Gemini → GitHub Models → OpenAI → Groq → IBM Granite (HF) → Mistral → OpenRouter → ApiFreeLLM
 */
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const{PROJECT_RULES,ARCHITECTURE_SUMMARY}=require('./project-rules');

// Circuit breaker: skip providers down recently
const _cb={};
function cbOk(n){const e=_cb[n];if(!e)return true;if(Date.now()-e.t>e.c){delete _cb[n];return true;}return false;}
function cbFail(n,ms){_cb[n]={t:Date.now(),c:ms||300000};}
// Fetch with timeout
function fetchT(url,opts,ms){ms=ms||30000;const ac=new AbortController();const tid=setTimeout(()=>ac.abort(),ms);opts=Object.assign({},opts,{signal:ac.signal});return fetch(url,opts).finally(()=>clearTimeout(tid));}
// Backoff with jitter
function backoff(attempt){return Math.min(2000*Math.pow(2,attempt)+Math.random()*1000,60000);}

async function callAI(text,sysPrompt,opts={}){
  const maxTokens=opts.maxTokens||2048;
  // Inject project rules + architecture into system prompt
  const archContext=ARCHITECTURE_SUMMARY?'\n\n---\n'+ARCHITECTURE_SUMMARY:'';
  const fullSysPrompt=PROJECT_RULES+archContext+'\n\n'+sysPrompt;
  // Try Gemini first (free)
  const gemKey=process.env.GOOGLE_API_KEY;
  if(gemKey){
    const models=['gemini-2.0-flash','gemini-2.0-flash-lite'];
    for(const model of models){
      if(!cbOk('gemini-'+model))continue;
      for(let retry=0;retry<3;retry++){
        if(retry>0)await sleep(backoff(retry));
        try{
          const r=await fetchT('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent?key='+gemKey,{
            method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({systemInstruction:{parts:[{text:fullSysPrompt}]},contents:[{parts:[{text}]}],
              generationConfig:{temperature:0.2,maxOutputTokens:maxTokens}})});
          if(r.ok){const d=await r.json();const t=d.candidates?.[0]?.content?.parts?.[0]?.text;if(t)return{text:t.trim(),model}}
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
        const r=await fetch('https://models.inference.ai.azure.com/chat/completions',{
          method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+ghToken},
          body:JSON.stringify({model,messages:[{role:'system',content:ghSys},{role:'user',content:ghText}],max_tokens:maxTokens,temperature:0.2})});
        if(r.ok){const d=await r.json();const t=d.choices?.[0]?.message?.content;if(t)return{text:t.trim(),model:'gh-'+model}}
        else{const e=await r.text().catch(()=>'');console.log('  GitHub Models '+model+' failed:',r.status,e.substring(0,150))}
      }catch(e){console.log('  GitHub Models '+model+' error:',e.message);cbFail('gh-'+model,60000)}
    }
  }
  // Fallback to OpenAI
  const oaiKey=process.env.OPENAI_API_KEY;
  if(oaiKey){
    console.log('  Falling back to OpenAI...');
    try{
      const r=await fetch('https://api.openai.com/v1/chat/completions',{
        method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+oaiKey},
        body:JSON.stringify({model:'gpt-4o-mini',messages:[{role:'system',content:fullSysPrompt},{role:'user',content:text}],
          max_tokens:maxTokens,temperature:0.2})});
      if(r.ok){const d=await r.json();const t=d.choices?.[0]?.message?.content;if(t)return{text:t.trim(),model:'gpt-4o-mini'}}
      else{const e=await r.text().catch(()=>'');console.log('  OpenAI failed:',r.status,e.substring(0,150))}
    }catch(e){console.log('  OpenAI error:',e.message)}
  }
  // Fallback to Groq (free, fast inference)
  const groqKey=process.env.GROQ_API_KEY;
  if(groqKey){
    console.log('  Falling back to Groq...');
    try{
      const r=await fetch('https://api.groq.com/openai/v1/chat/completions',{
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
      const r=await fetch('https://router.huggingface.co/v1/chat/completions',{
        method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+hfKey},
        body:JSON.stringify({model:'ibm-granite/granite-3.3-8b-instruct',messages:[{role:'system',content:fullSysPrompt},{role:'user',content:text}],max_tokens:maxTokens,temperature:0.2})});
      if(r.ok){const d=await r.json();const t=d.choices?.[0]?.message?.content;if(t)return{text:t.trim(),model:'granite-3.3-8b'}}
      else{const e=await r.text().catch(()=>'');console.log('  Granite failed:',r.status,e.substring(0,150))}
    }catch(e){console.log('  Granite error:',e.message)}
  }
  // Fallback to Mistral (free experiment plan)
  const mistralKey=process.env.MISTRAL_API_KEY;
  if(mistralKey){
    console.log('  Falling back to Mistral...');
    try{
      const r=await fetch('https://api.mistral.ai/v1/chat/completions',{
        method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+mistralKey},
        body:JSON.stringify({model:'mistral-small-latest',messages:[{role:'system',content:fullSysPrompt},{role:'user',content:text}],max_tokens:maxTokens,temperature:0.2})});
      if(r.ok){const d=await r.json();const t=d.choices?.[0]?.message?.content;if(t)return{text:t.trim(),model:'mistral-small'}}
      else console.log('  Mistral failed:',r.status);
    }catch(e){console.log('  Mistral error:',e.message)}
  }
  // Fallback to OpenRouter (free models)
  const orKey=process.env.OPENROUTER_API_KEY;
  if(orKey){
    console.log('  Falling back to OpenRouter...');
    try{
      const r=await fetch('https://openrouter.ai/api/v1/chat/completions',{
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
      const r=await fetch('https://apifreellm.com/api/v1/chat',{
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
  if(gemKey&&cbOk('gemini-vision')){
    for(let i=0;i<2;i++){if(i)await sleep(backoff(i));try{
      const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key='+gemKey,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({contents:[{parts:[{text:prompt},{inlineData:{mimeType:'image/jpeg',data:b64}}]}],
          generationConfig:{temperature:0.2,maxOutputTokens:1024}})});
      if(r.ok){const d=await r.json();return d.candidates?.[0]?.content?.parts?.[0]?.text?.trim()||null}
    }catch{}}
  }
  // OpenAI Vision fallback
  const oaiKey=process.env.OPENAI_API_KEY;
  if(oaiKey){
    try{
      const r=await fetch('https://api.openai.com/v1/chat/completions',{
        method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+oaiKey},
        body:JSON.stringify({model:'gpt-4o-mini',messages:[{role:'user',content:[{type:'text',text:prompt},{type:'image_url',image_url:{url:imageUrl}}]}],
          max_tokens:1024})});
      if(r.ok){const d=await r.json();return d.choices?.[0]?.message?.content?.trim()||null}
    }catch{}
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

module.exports={callAI,analyzeImage,sleep,localFallback};
