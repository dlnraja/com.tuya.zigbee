#!/usr/bin/env node
'use strict';
// v5.12.0: Forum Spam Scanner — identifies all dlnraja posts that need cleanup
// Detects: hidden/flagged, consecutive, bot signatures, duplicates, system-triggered
// Run: HOMEY_EMAIL=xxx HOMEY_PASSWORD=yyy node .github/scripts/forum-scan-spam.js
// Or:  HOMEY_EMAIL=x HOMEY_PASSWORD=y node .github/scripts/forum-scan-spam.js

const fs=require('fs');
const path = require('path');

// Auto-load .env from project root
const envFile = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+)\s*$/);
    if (m && m[2] && !m[2].startsWith('#')) process.env[m[1]] = m[2];
  }
  console.log('.env loaded');
}

const { getForumAuth, refreshCsrf, fmtCk, FORUM } = require('./forum-auth');

const STATE_DIR = path.join(__dirname, '..', 'state');
const TOPICS = [140352];
const USERNAME = 'dlnraja';
const { fetchWithRetry, sleep } = require('./retry-helper');

// Patterns that indicate bot/auto-generated content
const BOT_PATTERNS = [
  /Auto-response by dlnraja/i,
  /Bot Universal Tuya/i,
  /Install test version\s*$/i,
  /Universal Tuya Zigbee v\d+\.\d+\.\d+/i,
  /already supported in.*v\d+/i,
  /fingerprint.*already.*supported/i,
  /re-pair.*device/i,
];

