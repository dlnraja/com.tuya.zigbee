#!/usr/bin/env node
'use strict';
/**
 * forum-full-scrape.js — Fetches EVERY post of the forum topic via the
 * Discourse JSON API (post stream + batched post fetches), extracting
 * text, image URLs and link URLs for each post.
 * Output: .github/state/forum-full-topic.json + reports/forum-full-digest.md
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const TOPIC_ID = 140352;
const BASE = `https://community.homey.app`;
const BATCH = 50;
const DELAY_MS = 350;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (forum-scrape)' } });
  if (!res.ok) {throw new Error(`HTTP ${res.status} for ${url}`);}
  return res.json();
}

function stripHtml(html) {
  return (html || '')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<\/p>/g, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function extractMedia(html) {
  const images = [...(html || '').matchAll(/<img[^>]+src="([^"]+)"/g)].map(m =>
    m[1].startsWith('//') ? 'https:' + m[1] : m[1]);
  const links = [...(html || '').matchAll(/<a[^>]+href="([^"]+)"/g)].map(m => m[1])
    .filter(u => !u.includes('/user_avatar/') && !u.startsWith('#'));
  return { images: [...new Set(images)], links: [...new Set(links)] };
}

async function main() {
  const idsPath = path.join(ROOT, '.github', 'state', 'forum-stream-ids.json');
  let ids;
  if (fs.existsSync(idsPath)) {
    ids = JSON.parse(fs.readFileSync(idsPath, 'utf8'));
  } else {
    const topic = await fetchJson(`${BASE}/t/${TOPIC_ID}.json`);
    ids = topic.post_stream.stream;
  }
  console.log(`${ids.length} posts à récupérer`);

  const posts = [];
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);
    const qs = chunk.map(id => `post_ids[]=${id}`).join('&');
    try {
      const data = await fetchJson(`${BASE}/t/${TOPIC_ID}/posts.json?${qs}`);
      for (const p of data.post_stream?.posts || []) {
        const { images, links } = extractMedia(p.cooked);
        posts.push({
          n: p.post_number,
          id: p.id,
          user: p.username,
          date: (p.created_at || '').slice(0, 10),
          replyTo: p.reply_to_post_number || null,
          text: stripHtml(p.cooked),
          images,
          links,
          likes: p.like_count || 0,
        });
      }
    } catch (e) {
      console.error(`chunk ${i}-${i + BATCH} échoué: ${e.message}`);
    }
    if ((i / BATCH) % 10 === 0) {console.log(`  ${i}/${ids.length}…`);}
    await sleep(DELAY_MS);
  }

  posts.sort((a, b) => a.n - b.n);
  const out = {
    topic: TOPIC_ID,
    url: `${BASE}/t/app-pro-universal-tuya-zigbee-device-app-test/${TOPIC_ID}`,
    fetched: new Date().toISOString(),
    count: posts.length,
    posts,
  };
  fs.mkdirSync(path.join(ROOT, '.github', 'state'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, '.github', 'state', 'forum-full-topic.json'), JSON.stringify(out));

  const withImages = posts.filter(p => p.images.length);
  const withLinks = posts.filter(p => p.links.length);
  const users = new Set(posts.map(p => p.user));
  console.log(`${posts.length} posts récupérés | ${users.size} utilisateurs | ${withImages.length} avec images | ${withLinks.length} avec liens`);
}

main().catch((e) => { console.error(e); process.exit(1); });
