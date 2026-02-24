/**
 * Monthly Comprehensive Scanner
 * Deep scan: all GitHub activity + all forks + all forum posts + all enrichment sources
 * Auto-processes PRs, issues, responds on GitHub + forum
 */
const fs=require('fs'),path=require('path');
const{callAI,analyzeImage,sleep}=require('./ai-helper');
const{getForumAuth,fmtCk}=require('./forum-auth');
const{fetchWithRetry}=require('./retry-helper');
const DDIR=path.join(__dirname,'..','..','drivers');
const STATE=path.join(__dirname,'..','state','monthly-state.json');
const GH='https://api.github.com';
const FORUM='https://community.homey.app';

function loadState(){try{return JSON.parse(fs.readFileSync(STATE,'utf8'))}catch{return{lastRun:null,processedIssues:[],processedPRs:[],processedForkFPs:[]}}}
function saveState(s){fs.mkdirSync(path.dirname(STATE),{recursive:true});fs.writeFileSync(STATE,JSON.stringify(s,null,2)+'\n')}

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

const extractFP=t=>[...new Set((t||'').match(/_T[A-Z][A-Za-z0-9]{3,5}_[a-z0-9]{4,16}/g)||[])];
const extractPID=t=>[...new Set((t||'').match(/\bTS[0-9]{4}[A-Z]?\b/g)||[])];

async function ghFetch(url){
  const token=process.env.GH_PAT||process.env.GITHUB_TOKEN;
  const h={Accept:'application/vnd.github+json','User-Agent':'tuya-monthly-bot'};
  if(token)h.Authorization='Bearer '+token;
  const r=await fetchWithRetry(url,{headers:h},{retries:3,label:'ghFetch'});
  if(!r.ok){console.log('  GH '+r.status+': '+url.substring(0,80));return null}
  return r.json();
}


async function ghPost(url,body){
  const token=process.env.GH_PAT||process.env.GITHUB_TOKEN;
  const h={Accept:'application/vnd.github+json','User-Agent':'tuya-monthly-bot','Content-Type':'application/json'};
  if(token)h.Authorization='Bearer '+token;
  const r=await fetchWithRetry(url,{method:'POST',headers:h,body:JSON.stringify(body)},{retries:3,label:'ghPost'});
  if(!r.ok){const e=await r.text().catch(()=>'');console.log('  GH POST '+r.status+': '+e.substring(0,150));return null}
  return r.json();
}

// --- GITHUB DEEP SCANNER ---
async function scanAllIssues(repos){
  const all=[];
  for(const repo of repos){
    console.log('  Issues:',repo);
    for(let page=1;page<=3;page++){
      const items=await ghFetch(GH+'/repos/'+repo+'/issues?state=all&per_page=50&page='+page+'&sort=updated&direction=desc');
      if(!items||!items.length)break;
      all.push(...items.map(i=>({...i,_repo:repo})));
      await sleep(500);
    }
  }
  return all;
}

async function scanAllPRs(repos){
  const all=[];
  for(const repo of repos){
    console.log('  PRs:',repo);
    for(let page=1;page<=3;page++){
      const items=await ghFetch(GH+'/repos/'+repo+'/pulls?state=all&per_page=50&page='+page+'&sort=updated&direction=desc');
      if(!items||!items.length)break;
      all.push(...items.map(p=>({...p,_repo:repo})));
      await sleep(500);
    }
  }
  return all;
}

async function deepScanForks(repo){
  console.log('  Forks:',repo);
  const forks=await ghFetch(GH+'/repos/'+repo+'/forks?sort=newest&per_page=100');
  if(!forks)return[];
  const results=[];
  for(const fork of forks.slice(0,30)){
    try{
      // Get all driver.compose.json files from fork
      const tree=await ghFetch(GH+'/repos/'+fork.full_name+'/git/trees/'+fork.default_branch+'?recursive=1');
      if(!tree||!tree.tree)continue;
      const composeFiles=tree.tree.filter(f=>f.path.includes('driver.compose.json'));
      for(const cf of composeFiles){
        const blob=await ghFetch(GH+'/repos/'+fork.full_name+'/contents/'+cf.path);
        if(!blob||!blob.content)continue;
        const content=Buffer.from(blob.content,'base64').toString('utf8');
        const fps=extractFP(content);
        const driver=cf.path.split('/')[1]||'unknown';
        for(const fp of fps)results.push({fp,driver,fork:fork.full_name,owner:fork.owner?.login,file:cf.path});
      }
      // Also check fork PRs
      const forkPRs=await ghFetch(GH+'/repos/'+fork.full_name+'/pulls?state=all&per_page=10');
      if(forkPRs){
        for(const pr of forkPRs){
          const fps=extractFP((pr.title||'')+' '+(pr.body||''));
          for(const fp of fps)results.push({fp,source:'fork-pr',fork:fork.full_name,pr:pr.number,title:pr.title});
        }
      }
    }catch(e){console.log('    Fork error:',fork.full_name,e.message)}
    await sleep(300);
  }
  return results;
}

