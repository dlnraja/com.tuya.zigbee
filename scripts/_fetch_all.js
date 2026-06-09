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

  // Fetch last 50 posts in batches of 20
  const last50 = s.slice(-50);
  const batches = [];
  for (let i = 0; i < last50.length; i += 20) {
    batches.push(last50.slice(i, i + 20));
  }

  for (const batch of batches) {
    const ids = batch.join(',');
    try {
      const postsData = await fetch('https://community.homey.app/posts.json?ids=' + ids);
      const posts = postsData.post_stream?.posts || [];
      posts.forEach(p => {
        console.log('\n=== #' + p.post_number + ' | ' + p.username + ' | ' + p.created_at?.slice(0, 10) + ' ===');
        const t = p.cooked?.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
        console.log(t?.slice(0, 600));
      });
    } catch (e) {
      console.log('Error fetching batch:', e.message);
    }
  }
}

main().catch(console.error);
