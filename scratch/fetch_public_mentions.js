const https = require('https');
const fs = require('fs');

const opts = {
  headers: {
    'User-Agent': 'Node.js',
    'Accept': 'application/vnd.github.v3+json'
  }
};

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, opts, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch(e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('Fetching public mentions for dlnraja...');
  try {
    const data = await fetchJson('https://api.github.com/search/issues?q=mentions:dlnraja+is:open+repo:dlnraja/com.tuya.zigbee');
    const data2 = await fetchJson('https://api.github.com/search/issues?q=mentions:dlnraja+is:open+repo:JohanBendz/com.tuya.zigbee');
    
    const all = (data.items || []).concat(data2.items || []);
    let out = '# Mentions for dlnraja\n\n';
    
    for (const item of all) {
      out += `### [${item.repository_url.split('/').pop()}] Issue #${item.number}: ${item.title}\n`;
      out += `${item.body}\n---\n\n`;
    }
    
    fs.writeFileSync('scratch/public_mentions.md', out);
    console.log(`Found ${all.length} issues. Saved to scratch/public_mentions.md`);
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
