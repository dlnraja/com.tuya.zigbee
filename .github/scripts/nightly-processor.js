const fs=require('fs'),path=require('path');
const{callAI,analyzeImage,sleep}=require('./ai-helper');
const{getForumAuth,fmtCk,FORUM}=require('./forum-auth');
const{fetchWithRetry}=require('./retry-helper');
const GH='https://api.github.com';
const REPOS=['dlnraja/com.tuya.zigbee','JohanBendz/com.tuya.zigbee'];
const TOPICS=[140352,26439,146735,89271,54018,12758,85498];
const SKIP=['dlnraja','system','discobot'];
const MAX_REPLIES=8;
const ROOT=path.join(__dirname,'..','..'),DDIR=path.join(ROOT,'drivers');
const STATE=path.join(__dirname,'..','state','nightly-state.json');
const DOCS=path.join(ROOT,'docs');
const loadState=()=>{try{return JSON.parse(fs.readFileSync(STATE,'utf8'))}catch{return{forum:{},github:{},lastRun:null}}};
const saveState=s=>{fs.mkdirSync(path.dirname(STATE),{recursive:true});fs.writeFileSync(STATE,JSON.stringify(s,null,2)+'\n')};
const strip=h=>(h||'').replace(/<[^>]*>/g,' ').replace(/&\w+;/g,' ').replace(/\s+/g,' ').trim();
const exFP=t=>({mfr:[...new Set((t||'').match(/_T[A-Z][A-Za-z0-9]{3,5}_[a-z0-9]{4,16}/g)||[])],pid:[...new Set((t||'').match(/\bTS[0-9]{4}[A-Z]?\b/g)||[])]});
const exImgs=h=>{const u=[];const re=/<img[^>]+src="([^"]+)"/gi;let m;while((m=re.exec(h||''))!==null)u.push(m[1]);return u};
const exLinks=h=>{const u=[];const re=/href="(https?:\/\/[^"]+)"/gi;let m;while((m=re.exec(h||''))!==null)u.push(m[1]);return u};

