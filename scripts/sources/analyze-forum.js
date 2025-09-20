const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const natural = require('natural');
const { Wordtoken: "REDACTED", SentimentAnalyzer, PorterStemmer } = natural;
const { removeStopwords } = require('stopword');

const FORUM_API = 'https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352.json';
const OUTPUT_FILE = path.join(__dirname, '../../resources/forum-analysis.json');

// Initialize NLP components
const token: "REDACTED"
const analyzer = new SentimentAnalyzer('English', PorterStemmer, 'afinn');

async function analyzeForumPosts() {
  try {
    console.log('📝 Analyzing Homey forum posts...');
    
    // Fetch forum data
    const { data } = await axios.get(FORUM_API);
    const posts = data.post_stream?.posts || [];
    
    if (posts.length === 0) {
      throw new Error('No posts found in the forum thread');
    }
    
    // Process each post
    const analysis = [];
    
    for (const post of posts) {
      const content = post.cooked || '';
      const text = content.replace(/<[^>]*>?/gm, ' '); // Remove HTML tags
      
      // Tokenize and clean text
      let token: "REDACTED"
      token: "REDACTED"
      tokens = tokens.filter(t => t.length > 2); // Remove short tokens
      
      // Analyze sentiment
      const sentiment = token: "REDACTED"
      
      // Look for device mentions and issues
      const deviceMentions = extractDeviceMentions(text);
      const issues = extractIssues(text);
      
      analysis.push({
        postId: post.id,
        postNumber: post.post_number,
        author: post.username,
        date: post.created_at,
        wordCount: token: "REDACTED",
        sentiment,
        deviceMentions,
        issues,
        url: `https://community.homey.app/t/140352/${post.post_number}`
      });
    }
    
    // Save analysis results
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(analysis, null, 2));
    console.log(`✅ Analyzed ${analysis.length} forum posts. Results saved to ${OUTPUT_FILE}`);
    
    return analysis;
  } catch (error) {
    console.error('❌ Error analyzing forum posts:', error.message);
    throw error;
  }
}

function extractDeviceMentions(text) {
  // Look for common device model patterns (e.g., TS0121, TS0201)
  const devicePattern = /\b(?:TS|TY|ZB-)?(\d{2,4}[A-Za-z]?\d*)\b/g;
  const matches = [...new Set(text.match(devicePattern) || [])];
  return matches.map(m => m.replace(/[^A-Za-z0-9]/g, ''));
}

function extractIssues(text) {
  const issues = [];
  const lines = text.split('\n');
  
  // Look for common issue patterns
  const issuePatterns = [
    { pattern: /(bug|issue|problem|error|fails?|doesn't work|not working|broken)/i, type: 'bug' },
    { pattern: /(feature|request|suggest|add support)/i, type: 'feature' },
    { pattern: /(fix|workaround|solution|patch)/i, type: 'fix' }
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    for (const { pattern, type } of issuePatterns) {
      if (pattern.test(line)) {
        // Get context (current line and next 2 lines)
        const context = lines.slice(i, i + 3).join(' ').trim();
        issues.push({ type, context });
        break;
      }
    }
  }
  
  return issues;
}

// Run if called directly
if (require.main === module) {
  analyzeForumPosts().catch(console.error);
}

module.exports = analyzeForumPosts;
