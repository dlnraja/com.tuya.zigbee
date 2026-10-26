'use strict';
/**
 * Forum part of the history sweep: walks each tracked Discourse topic from post 1 in small
 * chunks (public JSON, no login, no AI) and records only structured findings
 * (post number, author handle, link, identities, coverage). Never stores post text (C1/C5).
 */
const https = require('https');
const { extract, stripHtml, classify } = require('./sweep-identity');

const HOST = 'community.homey.app';

function getJsonOnce(pathname) {
  return new Promise((resolve) => {
    const req = https.request({ hostname: HOST, path: pathname, method: 'GET', headers: { 'User-Agent': 'dlnraja-sweep', Accept: 'application/json' } }, (res) => {
      let b = '';
      // P2870: settle on aborted/closed bodies too (no 'end' event) — see advance-sweep ghGetOnce.
      res.on('aborted', () => resolve({ error: true, status: 'net' }));
      res.on('error', () => resolve({ error: true, status: 'net' }));
      res.on('close', () => { if (!res.complete) resolve({ error: true, status: 'net' }); });
      res.on('data', (c) => { b += c; if (b.length > 8e6) req.destroy(); });
      res.on('end', () => {
        if (res.statusCode === 429 || res.statusCode === 403) return resolve({ rateLimited: true, status: res.statusCode });
        if (res.statusCode >= 400) return resolve({ error: true, status: res.statusCode });
        try { resolve(JSON.parse(b)); } catch { resolve({ error: true, status: 'parse' }); }
      });
    });
    req.on('error', () => resolve({ error: true, status: 'net' }));
    req.on('close', () => resolve({ error: true, status: 'net' })); // no-op once settled
    req.setTimeout(20000, () => req.destroy(new Error('timeout')));
    req.end();
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * WHY(P2870): a single dropped socket ("net") on the topic JSON skipped a whole topic for the
 * day (2026-10-19 local run: 140352 + 146735 scanned 0). Retry transient network / 5xx / parse
 * failures twice with a short backoff; 403/429 stay a clean rate-limit stop, 4xx stays an error.
 */
async function getJson(pathname, { retries = 2, backoffMs = 2500 } = {}) {
  let r = await getJsonOnce(pathname);
  for (let i = 0; i < retries && r && r.error && (r.status === 'net' || r.status === 'parse' || Number(r.status) >= 500); i++) {
    await sleep(backoffMs * (i + 1));
    r = await getJsonOnce(pathname);
  }
  return r;
}

function countImages(cooked) {
  const imgs = String(cooked || '').match(/<img [^>]*>/g) || [];
  return imgs.filter((t) => !/class="emoji|avatar/.test(t)).length;
}

/** Advance one topic by up to `chunk` posts. Mutates thread state; returns new items + stats. */
async function advanceTopic(tid, st, chunk, { delayMs = 900 } = {}) {
  const topic = await getJson(`/t/${tid}.json`);
  if (topic.rateLimited) return { rateLimited: true, items: [], scanned: 0 };
  if (topic.error || !topic.post_stream) return { error: topic.status || 'no-stream', items: [], scanned: 0 };
  const stream = topic.post_stream.stream || [];
  st.lastPost = Math.max(st.lastPost || 0, topic.highest_post_number || 0);
  const sweptId = Number(st.sweptId || 0);
  const todo = stream.filter((id) => id > sweptId).slice(0, chunk);
  const items = []; let scanned = 0; let noAction = 0; let maxNum = st.sweptTo || 0;
  for (let i = 0; i < todo.length; i += 20) {
    const ids = todo.slice(i, i + 20);
    await sleep(delayMs);
    const q = ids.map((id) => `post_ids[]=${id}`).join('&');
    const r = await getJson(`/t/${tid}/posts.json?${q}`);
    // P2870: keep sweptTo in step with sweptId when a later batch fails mid-chunk.
    if (r.rateLimited) { st.sweptTo = maxNum; return { rateLimited: true, items, scanned, noAction }; }
    if (r.error || !r.post_stream) { st.sweptTo = maxNum; return { error: r.status, items, scanned, noAction }; }
    const posts = (r.post_stream.posts || []).sort((a, b) => a.id - b.id);
    for (const p of posts) {
      scanned++;
      const ids2 = extract(stripHtml(p.cooked));
      const imgs = countImages(p.cooked);
      let c = classify(ids2);
      // Maintainer announcements are not user requests; keep only real coverage gaps.
      if (/^dlnraja$/i.test(p.username) && c.status !== 'pending') c = { ...c, status: 'no-action' };
      if (c.status === 'no-action' && !imgs) noAction++;
      else if (c.status !== 'no-action' || imgs) {
        items.push({
          id: `forum:${tid}#${p.post_number}`,
          status: c.status,
          author: p.username,
          link: `https://${HOST}/t/${tid}/${p.post_number}`,
          mfrs: ids2.mfrs, pids: ids2.pids,
          missing: c.cov.missing.length ? c.cov.missing : undefined,
          images: imgs || undefined,
          why: c.why,
        });
      } else noAction++;
      maxNum = Math.max(maxNum, p.post_number);
      st.sweptId = Math.max(Number(st.sweptId || 0), p.id);
    }
  }
  st.sweptTo = maxNum;
  st.status = (stream.length && Number(st.sweptId) >= stream[stream.length - 1]) ? 'caught-up' : 'in-progress';
  st.sweptAt = new Date().toISOString();
  return { items, scanned, noAction };
}

module.exports = { advanceTopic, getJson };
