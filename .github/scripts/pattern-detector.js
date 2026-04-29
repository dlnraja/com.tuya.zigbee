#!/usr/bin/env node
'use strict';
// v5.11.27: Pattern Detector  scans forum state + GitHub issues for recurring patterns
// Detects: inversion reports, battery issues, double-division, pairing failures, unknown devices
// Generates actionable fix suggestions and priority lists
const fs=require('fs'),path=require('path');
const{buildFullIndex,extractAllFP}=require('./load-fingerprints');
const DDIR=path.join(__dirname,'..','..','drivers');
const STATE_DIR=path.join(__dirname,'..','state');

// Known issue patterns with detection regex and fix templates
const PATTERNS=[
  {id:'inversion',name:'Inverted Sensor State',
   regex:/invert|reversed|wrong.*(open|closed|state)|open.*when.*closed|closed.*when.*open|backward|opposite/i,
   fixHint:'Add manufacturerName to invertedByDefault in UnifiedSensorBase.js + device.js',
   files:['lib/devices/UnifiedSensorBase.js','drivers/{driver}/device.js']},
  {id:'battery',name:'False Battery Alert/Missing Battery',
   regex:/battery.*(0|null|\?|unknown|false|always|100|mains)|mains.*battery|usb.*battery|powered.*battery/i,
   fixHint:'Set `get mainsPowered() { return true; }` and remove measure_battery in onNodeInit',
   files:['drivers/{driver}/device.js']},
  {id:'double_div',name:'Double Division (wrong sensor values)',
   regex:/temp.*(0\.\d|wrong|half|double)|humidity.*(0\.\d|wrong)|value.*(wrong|half|too low|divided)/i,
   fixHint:'Check TuyaEF00Manager.js:1912  skip auto-convert when dpMappings has divisor !== 1',
   files:['lib/tuya/TuyaEF00Manager.js']},
  {id:'pairing',name:'Pairing Failure',
   regex:/can.t.*(pair|add|find|detect)|won.t.*pair|pair.*fail|not.*found.*pair|unknown.*device/i,
   fixHint:'Check driver.compose.json fingerprints, verify manufacturerName + productId',
   files:['drivers/{driver}/driver.compose.json']},
  {id:'unknown',name:'Device Shows Unknown',
   regex:/unknown.*unknown|shows.*unknown|appears.*unknown|device.*unknown/i,
   fixHint:'Check settings keys: zb_model_id (not zb_modelId), zb_manufacturer_name (not zb_manufacturerName)',
   files:['drivers/{driver}/device.js']},
  {id:'flow_dup',name:'Duplicate Flow Triggers',
   regex:/flow.*(trigger|fire).*(twice|double|duplicate|multiple)|trigger.*twice|double.*trigger/i,
   fixHint:'Add deduplication in setCapabilityValue with 500ms window',
   files:['drivers/{driver}/device.js']},
  {id:'no_response',name:'Device Not Responding',
   regex:/not respond|no response|offline|unavailable|unreachable|lost connection/i,
   fixHint:'Check Zigbee mesh, device routing, and cluster bindings',
   files:[]},
  {id:'voltage_wrong',name:'Wrong Voltage',
   regex:/voltage.*(wrong|high|2\d{3})|2300\s*V/i,
   fixHint:'Check voltage divisor',files:[]},
  {id:'no_temperature',name:'No Temperature',
   regex:/temp.*(null|missing|stuck|0\.0)/i,
   fixHint:'Check DP18 divisor',files:[]},
  {id:'ring_value',name:'Ring/Alarm Wrong',
   regex:/ring.*(wrong|value)|alarm.*(wrong|stuck)/i,
   fixHint:'Check alarm DP map',files:[]},
  {id:'energy_wrong',name:'Wrong Energy',
   regex:/power.*(wrong|crazy)|kwh.*(wrong|huge)/i,
   fixHint:'Check energy divisor',files:[]},
  {id:'sensor_zero',name:'Sensor Stuck Zero',
   regex:/stuck.*(0|zero)|always.*zero/i,
   fixHint:'Re-pair device',files:[]},
];

function loadForumData(){
  const posts=[];
  // Load from forum state
  const stateFile=path.join(STATE_DIR,'forum-state.json');
  if(fs.existsSync(stateFile)){
    try{
      const state=JSON.parse(fs.readFileSync(stateFile,'utf8'));
      if(state.recentPosts)posts.push(...state.recentPosts);
    }catch{}
  }
  // Load from nightly results
  const nightlyFile=path.join(STATE_DIR,'nightly-results.json');
  if(fs.existsSync(nightlyFile)){
    try{
      const data=JSON.parse(fs.readFileSync(nightlyFile,'utf8'));
    }catch{}
  }
  // Load from forum activity
  const activityFile=path.join(STATE_DIR,'forum-activity.json');
  if(fs.existsSync(activityFile)){
    try{
      const data=JSON.parse(fs.readFileSync(activityFile,'utf8'));
      if(Array.isArray(data))posts.push(...data);
      else if(data.mentions)posts.push(...data.mentions);
    }catch{}
  }
  // Load interview excerpts
  const intDir=path.join(STATE_DIR,'interviews');
  try{if(fs.existsSync(intDir))for(const f of fs.readdirSync(intDir).filter(f=>f.endsWith('.json'))){try{const d=JSON.parse(fs.readFileSync(path.join(intDir,f),'utf8'));if(d.excerpt&&d.user!=='dlnraja')posts.push({text:d.excerpt,user:d.user,date:d.date,topic_id:d.topicId})}catch{}}}catch{}
  // Load diagnostics
  const diagFile=path.join(STATE_DIR,'diagnostics-report.json');
  try{if(fs.existsSync(diagFile)){const d=JSON.parse(fs.readFileSync(diagFile,'utf8'));for(const e of(d.diagnostics||[]))if(e.subj)posts.push({text:e.subj+' '+(e.errs||[]).join(' '),user:'email',date:e.date})}}catch{}
  return posts;
}

