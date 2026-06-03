const https = require('https');
const fs = require('fs');

const opts = {
  headers: {
    'User-Agent': 'Node.js',
    'Accept': 'application/vnd.github.v3+json',
    'Cache-Control': 'no-cache'
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

async function getComments(commentsUrl) {
  if (!commentsUrl) return [];
  const comments = await fetchJson(commentsUrl);
  if (Array.isArray(comments)) {
    return comments.map(c => `**Comment by ${c.user.login}**:\n${c.body}`).join('\n\n---\n');
  }
  return '';
}

async function main() {
  console.log('Fetching recent activity...');
  try {
    // 1. Mentions on JohanBendz repo
    const dataJohan = await fetchJson('https://api.github.com/search/issues?q=mentions:dlnraja+is:open+repo:JohanBendz/com.tuya.zigbee&sort=updated&order=desc');
    // 2. Recent open issues on dlnraja repo
    const dataDlnraja = await fetchJson('https://api.github.com/search/issues?q=is:open+repo:dlnraja/com.tuya.zigbee&sort=updated&order=desc');
    
    // We only want the most recent ones, say top 10 from each
    const johanItems = (dataJohan.items || []).slice(0, 10);
    const dlnrajaItems = (dataDlnraja.items || []).slice(0, 10);
    
    // Remove duplicates if any (e.g. if mentioned on own repo)
    const allItemsMap = new Map();
    for (const item of johanItems) allItemsMap.set(item.html_url, item);
    for (const item of dlnrajaItems) allItemsMap.set(item.html_url, item);
    
    const all = Array.from(allItemsMap.values());
    let out = '# Latest Issues and PRs (Including Comments)\n\n';
    
    for (const item of all) {
      console.log(`Processing: ${item.title}`);
      out += `## [${item.repository_url.split('/').slice(-2).join('/')}] Issue #${item.number}: ${item.title}\n`;
      out += `**Author:** ${item.user.login} | **State:** ${item.state} | **Created:** ${item.created_at} | **Updated:** ${item.updated_at}\n`;
      out += `**URL:** ${item.html_url}\n\n`;
      out += `### Body:\n${item.body}\n\n`;
      
      if (item.comments > 0) {
        console.log(`Fetching ${item.comments} comments for issue #${item.number}...`);
        const commentsText = await getComments(item.comments_url);
        out += `### Comments:\n${commentsText}\n\n`;
      } else {
        out += `### Comments:\nNone.\n\n`;
      }
      out += `========================================================================\n\n`;
    }
    
    fs.writeFileSync('scratch/latest_github_activity.md', out);
    console.log(`Saved to scratch/latest_github_activity.md`);
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
