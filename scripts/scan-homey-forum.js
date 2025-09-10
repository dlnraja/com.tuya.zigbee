#!/usr/bin/env node
// Fallback implementations for missing dependencies

const https = require('https');
const http = require('http');
// Fallback HTTP client
const axios = {
  get: (url) => new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ data }));
    }).on('error', reject);
  })
};

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const natural = require('natural');
const { WordTokenizer, PorterStemmer } = natural;
const tokenizer = new WordTokenizer();

const OUTPUT_FILE = path.join(__dirname, '..', 'resources', 'forum-issues.json');
const FORUM_URL = 'https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352';

// Keywords to identify relevant posts
const KEYWORDS = [
  'bug', 'issue', 'fix', 'patch', 'workaround', 'problem', 'error',
  'not working', 'doesn\'t work', 'broken', 'crash', 'fail', 'tuya', 'zigbee'
];

// Initialize stemmer and keywords
const stemmer = PorterStemmer;
const stemmedKeywords = KEYWORDS.map(kw => 
  tokenizer.tokenize(kw).map(token => stemmer.stem(token)).join(' ')
);

/**
 * Check if a post contains relevant keywords
 */
function isRelevantPost(content) {
  if (!content) return false;
  
  const tokens = tokenizer.tokenize(content.toLowerCase());
  const stemmedTokens = tokens.map(token => stemmer.stem(token));
  const stemmedContent = stemmedTokens.join(' ');
  
  return stemmedKeywords.some(keyword => 
    stemmedContent.includes(keyword)
  );
}

/**
 * Extract potential patches from text
 */
function extractPatches(text) {
  const patches = [];
  const lines = text.split('\n');
  
  // Look for common patch patterns
  const patchPatterns = [
    /(?:fix|patch|workaround)[^.:!?]*?:\s*([^.!?]+)/gi,
    /(?:change|modify|update).*?to\s*([^.!?]+)/gi,
    /(?:use|try|set)\s+([^.!?]+?)(?:\s+instead|\s+to\s+fix)/gi
  ];
  
  for (const line of lines) {
    for (const pattern of patchPatterns) {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const patch = match[1]?.trim();
        if (patch && patch.length > 10) { // Filter out very short matches
          patches.push(patch);
        }
      }
    }
  }
  
  return [...new Set(patches)]; // Remove duplicates
}

/**
 * Fetch and process forum posts
 */
async function fetchForumPosts() {
  try {
    console.log('🌐 Fetching forum posts from Homey Community...');
    
    // This is a simplified example - in a real scenario, you'd need to handle pagination
    const response = await axios.get(`${FORUM_URL}.json`);
    const { post_stream } = response.data;
    
    if (!post_stream || !post_stream.posts) {
      throw new Error('Invalid forum response format');
    }
    
    const relevantPosts = [];
    
    // Process each post
    for (const post of post_stream.posts) {
      if (post.cooked && isRelevantPost(post.cooked)) {
        const dom = new JSDOM(`<!DOCTYPE html><body>${post.cooked}</body>`);
        const textContent = dom.window.document.body.textContent || '';
        
        // Extract potential patches
        const patches = extractPatches(textContent);
        
        if (patches.length > 0 || isRelevantPost(textContent)) {
          relevantPosts.push({
            id: post.id,
            username: post.username,
            createdAt: post.created_at,
            url: `${FORUM_URL}/${post.post_number}`,
            text: textContent.substring(0, 500) + '...', // Truncate long posts
            patches,
            source: 'homey_forum',
            timestamp: new Date().toISOString()
          });
        }
      }
    }
    
    // Save to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(relevantPosts, null, 2));
    console.log(`✅ Saved ${relevantPosts.length} relevant posts to ${OUTPUT_FILE}`);
    
    return relevantPosts;
  } catch (error) {
    console.error('❌ Error fetching forum posts:', error.message);
    
    // If we have a previous version, return that instead of failing
    if (fs.existsSync(OUTPUT_FILE)) {
      console.log('Using cached version instead');
      return JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    }
    
    throw error;
  }
}

// Run the function if this file is executed directly
if (require.main === module) {
  fetchForumPosts().catch(console.error);
}

module.exports = fetchForumPosts;
