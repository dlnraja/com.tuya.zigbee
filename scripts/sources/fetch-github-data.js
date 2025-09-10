const { Octokit } = require('@octokit/rest');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  owner: 'johan-benz',
  repo: 'homey-tuya-zigbee',
  outputDir: path.join(__dirname, '../../resources/github')
};

// Initialize Octokit with authentication if available
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  userAgent: 'HomeyTuyaZigbeeDataCollector/1.0.0'
});

async function fetchGitHubData() {
  try {
    console.log('🌐 Fetching data from GitHub...');
    
    // Ensure output directory exists
    await fs.mkdir(CONFIG.outputDir, { recursive: true });
    
    // Fetch repository forks
    console.log('🔍 Fetching repository forks...');
    const { data: forks } = await octokit.repos.listForks({
      owner: CONFIG.owner,
      repo: CONFIG.repo,
      per_page: 100,
      sort: 'newest'
    });
    
    await fs.writeFile(
      path.join(CONFIG.outputDir, 'forks.json'),
      JSON.stringify(forks, null, 2)
    );
    
    // Fetch pull requests
    console.log('🔍 Fetching pull requests...');
    const { data: pullRequests } = await octokit.pulls.list({
      owner: CONFIG.owner,
      repo: CONFIG.repo,
      state: 'all',
      per_page: 100,
      sort: 'updated',
      direction: 'desc'
    });
    
    await fs.writeFile(
      path.join(CONFIG.outputDir, 'pull-requests.json'),
      JSON.stringify(pullRequests, null, 2)
    );
    
    // Fetch issues
    console.log('🔍 Fetching issues...');
    const { data: issues } = await octokit.issues.listForRepo({
      owner: CONFIG.owner,
      repo: CONFIG.repo,
      state: 'all',
      per_page: 100,
      sort: 'updated',
      direction: 'desc'
    });
    
    // Filter out pull requests (GitHub API returns both issues and PRs)
    const pureIssues = issues.filter(issue => !('pull_request' in issue));
    
    await fs.writeFile(
      path.join(CONFIG.outputDir, 'issues.json'),
      JSON.stringify(pureIssues, null, 2)
    );
    
    // Extract device-related information
    const deviceData = extractDeviceData(forks, pullRequests, pureIssues);
    
    await fs.writeFile(
      path.join(CONFIG.outputDir, 'device-contributions.json'),
      JSON.stringify(deviceData, null, 2)
    );
    
    console.log(`✅ GitHub data collection complete. Results saved to ${CONFIG.outputDir}`);
    return deviceData;
  } catch (error) {
    console.error('❌ Error fetching GitHub data:', error.message);
    if (error.status === 403 && error.response?.headers['x-ratelimit-remaining'] === '0') {
      const resetTime = new Date(error.response.headers['x-ratelimit-reset'] * 1000);
      console.error(`⚠️ GitHub API rate limit exceeded. Will reset at: ${resetTime}`);
    }
    throw error;
  }
}

function extractDeviceData(forks, pullRequests, issues) {
  const deviceMap = new Map();
  
  // Process forks for device implementations
  for (const fork of forks) {
    // This is a simplified example - in a real scenario, you'd need to:
    // 1. Clone the fork
    // 2. Scan for device implementations
    // 3. Extract device information
    
    // For now, just use the fork description to look for device mentions
    const deviceMentions = extractDeviceMentions(fork.description || '');
    for (const device of deviceMentions) {
      if (!deviceMap.has(device)) {
        deviceMap.set(device, { sources: [] });
      }
      deviceMap.get(device).sources.push({
        type: 'fork',
        url: fork.html_url,
        owner: fork.owner.login,
        description: fork.description || '',
        updated: fork.updated_at
      });
    }
  }
  
  // Process pull requests for device contributions
  for (const pr of pullRequests) {
    const deviceMentions = [
      ...extractDeviceMentions(pr.title || ''),
      ...extractDeviceMentions(pr.body || '')
    ];
    
    for (const device of new Set(deviceMentions)) {
      if (!deviceMap.has(device)) {
        deviceMap.set(device, { sources: [] });
      }
      deviceMap.get(device).sources.push({
        type: 'pull_request',
        number: pr.number,
        title: pr.title,
        url: pr.html_url,
        state: pr.state,
        user: pr.user?.login,
        created: pr.created_at,
        updated: pr.updated_at
      });
    }
  }
  
  // Process issues for device-related reports
  for (const issue of issues) {
    const deviceMentions = [
      ...extractDeviceMentions(issue.title || ''),
      ...extractDeviceMentions(issue.body || '')
    ];
    
    for (const device of new Set(deviceMentions)) {
      if (!deviceMap.has(device)) {
        deviceMap.set(device, { sources: [] });
      }
      deviceMap.get(device).sources.push({
        type: 'issue',
        number: issue.number,
        title: issue.title,
        url: issue.html_url,
        state: issue.state,
        user: issue.user?.login,
        created: issue.created_at,
        updated: issue.updated_at,
        labels: issue.labels?.map(l => l.name) || []
      });
    }
  }
  
  // Convert map to array of device entries
  return Array.from(deviceMap.entries()).map(([device, data]) => ({
    device,
    ...data
  }));
}

function extractDeviceMentions(text) {
  if (!text) return [];
  
  // Look for common device model patterns (e.g., TS0121, TS0201, ZB-1234)
  const devicePattern = /\b(?:TS|TY|ZB-)?(\d{2,4}[A-Za-z]?\d*)\b/g;
  const matches = [...new Set(text.match(devicePattern) || [])];
  
  // Normalize device IDs (remove non-alphanumeric characters)
  return matches.map(m => m.replace(/[^A-Za-z0-9]/g, ''));
}

// Run if called directly
if (require.main === module) {
  if (!process.env.GITHUB_TOKEN) {
    console.warn('⚠️  GITHUB_TOKEN environment variable not set. You may hit rate limits.');
  }
  
  fetchGitHubData().catch(console.error);
}

module.exports = {
  fetchGitHubData,
  extractDeviceMentions
};
