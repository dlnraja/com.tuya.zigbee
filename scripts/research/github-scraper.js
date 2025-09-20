const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');
const { retry } = require('@octokit/plugin-retry');
const { throttling } = require('@octokit/plugin-throttling');

// Configuration
const OUTPUT_DIR = path.join(__dirname, '../../research/github');
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Set your GitHub token as an environment variable
const SEARCH_QUERIES = [
  'tuya zigbee',
  'tuya-ts',
  'tuya-zigbee',
  'homey tuya',
  'homey-zigbeedriver',
  'zigbee-herdsman',
  'zigbee2mqtt',
  'z2m',
  'zha',
  'z2m',
  'z2m',
];

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Configure Octokit with retry and throttling
const MyOctokit = Octokit.plugin(retry, throttling);
const octokit = new MyOctokit({
  auth: GITHUB_token: "REDACTED",
  throttle: {
    onRateLimit: (retryAfter, options) => {
      console.warn(`Request quota exhausted for request ${options.method} ${options.url}`);
      
      // Retry 3 times before giving up
      if (options.request.retryCount <= 3) {
        console.log(`Retrying after ${retryAfter} seconds...`);
        return true;
      }
    },
    onAbuseLimit: (retryAfter, options) => {
      console.error(`Abuse detected for request ${options.method} ${options.url}`);
      return true; // Retry once after receiving an abuse response
    }
  }
});

/**
 * Search GitHub repositories
 */
async function searchRepositories(query, page = 1, perPage = 30) {
  try {
    console.log(`🔍 Searching for: "${query}" (page ${page})`);
    
    const { data } = await octokit.search.repos({
      q: query,
      sort: 'stars',
      order: 'desc',
      per_page: perPage,
      page: page
    });
    
    return data;
  } catch (error) {
    console.error(`❌ Error searching repositories:`, error.message);
    if (error.status === 403 && error.response) {
      const resetTime = new Date(error.response.headers['x-ratelimit-reset'] * 1000);
      console.error(`Rate limit exceeded. Resets at: ${resetTime}`);
    }
    throw error;
  }
}

/**
 * Get repository details including forks
 */
async function getRepositoryDetails(owner, repo) {
  try {
    console.log(`📦 Fetching details for ${owner}/${repo}...`);
    
    const [repoData, { data: forks }, { data: issues }, { data: pulls }] = await Promise.all([
      octokit.repos.get({ owner, repo }),
      octokit.repos.listForks({ owner, repo, per_page: 100 }),
      octokit.issues.listForRepo({
        owner,
        repo,
        state: 'all',
        per_page: 100,
        sort: 'updated',
        direction: 'desc'
      }),
      octokit.pulls.list({
        owner,
        repo,
        state: 'all',
        per_page: 100,
        sort: 'updated',
        direction: 'desc'
      })
    ]);
    
    // Get README content
    let readme = '';
    try {
      const { data: readmeData } = await octokit.repos.getReadme({ owner, repo });
      readme = Buffer.from(readmeData.content, 'base64').toString('utf-8');
    } catch (error) {
      console.warn(`No README found for ${owner}/${repo}`);
    }
    
    return {
      ...repoData.data,
      readme,
      forks: forks.map(fork => ({
        id: fork.id,
        full_name: fork.full_name,
        html_url: fork.html_url,
        description: fork.description,
        stargazers_count: fork.stargazers_count,
        forks_count: fork.forks_count,
        updated_at: fork.updated_at,
        owner: {
          login: fork.owner.login,
          type: fork.owner.type,
          html_url: fork.owner.html_url
        }
      })),
      issues: issues.map(issue => ({
        id: issue.id,
        number: issue.number,
        title: issue.title,
        state: issue.state,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        user: issue.user ? issue.user.login : null,
        html_url: issue.html_url,
        labels: issue.labels.map(label => label.name),
        comments: issue.comments
      })),
      pull_requests: pulls.map(pr => ({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        state: pr.state,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        user: pr.user ? pr.user.login : null,
        html_url: pr.html_url,
        merged: pr.merged,
        merge_commit_sha: pr.merge_commit_sha
      }))
    };
  } catch (error) {
    console.error(`❌ Error fetching repository details for ${owner}/${repo}:`, error.message);
    throw error;
  }
}

/**
 * Search for Johan Benz's repositories and forks
 */
async function searchJohanBenzRepos() {
  try {
    console.log('🔍 Searching for Johan Benz repositories...');
    
    // Get user's repositories
    const { data: repos } = await octokit.repos.listForUser({
      username: 'johannb', // Johan Benz's GitHub username
      type: 'owner',
      sort: 'updated',
      per_page: 100
    });
    
    // Filter for Tuya/Zigbee related repos
    const relevantRepos = repos.filter(repo => 
      repo.name.toLowerCase().includes('tuya') || 
      repo.name.toLowerCase().includes('zigbee') ||
      (repo.description && (
        repo.description.toLowerCase().includes('tuya') ||
        repo.description.toLowerCase().includes('zigbee')
      ))
    );
    
    console.log(`Found ${relevantRepos.length} relevant repositories`);
    return relevantRepos;
  } catch (error) {
    console.error('❌ Error searching Johan Benz repositories:', error.message);
    throw error;
  }
}

/**
 * Save results to a JSON file
 */
function saveResults(data, filename) {
  const filePath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`💾 Saved results to ${filePath}`);
}

/**
 * Main function to run the GitHub scraper
 */
async function runGitHubScraper() {
  try {
    console.log('🚀 Starting GitHub scraper...');
    
    // Search for Johan Benz's repositories
    const johanRepos = await searchJohanBenzRepos();
    saveResults(johanRepos, 'johan-benz-repos.json');
    
    // Get details for each repository
    const repoDetails = [];
    for (const repo of johanRepos) {
      try {
        const [owner, repoName] = repo.full_name.split('/');
        const details = await getRepositoryDetails(owner, repoName);
        repoDetails.push(details);
        
        // Save progress after each repository
        saveResults(repoDetails, 'johan-benz-repo-details.json');
        
        // Be nice to GitHub's API
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Skipping ${repo.full_name} due to error`);
      }
    }
    
    // Search for general Tuya/Zigbee repositories
    const searchResults = [];
    for (const query of SEARCH_QUERIES) {
      try {
        const result = await searchRepositories(query);
        searchResults.push(...result.items);
        saveResults(searchResults, 'github-search-results.json');
        
        // Be nice to GitHub's API
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Skipping query "${query}" due to error`);
      }
    }
    
    console.log('\n✅ GitHub scraping completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in GitHub scraper:', error);
    process.exit(1);
  }
}

// Run the scraper
runGitHubScraper().catch(console.error);