function loadGitHubData(){
  const issues=[];
  const issuesFile=path.join(STATE_DIR,'github-issues.json');
  if(fs.existsSync(issuesFile)){
    try{
      const data=JSON.parse(fs.readFileSync(issuesFile,'utf8'));
      if(Array.isArray(data))issues.push(...data);
    }catch{}
  }
  return issues;
}

function detectPatterns(posts, issues){
  const {mfrIdx, pidIdx, allMfrs, allPids}=buildFullIndex(DDIR);
  const detections=new Map(); // patternId -> [{source, text, fps, user, date}]

  for(const pat of PATTERNS) detections.set(pat.id, []);

  for(const post of posts){
    const text=post.text||post.raw||post.reply||post.excerpt||'';
    if(!text)continue;
    for(const pat of PATTERNS){
      if(pat.regex.test(text)){
        const fps=extractAllFP(text,allMfrs,allPids);
        detections.get(pat.id).push({
          source:'forum',
          topic:post.topic||post.topic_id||'?',
          user:post.user||post.username||'?',
          fps:[...fps.mfr,...fps.pid],
          text:text.substring(0,200),
          date:post.date||post.created_at||null
        });
      }
    }
  }

  // Scan GitHub issues
  for(const issue of issues){
    const text=(issue.title||'')+' '+(issue.body||issue.text||'');
    if(!text.trim())continue;
    for(const pat of PATTERNS){
      if(pat.regex.test(text)){
        const fps=extractAllFP(text,allMfrs,allPids);
        detections.get(pat.id).push({
          source:'github',
          issue:issue.number||issue.id||'?',
          user:issue.user||issue.author||'?',
          fps:[...fps.mfr,...fps.pid],
          text:text.substring(0,200),
          date:issue.date||issue.created_at||null
        });
      }
    }
  }

  return detections;
}

function generateFixSuggestions(detections){
  const suggestions=[];
  for(const pat of PATTERNS){
    const hits=detections.get(pat.id);
    if(!hits||!hits.length)continue;

    // Count affected FPs
    const fpCounts=new Map();
    for(const h of hits){
      for(const fp of h.fps){
        fpCounts.set(fp,( fpCounts.get(fp)||0)+1);
      }
    }
    // Sort by frequency
    const topFPs=[...fpCounts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);

    suggestions.push({
      pattern:pat.name,
      id:pat.id,
      count:hits.length,
      priority:hits.length>=5?'high':hits.length>=2?'medium':'low',
      topFPs,
      fix:pat.fixHint,
      files:pat.files,
      recentHits:hits.slice(-3)
    });
  }
  return suggestions.sort((a,b)=>b.count-a.count);
}

function generateReport(suggestions){
  let md='## Pattern Detection Report\n\n';
  if(!suggestions.length){md+='No recurring patterns detected.\n';return md;}

  md+='| Pattern | Reports | Priority | Top Fingerprints |\n|---|---|---|---|\n';
  for(const s of suggestions){
    const fps=s.topFPs.slice(0,3).map(([fp,c])=>'`'+fp+'` ('+c+'x)').join(', ');
    md+='| '+s.pattern+' | '+s.count+' | **'+s.priority+'** | '+fps+' |\n';
  }
  md+='\n';

  for(const s of suggestions){
    md+='### '+s.pattern+' ('+s.count+' reports)\n';
    md+='**Fix:** '+s.fix+'\n';
    if(s.files.length)md+='**Files:** '+s.files.map(f=>'`'+f+'`').join(', ')+'\n';
    if(s.topFPs.length){
      md+='**Most affected:** '+s.topFPs.map(([fp,c])=>'`'+fp+'` ('+c+'x)').join(', ')+'\n';
    }
    md+='\n';
  }
  return md;
}

if(require.main===module){
  console.log('=== Pattern Detector ===');
  const issues=loadGitHubData();

  const detections=detectPatterns(posts,issues);
  const suggestions=generateFixSuggestions(detections);

  for(const s of suggestions){
    console.log('['+s.priority.toUpperCase()+']',s.pattern+':',s.count,'reports');
    if(s.topFPs.length)console.log('  Top FPs:',s.topFPs.slice(0,5).map(([fp,c])=>fp+'('+c+'x)').join(', '));
  }

  const report=generateReport(suggestions);
  const reportFile=path.join(STATE_DIR,'pattern-report.md');
  fs.mkdirSync(STATE_DIR,{recursive:true});
  fs.writeFileSync(reportFile,report);
  console.log('Report:',reportFile);

  // Save structured data for other scripts
  const dataFile=path.join(STATE_DIR,'pattern-data.json');
  fs.writeFileSync(dataFile,JSON.stringify({
    timestamp:new Date().toISOString(),
    suggestions:suggestions.map(s=>({...s,recentHits:undefined})),
    detections:Object.fromEntries([...detections.entries()].map(([k,v])=>[k,v.length]))
  },null,2));

  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,report);
  if(process.env.GITHUB_OUTPUT){
    fs.appendFileSync(process.env.GITHUB_OUTPUT,
      'patterns_found='+suggestions.length+'\n'+
      'high_priority='+suggestions.filter(s=>s.priority==='high').length+'\n');
  }
  console.log('Done:',suggestions.length,'patterns found');
}

module.exports={detectPatterns,generateFixSuggestions,generateReport,PATTERNS};
