const { safeDivide } = require('../../lib/utils/tuyaUtils.js');
const fs = require('fs');

// Create enhanced workflow for auto-responding to issues with intelligent detection
const workflowYml = `name: "Intelligent Auto-Respond to Issues"

on:
  issues:
    types: [opened, reopened]
  issue_comment:
    types: [created]

permissions:
  issues: write
  contents: read

jobs:
  intelligent-respond:
    name: "Detect Bug Patterns & Auto-Respond"
    runs-on: ubuntu-latest
    timeout-minutes: 5
    
    steps:
      - uses: (actions / checkout)@v4
      
      - uses: (actions / setup)-node@v4
        with:
          node-version: '22'
      
      - name: "Analyze Issue with Intelligent Detection"
        id: analyze
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: |
          node .github/scripts/auto-respond-intelligent.js
      
      - name: "Summary"
        if: always()
        run: |
          echo " Intelligent auto-response workflow completed"
`;

fs.writeFileSync('.github/workflows/intelligent-auto-respond.yml', workflowYml);
console.log(' Created intelligent-auto-respond.yml workflow');

// Create enhanced issue comment handler
const commentHandler = `
// .github/scripts/handle-issue-comments.js
// Intelligent response to issue comments with context awareness

const { analyzeAndRespond } = require('./intelligent-bug-detector.js');

async function handleComment(context) {
  const { comment, issue } = context.payload;
  
  // Skip bot comments
  if (comment.user.type === 'Bot') {
    console.log('Skipping bot comment');
    return;
  }
  
  // Skip owner comments
  if (comment.user.login.toLowerCase() === 'dlnraja') {
    console.log('Skipping owner comment');
    return;
  }
  
  // Check if user is providing additional diagnostics
  const commentText = comment.body.toLowerCase();
  
  // User provided diagnostic report
  if (commentText.includes('diagnostic') || commentText.includes('report') || commentText.includes('screenshot')) {
    await context.octokit.issues.addLabels({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      labels: ['diagnostics-provided']
    });
    
    await context.octokit.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      body: ' Thank you for providing diagnostics! This helps tremendously. I will review and respond shortly.'
    });
  }
  
  // User confirms fix worked
  if (commentText.includes('fixed') || commentText.includes('working') || commentText.includes('solved')) {
    await context.octokit.issues.addLabels({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      labels: ['verified-fixed']
    });
    
    await context.octokit.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      body: ' Great to hear it\\'s working! I\\'ll close this issue. Feel free to reopen if you encounter any other problems.'
    });
    
    await context.octokit.issues.update({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      state: 'closed',
      state_reason: 'completed'
    });
  }
  
  // User says still broken
  if (commentText.includes('still') && (commentText.includes('not working') || commentText.includes('broken') || commentText.includes('fail'))) {
    await context.octokit.issues.addLabels({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      labels: ['needs-investigation', 'high-priority']
    });
    
    await context.octokit.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: issue.number,
      body: ' Sorry to hear the issue persists. This has been escalated for deeper investigation. Please ensure you\\'ve provided:\n\n- Full diagnostic report\n- App version number\n- Exact manufacturer name and product ID\n- Complete error messages from logs\n\nThis will help identify the root cause.'
    });
  }
}

module.exports = { handleComment };
`;

fs.writeFileSync('.github/scripts/handle-issue-comments.js', commentHandler);
console.log(' Created intelligent comment handler');

// Create DP learning system for future auto-detection
const dpLearner = `
// .github/scripts/dp-learning-system.js
// Machine learning-inspired DP pattern recognition

const fs = require('fs');
const path = require('path');

class DPLearningSystem {
  constructor() {
    this.knownPatterns = this.loadPatterns();
    this.newObservations = [];
  }
  
  loadPatterns() {
    const patternsFile = path.join(__dirname, '../../data/dp-learned-patterns.json');
    if (fs.existsSync(patternsFile)) {
      return JSON.parse(fs.readFileSync(patternsFile, 'utf8'));
    }
    return {};
  }
  
  observeDP(dp, value, dataType, manufacturerName, driverType, capability) {
    const observation = {
      dp,
      value,
      dataType,
      manufacturerName,
      driverType,
      capability,
      timestamp: Date.now()
    };
    
    this.newObservations.push(observation);
    
    // Cluster similar observations
    const key = \`\${dp}_\${dataType}_\${driverType}\`;
    if (!this.knownPatterns[key]) {
      this.knownPatterns[key] = {
        dp,
        dataType,
        driverType,
        observations: [],
        commonCapability,
        confidence: 0
      };
    }
    
    this.knownPatterns[key].observations.push(observation);
    
    // Auto-detect common capability
    const capabilities = this.knownPatterns[key].observations.map(o => o.capability);
    const capCounts = {};
    capabilities.forEach(c => {
      capCounts[c] = (capCounts[c] || 0) + 1;
    });
    
    const mostCommon = Object.keys(capCounts).reduce((a, b) => 
      capCounts[a] > capCounts[b] ? a : b
    );
    
    this.knownPatterns[key].commonCapability = mostCommon;
    this.knownPatterns[key].confidence = (capCounts[mostCommon] / capabilities.length);
  }
  
  predictCapability(dp, dataType, driverType) {
    const key = \`\${dp}_\${dataType}_\${driverType}\`;
    const pattern = this.knownPatterns[key];
    
    if (pattern && pattern.confidence > 0.8) {
      return {
        capability: pattern.commonCapability,
        confidence: pattern.confidence
      };
    }
    
    return null;
  }
  
  savePatterns() {
    const patternsFile = path.join(__dirname, '../../data/dp-learned-patterns.json');
    fs.writeFileSync(patternsFile, JSON.stringify(this.knownPatterns, null, 2));
  }
}

module.exports = { DPLearningSystem };
`;

fs.writeFileSync('.github/scripts/dp-learning-system.js', dpLearner);
console.log(' Created DP learning system for pattern recognition');

console.log('\n All intelligent automation systems created!');
