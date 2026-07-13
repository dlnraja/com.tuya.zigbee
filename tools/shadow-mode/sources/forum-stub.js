/**
 * sources/forum-stub.js
 *
 * Discourse API adapter for Homey community forum. Only loads if DISCOURSE_API_KEY env var is set.
 *
 * NOTE: The Homey community forum URL is `https://community.homey.app/`. This stub uses
 * Discourse v1 API: GET /categories.json, GET /c/{category}/show.json, GET /search.json
 *
 * App cible: BOTH master + stable.
 */

'use strict';

const https = require('https');

const FORUM_HOST = 'community.homey.app';
const CATEGORY_ID = 56; // 'Apps' category on Homey community (verify in production)

function pullFromForum(apiKey, options = {}) {
  return new Promise((resolve, reject) => {
    // Search for "tuya" topics in the last 30 days
    const path = `/search.json?q=tuya+zigbee+unified+in:title&category_id=${CATEGORY_ID}`;
    const req = https.request({
      hostname: FORUM_HOST,
      path,
      method: 'GET',
      headers: {
        'Api-Key': apiKey,
        'Accept': 'application/json',
        'User-Agent': 'Mavis-shadow-mode/0.1.0',
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Forum API ${res.statusCode}: ${data.substring(0, 200)}`));
        }
        try {
          const result = JSON.parse(data);
          const tickets = (result.topics || []).map((t) => ({
            id: `forum-${t.id}`,
            source: 'discourse-api',
            title: t.title,
            body: t.excerpt || '',
            mfr: extractMfr(t.title + ' ' + (t.excerpt || '')),
            deviceIds: extractDeviceIds(t.title + ' ' + (t.excerpt || '')),
            status: t.closed ? 'closed' : 'open',
            url: `https://${FORUM_HOST}/t/${t.slug}/${t.id}`,
            posts: t.posts_count,
            createdAt: t.created_at,
            lastActivityAt: t.last_activity_at,
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

module.exports = { pullFromForum };
