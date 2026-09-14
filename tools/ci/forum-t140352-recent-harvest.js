'use strict';
/**
 * WHY (P215): Live T140352 harvest — Discourse `/t/{id}/{N}.json` is post_number, not page.
 * Contre quoi: wrong page math pulls #107 era and misses #2200+ NEED_ACTION.
 * Silent only — never forum POST.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const OUT = path.join(ROOT, 'reports', 'forum-l99-2026-09-14-t140352');
const TOPIC = 140352;
const RECENT = 40;

function get(urlPath) {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: 'community.homey.app',
      path: urlPath,
      headers: { 'User-Agent': UA, Accept: 'application/json', 'Accept-Encoding': 'identity' },
    }, (res) => {
      let d = '';
      res.on('data', (c) => { d += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch (e) { reject(new Error(`${urlPath}: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

function stripHtml(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractImgs(html) {
  const out = [];
  const re = /(?:src|data-src|href)="(https:\/\/[^"]+)"/g;
  let m;
  while ((m = re.exec(html || ''))) {
    const u = m[1];
    if (/emoji|avatar|lazy|svg/i.test(u)) continue;
    if (!/discourse-cdn|uploads\/athom/i.test(u)) continue;
    out.push(u.replace(/_2_\d+x\d+/, '').replace(/\/optimized\//, '/original/'));
  }
  return [...new Set(out)];
}

function extractLinks(html) {
  return [...new Set(String(html || '').match(/https?:\/\/[^\s"'<>]+/g) || [])]
    .filter((u) => !/emoji|avatar|discourse-cdn\.com\/flex025\/user_avatar/i.test(u))
    .slice(0, 20);
}

function mapPost(p) {
  return {
    n: p.post_number,
    id: p.id,
    user: p.username,
    created: p.created_at,
    images: extractImgs(p.cooked),
    text: stripHtml(p.cooked).slice(0, 900),
    links: extractLinks(p.cooked),
  };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const t = await get(`/t/${TOPIC}.json`);
  const highest = t.highest_post_number;
  const stream = t.post_stream?.stream || [];
  // Fetch by jumping to highest post_number slug (Discourse loads a window around it)
  const around = await get(`/t/${TOPIC}/${highest}.json`);
  let posts = (around.post_stream?.posts || []).map(mapPost);

  // Backfill older recent posts via posts.json chunks from stream tail
  const needFrom = Math.max(1, highest - RECENT + 1);
  const have = new Set(posts.map((p) => p.n));
  const missingNums = [];
  for (let n = needFrom; n <= highest; n++) {
    if (!have.has(n)) missingNums.push(n);
  }

  // Map post_number → stream id from topic JSON is incomplete; use chunked posts.json on stream tail
  const tailIds = stream.slice(-Math.min(stream.length, RECENT + 10));
  for (let i = 0; i < tailIds.length; i += 20) {
    const chunk = tailIds.slice(i, i + 20);
    const qs = chunk.map((id) => `post_ids[]=${id}`).join('&');
    const batch = await get(`/t/${TOPIC}/posts.json?${qs}`);
    const batchPosts = batch.post_stream?.posts || batch.posts || [];
    for (const p of batchPosts) {
      const m = mapPost(p);
      if (m.n >= needFrom && !have.has(m.n)) {
        posts.push(m);
        have.add(m.n);
      }
    }
  }

  posts = posts.filter((p) => p.n >= needFrom).sort((a, b) => a.n - b.n);

  const summary = {
    title: t.title,
    highest,
    harvested: posts.length,
    needFrom,
    generated: new Date().toISOString(),
    posts,
  };
  fs.writeFileSync(path.join(OUT, 'LAST_PAGE.json'), JSON.stringify(summary, null, 2));

  const allImgs = [];
  const allLinks = [];
  let md = `# T140352 live harvest ${summary.generated}\n\n`;
  md += `Highest **#${highest}** · posts **#${needFrom}–#${highest}** (${posts.length}) · silent only · never invent pid\n\n`;
  for (const p of posts) {
    md += `## #${p.n} @${p.user}\n${p.text}\n`;
    if (p.images.length) {
      md += `- images (${p.images.length}):\n  - ${p.images.slice(0, 8).join('\n  - ')}\n`;
      allImgs.push(...p.images.map((u) => ({ n: p.n, user: p.user, u })));
    }
    if (p.links.length) {
      md += `- links: ${p.links.slice(0, 10).join(' | ')}\n`;
      allLinks.push(...p.links.map((u) => ({ n: p.n, user: p.user, u })));
    }
    md += '\n';
  }

  const hostCount = {};
  for (const { u } of allLinks) {
    try {
      const h = new URL(u).hostname;
      hostCount[h] = (hostCount[h] || 0) + 1;
    } catch (_) { /* ignore */ }
  }
  md += `## URL hosts (recent window)\n\`\`\`json\n${JSON.stringify(hostCount, null, 2)}\n\`\`\`\n`;
  md += `\n## Image count: ${allImgs.length}\n`;

  fs.writeFileSync(path.join(OUT, 'FLEET_L99.md'), md);
  fs.writeFileSync(path.join(OUT, 'IMAGES.json'), JSON.stringify(allImgs, null, 2));
  fs.writeFileSync(path.join(OUT, 'LINKS.json'), JSON.stringify(allLinks, null, 2));

  console.log('highest', highest, 'posts', posts.length, 'imgs', allImgs.length);
  console.log(posts.map((p) => `#${p.n}@${p.user}`).join(' '));
  console.log('wrote', OUT);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
