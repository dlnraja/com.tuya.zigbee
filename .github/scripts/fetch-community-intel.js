#!/usr/bin/env node
'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');

const opts = {
  headers: {
    'User-Agent': 'Node.js',
    'Accept': 'application/vnd.github.v3+json',
    'Cache-Control': 'no-cache'
  }
};

if (process.env.GH_TOKEN) {
  opts.headers['Authorization'] = `token ${process.env.GH_TOKEN}`;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, opts, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch(e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function getComments(commentsUrl) {
  if (!commentsUrl) return [];
  const comments = await fetchJson(commentsUrl);
  if (Array.isArray(comments)) {
    return comments.map(c => `**Comment by ${c.user.login}**:\n${c.body}`).join('\n\n---\n');
  }
  return '';
}

async function main() {
  console.log('Fetching community intelligence from GitHub...');
  try {
    const dataJohan = await fetchJson('https://api.github.com/search/issues?q=mentions:dlnraja+is:open+repo:JohanBendz/com.tuya.zigbee&sort=updated&order=desc');
    const dataDlnraja = await fetchJson('https://api.github.com/search/issues?q=is:open+repo:dlnraja/com.tuya.zigbee&sort=updated&order=desc');
    
    const johanItems = (dataJohan.items || []).slice(0, 10);
    const dlnrajaItems = (dataDlnraja.items || []).slice(0, 10);
    
    const allItemsMap = new Map();
    for (const item of johanItems) allItemsMap.set(item.html_url, item);
    for (const item of dlnrajaItems) allItemsMap.set(item.html_url, item);
    
    const all = Array.from(allItemsMap.values());
    let out = '# Latest Issues and PRs (Including Comments)\n\n';
    
    for (const item of all) {
      console.log(`Processing: ${item.title}`);
      out += `## [${item.repository_url.split('/').slice(-2).join('/')}] Issue #${item.number}: ${item.title}\n`;
      out += `**Author:** ${item.user.login} | **State:** ${item.state} | **Created:** ${item.created_at} | **Updated:** ${item.updated_at}\n`;
      out += `**URL:** ${item.html_url}\n\n`;
      out += `### Body:\n${item.body}\n\n`;
      
      if (item.comments > 0) {
        console.log(`Fetching ${item.comments} comments for issue #${item.number}...`);
        const commentsText = await getComments(item.comments_url);
        out += `### Comments:\n${commentsText}\n\n`;
      } else {
        out += `### Comments:\nNone.\n\n`;
      }
      out += `========================================================================\n\n`;
    }
    
    const stateDir = path.join(__dirname, '..', 'state');
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }
    fs.writeFileSync(path.join(stateDir, 'community_intel.md'), out);
    console.log(`Intelligence saved to .github/state/community_intel.md`);
  } catch (err) {
    console.error('Error fetching intelligence:', err);
    process.exit(1);
  }
}

main();