// --- ENRICHMENT SOURCES ---
async function crawlZ2M(){
  console.log('  Crawling Z2M issues...');
  const all=[];
  for(const q of['_TZE284_','_TZE204_','_TZ3000_']){
    const d=await ghFetch(GH+'/search/issues?q=repo:Koenkk/zigbee2mqtt+'+q+'+state:open&per_page=30&sort=created&order=desc');
    if(d&&d.items)for(const i of d.items){
      const fps=extractFP((i.title||'')+' '+(i.body||''));
      for(const fp of fps)all.push({fp,source:'z2m',issue:i.number,title:i.title?.substring(0,80),url:i.html_url});
    }
    await sleep(2000);
  }
  return all;
}

async function crawlZHA(){
  console.log('  Crawling ZHA issues...');
  const d=await ghFetch(GH+'/search/issues?q=repo:zigpy/zha-device-handlers+tuya+state:open&per_page=30');
  if(!d||!d.items)return[];
  const all=[];
  for(const i of d.items){
    const fps=extractFP((i.title||'')+' '+(i.body||''));
    for(const fp of fps)all.push({fp,source:'zha',issue:i.number,title:i.title?.substring(0,80),url:i.html_url});
  }
  return all;
}

async function crawlDeconz(){
  console.log('  Crawling deCONZ issues...');
  const d=await ghFetch(GH+'/search/issues?q=repo:dresden-elektronik/deconz-rest-plugin+tuya+state:open&per_page=20');
  if(!d||!d.items)return[];
  const all=[];
  for(const i of d.items){
    const fps=extractFP((i.title||'')+' '+(i.body||''));
    for(const fp of fps)all.push({fp,source:'deconz',issue:i.number,title:i.title?.substring(0,80),url:i.html_url});
  }
  return all;
}

async function crawlBlakadder(){
  console.log('  Crawling Blakadder...');
  try{
    const r=await fetchWithRetry('https://zigbee.blakadder.com/assets/js/zigbee.json',{headers:{'User-Agent':'tuya-bot'}},{retries:3,label:'blakadder'});
    if(!r.ok)return[];
    const data=await r.json();
    if(!Array.isArray(data))return[];
    return data.filter(d=>d.manufacturerName&&d.manufacturerName.startsWith('_T'))
      .map(d=>({fp:d.manufacturerName,source:'blakadder',model:d.zigbeeModel,name:d.name}));
  }catch{return[]}
}


// --- FORUM DEEP SCANNER ---
async function scanForumTopic(topicId,maxPages){
  console.log('  Forum topic:',topicId);
  const posts=[];
  const r=await fetchWithRetry(FORUM+'/t/'+topicId+'.json',{},{retries:3,label:'forumTopic'});
  if(!r.ok)return posts;
  const d=await r.json();
  const highest=d.highest_post_number;
  // Fetch last N pages
  const startFrom=Math.max(1,highest-(maxPages*20));
  for(let from=startFrom;from<=highest;from+=20){
    try{
      const r2=await fetchWithRetry(FORUM+'/t/'+topicId+'/'+from+'.json',{},{retries:2,label:'forumPage'});
      if(!r2.ok)break;
      const d2=await r2.json();
      posts.push(...(d2.post_stream?.posts||[]));
    }catch{break}
    await sleep(500);
  }
  return posts;
}

function extractImagesFromPost(post){
  const urls=[];
  const html=post.cooked||'';
  const re=/<img[^>]+src="([^"]+)"/gi;
  let m;while((m=re.exec(html))!==null)urls.push(m[1]);
  return urls;
}

// --- AUTO-RESPOND ON GITHUB ---
async function respondToIssue(repo,issue,idx,pidx,state,appVersion){
  const key=repo+'#'+issue.number;
  if(state.processedIssues.includes(key))return null;
  const text=(issue.title||'')+'\n'+(issue.body||'');
  const fps=extractFP(text);
  const pids=extractPID(text);
  if(!fps.length&&!pids.length)return null;

  const results={};
  for(const fp of fps){const d=idx.get(fp)||[];results[fp]={found:d.length>0,drivers:d}}
  for(const pid of pids){const d=pidx.get(pid)||[];results[pid]={found:d.length>0,drivers:d,type:'productId'}}

  const sysPrompt='You are the maintainer bot for Universal Tuya Zigbee (v'+appVersion+'). Respond to this GitHub issue with technical details. If fingerprint is supported, tell which driver. If not, ask for device interview from tools.developer.homey.app. Be concise, use GitHub markdown. Max 300 words. End with: ---\n*Bot Universal Tuya Zigbee v'+appVersion+'*';
  const ai=await callAI('Issue #'+issue.number+' by @'+issue.user?.login+':\n'+text+'\n\nFingerprint results:\n'+JSON.stringify(results,null,2),sysPrompt);
  if(!ai)return null;
  if(ai.text.toUpperCase()==='NULL')return null;

  state.processedIssues.push(key);
  return{repo,number:issue.number,response:ai.text,model:ai.model,fps,results};
}

