const fs = require('fs');
const https = require('https');

// Create script to query Homey Community forum for Johan's posts via Discourse API
const scriptContent = `
const https = require('https');
const fs = require('fs');

const options = {
  hostname: 'community.homey.app',
  path: '/search.json?q=@Johan+order:latest',
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
      if (result.topics && result.topics.length > 0) {
        console.log('Found latest topics mentioning Johan:');
        result.topics.slice(0, 5).forEach(t => {
          console.log(\`- [\${t.id}] \${t.title} (\${t.created_at})\`);
        });
      }
      
      if (result.posts && result.posts.length > 0) {
        console.log('\\nFound latest posts mentioning Johan:');
        result.posts.slice(0, 5).forEach(p => {
          console.log(\`- [\${p.topic_id}] @\${p.username}: \${p.blurb.substring(0, 100)}...\`);
        });
      } else {
        console.log('No recent posts found for Johan.');
      }
    } catch (e) {
      console.error('Error parsing response:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.end();
`;

fs.writeFileSync('scripts/temp/search-forum-johan.js', scriptContent);
console.log('Created search script');
