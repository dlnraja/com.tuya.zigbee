const fs = require('fs');
const https = require('https');

function ghGet(pathname) {
  const options = {
    hostname: 'api.github.com',
    path: pathname,
    headers: {
      'User-Agent': 'tuya-zigbee-crawler',
      Accept: 'application/vnd.github+json',
    },
  };
  return new Promise((resolve, reject) => {
    https
      .get(options, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      })
      .on('error', reject);
  });
}

async function collectRepo(owner, repo, outPrefix) {
  const issues = await ghGet(`/repos/${owner}/${repo}/issues?state=all&per_page=100`);
  const pulls = await ghGet(`/repos/${owner}/${repo}/pulls?state=all&per_page=100`);
  const branches = await ghGet(`/repos/${owner}/${repo}/branches?per_page=100`);
  const dir = 'research';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  fs.writeFileSync(`${dir}/${outPrefix}_issues.jsonl`, issues.body);
  fs.writeFileSync(`${dir}/${outPrefix}_prs.jsonl`, pulls.body);
  fs.writeFileSync(`${dir}/${outPrefix}_branches.json`, branches.body);
}

async function main() {
  await collectRepo('JohanBendz', 'com.tuya.zigbee', 'github_upstream');
  await collectRepo('dlnraja', 'com.tuya.zigbee', 'github_origin');
}

main();


