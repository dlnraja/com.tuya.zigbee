const { Octokit } = require('@octokit/rest');

// We use an unauthenticated octokit because local tokens might be expired
const octokit = new Octokit({
  userAgent: 'Homey-Tuya-Intelligence-v1'
});

const REPOS = [
  { owner: 'JohanBendz', repo: 'com.tuya.zigbee' },
  { owner: 'dlnraja', repo: 'com.tuya.zigbee' }
];

async function extractTuyaInterviews(body) {
  const fingerprints = [];
  if (!body) return fingerprints;
  
  // Try to find JSON blocks
  const jsonBlocks = body.match(/```json\s*([\s\S]*?)\s*```/g) || [];
  for (const block of jsonBlocks) {
    try {
      const cleanJson = block.replace(/```json|```/g, '').trim();
      // Handle the case where users wrap the json in brackets [ ] 
      let parsed = null;
      try { parsed = JSON.parse(cleanJson); } 
      catch (e) {
        // Some users put "[ " before the json
        const fixed = cleanJson.replace(/^\[\s*/, '').replace(/\s*\]$/, '');
        try { parsed = JSON.parse(fixed); } catch(err) {}
      }

      if (parsed) {
        // Tuya format typically has "ids" or "endpoints"
        const mfr = parsed.ids?.manufacturerName || parsed.endpoints?.manufacturerName;
        const productId = parsed.ids?.modelId || parsed.endpoints?.modelId;
        
        if (mfr && productId) {
          fingerprints.push({
            mfr: mfr,
            productId: productId,
            endpoints: parsed.endpoints ? Object.keys(parsed.endpoints.extendedEndpointDescriptors || {}).map(Number) : [1],
            raw: parsed
          });
        }
      }
    } catch (err) {
      // Ignore unparseable blocks
    }
  }

  // Fallback regex if no valid JSON block found
  if (fingerprints.length === 0) {
    const mfrMatch = body.match(/_TZ[0-9]{4}_[a-zA-Z0-9]{8}/g) || body.match(/_TYZB01_[a-zA-Z0-9]{8}/g) || [];
    const modelMatch = body.match(/TS[0-9]{4}/g) || [];
    
    if (mfrMatch.length > 0) {
      fingerprints.push({
        mfr: mfrMatch[0],
        productId: modelMatch.length > 0 ? modelMatch[0] : null,
        endpoints: [1],
        fallback: true
      });
    }
  }

  return fingerprints;
}

async function run() {
  console.log('🔍 Starting Deep GitHub Intelligence Extraction...');
  const intelligence = {
    fingerprints: [],
    prs: [],
    commits: []
  };

  for (const repoInfo of REPOS) {
    console.log(`\n📂 Scraping repo: ${repoInfo.owner}/${repoInfo.repo}`);
    try {
      // 1. Fetch Issues (last 30)
      console.log('  -> Fetching issues...');
      const issues = await octokit.rest.issues.listForRepo({
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        state: 'all',
        per_page: 30
      });

      for (const issue of issues.data) {
        if (issue.pull_request) {
          // Store PR info
          intelligence.prs.push({
            repo: `${repoInfo.owner}/${repoInfo.repo}`,
            number: issue.number,
            title: issue.title,
            body: issue.body,
            url: issue.html_url,
            state: issue.state
          });
        } else {
          // Extract fingerprints from issue body
          const fps = await extractTuyaInterviews(issue.body);
          if (fps.length > 0) {
            fps.forEach(fp => {
              intelligence.fingerprints.push({
                ...fp,
                source: `${repoInfo.owner}/${repoInfo.repo}`,
                issue: issue.number,
                title: issue.title,
                description: issue.title // For device type inferring later
              });
            });
          }
        }
      }

      // 2. Fetch latest commits
      console.log('  -> Fetching commits...');
      const commits = await octokit.rest.repos.listCommits({
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        per_page: 15
      });
      
      commits.data.forEach(commit => {
        intelligence.commits.push({
          repo: `${repoInfo.owner}/${repoInfo.repo}`,
          sha: commit.sha,
          message: commit.commit.message,
          author: commit.commit.author.name,
          date: commit.commit.author.date
        });
      });

    } catch (error) {
      console.error(`❌ Error scraping ${repoInfo.owner}/${repoInfo.repo}: ${error.message}`);
    }
  }

  return intelligence;
}

if (require.main === module) {
  run().then(res => {
    const fs = require('fs');
    const path = require('path');
    const OUT = path.join(__dirname, '../../data/community-sync');
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'github_intelligence.json'), JSON.stringify(res, null, 2));
    console.log(`\n✅ Extracted ${res.fingerprints.length} fingerprints, ${res.prs.length} PRs, ${res.commits.length} commits.`);
  });
}

module.exports = run;
