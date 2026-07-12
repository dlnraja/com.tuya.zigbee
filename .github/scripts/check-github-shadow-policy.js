#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');
const policy=require('./github-shadow-policy');

const ROOT=path.join(__dirname,'..');
const WORKFLOWS=path.join(ROOT,'workflows');
const GUARDED_SCRIPTS=[
  'triage-run.js',
  'triage-upstream-enhanced.js',
  'github-issue-manager.js',
  'nightly-processor.js',
  'monthly-comprehensive.js',
  'diagnostic-auto-resolver.js',
];
const ACTIVE_CALLS=[
  'triage-run.js',
  'triage-upstream-enhanced.js',
  'github-issue-manager.js',
  'nightly-processor.js',
  'monthly-comprehensive.js',
  'diagnostic-auto-resolver.js',
  'batch-close-upstream.js',
];

const read=file=>fs.readFileSync(file,'utf8');
const failures=[];
const check=(condition,message)=>{if(!condition)failures.push(message)};

for(const script of GUARDED_SCRIPTS){
  const source=read(path.join(__dirname,script));
  check(source.includes("require('./github-shadow-policy')")||source.includes('require("./github-shadow-policy")'),`${script} does not import the central shadow guard`);
}

const deprecated=read(path.join(__dirname,'batch-close-upstream.js'));
check(!/\b(issue|pr)\s+(comment|close|edit|merge|review)\b/i.test(deprecated),'batch-close-upstream contains a mutating gh command');
check(!/-X\s+(POST|PATCH|PUT|DELETE)/i.test(deprecated),'batch-close-upstream contains a mutating API verb');

const workflowFiles=fs.readdirSync(WORKFLOWS).filter(file=>/\.ya?ml$/i.test(file));
for(const file of workflowFiles){
  const source=read(path.join(WORKFLOWS,file));
  const callsProtectedScript=ACTIVE_CALLS.some(script=>source.includes(script));
  const scansUpstream=source.includes('JohanBendz/com.tuya.zigbee')||source.includes('diagnostic-auto-resolver.js');
  if(callsProtectedScript&&scansUpstream&&file!=='delete-own-upstream-comments.yml'){
    check(source.includes('READ_ONLY_SHADOW: "true"'),`${file} calls an upstream-capable script without READ_ONLY_SHADOW`);
  }
}

const cleanup=read(path.join(WORKFLOWS,'delete-own-upstream-comments.yml'));
const triggerBlock=cleanup.slice(cleanup.indexOf('\non:'),cleanup.indexOf('\npermissions:'));
check(triggerBlock.includes('workflow_dispatch:'),'cleanup workflow is not manual');
check(!/^\s+(push|pull_request|schedule|issues|issue_comment):/m.test(triggerBlock),'cleanup workflow has an automatic trigger');
check(cleanup.includes("inputs.confirmation == 'DELETE MY JOHAN COMMENTS'"),'cleanup workflow lacks exact confirmation');
check(cleanup.includes("comment.user?.login !== OWNER"),'cleanup workflow does not verify author before DELETE');
check(cleanup.includes('issues.deleteComment'),'cleanup workflow does not cover issue/PR conversation comments');
check(cleanup.includes('pulls.deleteReviewComment'),'cleanup workflow does not cover PR inline review comments');
check(cleanup.includes('secrets.GH_PAT'),'cleanup workflow does not use GH_PAT');
check(!cleanup.includes('secrets.GITHUB_TOKEN'),'cleanup workflow must not use GITHUB_TOKEN');
const stale=read(path.join(WORKFLOWS,'stale.yml'));
check(/days-before-close:\s*-1\b/.test(stale),'stale workflow must never auto-close issues or PRs');

assert.strictEqual(policy.apiMutationAllowed('/repos/JohanBendz/com.tuya.zigbee/issues/1/comments','POST',{body:'x'}),false);
assert.strictEqual(policy.apiMutationAllowed('/repos/JohanBendz/com.tuya.zigbee/issues/1/labels','POST',{labels:['x']}),false);
assert.strictEqual(policy.apiMutationAllowed('/repos/JohanBendz/com.tuya.zigbee/pulls/1/reviews','POST',{event:'COMMENT'}),false);
assert.strictEqual(policy.apiMutationAllowed('/repos/JohanBendz/com.tuya.zigbee/pulls/1/merge','PUT',{}),false);
assert.strictEqual(policy.apiMutationAllowed('/repos/dlnraja/com.tuya.zigbee/issues/1','PATCH',{state:'closed'}),false);
assert.strictEqual(policy.apiMutationAllowed('/repos/dlnraja/com.tuya.zigbee/pulls/1/merge','PUT',{}),true);
assert.strictEqual(policy.apiMutationAllowed('/repos/dlnraja/com.tuya.zigbee/issues/1/comments','POST',{body:'x'}),true);

if(failures.length){
  console.error(failures.map(message=>`- ${message}`).join('\n'));
  process.exit(1);
}
console.log(`Shadow policy OK: ${GUARDED_SCRIPTS.length} scripts and ${workflowFiles.length} workflows checked.`);
