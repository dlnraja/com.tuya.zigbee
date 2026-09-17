#!/usr/bin/env node
'use strict';

/**
 * P2571 — Deep harvest Homey T26439 (Johan thread) → OUR app only (silent).
 * Never posts. Never touches JohanBendz repo.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..', '..');
const TOPIC = 26439;
const OUT = path.join(ROOT, 'reports', `forum-t26439-${new Date().toISOString().slice(0, 10)}`);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const MFR_RE = /_T[YZ](?:E200|E204|E284|E28[0-9A-Z]*|ZB\d{2}|Z3000|Z3002|Z3210|Z3218|ST11)[_-][A-Za-z0-9]+/gi;
const PID_RE = /\bTS\d{4}[A-Z]?\b|\bZG-[0-9A-Z]+\b/gi;
const DIAG_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'application/json',
        'Accept-Encoding': 'identity',
        Referer: 'https://community.homey.app/',
      },
    }, (res) => {
      let d = '';
      res.on('data', (c) => { d += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch (e) { reject(new Error(`${res.statusCode} ${d.slice(0, 180)}`)); }
      });
    }).on('error', reject);
  });
}

function strip(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractMedia(cooked) {
  const html = String(cooked || '');
  const images = [...html.matchAll(/<img[^>]+src="([^"]+)"/gi)].map((m) => m[1].split('?')[0]);
  const lightbox = [...html.matchAll(/data-download-href="([^"]+)"/gi)].map((m) => m[1]);
  const alts = [...html.matchAll(/alt="([^"]+)"/gi)].map((m) => m[1]).filter(Boolean);
  return {
    images: [...new Set([...images, ...lightbox])],
    alts: [...new Set(alts)],
  };
}

async function fetchPostsByIds(ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 40) {
    const chunk = ids.slice(i, i + 40);
    const q = chunk.map((id) => `post_ids[]=${id}`).join('&');
    const data = await get(`https://community.homey.app/t/${TOPIC}/posts.json?${q}`);
    out.push(...(data.post_stream?.posts || []));
    await new Promise((r) => setTimeout(r, 250));
  }
  return out;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const meta = await get(`https://community.homey.app/t/${TOPIC}.json`);
  const stream = meta.post_stream?.stream || [];
  const highest = meta.highest_post_number;
  // WHY P2571: user asked ALL messages to tip — full stream, not last-200 only.
  // Optional: P2571_MAX_POSTS=N to cap (default = entire stream).
  const maxPosts = Number(process.env.P2571_MAX_POSTS || 0);
  const window = maxPosts > 0 ? stream.slice(-maxPosts) : stream.slice();
  console.log(`[P2571] T26439 highest=#${highest} stream=${stream.length} harvest=${window.length}`);

  const posts = await fetchPostsByIds(window);
  const rows = [];
  const couples = new Map();
  const images = [];

  for (const p of posts) {
    const text = strip(p.cooked);
    const media = extractMedia(p.cooked);
    const mfrs = [...new Set((text.match(MFR_RE) || []).map((x) => x.trim()))];
    const pids = [...new Set((text.match(PID_RE) || []).map((x) => x.toUpperCase()))];
    const diags = [...new Set((text.match(DIAG_RE) || []).map((x) => x.toLowerCase()))];
    const row = {
      n: p.post_number,
      user: p.username,
      created: p.created_at,
      mfrs,
      pids,
      diags,
      images: media.images,
      alts: media.alts,
      text: text.slice(0, 1200),
    };
    rows.push(row);
    for (const img of media.images) {
      images.push({ n: p.post_number, user: p.username, url: img, alts: media.alts });
    }
    for (const m of mfrs) {
      for (const pid of pids) {
        if (/ABC123|XXXX|placeholder|000000/i.test(m)) continue;
        const key = `${m.toLowerCase()}|${pid}`;
        const cur = couples.get(key) || { mfr: m, pid, posts: [], users: new Set() };
        cur.posts.push(p.post_number);
        cur.users.add(p.username);
        couples.set(key, cur);
      }
    }
  }

  const coupleList = [...couples.values()].map((c) => ({
    mfr: c.mfr,
    pid: c.pid,
    posts: [...new Set(c.posts)].sort((a, b) => b - a),
    users: [...c.users],
  })).sort((a, b) => b.posts.length - a.posts.length);

  const report = {
    id: 'P2571-t26439-deep-harvest',
    topic: TOPIC,
    url: 'https://community.homey.app/t/app-pro-tuya-zigbee-app/26439',
    highest,
    harvestedPosts: rows.length,
    coupleCount: coupleList.length,
    imageCount: images.length,
    policy: {
      targetApp: 'com.dlnraja.tuya.zigbee',
      notJohanRepo: true,
      forumPost: false,
      complementaryOnly: true,
      neverInventPid: true,
    },
    latest: rows.slice(-20).map((r) => ({
      n: r.n, user: r.user, mfrs: r.mfrs, pids: r.pids, imgs: r.images.length, text: r.text.slice(0, 220),
    })),
    couples: coupleList.slice(0, 400),
    images: images.slice(0, 500),
  };

  fs.writeFileSync(path.join(OUT, 'HARVEST.json'), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT, 'POSTS.json'), `${JSON.stringify(rows, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT, 'NEED_ACTION.md'), [
    `# T26439 deep harvest → OUR app (P2571)`,
    '',
    `Silent only. Highest **#${highest}**. Couples: **${coupleList.length}**. Images: **${images.length}**.`,
    '',
    '## Latest posts',
    ...report.latest.map((r) => `- #${r.n} @${r.user} mfr=${r.mfrs.join(',')||'—'} pid=${r.pids.join(',')||'—'} imgs=${r.imgs}`),
    '',
    '## Top couples (by recurrence)',
    ...coupleList.slice(0, 40).map((c) => `- \`${c.mfr}\`+\`${c.pid}\` posts=${c.posts.slice(0, 5).join(',')} users=${c.users.join(',')}`),
    '',
  ].join('\n'));

  console.log(`[P2571] wrote ${OUT}`);
  console.log(`[P2571] couples=${coupleList.length} images=${images.length}`);
  console.log('[P2571] latest:', report.latest.map((r) => `#${r.n}@${r.user}`).join(' '));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
