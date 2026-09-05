#!/usr/bin/env node
'use strict';
/**
 * forum-full-retry.js — retries the missing post IDs with longer delays
 * and merges them into forum-full-topic.json.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const TOPIC_ID = 140352;
const BASE = 'https://community.homey.app';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (forum-scrape)' } });
      if (!res.ok) {throw new Error(`HTTP ${res.status}`);}
      return await res.json();
    } catch (e) {
      if (i === retries - 1) {throw e;}
      await sleep(2000 * (i + 1));
    }
  }
}

function stripHtml(html) {
  return (html || '')
    .replace(/<br\s*\/?>/g, '\n').replace(/<\/p>/g, '\n\n')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/[ \t]{2,}/g, ' ').trim();
}

function extractMedia(html) {
  const images = [...(html || '').matchAll(/<img[^>]+src="([^"]+)"/g)].map(m =>
    m[1].startsWith('//') ? 'https:' + m[1] : m[1]);
  const links = [...(html || '').matchAll(/<a[^>]+href="([^"]+)"/g)].map(m => m[1])
    .filter(u => !u.includes('/user_avatar/') && !u.startsWith('#'));
  return { images: [...new Set(images)], links: [...new Set(links)] };
}

async function main() {
  const missing = JSON.parse(fs.readFileSync(path.join(ROOT, '.github', 'state', 'forum-missing-ids.json'), 'utf8'));
  const topic = JSON.parse(fs.readFileSync(path.join(ROOT, '.github', 'state', 'forum-full-topic.json'), 'utf8'));
  const have = new Set(topic.posts.map(p => p.id));
  console.log(`${missing.length} posts à re-tenter`);

  let added = 0;
  for (let i = 0; i < missing.length; i += 25) {
    const chunk = missing.slice(i, i + 25);
    const qs = chunk.map(id => `post_ids[]=${id}`).join('&');
    try {
      const data = await fetchJson(`${BASE}/t/${TOPIC_ID}/posts.json?${qs}`);
      for (const p of data.post_stream?.posts || []) {
        if (have.has(p.id)) {continue;}
        const { images, links } = extractMedia(p.cooked);
        topic.posts.push({
          n: p.post_number, id: p.id, user: p.username,
          date: (p.created_at || '').slice(0, 10),
          replyTo: p.reply_to_post_number || null,
          text: stripHtml(p.cooked), images, links, likes: p.like_count || 0,
        });
        have.add(p.id);
        added++;
      }
    } catch (e) {
      console.error(`chunk ${i} échoué après retries: ${e.message}`);
    }
    await sleep(800);
  }

  topic.posts.sort((a, b) => a.n - b.n);
  topic.count = topic.posts.length;
  topic.fetched = new Date().toISOString();
  fs.writeFileSync(path.join(ROOT, '.github', 'state', 'forum-full-topic.json'), JSON.stringify(topic));
  console.log(`+${added} posts | total: ${topic.count}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
