const { safeParse } = require('../../lib/utils/tuyaUtils.js');
/**
 * AI Helper - Multi-provider with project rules injection
 * Orchestrated for Free Tiers, Prioritizing Intelligent Aggregators.
 * Chain: OpenRouter  HuggingFace  Cerebras  Together  Groq  DeepSeek  Gemini  GitHub Models  OpenAI  Mistral  Kimi
 */
const fs=require('fs'),path=require('path');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const{PROJECT_RULES,ARCHITECTURE_SUMMARY,LOADED_RULES}=require('./project-rules');

// Circuit breaker: skip providers down recently
const _cb={};
function cbOk(n){const e=_cb[n];if(!e)return true;if(Date.now()-e.t>e.c){delete _cb[n];return true;}return false;}
function cbFail(n,ms){_cb[n]={t:Date.now(),c:ms||300000};}
// Fetch with timeout
function fetchT(url,opts,ms){ms=ms||30000;const ac=new AbortController();const tid=setTimeout(()=>ac.abort(),ms);opts=Object.assign({},opts,{signal:ac.signal});return fetch(url,opts).finally(()=>clearTimeout(tid));}
// Backoff with jitter
function backoff(attempt){return Math.min(2000*Math.pow(2,attempt)+Math.random()*1000,60000);}

const _rt={m:{},d:{},mt:0,dd:''};
const _rtF=path.join(__dirname,'..','..','.github','state','ai-rate-state.json');
function _rtLoad(){try{const j=JSON.parse(fs.readFileSync(_rtF,'utf8'));const td=new Date().toISOString().slice(0,10);if(j.dd===td){_rt.d=j.d||{};_rt.dd=td}}catch{}}
function _rtSave(){try{_rt.dd=new Date().toISOString().slice(0,10);fs.mkdirSync(path.dirname(_rtF),{recursive:true});fs.writeFileSync(_rtF,JSON.stringify(_rt))}catch{}}
function _rtTrack(id){const n=Date.now(),td=new Date().toISOString().slice(0,10);if(n-_rt.mt>60000){_rt.m={};_rt.mt=n}if(_rt.dd!==td){_rt.d={};_rt.dd=td}_rt.m[id]=(_rt.m[id]||0)+1;_rt.d[id]=(_rt.d[id]||0)+1;_rtSave()}
function _rtBudget(){return Object.entries(_rt.d).map(([k,v])=>k+':'+v).join(' ');}

function classifyTask(t,s,o){
  if(o&&o.complexity!==undefined){const m={trivial:0,low:1,medium:2,high:3};return{cx:typeof o.complexity==='string'?(m[o.complexity]??1):o.complexity,type:o.taskType||'generate'}}
  const lc=((t||'')+' '+(s||'')).toLowerCase();let type='generate';
  if(/write.*code|implement|device\.js|driver/i.test(lc))type='code';
  else if(/classify|triage|categorize/i.test(lc))type='classify';
  else if(/merge|synthesize|combine/i.test(lc))type='merge';
  else if(/analyze|investigate|debug|diagnose/i.test(lc))type='analyze';
  else if(/fingerprint|lookup|find.*driver/i.test(lc))type='lookup';
  return{cx:type==='code'||type==='analyze'?2:1,type};
}

async function callAIEngine(url, headers, body, providerName, maxRetries = 1, timeout = 30000) {
  if (!cbOk(providerName)) return null;
  for (let retry = 0; retry <= maxRetries; retry++) {
    if (retry > 0) await sleep(backoff(retry));
    try {
      const r = await fetchT(url, { method: 'POST', headers, body: JSON.stringify(body) }, timeout);
      if (r.ok) {
        const d = await r.json();
        const t = d.choices?.[0]?.message?.content || d.candidates?.[0]?.content?.parts?.[0]?.text;
        if (t) {
            _rtTrack(providerName);
            return { text: t.trim(), model: providerName };
        }
      }
      if (r.status === 429) {
        console.log(`  [${providerName}] 429 rate limit.`);
        if (retry >= maxRetries) cbFail(providerName, 180000);
      } else if (r.status >= 500) {
        console.log(`  [${providerName}] 5xx error.`);
        cbFail(providerName, 60000);
        break;
      } else {
        const e = await r.text().catch(()=>'');
        console.log(`  [${providerName}] failed: ${r.status}`);
        break;
      }
    } catch (e) {
      console.log(`  [${providerName}] error: ${e.message}`);
      if (e.name === 'AbortError') cbFail(providerName, 60000);
    }
  }
  return null;
}

