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
const natural = require('natural');
const fs = require('fs').promises;

async function fetchHomeyForum() {
  try {
    const response = await axios.get('https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352.json');
    const tokenizer = new natural.WordTokenizer();
    const issues = [];
    response.data.post_stream.posts.forEach(post => {
      const tokens = tokenizer.tokenize(post.cooked);
      if (tokens.includes('bug') || tokens.includes('issue') || tokens.includes('problem')) {
        issues.push({ id: post.id, content: post.cooked });
      }
    });
    await fs.writeFile('resources/forum-issues.json', JSON.stringify(issues, null, 2));
    console.log('Homey forum issues saved');
  } catch (error) {
    console.error('Error fetching Homey forum issues:', error.message);
  }
}

fetchHomeyForum();
