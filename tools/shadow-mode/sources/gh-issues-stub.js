/**
 * sources/gh-issues-stub.js
 *
 * GitHub API adapter. Only loads if GITHUB_TOKEN env var is set.
 * Uses `gh` CLI if available, otherwise falls back to fetch() with the token.
 *
 * Returns open issues + open PRs for dlnraja/com.tuya.zigbee.
 *
 * App cible: BOTH master + stable.
 */

'use strict';

const https = require('https');

const REPO = 'dlnraja/com.tuya.zigbee';

function pullFromGhIssues(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${REPO}/issues?state=open&per_page=50`,
      method: 'GET',
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'Mavis-shadow-mode/0.1.0',
        'Accept': 'application/vnd.github.v3+json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`GitHub API ${res.statusCode}: ${data.substring(0, 200)}`));
        }
        try {
          const issues = JSON.parse(data);
          const tickets = issues.map((i) => ({
            id: `gh-${i.number}`,
            source: 'github-api',
            title: i.title,
            body: i.body || '',
            mfr: extractMfr(i.title + ' ' + (i.body || '')),
            deviceIds: extractDeviceIds(i.title + ' ' + (i.body || '')),
            status: i.state,
            url: i.html_url,
            labels: (i.labels || []).map((l) => l.name),
            createdAt: i.created_at,
            updatedAt: i.updated_at,
          }));
          resolve(tickets);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function extractMfr(text) {
  const m = text.match(/_(TZ\d|TZE\d|TYZB\d|TYST\d|Z[A-Z]{2})_[a-zA-Z0-9]+/);
  return m ? m[0] : null;
}

function extractDeviceIds(text) {
  const matches = text.match(/TS\d{4}[a-zA-Z]?/g);
  return matches ? [...new Set(matches)] : [];
}

module.exports = { pullFromGhIssues };
