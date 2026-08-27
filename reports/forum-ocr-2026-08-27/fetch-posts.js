'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const OUT = __dirname;
const TARGETS = [
  { topic: 140352, n: 2203 },
  { topic: 140352, n: 2202 },
  { topic: 140352, n: 2193 },
  { topic: 156967, n: 58 },
  { topic: 156967, n: 56 },
  { topic: 158757, n: 1 },
  { topic: 140352, n: 2199 },
  { topic: 26439, n: 5493 },
  { topic: 150690, n: 30 },
  { topic: 150690, n: 28 },
  { topic: 146667, n: 25 },
];

function get(url) {
  return new Promise((res, rej) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } }, (r) => {
        let d = '';
        r.on('data', (c) => {
          d += c;
        });
        r.on('end', () => {
          try {
            res(JSON.parse(d));
          } catch (e) {
            rej(new Error(`${url} parse fail: ${d.slice(0, 200)}`));
          }
        });
      })
      .on('error', rej);
  });
}

function dl(url, file) {
  return new Promise((res, rej) => {
    const f = fs.createWriteStream(file);
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
        if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
          r.resume();
          return dl(r.headers.location, file).then(res, rej);
        }
        r.pipe(f);
        f.on('finish', () => {
          f.close();
          res(file);
        });
      })
      .on('error', rej);
  });
}

function extractImgs(html) {
  const urls = [...String(html || '').matchAll(/src="(https?:\/\/[^"]+)"/gi)].map((m) => m[1].split('?')[0]);
  return [...new Set(urls)].filter((u) => /uploads|secure-media|original|optimized|discourse-cdn/i.test(u) && !/letter\//i.test(u) && !/avatar/i.test(u));
}

(async () => {
  const byTopic = new Map();
  for (const t of TARGETS) {
    if (!byTopic.has(t.topic)) byTopic.set(t.topic, new Set());
    byTopic.get(t.topic).add(t.n);
  }

  const summary = [];
  for (const [tid, wanted] of byTopic) {
    const meta = await get(`https://community.homey.app/t/${tid}.json`);
    const highest = meta.highest_post_number || meta.posts_count;
    // Fetch enough pages to cover wanted posts
    const pagesNeeded = new Set();
    for (const n of wanted) {
      pagesNeeded.add(Math.max(1, n - 2));
    }
    pagesNeeded.add(Math.max(1, highest - 10));
    const seen = new Map();
    for (const start of pagesNeeded) {
      const page = await get(`https://community.homey.app/t/${tid}/${start}.json`);
      for (const post of (page.post_stream && page.post_stream.posts) || []) {
        seen.set(post.post_number, post);
      }
    }
    for (const n of wanted) {
      const post = seen.get(n);
      if (!post) {
        summary.push({ topic: tid, post: n, error: 'not found' });
        continue;
      }
      const imgs = extractImgs(post.cooked);
      const text = String(post.cooked || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const entry = {
        topic: tid,
        post: post.post_number,
        user: post.username,
        at: post.created_at,
        text: text.slice(0, 2000),
        images: [],
      };
      let i = 0;
      for (const url of imgs.slice(0, 5)) {
        const ext = (url.match(/\.(jpe?g|png|webp|gif)/i) || ['.jpg'])[0];
        const file = path.join(OUT, `T${tid}_${post.post_number}_${i}${ext}`);
        try {
          await dl(url, file);
          entry.images.push(file);
          i += 1;
        } catch (e) {
          entry.images.push(`FAIL:${e.message}`);
        }
      }
      summary.push(entry);
      console.log(`T${tid}#${post.post_number} @${post.username} imgs=${entry.images.length}`);
    }
  }
  fs.writeFileSync(path.join(OUT, 'posts.json'), `${JSON.stringify(summary, null, 2)}\n`);
  console.log('wrote', summary.length, 'posts');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