function buildIndex(){
  const idx=new Map(),pidx=new Map();
  if(!fs.existsSync(DDIR))return{idx,pidx};
  for(const d of fs.readdirSync(DDIR)){
    const f=path.join(DDIR,d,'driver.compose.json');
    if(!fs.existsSync(f))continue;
    const c=fs.readFileSync(f,'utf8');
    for(const m of(c.match(/"_T[A-Za-z0-9_]+"/g)||[]))
      {const k=m.replace(/"/g,'');if(!idx.has(k))idx.set(k,[]);if(!idx.get(k).includes(d))idx.get(k).push(d)}
    for(const m of(c.match(/"TS[0-9]{4}[A-Z]?"/g)||[]))
      {const k=m.replace(/"/g,'');if(!pidx.has(k))pidx.set(k,[]);if(!pidx.get(k).includes(d))pidx.get(k).push(d)}
  }
  return{idx,pidx};
}

function lookupFPs(fps,idx,pidx){
  const results={};
  for(const fp of fps.mfr){const d=idx.get(fp)||[];results[fp]={found:d.length>0,drivers:d,type:'mfr'}}
  for(const pid of fps.pid){const d=pidx.get(pid)||[];results[pid]={found:d.length>0,drivers:d,type:'pid'}}
  return results;
}


async function postForum(topicId,content,replyTo,auth){
  const body={topic_id:topicId,raw:content};
  if(replyTo)body.reply_to_post_number=replyTo;
  const h=auth.type==='apikey'
    ?{'Content-Type':'application/json','User-Api-Key':auth.key}
    :{'Content-Type':'application/json','X-CSRF-Token':auth.csrf,'X-Requested-With':'XMLHttpRequest',Cookie:fmtCk(auth.cookies)};
  const r=await fetchWithRetry(FORUM+'/posts',{method:'POST',headers:h,body:JSON.stringify(body)},{retries:3,label:'forumPost'});
  return r.ok?(await r.json()):null;
}

async function ghFetch(url){
  const token=process.env.GH_PAT||process.env.GITHUB_TOKEN;
  const h={Accept:'application/vnd.github+json','User-Agent':'tuya-nightly'};
  if(token)h.Authorization='Bearer '+token;
  const r=await fetchWithRetry(url,{headers:h},{retries:3,label:'ghFetch'});
  if(!r.ok){console.log('  GH '+r.status+': '+url.substring(0,80));return null}
  return r.json();
}

async function ghPost(url,body){
  const token=process.env.GH_PAT||process.env.GITHUB_TOKEN;
  const h={Accept:'application/vnd.github+json','User-Agent':'tuya-nightly','Content-Type':'application/json'};
  if(token)h.Authorization='Bearer '+token;
  const r=await fetchWithRetry(url,{method:'POST',headers:h,body:JSON.stringify(body)},{retries:3,label:'ghPost'});
  return r.ok?(await r.json()):null;
}

// === FORUM PROCESSING ===
async function processForumPosts(state,idx,pidx,auth,appVersion,dryRun){
  const results=[];
  let replied=0;
  for(const tid of TOPICS){
    let since=state.forum[tid]||0;
    // Auto-init: on first run, skip to recent posts only
    const r0=await fetchWithRetry(FORUM+'/t/'+tid+'.json',{},{retries:2,label:'forumTopic'});
    if(!r0.ok){console.log('    Fetch failed:',r0.status);continue}
    const d0=await r0.json();
    if(since===0){since=Math.max(0,d0.highest_post_number-15);state.forum[tid]=since;console.log('    Init state to #'+since)}
    console.log('  Topic '+tid+' since post #'+since);
    const highest=d0.highest_post_number;
    if(highest<=since){console.log('    No new posts');continue}
    // Fetch all new posts in batches
    const posts=[];
    for(let from=since+1;from<=highest;from+=20){
      const r2=await fetchWithRetry(FORUM+'/t/'+tid+'/'+from+'.json',{},{retries:2,label:'forumBatch'});
      if(!r2.ok)break;
      const d2=await r2.json();
      for(const p of(d2.post_stream?.posts||[]))
        if(p.post_number>since&&!posts.find(e=>e.post_number===p.post_number))posts.push(p);
      await sleep(500);
    }
    posts.sort((a,b)=>a.post_number-b.post_number);
    console.log('    '+posts.length+' new posts to process');
    let maxP=since;
    for(const post of posts){
      if(SKIP.includes(post.username)){maxP=Math.max(maxP,post.post_number);continue}
      if(replied>=MAX_REPLIES){console.log('    Max replies reached');break}
      const text=strip(post.cooked);
      const fps=exFP(text);
      const imgs=exImgs(post.cooked);
      const links=exLinks(post.cooked);
      const fpResults=lookupFPs(fps,idx,pidx);
      // Analyze images if present
      let imageAnalysis=null;
      if(imgs.length>0){
        console.log('    Post #'+post.post_number+': '+imgs.length+' image(s)');
        const imgUrl=imgs[0].startsWith('/')?FORUM+imgs[0]:imgs[0];
        imageAnalysis=await analyzeImage(imgUrl,'Extract Tuya fingerprints (_TZxxxx_xxx, TSxxxx), device type, error messages, or relevant info from this image. Return JSON {fingerprints:[], deviceType:"", info:""} or NULL.');
        if(imageAnalysis)console.log('      Image: '+imageAnalysis.substring(0,120));
      }
      // Analyze links (Z2M, ZHA, GitHub issues)
      let linkContext='';
      for(const link of links.slice(0,3)){
        if(link.includes('github.com')||link.includes('zigbee2mqtt')||link.includes('blakadder')){
          linkContext+='\nLinked: '+link;
        }
      }
      // Build context for AI
      const hasFPs=fps.mfr.length>0||fps.pid.length>0;
      const hasImages=imgs.length>0;
      const sysPrompt='You are the bot for Universal Tuya Zigbee v'+appVersion+' (com.dlnraja.tuya.zigbee) on Homey Community forum. Analyze this forum post and write a helpful, detailed reply. Include:\n- If fingerprints found: check support status and explain which driver\n- If images: incorporate image analysis\n- If links to Z2M/ZHA/GitHub: cross-reference\n- If device interview: analyze clusters and suggest driver\n- If question/bug report: provide troubleshooting steps\n- If not device-related or just a thank you: return NULL\nUse Discourse markdown. Max 400 words. End with:\n---\n*Bot Universal Tuya Zigbee v'+appVersion+' — [Install test](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) | [GitHub](https://github.com/dlnraja/com.tuya.zigbee/issues)*';
      const userMsg='Post #'+post.post_number+' by @'+post.username+':\n'+text+(imageAnalysis?'\n\nImage analysis: '+imageAnalysis:'')+(linkContext?'\n'+linkContext:'')+'\n\nFingerprint lookup:\n'+JSON.stringify(fpResults,null,2)+'\n\nGenerate reply or NULL:';
      let reply=null,model='template';
      if(hasFPs){
        const ai=await callAI(userMsg,sysPrompt);
        if(ai&&ai.text&&ai.text.trim().toUpperCase()!=='NULL'){reply=ai.text.trim();model=ai.model}
      }
      if(!reply&&hasFPs){
        const sup=Object.entries(fpResults).filter(([,v])=>v.found).map(([k,v])=>'`'+k+'` → **'+v.drivers.join(', ')+'**');
        const mis=Object.entries(fpResults).filter(([,v])=>!v.found).map(([k])=>'`'+k+'`');
        if(sup.length||mis.length){
          reply='**Fingerprint check** (v'+appVersion+'):\n';
          if(sup.length)reply+='✅ Supported: '+sup.join(', ')+'\n';
          if(mis.length)reply+='❓ Not found: '+mis.join(', ')+' — please share a [device interview](https://tools.developer.homey.app/tools/zigbee).\n';
          reply+='\n---\n*Bot Universal Tuya Zigbee v'+appVersion+'*';
        }
      }
      if(!reply){maxP=Math.max(maxP,post.post_number);continue}
      results.push({topic:tid,post:post.post_number,user:post.username,fps:fps.mfr,reply:reply.substring(0,200),model});
      if(!dryRun&&auth){
        const posted=await postForum(tid,reply,post.post_number,auth);
        if(posted){console.log('    Posted reply to #'+post.post_number+' ('+model+')');replied++}
        await sleep(15000);
      }else{
        console.log('    [DRY] Reply to #'+post.post_number+' ('+model+'): '+reply.substring(0,100)+'...');
      }
      maxP=Math.max(maxP,post.post_number);
    }
    state.forum[tid]=maxP;
  }
  return results;
}

// === GITHUB PROCESSING ===
async function processGitHub(state,idx,pidx,appVersion,dryRun){
  const results=[];
  const since=state.github.lastIssueDate||new Date(Date.now()-86400000).toISOString();
  const processed=new Set(state.github.processedIssues||[]);
  console.log('  Since:',since);
  for(const repo of REPOS){
    console.log('  Repo:',repo);
    // Issues
    const issues=await ghFetch(GH+'/repos/'+repo+'/issues?state=open&since='+since+'&per_page=30&sort=updated&direction=desc');
    if(!issues)continue;
    for(const iss of issues){
      if(iss.pull_request)continue;
      const key=repo+'#'+iss.number;
      if(processed.has(key))continue;
      const text=(iss.title||'')+'\n'+(iss.body||'');
      const fps=exFP(text);
      if(!fps.mfr.length&&!fps.pid.length)continue;
      const fpResults=lookupFPs(fps,idx,pidx);
      // Extract images from body
      const imgs=exImgs(iss.body||'');
      let imageInfo='';
      if(imgs.length>0){
        const ia=await analyzeImage(imgs[0],'Extract Tuya fingerprints, device type, clusters, error messages from this image. Return JSON or NULL.');
        if(ia)imageInfo='\nImage analysis: '+ia;
      }
      // Extract links
      const links=exLinks(iss.body||'');
      let linkInfo='';
      for(const l of links.slice(0,3)){
        if(l.includes('zigbee2mqtt')||l.includes('blakadder')||l.includes('zigpy'))
          linkInfo+='\nExternal ref: '+l;
      }
      // Check for interview data in body
      const hasInterview=(iss.body||'').includes('zclNode')||(iss.body||'').includes('clusters')||(iss.body||'').includes('endpoint');
      const sysPrompt='You are the maintainer bot for Universal Tuya Zigbee v'+appVersion+'. Respond to this GitHub issue with a detailed, technical explanation:\n- If fingerprint supported: tell exactly which driver handles it, how to pair\n- If not supported: explain what info is needed (device interview from tools.developer.homey.app)\n- If interview data present: analyze clusters, endpoints, identify device type and suggest driver\n- If image present: incorporate image analysis\n- Cross-reference with Z2M/ZHA if links provided\nUse GitHub markdown. Max 400 words. End with:\n---\n*Bot Universal Tuya Zigbee v'+appVersion+'*';
      const userMsg='Issue #'+iss.number+' by @'+(iss.user?.login||'?')+':\n'+text+imageInfo+linkInfo+(hasInterview?'\n[Contains device interview data]':'')+'\n\nFingerprint lookup:\n'+JSON.stringify(fpResults,null,2);
      let reply=null,model='template';
      const ai=await callAI(userMsg,sysPrompt);
      if(ai&&ai.text&&ai.text.trim().toUpperCase()!=='NULL'){reply=ai.text.trim();model=ai.model}
      if(!reply){
        const sup=Object.entries(fpResults).filter(([,v])=>v.found).map(([k,v])=>'`'+k+'` → **'+v.drivers.join(', ')+'**');
        const mis=Object.entries(fpResults).filter(([,v])=>!v.found).map(([k])=>'`'+k+'`');
        if(sup.length||mis.length){
          reply='## Fingerprint Check (v'+appVersion+')\n';
          if(sup.length)reply+='**Supported:** '+sup.join(', ')+'\n';
          if(mis.length)reply+='**Not found:** '+mis.join(', ')+' — please provide a [device interview](https://tools.developer.homey.app/tools/zigbee).\n';
          reply+='\n---\n*Bot Universal Tuya Zigbee v'+appVersion+'*';
        }
      }
      if(!reply)continue;
      results.push({repo,number:iss.number,user:iss.user?.login,fps:fps.mfr,title:iss.title,response:reply.substring(0,300),model});
      if(!dryRun){
        const posted=await ghPost(GH+'/repos/'+repo+'/issues/'+iss.number+'/comments',{body:reply});
        if(posted){console.log('    Responded to '+key+' ('+model+')');processed.add(key)}
      }else{
        console.log('    [DRY] '+key+': '+reply.substring(0,100)+'...');
        processed.add(key);
      }
      await sleep(3000);
    }
    // PRs
    const prs=await ghFetch(GH+'/repos/'+repo+'/pulls?state=open&sort=updated&direction=desc&per_page=20');
    if(!prs)continue;
    for(const pr of prs){
      const key=repo+'#PR'+pr.number;
      if(processed.has(key))continue;
      const text=(pr.title||'')+'\n'+(pr.body||'');
      const fps=exFP(text);
      if(!fps.mfr.length)continue;
      const fpResults=lookupFPs(fps,idx,pidx);
      // Get PR diff for code review
      let diffInfo='';
      const diff=await ghFetch(GH+'/repos/'+repo+'/pulls/'+pr.number+'/files');
      if(diff){
        const fpFiles=diff.filter(f=>f.filename.includes('driver.compose.json')||f.filename.includes('device.js'));
        for(const f of fpFiles.slice(0,3))diffInfo+='\n'+f.filename+':\n'+(f.patch||'').substring(0,500);
      }
      const sysPrompt='You are reviewing a PR for Universal Tuya Zigbee v'+appVersion+'. Analyze the changes:\n- Check fingerprint correctness\n- Verify driver assignment\n- Check for common bugs (wrong import paths, wrong settings keys)\n- Suggest improvements\nUse GitHub markdown. Max 300 words.';
      const userMsg='PR #'+pr.number+' by @'+(pr.user?.login||'?')+': '+pr.title+'\n'+text+'\nFingerprints: '+JSON.stringify(fpResults)+'\nChanged files:'+diffInfo;
      let prReply=null,prModel='template';
      const ai=await callAI(userMsg,sysPrompt);
      if(ai&&ai.text&&ai.text.trim().toUpperCase()!=='NULL'){prReply=ai.text.trim();prModel=ai.model}
      if(!prReply){
        const sup=Object.entries(fpResults).filter(([,v])=>v.found).map(([k,v])=>'`'+k+'` → '+v.drivers.join(', '));
        const mis=Object.entries(fpResults).filter(([,v])=>!v.found).map(([k])=>'`'+k+'`');
        if(sup.length||mis.length){
          prReply='## PR Fingerprint Review (v'+appVersion+')\n';
          if(sup.length)prReply+='✅ Known: '+sup.join(', ')+'\n';
          if(mis.length)prReply+='❓ Unknown: '+mis.join(', ')+'\n';
          prReply+='\n---\n*Bot Universal Tuya Zigbee v'+appVersion+'*';
        }
      }
      if(!prReply){processed.add(key);continue}
      results.push({repo,number:pr.number,type:'pr',user:pr.user?.login,fps:fps.mfr,model:prModel});
      if(!dryRun){
        const posted=await ghPost(GH+'/repos/'+repo+'/pulls/'+pr.number+'/reviews',{body:prReply,event:'COMMENT'});
        if(posted)console.log('    Reviewed PR '+key+' ('+prModel+')');
        processed.add(key);
      }else{
        console.log('    [DRY] Review '+key+': '+prReply.substring(0,100)+'...');
        processed.add(key);
      }
      await sleep(3000);
    }
    await sleep(1000);
  }
  state.github.lastIssueDate=new Date().toISOString();
  state.github.processedIssues=[...processed].slice(-500);
  return results;
}

// === UPDATE DOCS ===
async function updateUserExpectations(forumResults,ghResults,appVersion){
  const uePath=path.join(DOCS,'rules','USER_DEVICE_EXPECTATIONS.md');
  if(!fs.existsSync(uePath)){console.log('  USER_DEVICE_EXPECTATIONS.md not found');return}
  let content=fs.readFileSync(uePath,'utf8');
  // Update version in header
  const today=new Date().toISOString().split('T')[0];
  content=content.replace(/^# User Device Expectations \(v[^)]+\)/,'# User Device Expectations (v'+appVersion+')');
  content=content.replace(/\*\*Updated\*\*: [^\n]+/,'**Updated**: '+today+' (v'+appVersion+': nightly auto-scan)');
  // Append new entries from forum
  const newEntries=[];
  for(const r of forumResults){
    if(r.fps&&r.fps.length>0){
      newEntries.push('| '+r.user+' | `'+r.fps.join('`, `')+'` | Forum #'+r.topic+' post #'+r.post+' | Auto-scanned '+today+' |');
    }
  }
  // Append new entries from GitHub
  for(const r of ghResults){
    if(r.fps&&r.fps.length>0){
      newEntries.push('| '+(r.user||'?')+' | `'+r.fps.join('`, `')+'` | '+r.repo+'#'+r.number+' | Auto-scanned '+today+' |');
    }
  }
  if(newEntries.length>0){
    const section='\n\n## Nightly Auto-Scan ('+today+')\n| User | Fingerprint(s) | Source | Date |\n|------|---------------|--------|------|\n'+newEntries.join('\n')+'\n';
    // Insert before first ## section or append
    if(content.includes('## Nightly Auto-Scan ('+today+')')){
      // Already has today's section, skip
      console.log('  UDE already has today\'s section');
    }else{
      // Insert after header
      const firstH2=content.indexOf('\n## ',10);
      if(firstH2>0)content=content.substring(0,firstH2)+section+content.substring(firstH2);
      else content+=section;
      fs.writeFileSync(uePath,content);
      console.log('  Updated USER_DEVICE_EXPECTATIONS.md: +'+newEntries.length+' entries');
    }
  }
}

async function updateProjectStatus(report,appVersion){
  const psPath=path.join(DOCS,'PROJECT_STATUS.md');
  if(!fs.existsSync(psPath))return;
  let content=fs.readFileSync(psPath,'utf8');
  const today=new Date().toISOString().split('T')[0];
  // Update version
  content=content.replace(/> Last Updated: [^|]+\| Version: [^\n]+/,'> Last Updated: '+today+' | Version: '+appVersion);
  fs.writeFileSync(psPath,content);
  console.log('  Updated PROJECT_STATUS.md version to',appVersion);
}

async function updateMasterReference(report,appVersion){
  const mrPath=path.join(DOCS,'MASTER_REFERENCE.md');
  if(!fs.existsSync(mrPath))return;
  let content=fs.readFileSync(mrPath,'utf8');
  const today=new Date().toISOString().split('T')[0];
  content=content.replace(/\*\*v[0-9.]+\*\* \| \*\*[0-9-]+\*\*/,'**v'+appVersion+'** | **'+today+'**');
  fs.writeFileSync(mrPath,content);
  console.log('  Updated MASTER_REFERENCE.md version to',appVersion);
}

async function updateGitHubResponsesDoc(ghResults,appVersion){
  const grPath=path.join(DOCS,'GITHUB_RESPONSES_FULL.md');
  if(!fs.existsSync(grPath))return;
  let content=fs.readFileSync(grPath,'utf8');
  const today=new Date().toISOString().split('T')[0];
  if(ghResults.length>0){
    let section='\n\n## Nightly Auto-Responses ('+today+' v'+appVersion+')\n';
    for(const r of ghResults){
      section+='- **'+r.repo+'#'+r.number+'** @'+(r.user||'?')+': `'+r.fps.join('`, `')+'` ('+r.model+')\n';
    }
    if(!content.includes('## Nightly Auto-Responses ('+today)){
      content+=section;
      fs.writeFileSync(grPath,content);
      console.log('  Updated GITHUB_RESPONSES_FULL.md: +'+ghResults.length+' responses');
    }
  }
}

async function updateForumAnalysis(forumResults,appVersion){
  const faPath=path.join(DOCS,'FORUM_ISSUES_ANALYSIS.md');
  if(!fs.existsSync(faPath))return;
  let content=fs.readFileSync(faPath,'utf8');
  const today=new Date().toISOString().split('T')[0];
  if(forumResults.length>0){
    let section='\n\n## Nightly Forum Scan ('+today+' v'+appVersion+')\n';
    for(const r of forumResults){
      section+='- **Topic '+r.topic+' #'+r.post+'** @'+r.user+': '+(r.fps.length?'`'+r.fps.join('`, `')+'`':'no FPs')+' ('+r.model+')\n';
    }
    if(!content.includes('## Nightly Forum Scan ('+today)){
      content+=section;
      fs.writeFileSync(faPath,content);
      console.log('  Updated FORUM_ISSUES_ANALYSIS.md: +'+forumResults.length+' entries');
    }
  }
}

// === MAIN ===
async function main(){
  const dryRun=process.env.DRY_RUN!=='false';
  let appVersion='unknown';
  try{appVersion=JSON.parse(fs.readFileSync(path.join(ROOT,'app.json'),'utf8')).version}catch{}
  const state=loadState();
  const{idx,pidx}=buildIndex();

  console.log('=== Nightly Processor ===');
  console.log('Mode:',dryRun?'DRY RUN':'LIVE','| App: v'+appVersion,'| Index:',idx.size,'mfrs');

  // 1. Forum
  console.log('\n== 1. Forum Processing ==');
  let auth=null;
  if(!dryRun)auth=await getForumAuth();
  const forumResults=await processForumPosts(state,idx,pidx,auth,appVersion,dryRun);
  console.log('Forum: '+forumResults.length+' replies');

  // 2. GitHub
  console.log('\n== 2. GitHub Processing ==');
  const ghResults=await processGitHub(state,idx,pidx,appVersion,dryRun);
  console.log('GitHub: '+ghResults.length+' responses');

  // 2b. Ingest Gmail diagnostics
  let diagCount=0;
  try{const df=path.join(__dirname,'..','state','diagnostics-report.json');
  if(fs.existsSync(df)){diagCount=(JSON.parse(fs.readFileSync(df,'utf8'))).count||0;
  if(diagCount)console.log('  Diagnostics:',diagCount,'reports')}}catch{}

  // 3. Update docs
  console.log('\n== 3. Update Docs ==');
  if(forumResults.length||ghResults.length){
    await updateUserExpectations(forumResults,ghResults,appVersion);
    await updateProjectStatus({forum:forumResults.length,github:ghResults.length},appVersion);
    await updateMasterReference({},appVersion);
    await updateGitHubResponsesDoc(ghResults,appVersion);
    await updateForumAnalysis(forumResults,appVersion);
  }else{
    console.log('  No new results, skipping doc updates');
  }

  // 4. Save state + report
  state.lastRun=new Date().toISOString();
  saveState(state);
  const report={timestamp:state.lastRun,appVersion,forum:forumResults.length,github:ghResults.length,diagnostics:diagCount,
    forumDetails:forumResults.slice(0,20),githubDetails:ghResults.slice(0,20)};
  fs.writeFileSync(path.join(__dirname,'..','state','nightly-report.json'),JSON.stringify(report,null,2)+'\n');

  console.log('\n=== Nightly Complete ===');
  console.log('Forum replies:',forumResults.length,'| GitHub responses:',ghResults.length,'| Diagnostics:',diagCount);

  if(process.env.GITHUB_STEP_SUMMARY){
    let md='## Nightly Processor\n| Metric | Count |\n|---|---|\n';
    md+='| Forum replies | '+forumResults.length+' |\n';
    md+='| GitHub responses | '+ghResults.length+' |\n';
    md+='| Gmail diagnostics | '+diagCount+' |\n';
    if(forumResults.length){
      md+='\n### Forum\n';
      for(const r of forumResults.slice(0,10))md+='- Topic '+r.topic+' #'+r.post+' @'+r.user+'\n';
    }
    if(ghResults.length){
      md+='\n### GitHub\n';
      for(const r of ghResults.slice(0,10))md+='- '+r.repo+'#'+r.number+' @'+(r.user||'?')+'\n';
    }
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md);
  }
}

main().catch(e=>{console.error('Fatal:',e.message);process.exit(1)});
