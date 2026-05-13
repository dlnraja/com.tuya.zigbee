#!/usr/bin/env node
const https = require('https');
const fs = require('fs');
const path = require('path');

const REPOS = ['dlnraja/com.tuya.zigbee', 'JohanBendz/com.tuya.zigbee'];
const OUT_DIR = path.join(__dirname, '../../data/community-sync');

function fetchGitHub(urlPath) {
  return new Promise((resolve) => {
    const opts = {
      hostname: 'api.github.com',
      path: urlPath,
      headers: {
        'User-Agent': 'HomeyTuyaPRScraper',
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    https.get(opts, res => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch(e) { resolve([]); }
      });
    }).on('error', (err) => {
      console.error(`Error fetching ${urlPath}:`, err.message);
      resolve([]);
    });
  });
}

async function analyzePRs() {
  console.log('🔍 Scraping and analyzing recent Pull Requests (Open & Closed)...');
  const prAnalysis = [];

  for (const repo of REPOS) {
    console.log(`📡 Fetching PRs for ${repo}...`);
    // Fetch both open and closed PRs
    const url = `/repos/${repo}/pulls?state=all&per_page=30`;
    const prs = await fetchGitHub(url);

    if (!Array.isArray(prs)) {
      console.log(`⚠️ Failed or empty response for ${repo}`);
      continue;
    }

    console.log(`✅ Retrieved ${prs.length} PRs for ${repo}`);

    for (const pr of prs) {
      // Extract manufacturer names (_TZ3000_..., _TZE200_..., etc.)
      const bodyText = pr.body || '';
      const titleText = pr.title || '';
      const combinedText = titleText + '\n' + bodyText;

      const mfrs = Array.from(new Set(combinedText.match(/_T[A-Z0-9]{4}_[a-zA-Z0-9_]{8}/g) || []));
      const pids = Array.from(new Set(combinedText.match(/TS[0-9]{4}[a-zA-Z0-9_]*/g) || []));

      // Attempt to infer what driver this PR is targeting
      let targetDriver = null;
      if (pr.head && pr.head.ref) {
        const refLower = pr.head.ref.toLowerCase();
        if (refLower.includes('driver')) targetDriver = refLower;
      }
      
      const keywords = ['dimmer', 'switch', 'sensor', 'motion', 'climate', 'valve', 'plug', 'socket', 'doorbell', 'cover', 'curtain', 'thermostat', 'trv'];
      for (const kw of keywords) {
        if (!targetDriver && combinedText.toLowerCase().includes(kw)) {
          targetDriver = kw;
        }
      }

      prAnalysis.push({
        repo,
        number: pr.number,
        title: pr.title,
        state: pr.state,
        user: pr.user ? pr.user.login : 'unknown',
        created_at: pr.created_at,
        closed_at: pr.closed_at,
        merged_at: pr.merged_at,
        html_url: pr.html_url,
        manufacturers: mfrs,
        productIds: pids,
        inferredDriver: targetDriver || 'generic_diy',
        hasCodeChanges: true
      });
    }
  }

  // Deduplicate and filter valuable insights
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'pr-analysis.json'), JSON.stringify(prAnalysis, null, 2));
  console.log(`\n🎉 PR Analysis complete! Saved ${prAnalysis.length} analyzed PR entries to data/community-sync/pr-analysis.json`);
}

analyzePRs().catch(err => {
  console.error('❌ Scraper failed:', err);
});
