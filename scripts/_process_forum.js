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
  // Get thread info
  const thread = await fetch('https://community.homey.app/t/140352.json');
  const s = thread.post_stream?.stream || [];
  console.log('Thread: Universal TUYA Zigbee Device App');
  console.log('Total posts:', s.length);

  // Fetch last 20 posts
  const last20 = s.slice(-20);
  console.log('\nFetching last 20 posts...\n');

  for (const postId of last20) {
    try {
      // Use topic endpoint to get specific post
      const page = Math.ceil(postId / 20);
      const postData = await fetch(`https://community.homey.app/t/140352/${page}.json`);
      const post = postData.post_stream?.posts?.find(p => p.id === postId);
      if (post) {
        console.log(`\n=== #${post.post_number} | ${post.username} | ${post.created_at?.slice(0, 16)} ===`);
        const t = post.cooked?.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
        console.log(t?.slice(0, 800));
      }
    } catch (e) {
      console.log(`Error fetching post ${postId}:`, e.message);
    }
  }
}

main().catch(console.error);
