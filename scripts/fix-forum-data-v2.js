#!/usr/bin/env node
'use strict';
/**
 * Fix corrupted forum-activity-data.json - Version 2
 * Handles the specific issue with code snippets in excerpt fields
 */
const fs=require('fs'),path=require('path');

const STATE_F=path.join(__dirname,'..','.github','state','forum-activity-data.corrupted.json');
const FIXED_F=path.join(__dirname,'..','.github','state','forum-activity-data.json');

console.log('Fixing forum activity data v2...\n');

const raw=fs.readFileSync(STATE_F,'utf8');
console.log('Original size:',raw.length,'chars');

// Fix: The issue is in a string that contains raw code snippets like "101: { cap: ... }"
// We need to escape these or remove them
let fixed=raw;

// Find and replace the problematic excerpt field pattern
// Match: "excerpt": "...101: { cap:"
const problematicPattern=/"excerpt":\s*"(?:[^"\\]|\\.)*?101:\s*\{[^}]+\}/g;
fixed=fixed.replace(problematicPattern, (match)=>{
  // Escape the curly braces or remove the problematic section
  return match.replace(/\{/g,'\\u007B').replace(/\}/g,'\\u007D');
});

// Alternative: Remove newlines that aren't properly escaped in excerpt
// Match "excerpt": " followed by content with unescaped newlines
const excerptFix=/"excerpt":\s*"((?:[^"\\]|\\.)*?)(?<!\\)\\n/g;
fixed=fixed.replace(excerptFix, (m, content)=>{
  return '"excerpt": "'+content.replace(/\n/g,'\\n')+'"';
});

// Try to parse
let data;
try{
  data=JSON.parse(fixed);
  console.log('Parsed successfully!');
  console.log('Keys:',Object.keys(data).join(', '));
  
  if(data.recentPosts)console.log('Recent posts:',data.recentPosts.length);
  if(data.deviceRequests)console.log('Device requests:',data.deviceRequests.length);
  if(data.unsupportedFPs)console.log('Unsupported FPs:',data.unsupportedFPs.length);
  if(data.activity)console.log('Activity entries:',data.activity.length);
  if(data.topicCount)console.log('Topic count:',data.topicCount);
  
  fs.writeFileSync(FIXED_F,JSON.stringify(data,null,2));
  console.log('\nFixed file saved!');
  console.log('New size:',fs.readFileSync(FIXED_F,'utf8').length,'chars');
  
}catch(e){
  console.error('Parse error:',e.message);
  
  // More aggressive fix: replace all newlines in strings with escaped versions
  console.log('\nTrying aggressive fix...');
  
  // Find position
  const posMatch=e.message.match(/position\s+(\d+)/);
  if(posMatch){
    const pos=parseInt(posMatch[1]);
    console.log('Error at position:',pos);
    console.log('Context:',raw.slice(Math.max(0,pos-100),pos+100));
  }
  
  // Try: replace all unescaped newlines within string values
  let aggressive=raw;
  
  // Match string values and fix newlines inside them
  const stringPattern=/"[^"]*"/g;
  let result='';
  let lastEnd=0;
  let match;
  
  while((match=stringPattern.exec(raw))!==null){
    const str=match[0];
    if(str.includes('\n')&&!str.includes('\\n')){
      // Fix unescaped newlines
      const fixedStr='"'+str.slice(1,-1).replace(/\n/g,'\\n')+'"';
      result+=raw.slice(lastEnd,match.index)+fixedStr;
    }else{
      result+=raw.slice(lastEnd,match.index)+str;
    }
    lastEnd=match.index+str.length;
  }
  result+=raw.slice(lastEnd);
  
  try{
    data=JSON.parse(result);
    console.log('\nAggressive fix worked!');
    fs.writeFileSync(FIXED_F,JSON.stringify(data,null,2));
    console.log('Fixed file saved!');
  }catch(e2){
    console.error('Aggressive fix failed:',e2.message);
    
    // Last resort: create a minimal valid file with what we can extract
    console.log('\nCreating minimal extraction...');
    const minimal={
      timestamp:new Date().toISOString(),
      note:'Partial data due to JSON corruption',
      totalLines:raw.split('\n').length
    };
    fs.writeFileSync(FIXED_F,JSON.stringify(minimal,null,2));
    console.log('Minimal file saved.');
  }
}