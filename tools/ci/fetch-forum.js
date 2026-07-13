// fetch-forum.js — fetch homey community forum via public RSS + categories
const https = require('https');
const fs = require('fs');

function get(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'curl/7.0' } }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', (e) => resolve({ error: e.message }));
  });
}

async function fetchRSS() {
  // Get categories list first
  console.log('=== CATEGORIES ===');
  const cats = await get('https://community.homey.app/categories.json');
  if (cats.body) {
    fs.writeFileSync('.github/state/forum-categories.json', cats.body);
    const data = JSON.parse(cats.body);
    for (const cat of data.category_list.categories) {
      console.log('  [' + cat.id + '] ' + cat.name + ' (' + cat.topic_count + ' topics, ' + cat.post_count + ' posts)');
    }
  }
  console.log();

  // Get site info
  console.log('=== SITE INFO ===');
  const site = await get('https://community.homey.app/site.json');
  if (site.body) {
    fs.writeFileSync('.github/state/forum-site.json', site.body);
    const data = JSON.parse(site.body);
    console.log('  Title:', data.title);
    console.log('  Description:', data.description?.substring(0, 200));
    console.log('  Users:', data.stats?.user_count || 'n/a');
    console.log('  Topics:', data.stats?.topic_count || 'n/a');
    console.log('  Posts:', data.stats?.post_count || 'n/a');
    console.log('  Categories:', data.categories?.length || 'n/a');
  }
  console.log();

  // Get the global RSS feed
  console.log('=== LATEST POSTS (RSS) ===');
  const rss = await get('https://community.homey.app/posts.rss');
  if (rss.body) {
    fs.writeFileSync('.github/state/forum-latest-posts.rss', rss.body);
    // Parse RSS
    const items = rss.body.match(/<item>[\s\S]*?<\/item>/g) || [];
    console.log('  Items in RSS:', items.length);
    for (const item of items.slice(0, 30)) {
      const title = item.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)?.[1] || '';
      const link = item.match(/<link>(.*?)<\/link>/)?.[1] || '';
      const creator = item.match(/<dc:creator>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/dc:creator>/)?.[1] || '';
      const date = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
      const category = item.match(/<category>(.*?)<\/category>/)?.[1] || '';
      const desc = item.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/)?.[1] || '';
      console.log('  - [' + category + '] ' + (title.substring(0, 80)) + ' by ' + creator + ' @ ' + (date.substring(0, 16)));
      if (desc.length > 10) {
        const descText = desc.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').substring(0, 200);
        if (descText.match(/tuya|dlnraja|zigbee/i)) {
          console.log('    > ' + descText);
        }
      }
    }
  }
}

fetchRSS().catch(console.error);
