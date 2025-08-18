const fs = require('fs');
const https = require('https');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      })
      .on('error', reject);
  });
}

function extractEntities(text) {
  const matches = text.match(/(_TZ\w+|_TZE\w+|_TYZB\w+|TS\d{3,4}|TUYATEC-[A-Za-z0-9_-]+)/g) || [];
  return Array.from(new Set(matches));
}

async function crawl(baseUrl, maxPages = 200) {
  const out = [];
  for (let i = 1; i <= maxPages; i += 1) {
    const url = i === 1 ? baseUrl : `${baseUrl}/${i}`;
    const res = await fetch(url);
    if (res.status >= 400) break;
    const body = res.body || '';
    const entities = extractEntities(body);
    out.push({ page: i, url, detected_entities: entities, raw_text_excerpt: body.slice(0, 2000) });
    if (!/next\s*page|load\s*more|aria-label=\"next\"/i.test(body) && i > 5 && entities.length === 0) {
      // Heuristic stop
      break;
    }
  }
  const dir = 'research';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  fs.writeFileSync(`${dir}/forum_for_tuya_zigbee.jsonl`, out.map((o) => JSON.stringify(o)).join('\n'));
}

async function main() {
  const targets = process.argv.slice(2);
  if (!targets.length) {
    console.error('Usage: node tools/crawl/crawl_discourse.js <url1> <url2> ...');
    process.exit(1);
  }
  for (const t of targets) {
    await crawl(t);
  }
}

main();


