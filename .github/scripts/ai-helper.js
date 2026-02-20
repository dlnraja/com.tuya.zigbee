/**
 * AI Helper - Uses Gemini (free) with OpenAI fallback
 * Shared module for all automation scripts
 */
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function callAI(text,sysPrompt,opts={}){
  const maxTokens=opts.maxTokens||2048;
  // Try Gemini first (free)
  const gemKey=process.env.GOOGLE_API_KEY;
  if(gemKey){
    const models=['gemini-2.0-flash','gemini-2.0-flash-lite'];
    for(const model of models){
      for(let retry=0;retry<2;retry++){
        if(retry>0)await sleep(5000);
        try{
          const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent?key='+gemKey,{
            method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({systemInstruction:{parts:[{text:sysPrompt}]},contents:[{parts:[{text}]}],
              generationConfig:{temperature:0.2,maxOutputTokens:maxTokens}})});
          if(r.ok){const d=await r.json();const t=d.candidates?.[0]?.content?.parts?.[0]?.text;if(t)return{text:t.trim(),model}}
          if(r.status===429){console.log('  Gemini '+model+' 429, retrying...');continue}
          break;
        }catch(e){break}
      }
    }
  }
  // Fallback to OpenAI
  const oaiKey=process.env.OPENAI_API_KEY;
  if(oaiKey){
    console.log('  Falling back to OpenAI...');
    try{
      const r=await fetch('https://api.openai.com/v1/chat/completions',{
        method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+oaiKey},
        body:JSON.stringify({model:'gpt-4o-mini',messages:[{role:'system',content:sysPrompt},{role:'user',content:text}],
          max_tokens:maxTokens,temperature:0.2})});
      if(r.ok){const d=await r.json();const t=d.choices?.[0]?.message?.content;if(t)return{text:t.trim(),model:'gpt-4o-mini'}}
      else{const e=await r.text().catch(()=>'');console.log('  OpenAI failed:',r.status,e.substring(0,150))}
    }catch(e){console.log('  OpenAI error:',e.message)}
  }
  return null;
}

async function analyzeImage(imageUrl,prompt){
  // Gemini Vision
  const gemKey=process.env.GOOGLE_API_KEY;
  if(gemKey){
    try{
      const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key='+gemKey,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({contents:[{parts:[{text:prompt},{inlineData:{mimeType:'image/jpeg',data:await fetchImageBase64(imageUrl)}}]}],
          generationConfig:{temperature:0.2,maxOutputTokens:1024}})});
      if(r.ok){const d=await r.json();return d.candidates?.[0]?.content?.parts?.[0]?.text?.trim()||null}
    }catch{}
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
  return null;
}

async function fetchImageBase64(url){
  const r=await fetch(url);const buf=await r.arrayBuffer();return Buffer.from(buf).toString('base64');
}

module.exports={callAI,analyzeImage,sleep};