// Patterns for raw FP dumps (nightly processor spam)
const FP_DUMP_PATTERNS = [
  /^`_T[ZE]\d{3}_[a-z0-9]+`\s*→/m,
  /manufacturerName.*productId/i,
  /\{.*"zigbee".*"manufacturerName"/,
];

function getHeaders(auth) {
  if (auth.type === 'apikey') {
    return { 'Api-Key': auth.key, 'Api-Username': USERNAME };
  }
  return {
    'X-CSRF-Token': auth.csrf,
    'X-Requested-With': 'XMLHttpRequest',
    Cookie: fmtCk(auth.cookies)
  };
}

async function fetchAllPosts(topicId, auth) {
  const posts = [];
  let page = 0;
  const pageSize = 20;
  
  // First fetch gets topic info + first posts
  const url = `${FORUM}/t/${topicId}.json?print=true`;
  try {
    const r = await fetchWithRetry(url, { headers: getHeaders(auth) }, { retries: 2, label: 'topic' });
    if (!r.ok) {
      console.log(`  ✗ T${topicId}: HTTP ${r.status}`);
      return posts;
    }
    const data = await r.json();
    const stream = data.post_stream;
    if (!stream) return posts;
    
    // Get all post IDs
    const allIds = stream.stream || [];
    const firstPosts = stream.posts || [];
    posts.push(...firstPosts);
    
    // Fetch remaining posts in chunks of 20
    const remaining = allIds.filter(id => !firstPosts.some(p => p.id === id));
    for (let i = 0; i < remaining.length; i += pageSize) {
      const chunk = remaining.slice(i, i + pageSize);
      const chunkUrl = `${FORUM}/t/${topicId}/posts.json?post_ids[]=${chunk.join('&post_ids[]=')}`;
      try {
        await sleep(1000);
        const cr = await fetchWithRetry(chunkUrl, { headers: getHeaders(auth) }, { retries: 2, label: 'chunk' });
        if (cr.ok) {
          const cd = await cr.json();
          if (cd.post_stream?.posts) posts.push(...cd.post_stream.posts);
        }
      } catch (e) { /* skip chunk */ }
    }
  } catch (e) {
    console.log(`  ✗ T${topicId}: ${e.message}`);
  }
  
  return posts;
}

function stripHtml(html) {
  return (html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function analyzePost(post, prevPost, allMyPosts) {
  const issues = [];
  const text = stripHtml(post.cooked);
  
  // 1. Hidden/flagged by community
  if (post.hidden) {
    issues.push({
      type: 'HIDDEN',
      severity: 'critical',
      reason: `Post hidden (reason_id: ${post.hidden_reason_id || 'unknown'})`,
      action: 'delete'
    });
  }
  
  // 2. Consecutive posts (same user posting twice in a row = spam risk)
  if (prevPost && prevPost.username === USERNAME) {
    issues.push({
      type: 'CONSECUTIVE',
      severity: 'high',
      reason: `Consecutive post after #${prevPost.post_number} — should edit previous instead`,
      action: 'merge_or_delete'
    });
  }
  
  // 3. Bot signature detection
  for (const pat of BOT_PATTERNS) {
    if (pat.test(text)) {
      issues.push({
        type: 'BOT_SIGNATURE',
        severity: 'medium',
        reason: `Contains bot pattern: ${pat.source.substring(0, 40)}`,
        action: 'edit_remove_signature'
      });
      break;
    }
  }
  
  // 4. Raw FP dump (nightly processor spam)
  for (const pat of FP_DUMP_PATTERNS) {
    if (pat.test(text)) {
      issues.push({
        type: 'FP_DUMP',
        severity: 'high',
        reason: 'Raw fingerprint dump — nightly processor spam',
        action: 'delete'
      });
      break;
    }
  }
  
  // 5. Near-duplicate detection (compare to other posts in same topic)
  for (const other of allMyPosts) {
    if (other.id === post.id) continue;
    if (other.topic_id !== post.topic_id) continue;
    if (Math.abs(new Date(post.created_at) - new Date(other.created_at)) > 3600000) continue; // within 1h
    const sim = textSimilarity(text, stripHtml(other.cooked));
    if (sim > 0.7) {
      issues.push({
        type: 'DUPLICATE',
        severity: 'high',
        reason: `${Math.round(sim * 100)}% similar to #${other.post_number} (id=${other.id})`,
        action: 'delete'
      });
      break;
    }
  }
  
  // 6. Very short meaningless posts
  if (text.length < 20 && !post.hidden) {
    issues.push({
      type: 'TOO_SHORT',
      severity: 'low',
      reason: `Only ${text.length} chars: "${text.substring(0, 50)}"`,
      action: 'review'
    });
  }
  
  return issues;
}

function textSimilarity(a, b) {
  if (!a || !b) return 0;
  const wa = new Set(a.toLowerCase().split(/\s+/));
  const wb = new Set(b.toLowerCase().split(/\s+/));
  let common = 0;
  for (const w of wa) { if (wb.has(w)) common++; }
  return common / Math.max(wa.size, wb.size);
}

async function main() {
  console.log('=== Forum Spam Scanner v5.12.0 ===');
  console.log('Topics:', TOPICS.join(', '));
  
  const auth = await getForumAuth();
    if(auth&&auth.type==='session')auth=await refreshCsrf(auth);
  if (!auth) {
    console.error('❌ No auth available. Set HOMEY_EMAIL + HOMEY_PASSWORD or HOMEY_EMAIL');
    process.exit(1);
  }
  console.log('✅ Auth:', auth.type);
  
  const allMyPosts = [];
  const allIssues = [];
  const topicStats = {};
  
  for (const tid of TOPICS) {
    console.log(`\n--- Scanning T${tid} ---`);
    const posts = await fetchAllPosts(tid, auth);
    console.log(`  Fetched ${posts.length} posts`);
    
    const myPosts = posts.filter(p => p.username === USERNAME);
    console.log(`  dlnraja posts: ${myPosts.length}`);
    allMyPosts.push(...myPosts);
    
    topicStats[tid] = {
      total: posts.length,
      myPosts: myPosts.length,
      hidden: myPosts.filter(p => p.hidden).length,
    };
    
    // Analyze each of my posts
    let prevPost = null;
    for (const post of posts) {
      if (post.username === USERNAME) {
        const issues = analyzePost(post, prevPost, myPosts);
        if (issues.length > 0) {
          allIssues.push({
            topic: tid,
            postNumber: post.post_number,
            postId: post.id,
            date: post.created_at,
            hidden: !!post.hidden,
            textPreview: stripHtml(post.cooked).substring(0, 100),
            issues
          });
        }
      }
      prevPost = post;
    }
    
    await sleep(2000);
  }
  
  // Generate report
  console.log('\n\n========== SCAN RESULTS ==========');
  console.log(`Total dlnraja posts scanned: ${allMyPosts.length}`);
  console.log(`Posts with issues: ${allIssues.length}`);
  
  // Group by action
  const toDelete = allIssues.filter(p => p.issues.some(i => i.action === 'delete'));
  const toEdit = allIssues.filter(p => p.issues.some(i => i.action === 'edit_remove_signature') && !p.issues.some(i => i.action === 'delete'));
  const toMerge = allIssues.filter(p => p.issues.some(i => i.action === 'merge_or_delete') && !p.issues.some(i => i.action === 'delete'));
  const toReview = allIssues.filter(p => p.issues.every(i => i.action === 'review'));
  
  console.log(`\n🗑️  TO DELETE: ${toDelete.length}`);
  for (const p of toDelete) {
    console.log(`  T${p.topic}#${p.postNumber} (id=${p.postId}) ${p.hidden ? '[HIDDEN] ' : ''}— ${p.issues.map(i => i.reason).join('; ')}`);
    console.log(`    Preview: ${p.textPreview}`);
  }
  
  console.log(`\n✏️  TO EDIT (remove bot signature): ${toEdit.length}`);
  for (const p of toEdit) {
    console.log(`  T${p.topic}#${p.postNumber} (id=${p.postId}) — ${p.issues.map(i => i.reason).join('; ')}`);
  }
  
  console.log(`\n🔀 TO MERGE/DELETE (consecutive): ${toMerge.length}`);
  for (const p of toMerge) {
    console.log(`  T${p.topic}#${p.postNumber} (id=${p.postId}) — ${p.issues.map(i => i.reason).join('; ')}`);
  }
  
  console.log(`\n👀 TO REVIEW: ${toReview.length}`);
  for (const p of toReview) {
    console.log(`  T${p.topic}#${p.postNumber} (id=${p.postId}) — ${p.issues.map(i => i.reason).join('; ')}`);
  }
  
  // Check which posts from previous cleanup have already been processed
  const prevCleanup = new Set([
    714577, 714579, 714580, 714581, 714583, 714585,
    714588, 714589, 714591, 714592, 714593,
    714596, 714598, 714599, 714603, 714605,
    714648, 714563, 714780, 714503, 714507, 714511,
    714597, 714602, 714609, 714610,
    714499, 714659, 714607
  ]);
  const newIssues = allIssues.filter(p => !prevCleanup.has(p.postId));
  console.log(`\n📊 NEW issues (not in previous cleanup): ${newIssues.length}`);
  
  // Save scan results
  const report = {
    date: new Date().toISOString(),
    totalScanned: allMyPosts.length,
    issuesFound: allIssues.length,
    topicStats,
    toDelete: toDelete.map(p => ({ topic: p.topic, num: p.postNumber, id: p.postId, hidden: p.hidden, reasons: p.issues.map(i => i.reason) })),
    toEdit: toEdit.map(p => ({ topic: p.topic, num: p.postNumber, id: p.postId, reasons: p.issues.map(i => i.reason) })),
    toMerge: toMerge.map(p => ({ topic: p.topic, num: p.postNumber, id: p.postId, reasons: p.issues.map(i => i.reason) })),
    toReview: toReview.map(p => ({ topic: p.topic, num: p.postNumber, id: p.postId, reasons: p.issues.map(i => i.reason) })),
    newIssues: newIssues.map(p => ({ topic: p.topic, num: p.postNumber, id: p.postId, reasons: p.issues.map(i => i.reason) })),
  };
  
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(path.join(STATE_DIR, 'spam-scan-results.json'), JSON.stringify(report, null, 2));
  console.log(`\n✅ Results saved to .github/state/spam-scan-results.json`);
  
  // Generate cleanup script additions
  if (newIssues.length > 0) {
    console.log('\n=== CLEANUP SCRIPT ADDITIONS ===');
    console.log('// Add to forum-cleanup.js TO_DELETE array:');
    for (const p of toDelete.filter(x => !prevCleanup.has(x.postId))) {
      console.log(`  {id:${p.postId},num:'${p.topic}#${p.postNumber}',reason:'${p.issues[0].reason.replace(/'/g, "\\'")}'},`);
    }
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