async function callAI(text,sysPrompt,opts={}){
  // v7.0.25: Cloudless-First Shield
  if (process.env.PIPELINE_MODE === 'RULE_BASED') {
    console.log('  [SHIELD] Cloudless-First Mode: Skipping AI and using Template/Rule fallbacks.');
    return { text: "AI_OFFLINE_OR_LIMIT_REACHED", model: "rule-based-fallback" };
  }

  const maxTokens=opts.maxTokens||2048;
  const tk = classifyTask(text, sysPrompt, opts);
  
  // Intelligent Waiter: Global retry loop for the entire API cascade
  let globalAttempts = 0;
  const maxGlobalAttempts = opts.maxGlobalAttempts || 3;
  
  while(globalAttempts < maxGlobalAttempts) {
    const archContext=ARCHITECTURE_SUMMARY?'\n\n---\n'+ARCHITECTURE_SUMMARY:'';
  const rulesContext=LOADED_RULES?'\n\n---\n'+LOADED_RULES:'';
  const fullSysPrompt=PROJECT_RULES+archContext+rulesContext+'\n\n'+sysPrompt;
  
  _rtLoad();

  // 1. NVIDIA NIM — 40 RPM, 800/day cap (free tier) — PRIORITY FREE TIER
  const nvidiaKey = process.env.NVIDIA_API_KEY || process.env.NVIDIA;
  if (nvidiaKey && cbOk('nvidia') && (_rt.d['nvidia']||0) < 800) {
    console.log('  Trying NVIDIA NIM (FREE TIER - Priority)...');
    const res = await callAIEngine(
      'https://integrate.api.nvidia.com/v1/chat/completions',
      {'Authorization': 'Bearer ' + nvidiaKey, 'Content-Type': 'application/json'},
      {model:'meta/llama-3.1-8b-instruct', messages:[{role:'system',content:fullSysPrompt.substring(0,6000)},{role:'user',content:text.substring(0,10000)}], max_tokens:Math.min(maxTokens, 1024), temperature:0.2},
      'nvidia'
    );
    if (res) return res;
  }
  
  // 1.5. XiaomiMimo (Premium Tier) — 200/day cap (v2.5 pro)
  const mimoKey = process.env.XIAOMI_MIMO_API_KEY;
  if (mimoKey && cbOk('xiaomimimo') && (_rt.d['xiaomimimo']||0) < 200) {
    console.log('  Trying XiaomiMimo (v2.5 Pro)...');
    const res = await callAIEngine(
      'https://token-plan-ams.xiaomimimo.com/v1/chat/completions',
      {'Authorization': 'Bearer ' + mimoKey, 'Content-Type': 'application/json'},
      {model:'gpt-4o', messages:[{role:'system',content:fullSysPrompt},{role:'user',content:text}], max_tokens:maxTokens, temperature:0.2},
      'xiaomimimo'
    );
    if (res) return res;
  }

  // 2. OpenRouter (Aggregator - High priority)
  if (process.env.OPENROUTER_API_KEY && cbOk('openrouter')) {
    console.log('  Trying OpenRouter...');
    let orModel = 'google/gemini-2.0-flash-lite-preview-02-05:free'; // Safe fallback
    try {
      const mr = await fetchT('https://openrouter.ai/api/v1/models', {}, 3000);
      if (mr.ok) {
        const d = await mr.json();
        const frees = d.data.filter(m => m.pricing && m.pricing.prompt === "0" && m.id.endsWith(':free'));
        if (frees.length > 0) orModel = frees[0].id; // Pick first available free model
      }
    } catch(e) {}
    
    const res = await callAIEngine(
      'https://openrouter.ai/api/v1/chat/completions',
      {'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY, 'Content-Type': 'application/json'},
      {model:orModel, messages:[{role:'system',content:fullSysPrompt},{role:'user',content:text}], max_tokens:maxTokens, temperature:0.2},
      'openrouter'
    );
    if (res) return res;
  }

  // 3. HuggingFace (Aggregator) — 500/day cap
  if (process.env.HF_TOKEN && cbOk('hf') && (_rt.d['hf']||0) < 500) {
    let hfM='meta-llama/Llama-3.1-8B-Instruct';
    if(tk.cx>=3)hfM='Qwen/Qwen2.5-72B-Instruct';
    else if(tk.type==='code')hfM='Qwen/Qwen2.5-Coder-32B-Instruct';
    else if(tk.type==='analyze'||tk.type==='merge')hfM='ibm-granite/granite-3.3-8b-instruct';
    console.log(`  Trying HuggingFace (${hfM})...`);
    const res = await callAIEngine(
      'https://router.huggingface.co/v1/chat/completions',
      {'Authorization': 'Bearer ' + process.env.HF_TOKEN, 'Content-Type': 'application/json'},
      {model:hfM, messages:[{role:'system',content:fullSysPrompt},{role:'user',content:text}], max_tokens:maxTokens, temperature:0.2},
      `hf-${hfM.split('/').pop()}`
    );
    if (res) return res;
  }

  // 4. Cerebras (Fast 70B) — 100/day cap
  if (process.env.CEREBRAS_API_KEY && cbOk('cerebras') && (_rt.d['cerebras']||0) < 100) {
    console.log('  Trying Cerebras...');
    const res = await callAIEngine(
      'https://api.cerebras.ai/v1/chat/completions',
      {'Authorization': 'Bearer ' + process.env.CEREBRAS_API_KEY, 'Content-Type': 'application/json'},
      {model:'llama3.1-70b', messages:[{role:'system',content:fullSysPrompt},{role:'user',content:text}], max_tokens:maxTokens, temperature:0.2},
      'cerebras'
    );
    if (res) return res;
  }

  // 5. Together.ai — 200/day cap
  if (process.env.TOGETHER_API_KEY && cbOk('together') && (_rt.d['together']||0) < 200) {
    console.log('  Trying Together...');
    const res = await callAIEngine(
      'https://api.together.xyz/v1/chat/completions',
      {'Authorization': 'Bearer ' + process.env.TOGETHER_API_KEY, 'Content-Type': 'application/json'},
      {model:'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free', messages:[{role:'system',content:fullSysPrompt},{role:'user',content:text}], max_tokens:maxTokens, temperature:0.2},
      'together'
    );
    if (res) return res;
  }

  // 6. Groq — 500/day cap
  if (process.env.GROQ_API_KEY && cbOk('groq') && (_rt.d['groq']||0) < 500) {
    console.log('  Trying Groq...');
    const res = await callAIEngine(
      'https://api.groq.com/openai/v1/chat/completions',
      {'Authorization': 'Bearer ' + process.env.GROQ_API_KEY, 'Content-Type': 'application/json'},
      {model:'llama-3.3-70b-versatile', messages:[{role:'system',content:fullSysPrompt},{role:'user',content:text}], max_tokens:maxTokens, temperature:0.2},
      'groq'
    );
    if (res) return res;
  }

  // 7. DeepSeek — 50/day cap
  if (process.env.DEEPSEEK_API_KEY && cbOk('deepseek') && (_rt.d['deepseek']||0) < 50) {
    const dsM=tk.cx>=3?'deepseek-reasoner':'deepseek-chat';
    console.log(`  Trying DeepSeek (${dsM})...`);
    const res = await callAIEngine(
      'https://api.deepseek.com/chat/completions',
      {'Authorization': 'Bearer ' + process.env.DEEPSEEK_API_KEY, 'Content-Type': 'application/json'},
      {model:dsM, messages:[{role:'system',content:fullSysPrompt},{role:'user',content:text}], max_tokens:maxTokens, temperature:0.2},
      'deepseek'
    );
    if (res) return res;
  }

  // 8. Gemini (High Cap, free tier limits apply)
  if (process.env.GOOGLE_API_KEY && cbOk('gemini')) {
    const gemUsed = _rt.d['gemini'] || 0;
    if (gemUsed < 1400) {
      console.log('  Trying Gemini...');
      const res = await callAIEngine(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + process.env.GOOGLE_API_KEY,
        {'Content-Type': 'application/json'},
        {systemInstruction:{parts:[{text:fullSysPrompt}]},contents:[{parts:[{text}]}], generationConfig:{temperature:0.2,maxOutputTokens:maxTokens}},
        'gemini'
      );
      if (res) return res;
    } else console.log('  Gemini cap reached.');
  }

  // 9. GitHub Models — 100/day cap
  const ghToken = process.env.GH_PAT || process.env.GITHUB_TOKEN;
  if (ghToken && cbOk('gh-models') && (_rt.d['gh-models']||0) < 100) {
    const ghSys = fullSysPrompt.length > 6000 ? sysPrompt.substring(0, 5000) + '...' : fullSysPrompt;
    console.log('  Trying GitHub Models...');
    const res = await callAIEngine(
      'https://models.inference.ai.azure.com/chat/completions',
      {'Authorization': 'Bearer ' + ghToken, 'Content-Type': 'application/json'},
      {model:'gpt-4o-mini', messages:[{role:'system',content:ghSys},{role:'user',content:text.substring(0,12000)}], max_tokens:maxTokens, temperature:0.2},
      'gh-models'
    );
    if (res) return res;
  }

  // 10. OpenAI (Strict Limits) — 50/day cap
  if (process.env.OPENAI_API_KEY && cbOk('openai')) {
    if ((_rt.d['openai']||0) < 50 && (_rt.m['openai']||0) < 3) {
      console.log('  Trying OpenAI...');
      const res = await callAIEngine(
        'https://api.openai.com/v1/chat/completions',
        {'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY, 'Content-Type': 'application/json'},
        {model:'gpt-3.5-turbo', messages:[{role:'system',content:fullSysPrompt.substring(0,4000)},{role:'user',content:text.substring(0,8000)}], max_tokens:Math.min(maxTokens,500), temperature:0.2},
        'openai'
      );
      if (res) return res;
    }
  }

  // 11. Mistral
  if (process.env.MISTRAL_API_KEY && cbOk('mistral')) {
    if ((_rt.d['mistral']||0) < 30 && (_rt.m['mistral']||0) < 1) {
      console.log('  Trying Mistral...');
      const res = await callAIEngine(
        'https://api.mistral.ai/v1/chat/completions',
        {'Authorization': 'Bearer ' + process.env.MISTRAL_API_KEY, 'Content-Type': 'application/json'},
        {model:'open-mistral-nemo', messages:[{role:'system',content:fullSysPrompt.substring(0,4000)},{role:'user',content:text.substring(0,8000)}], max_tokens:Math.min(maxTokens,500), temperature:0.2},
        'mistral'
      );
      if (res) return res;
    }
  }

    // 12. Kimi — 50/day cap
    if (process.env.KIMI_API_KEY && cbOk('kimi') && (_rt.d['kimi']||0) < 50) {
      console.log('  Trying Kimi...');
      const res = await callAIEngine(
        'https://api.moonshot.cn/v1/chat/completions',
        {'Authorization': 'Bearer ' + process.env.KIMI_API_KEY, 'Content-Type': 'application/json'},
        {model:'moonshot-v1-8k', messages:[{role:'system',content:fullSysPrompt.substring(0,6000)},{role:'user',content:text.substring(0,6000)}], max_tokens:Math.min(maxTokens, 1024), temperature:0.2},
        'kimi'
      );
      if (res) return res;
    }

  // 13. Minimax — Monthly subscription (~$20/month) — Budget tracked via MINIMAX_BUDGET
  if (process.env.MINIMAX_API_KEY && cbOk('minimax')) {
    const minBudget = parseInt(process.env.MINIMAX_BUDGET) || 50000; // Default 50k tokens/month budget
    const minUsed = _rt.d['minimax'] || 0;
    const minPct = Math.round((minUsed / minBudget) * 100);
    console.log(`  Trying Minimax (used: ${minUsed}/${minBudget} tokens [${minPct}%])...`);
    if (minUsed < minBudget) {
      const res = await callAIEngine(
        'https://api.minimax.chat/v1/chat/completions',
        {'Authorization': 'Bearer ' + process.env.MINIMAX_API_KEY, 'Content-Type': 'application/json'},
        {model:'abab6.5-chat', messages:[{role:'system',content:fullSysPrompt.substring(0,6000)},{role:'user',content:text.substring(0,8000)}], max_tokens:Math.min(maxTokens, 2048), temperature:0.2},
        'minimax'
      );
      if (res) return res;
    } else console.log('  Minimax budget exhausted (' + minPct + '%).');
  }

  console.log(`  [Waiter] All AI engines exhausted on attempt ${globalAttempts + 1}/${maxGlobalAttempts}.`);
    globalAttempts++;
    if (globalAttempts >= maxGlobalAttempts) break;
    
    // Resume runs when necessary: exponential smart sleep
    const waitMs = 30000 * Math.pow(1.5, globalAttempts);
    console.log(`  [Waiter] Sleeping for ${waitMs/1000}s to let rate limits recover before resuming...`);
    await sleep(waitMs);
  }

  console.log('  [Waiter] Max global retries reached. Failing gracefully.');
  return { text: "AI_OFFLINE_OR_LIMIT_REACHED", model: "fallback-error-system" };
}

// Map-Reduce logic with varying models for concurrency
async function splitTaskAndCombine(text, sysPrompt, opts={}) {
  const maxTokens = opts.maxTokens || 2048;
  const tk = classifyTask(text, sysPrompt, opts);
  
  if (text.length < 3000 || tk.cx <= 1 || (opts.depth||0) >= 2) {
    return await callAI(text, sysPrompt, opts);
  }
  
  console.log(`  [AI Orchestrator] Slicing task (depth ${opts.depth||0}) length (${text.length})`);
  
  const slicePrompt = `Split the following complex text into exactly TWO non-overlapping sub-tasks (JSON array of 2 strings). Preserve all details. Do not solve them. Output ONLY valid JSON: ["PART1_TEXT...", "PART2_TEXT..."]`;
  const sliceRes = await callAI(text, slicePrompt, { maxTokens: 4096, complexity: 1 });
  
  let parts = null;
  if (sliceRes && sliceRes.text) {
    try {
      const cleaned = sliceRes.text.replace(/```json/g, '').replace(/```/g, '').trim();
      parts = JSON.parse(cleaned);
      if (!Array.isArray(parts) || parts.length !== 2) parts = null;
    } catch(e) {}
  }
  
  if (!parts) return await callAI(text, sysPrompt, opts);
  
  // Parallel map with offset to force different providers if possible 
  // (In practice, cbOk/rate limiting and random jitter organically distribute load if run concurrently)
  console.log(`  [AI Orchestrator] Sub-task execution in parallel...`);
  const results = await Promise.all([
    splitTaskAndCombine(parts[0], sysPrompt, { ...opts, depth: (opts.depth||0)+1 }),
    splitTaskAndCombine(parts[1], sysPrompt, { ...opts, depth: (opts.depth||0)+1 }),
    sleep(1000) // Small offset
  ]);
  
  if (!results[0] || !results[1]) return results[0] || results[1] || null;
  
  console.log(`  [AI Orchestrator] Merging solutions...`);
  const mergeSystem = `Merge these two processed parts seamlessly. Original goal: ${sysPrompt}`;
  const mergeText = `[PART 1]\n${results[0].text}\n\n[PART 2]\n${results[1].text}`;
  
  const finalRes = await callAI(mergeText, mergeSystem, { ...opts, maxTokens: Math.max(maxTokens, 4000) });
  if (finalRes) return { text: finalRes.text, model: `map-reduce(${results[0].model}+${results[1].model}->${finalRes.model})` };
  
  return { text: results[0].text + '\n\n' + results[1].text, model: 'map-reduce(fallback)' };
}

async function callAIEnsemble(t,s,o){try{const{qc,pickForTask}=require('./ai-ensemble');const tk=classifyTask(t,s,o);const ps=pickForTask(tk.type,2);if(ps.length<2)return callAI(t,s,o);const mt=Math.min((o||{}).maxTokens||2048,1500);const res=await Promise.allSettled(ps.map(p=>qc(p,t,s,mt)));const ans=res.map((r,i)=>({p:ps[i],t:r.status==='fulfilled'?r.value:null})).filter(a=>a.t&&a.t.length>20);if(!ans.length)return callAI(t,s,o);if(ans.length===1)return{text:ans[0].t,model:'ens-'+ans[0].p};const mp='Synthesize into ONE answer (max 300w):\n\n'+ans.map(a=>'['+a.p+']:\n'+a.t).join('\n\n');const m=await callAI(mp,'Merge AI answers.',{maxTokens:mt,complexity:'low'});return m||{text:ans[0].t,model:'ens-'+ans[0].p}}catch(e){console.log('  Ensemble fallback:',e.message);return callAI(t,s,o)}}

async function analyzeImage(imageUrl,prompt){
  let b64;try{b64=await fetchImageBase64(imageUrl)}catch(e){console.log('  Img fetch fail:',e.message);return null}
  _rtLoad();
  if (process.env.GOOGLE_API_KEY&&cbOk('gemini-vision')&&(_rt.d['gemini']||0)<1400){
    for(let i=0;i<2;i++){if(i)await sleep(backoff(i));try{
      const r=await fetchT('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key='+process.env.GOOGLE_API_KEY,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({contents:[{parts:[{text:prompt},{inlineData:{mimeType:'image/jpeg',data:b64}}]}],
          generationConfig:{temperature:0.2,maxOutputTokens:2048}})});
      if(r.ok){const d=await r.json();const vt=d.candidates?.[0]?.content?.parts?.[0]?.text?.trim();if(vt){_rtTrack('gemini');return vt}}
    }catch{}}
  }
  const ght=process.env.GH_PAT||process.env.GITHUB_TOKEN;
  if(ght&&cbOk('gh-vision')){
    try{
      const r=await fetchT('https://models.inference.ai.azure.com/chat/completions',{
        method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+ght},
        body:JSON.stringify({model:'gpt-4o-mini',messages:[{role:'user',content:[{type:'text',text:prompt},{type:'image_url',image_url:{url:imageUrl}}]}],max_tokens:2048})});
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

function textSimilarity(a,b){
  if(!a||!b)return 0;const bg=s=>{const g=new Set();for(let i=0;i<s.length-1;i++)g.add(s.slice(i,i+2).toLowerCase());return g};
  const sa=bg(a),sb=bg(b);if(!sa.size||!sb.size)return 0;let c=0;for(const g of sa)if(sb.has(g))c++;return(sa.size>0?c/Math.max(sa.size,sb.size):0);
}
function isDuplicateContent(a,b,thr){return textSimilarity(a,b)>=(thr||0.40)}
function getAIBudget(){_rtLoad();return{used:_rt.d,budget:_rtBudget()}}
function localFallback(){}

module.exports={callAI,callAIEnsemble,splitTaskAndCombine,analyzeImage,sleep,localFallback,textSimilarity,isDuplicateContent,getAIBudget,classifyTask};

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--check-health')) {
    Object.keys(process.env).forEach(k => { if (k.endsWith('_API_KEY') || k === 'HF_TOKEN') console.log(' Found ' + k); });
    return;
  }
  
  const actionIdx = args.indexOf('--action');
  if (actionIdx !== -1) {
    const action = args[actionIdx + 1];
    if (action === 'assess_risk') {
      const commits = args[args.indexOf('--commits') + 1] || 1;
      console.log(` Assessing risk for last ${commits} commits...`);
      // Simulating git log fetch
      let diff = "";
      try {
        diff = require('child_process').execSync(`git diff HEAD~${commits}..HEAD`).toString();
      } catch (e) {
        console.log(`  Could not fetch diff for last ${commits} commits (maybe history is too short). Trying root diff...`);
        try {
          diff = require('child_process').execSync(`git diff $(git rev-list --max-parents=0 HEAD)..HEAD`).toString();
        } catch (e2) {
          console.log(`  Root diff failed. Using simple HEAD diff.`);
          diff = require('child_process').execSync(`git diff HEAD`).toString();
        }
      }
      const prompt = `Analyze this git diff for architectural risks, SDK 3 non-compliance, and regression patterns. 
      Focus on Tuya specific bugs like:
      - Semicolon insertion errors in IIFEs
      - Missing flow card .trigger() calls
      - Concurrent device registration crashes
      - Large image size requirements (500x500+)
      
      Diff:
      ${diff.substring(0, 15000)}`; // Token limit safety
      
      const res = await callAI(prompt, "You are a Senior SDK 3 Architect. Assess deployment risk as LOW, MEDIUM, or HIGH. Provide reasoning.");
      console.log(res.text);
      if (res.text.includes('HIGH')) process.exit(1);
    }
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error(' AI Helper Error:', err);
    process.exit(1);
  });
}
