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

const STATE_DIR = 'C:/Users/Dell/Documents/homey/master/.github/state';
const FORUM_BASE = 'https://community.homey.app';
const SEARCH_TERMS = ['tuya zigbee button', 'TS0041', 'TS0044', 'button wireless', 'button press', 'flow card', 'button scene'];

function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'Mavis-CI/1.0',
      'Accept': 'application/json',
      ...options.headers,
    };
    https.get(url, { headers }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchJson(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return resolve({ status: res.statusCode, data: null });
      }
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve({ status: 200, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: 200, data: data }); }
      });
    }).on('error', reject);
  });
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

  // Get details for each topic
  const detailed = [];
  for (const topic of topics.slice(0, 30)) { // limit to top 30
    const posts = await getTopicPosts(topic.id);
    detailed.push({
      ...topic,
      posts: posts.slice(0, 5), // first 5 posts
      postCount: posts.length,
    });
    // rate limit
    await new Promise(r => setTimeout(r, 200));
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
