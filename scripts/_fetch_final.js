const https = require('https');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { Accept: 'application/json' } }, (res) => {
      let d = '';
      res.on('data', (c) => { d += c; });
      res.on('end', () => { resolve(JSON.parse(d)); });
    }).on('error', reject);
  });
}

async function main() {
  const ids = '747901,747843,747797,747648,747403,747358,747269,747114,747058,746931';
  const postsData = await fetch('https://community.homey.app/posts.json?ids=' + ids);
  const posts = postsData.post_stream?.posts || [];
  console.log('Fetched:', posts.length, 'posts\n');
  posts.forEach(p => {
    console.log('=== #' + p.post_number + ' | ' + p.username + ' | ' + p.created_at?.slice(0, 16) + ' ===');
    const t = p.cooked?.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
    console.log(t?.slice(0, 800));
    console.log('---');
  });
}

main().catch(console.error);
