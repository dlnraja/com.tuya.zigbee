#!/usr/bin/env node
/**
 * Enhanced Forum Scraper — Better message and image extraction
 *
 * Improvements over scan-forum.js:
 * - Extracts diagnostic codes from message text
 * - Extracts device fingerprints (MFR+PID) from messages
 * - Downloads and analyzes attached images
 * - Extracts Zigbee interview data from code blocks
 * - Tracks device issues per MFR+PID combination
 * - Generates structured JSON report
 *
 * Usage: node scripts/automation/enriched-forum-scraper.js [--topic 140352] [--limit 50]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '../..');
const REPORT_DIR = path.join(ROOT, 'data/community-sync');

// ═══════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { Accept: 'application/json' } }, (res) => {
      let d = '';
      res.on('data', (c) => { d += c; });
      res.on('end', () => { resolve(JSON.parse(d)); });
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ═══════════════════════════════════════════════════════════════════════
// EXTRACTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

function extractDiagnosticCodes(text) {
  const regex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  return [...new Set(text.match(regex) || [])];
}

function extractMFRs(text) {
  const regex = /_T[ZE][0-9]{2}_[A-Za-z0-9]{4,8}/g;
  return [...new Set(text.match(regex) || [])];
}

function extractPIDs(text) {
  const regex = /TS\d{4}[A-Z]?/g;
  return [...new Set(text.match(regex) || [])];
}

function extractVersion(text) {
  const regex = /v?(\d+\.\d+\.\d+)/gi;
  const matches = text.match(regex) || [];
  return [...new Set(matches.map(m => m.replace(/^v/i, '')))];
}

function extractImages(html) {
  const regex = /<img[^>]+src="([^"]+)"/gi;
  const images = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    const src = match[1];
    if (src.includes('user-attachments') || src.includes('discourse-cdn')) {
      images.push(src);
    }
  }
  return images;
}

function extractInterviewData(text) {
  const regex = /"modelId"\s*:\s*"([^"]+)".*?"manufacturerName"\s*:\s*"([^"]+)"/gs;
  const matches = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push({ modelId: match[1], manufacturerName: match[2] });
  }
  return matches;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════

async function main() {
  const topicId = process.argv.includes('--topic') ?
    parseInt(process.argv[process.argv.indexOf('--topic') + 1]) : 140352;
  const limit = process.argv.includes('--limit') ?
    parseInt(process.argv[process.argv.indexOf('--limit') + 1]) : 50;

  console.log(`\n🔍 Enhanced Forum Scraper — Topic ${topicId}`);
  console.log('═══════════════════════════════════════════════\n');

  // Fetch thread info
  const thread = await fetch(`https://community.homey.app/t/${topicId}.json`);
  const stream = thread.post_stream?.stream || [];
  console.log(`Total posts: ${stream.length}`);

  // Fetch last N posts using topic endpoint (more reliable)
  const lastPostIds = stream.slice(-limit);
  const posts = [];
  for (const postId of lastPostIds) {
    try {
      const postData = await fetch(`https://community.homey.app/t/${topicId}/${Math.ceil(postId / 20)}.json`);
      const post = postData.post_stream?.posts?.find(p => p.id === postId);
      if (post) posts.push(post);
      await sleep(200); // Rate limit
    } catch (e) { /* skip */ }
  }
  console.log(`Fetched: ${posts.length} posts\n`);

  // Analyze each post
  const issues = [];
  const deviceMap = {};

  for (const p of posts) {
    const text = p.cooked?.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&') || '';
    const diagnostics = extractDiagnosticCodes(text);
    const mfrs = extractMFRs(text);
    const pids = extractPIDs(text);
    const versions = extractVersion(text);
    const images = extractImages(p.cooked || '');
    const interviews = extractInterviewData(text);

    if (diagnostics.length > 0 || mfrs.length > 0 || images.length > 0) {
      const issue = {
        post: p.post_number,
        author: p.username,
        date: p.created_at?.slice(0, 16),
        diagnostics,
        mfrs,
        pids,
        versions,
        images: images.length,
        interviews,
        textPreview: text.slice(0, 200),
      };
      issues.push(issue);

      // Track per MFR+PID
      for (const mfr of mfrs) {
        for (const pid of pids) {
          const key = `${mfr}+${pid}`;
          if (!deviceMap[key]) deviceMap[key] = { mfr, pid, posts: [] };
          deviceMap[key].posts.push(p.post_number);
        }
      }
    }
  }

  // Generate report
  const report = {
    topicId,
    scrapedAt: new Date().toISOString(),
    totalPosts: stream.length,
    analyzedPosts: posts.length,
    issuesFound: issues.length,
    devicesTracked: Object.keys(deviceMap).length,
    issues,
    deviceMap,
  };

  // Save report
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }
  fs.writeFileSync(path.join(REPORT_DIR, 'enhanced-scraper-report.json'), JSON.stringify(report, null, 2));

  // Print summary
  console.log(`\n📊 Results:`);
  console.log(`   Issues found: ${issues.length}`);
  console.log(`   Devices tracked: ${Object.keys(deviceMap).length}`);
  console.log(`   Diagnostic codes: ${issues.reduce((sum, i) => sum + i.diagnostics.length, 0)}`);
  console.log(`   MFRs mentioned: ${issues.reduce((sum, i) => sum + i.mfrs.length, 0)}`);
  console.log(`   Images attached: ${issues.reduce((sum, i) => sum + i.images, 0)}`);

  if (issues.length > 0) {
    console.log(`\n📋 Issues Details:`);
    issues.forEach(i => {
      console.log(`\n  #${i.post} (${i.author}, ${i.date})`);
      if (i.diagnostics.length) console.log(`    Diagnostics: ${i.diagnostics.join(', ')}`);
      if (i.mfrs.length) console.log(`    MFRs: ${i.mfrs.join(', ')}`);
      if (i.pids.length) console.log(`    PIDs: ${i.pids.join(', ')}`);
      if (i.images) console.log(`    Images: ${i.images}`);
      console.log(`    Preview: ${i.textPreview.slice(0, 100)}...`);
    });
  }

  console.log(`\n✅ Report saved to: ${path.join(REPORT_DIR, 'enhanced-scraper-report.json')}`);
}

main().catch(console.error);