// --- FORUM AUTH + POST (uses forum-auth.js) ---
async function postToForum(topicId,content,auth){
  const h=auth.type==='apikey'
    ?{'Content-Type':'application/json','User-Api-Key':auth.key}
    :{'Content-Type':'application/json','X-CSRF-Token':auth.csrf,'X-Requested-With':'XMLHttpRequest',Cookie:fmtCk(auth.cookies)};
  const r=await fetchWithRetry(FORUM+'/posts',{method:'POST',headers:h,
    body:JSON.stringify({topic_id:topicId,raw:content})},{retries:3,label:'forumPost'});
  return r.ok?(await r.json()):null;
}
async function main(){
  const dryRun=process.env.DRY_RUN!=='false';
  const repos=['dlnraja/com.tuya.zigbee','JohanBendz/com.tuya.zigbee'];
  const forumTopics=[140352,26439];
  let appVersion='unknown';
  try{appVersion=JSON.parse(fs.readFileSync(path.join(__dirname,'..','..','app.json'),'utf8')).version}catch{}
  const state=loadState();
  const{idx,pidx}=buildIndex();

  console.log('=== Monthly Comprehensive Scanner ===');
  console.log('Mode:',dryRun?'DRY RUN':'LIVE','| App: v'+appVersion,'| Index:',idx.size,'mfrs,',pidx.size,'pids');

  const report={timestamp:new Date().toISOString(),appVersion,github:{},enrichment:{},forum:{},actions:[]};

  // ===== 1. GITHUB ISSUES =====
  console.log('\n== 1. GitHub Issues ==');
  const allIssues=await scanAllIssues(repos);
  console.log('Total issues:',allIssues.length);
  const issuesWithFP=allIssues.filter(i=>!i.pull_request&&extractFP((i.title||'')+' '+(i.body||'')).length>0);
  console.log('Issues with fingerprints:',issuesWithFP.length);

  // Auto-respond to unprocessed issues
  let ghResponses=0;
  for(const iss of issuesWithFP.slice(0,10)){
    const resp=await respondToIssue(iss._repo,iss,idx,pidx,state,appVersion);
    if(!resp)continue;
    console.log('  -> Response for',resp.repo+'#'+resp.number,'(',resp.model,')');
    if(!dryRun){
      const posted=await ghPost(GH+'/repos/'+resp.repo+'/issues/'+resp.number+'/comments',{body:resp.response});
      if(posted){console.log('    Posted comment id:',posted.id);ghResponses++}
    }else{
      console.log('    [DRY] Would post:',resp.response.substring(0,100)+'...');
      report.actions.push({type:'github_comment',repo:resp.repo,issue:resp.number,preview:resp.response.substring(0,200)});
    }
    await sleep(2000);
  }

  // ===== 2. GITHUB PRs =====
  console.log('\n== 2. GitHub PRs ==');
  const allPRs=await scanAllPRs(repos);
  const prsWithFP=allPRs.filter(p=>extractFP((p.title||'')+' '+(p.body||'')).length>0);
  console.log('Total PRs:',allPRs.length,'| With FPs:',prsWithFP.length);
  report.github={issues:issuesWithFP.length,prs:prsWithFP.length,responded:ghResponses};

  // ===== 3. FORK DEEP SCAN =====
  console.log('\n== 3. JohanBendz Fork Deep Scan ==');
  const forkFPs=await deepScanForks('JohanBendz/com.tuya.zigbee');
  const newFromForks=forkFPs.filter(f=>!idx.has(f.fp));
  const uniqueNewFork=[...new Map(newFromForks.map(f=>[f.fp,f])).values()];
  console.log('Fork FPs total:',forkFPs.length,'| New:',uniqueNewFork.length);
  if(uniqueNewFork.length){
    for(const f of uniqueNewFork.slice(0,20))console.log('  NEW:',f.fp,'from',f.fork,'->',f.driver||f.source);
  }
  report.github.forkFPs=uniqueNewFork.length;

  // ===== 4. ENRICHMENT CRAWL =====
  console.log('\n== 4. Enrichment Crawl ==');
  const z2m=await crawlZ2M();await sleep(3000);
  const zha=await crawlZHA();await sleep(2000);
  const deconz=await crawlDeconz();await sleep(2000);
  const blak=await crawlBlakadder();
  const allEnrich=[...z2m,...zha,...deconz,...blak];
  const newEnrich=allEnrich.filter(f=>!idx.has(f.fp));
  const uniqueNewEnrich=[...new Map(newEnrich.map(f=>[f.fp,f])).values()];
  console.log('Z2M:',z2m.length,'| ZHA:',zha.length,'| deCONZ:',deconz.length,'| Blakadder:',blak.length);
  console.log('Total new from enrichment:',uniqueNewEnrich.length);
  report.enrichment={z2m:z2m.length,zha:zha.length,deconz:deconz.length,blakadder:blak.length,totalNew:uniqueNewEnrich.length};

  // ===== 5. FORUM SCAN =====
  console.log('\n== 5. Forum Scan ==');
  let forumFingerprints=0,forumImages=0;
  for(const tid of forumTopics){
    const posts=await scanForumTopic(tid,5);
    console.log('  Topic',tid,':',posts.length,'posts');
    for(const p of posts){
      const fps=extractFP(p.cooked||'');
      if(fps.length)forumFingerprints+=fps.length;
      const imgs=extractImagesFromPost(p);
      if(imgs.length){
        forumImages+=imgs.length;
        // Analyze first image per post with AI vision
        if(imgs[0]&&!dryRun){
          const analysis=await analyzeImage(imgs[0],'Extract any Tuya device fingerprints (manufacturerName like _TZxxxx_xxx, productId like TSxxxx) from this screenshot. Also identify the device type. Return JSON or NULL if not relevant.');
          if(analysis)console.log('    Image analysis:',analysis.substring(0,100));
        }
      }
    }
  }
  report.forum={fingerprints:forumFingerprints,images:forumImages};
  console.log('Forum FPs:',forumFingerprints,'| Images:',forumImages);

  // ===== 6. AI COMPREHENSIVE SUMMARY =====
  console.log('\n== 6. AI Summary ==');
  const allNewFPs=[...uniqueNewFork,...uniqueNewEnrich];
  const summaryData={report,newFingerprints:allNewFPs.slice(0,30),topIssues:issuesWithFP.slice(0,10).map(i=>({repo:i._repo,number:i.number,title:i.title,user:i.user?.login}))};

  const sysPrompt='You are posting a monthly status update on the Homey Community forum #140352 for Universal Tuya Zigbee app (v'+appVersion+'). Write a comprehensive, professional post covering: 1) GitHub activity summary 2) New fingerprints found from forks/Z2M/ZHA/deCONZ/Blakadder 3) Issues responded to 4) Devices needing community help. Use Discourse markdown. Max 600 words. End with bot signature.';
  const aiSummary=await callAI(JSON.stringify(summaryData,null,2),sysPrompt);

  if(aiSummary){
    console.log('AI Summary (',aiSummary.model,'):',aiSummary.text.length,'chars');
    report.aiSummary=aiSummary.text;

    // Post to forum
    if(!dryRun){
      const auth=await getForumAuth();
      if(auth){
        const posted=await postToForum(140352,aiSummary.text,auth);
        if(posted)console.log('Forum post id:',posted.id);
      }
    }else{
      console.log('[DRY] Would post to forum:\n---\n'+aiSummary.text.substring(0,300)+'...\n---');
    }
  }

  // Save everything
  const reportPath=path.join(__dirname,'..','state','monthly-report.json');
  fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
  saveState(state);

  console.log('\n=== Monthly Scan Complete ===');
  console.log('GitHub: '+report.github.issues+' issues, '+report.github.prs+' PRs, '+report.github.forkFPs+' new fork FPs');
  console.log('Enrichment: '+report.enrichment.totalNew+' new FPs');
  console.log('Forum: '+report.forum.fingerprints+' FPs, '+report.forum.images+' images');
  console.log('Actions: '+report.actions.length+' pending');

  if(process.env.GITHUB_STEP_SUMMARY){
    let md='## Monthly Comprehensive Scan\n\n';
    md+='| Category | Count |\n|---|---|\n';
    md+='| GitHub issues with FPs | '+report.github.issues+' |\n';
    md+='| GitHub PRs with FPs | '+report.github.prs+' |\n';
    md+='| New FPs from forks | '+report.github.forkFPs+' |\n';
    md+='| New FPs from enrichment | '+report.enrichment.totalNew+' |\n';
    md+='| Forum fingerprints | '+report.forum.fingerprints+' |\n';
    md+='| Forum images analyzed | '+report.forum.images+' |\n';
    md+='| GitHub responses posted | '+ghResponses+' |\n';
    if(aiSummary)md+='\n### AI Summary\n'+aiSummary.text+'\n';
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md);
  }
}

main().catch(e=>{console.error('Fatal:',e.message);process.exit(1)});
