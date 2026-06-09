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
  const thread = await fetch('https://community.homey.app/t/140352.json');
  const s = thread.post_stream?.stream || [];
  console.log('Total posts:', s.length);

  const last50 = s.slice(-50);
  const ids = last50.join(',');

  const postsData = await fetch('https://community.homey.app/posts.json?ids=' + ids);
  const posts = postsData.post_stream?.posts || [];
  console.log('Fetched:', posts.length, 'posts\n');

  posts.forEach(p => {
    console.log('=== #' + p.post_number + ' | ' + p.username + ' | ' + p.created_at?.slice(0, 10) + ' ===');
    const t = p.cooked?.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
    console.log(t?.slice(0, 600));
    console.log('---');
  });
}

main().catch(console.error);
