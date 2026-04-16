#!/usr/bin/env node
const https = require('https');
const REPOS = ['dlnraja/com.tuya.zigbee', 'JohanBendz/com.tuya.zigbee'];

function fetchIssues(repo) {
  return new Promise((resolve) => {
    const opts = {hostname:'api.github.com', path:`/repos/${repo}/issues?state=open&per_page=50`,
      headers:{'User-Agent':'CommunitySync'}};
    https.get(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch(e) { resolve([]); }
      });
    }).on('error', () => resolve([]));
  });
}

module.exports = async () => {
  const results = {issues: [], prs: [], deviceRequests: []};
  for (const repo of REPOS) {
    const issues = await fetchIssues(repo);
    issues.forEach(i => {
      const mfrs = (i.body || '').match(/_TZ[A-Z0-9]{4}_[a-z0-9]{8}/g) || [];
      if (mfrs.length) results.deviceRequests.push({repo, num: i.number, title: i.title, mfrs});
      if (i.pull_request) results.prs.push({repo, num: i.number});
      else results.issues.push({repo, num: i.number});
    });
  }
  return {issueCount: results.issues.length, prCount: results.prs.length, 
    deviceRequests: results.deviceRequests.slice(0,20)};
};
