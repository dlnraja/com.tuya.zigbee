#!/usr/bin/env node
'use strict';

/**
 * P26.6.1 — Get all forum messages with timestamps via Discourse API
 *
 * Discourse exposes public API:
 * - /search.json?q=tuya+zigbee+button (with auth)
 * - /t/{id}.json (single topic with all posts + timestamps)
 * - /posts.rss (RSS feed)
 *
 * Cross-references with GitHub issues for temporal analysis.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { SmartFetcher } = require(path.resolve(__dirname, '..', '..', 'lib', 'scraper', 'smart-fetch'));

const STATE_DIR = 'C:/Users/Dell/Documents/homey/master/.github/state';
const FORUM_BASE = 'https://community.homey.app';
const SEARCH_TERMS = ['tuya zigbee button', 'TS0041', 'TS0044', 'button wireless', 'button press', 'flow card', 'button scene'];

// P55 — smart fetcher with browser UA + concurrency + cache + retry
const fetcher = new SmartFetcher({
  source: 'forum-temporal',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  concurrency: 4,
  maxRetries: 2,
  baseBackoffMs: 3000,
  defaultDelay: 200,
  headers: { 'Accept': 'application/json, text/plain, */*', 'Referer': 'https://community.homey.app/' },
});

async function fetchJson(url, options = {}) {
  try {
    const r = await fetcher.fetch(url);
    if (r.statusCode !== 200) return { status: r.statusCode, data: null };
    try { return { status: 200, data: JSON.parse(r.body.toString('utf8')) }; }
    catch (e) { return { status: 200, data: r.body.toString('utf8') }; }
  } catch (e) {
    return { status: 0, data: null, error: e.message };
  }
}

async function getForumTopics() {
  const allTopics = [];
  // Use the Discourse public search via RSS
  for (const term of SEARCH_TERMS) {
    const url = `${FORUM_BASE}/search.json?q=${encodeURIComponent(term)}`;
    const { status, data } = await fetchJson(url);
    if (status === 200 && data && data.topics) {
      for (const topic of data.topics) {
        allTopics.push({
          id: topic.id,
          title: topic.title,
          slug: topic.slug,
          createdAt: topic.created_at,
          lastPostedAt: topic.last_posted_at,
          postsCount: topic.posts_count,
          views: topic.views,
          likeCount: topic.like_count,
          categoryId: topic.category_id,
          searchTerm: term,
        });
      }
    }
  }

  // Dedupe by ID
  const seen = new Set();
  return allTopics.filter(t => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
}

async function getTopicPosts(topicId) {
  const url = `${FORUM_BASE}/t/${topicId}.json`;
  const { status, data } = await fetchJson(url);
  if (status === 200 && data && data.post_stream && data.post_stream.posts) {
    return data.post_stream.posts.map(p => ({
      id: p.id,
      username: p.username,
      name: p.name,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      cooked: p.cooked ? p.cooked.substring(0, 500) : '',
      likeCount: p.like_count,
      reads: p.reads,
    }));
  }
  return [];
}

async function main() {
  console.log('=== P26.6.1 — Forum Messages with Timestamps ===\n');

  const topics = await getForumTopics();
  console.log(`Found ${topics.length} unique forum topics`);

  // Get details for each topic (P55 — parallel batch with smartFetcher)
  const topicSubset = topics.slice(0, 30);
  const tDetails = Date.now();
  const detailResults = await fetcher.fetchAll(topicSubset.map(t => FORUM_BASE + '/t/' + t.id + '.json'), {
    concurrency: fetcher.concurrency,
    onProgress: (d, t) => process.stdout.write(`\r  [Details] ${d}/${t}    `),
  });
  console.log(`\r  [Details] Done in ${Date.now() - tDetails}ms`);
  const detailed = [];
  for (let i = 0; i < topicSubset.length; i++) {
    const topic = topicSubset[i];
    const r = detailResults[i];
    if (r.error || !r.body) {
      console.log('  #' + topic.id + ' error: ' + r.error);
      continue;
    }
    let data;
    try { data = JSON.parse(r.body.toString('utf8')); } catch { continue; }
    const posts = (data.post_stream?.posts || []).map(p => ({
      id: p.id,
      username: p.username,
      name: p.name,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      cooked: p.cooked ? p.cooked.substring(0, 500) : '',
      likeCount: p.like_count,
      reads: p.reads,
    }));
    detailed.push({
      ...topic,
      posts: posts.slice(0, 5), // first 5 posts
      postCount: posts.length,
    });
  }

  // Save
  fs.writeFileSync(
    path.join(STATE_DIR, 'forum-topics-detailed.json'),
    JSON.stringify(detailed, null, 2)
  );

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Total topics: ${detailed.length}`);
  if (detailed.length > 0) {
    const dates = detailed.map(t => new Date(t.createdAt).getTime());
    const lastDates = detailed.map(t => new Date(t.lastPostedAt).getTime());
    const minDate = new Date(Math.min(...dates)).toISOString().substring(0, 10);
    const maxDate = new Date(Math.max(...lastDates)).toISOString().substring(0, 10);
    console.log(`Date range: ${minDate} → ${maxDate}`);
  }

  // Top topics by activity
  const byActivity = [...detailed].sort((a, b) => b.postsCount - a.postsCount).slice(0, 5);
  console.log('\nTop 5 by activity:');
  for (const t of byActivity) {
    console.log(`  - ${t.title} (${t.postsCount} posts, ${t.likeCount} likes, ${t.createdAt.substring(0, 10)})`);
  }

  // Date histogram (per month)
  const byMonth = {};
  for (const t of detailed) {
    const month = t.createdAt.substring(0, 7); // YYYY-MM
    byMonth[month] = (byMonth[month] || 0) + 1;
  }
  console.log('\nPosts by month:');
  const sortedMonths = Object.keys(byMonth).sort();
  for (const m of sortedMonths) {
    console.log(`  ${m}: ${'#'.repeat(byMonth[m])} (${byMonth[m]})`);
  }

  console.log(`\nOutput: ${path.join(STATE_DIR, 'forum-topics-detailed.json')}`);
}

main().catch(e => console.error('FATAL:', e.message));
