const https = require('https');

const options = {
  hostname: 'community.homey.app',
  path: '/search.json?q=besterm+radiator+order:latest',
  method: 'GET',
  headers: {
    'User-Agent': 'TuyaZigbeeAutomation/1.0',
    'Accept': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      if (result.posts && result.posts.length > 0) {
        console.log('--- Latest posts mentioning besterm radiator ---');
        result.posts.slice(0, 5).forEach(p => {
          console.log(`- [${p.topic_id}] @${p.username}: ${p.blurb.substring(0, 150).replace(/\n/g, ' ')}...`);
        });
      } else {
        console.log('No posts found for besterm radiator.');
      }
    } catch (e) {
      console.error('Error parsing response:', e.message);
    }
  });
});
req.end();
