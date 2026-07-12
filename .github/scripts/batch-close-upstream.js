#!/usr/bin/env node
'use strict';

// Deprecated intentionally: upstream is a read-only evidence source.
// Keep this command as a harmless scanner so old/manual invocations cannot close anything.
const {execSync}=require('child_process');
const {PROTECTED_UPSTREAM}=require('./github-shadow-policy');

function ghRead(command){
  try{return execSync(`gh ${command}`,{encoding:'utf8',maxBuffer:10*1024*1024}).trim()}
  catch{return null}
}

function main(){
  const result=ghRead(`api "repos/${PROTECTED_UPSTREAM}/issues?state=open&per_page=1" --jq "length"`);
  console.log('[SHADOW] batch-close-upstream is permanently read-only.');
  console.log('[SHADOW] Upstream scan reachable:',result!==null?'yes':'no');
  console.log('[SHADOW] No comments, labels, reviews, state changes, merges, or deletes were attempted.');
}

main();
