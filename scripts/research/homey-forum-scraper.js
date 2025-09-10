const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { URL } = require('url');

// Configuration
const OUTPUT_DIR = path.join(__dirname, '../../research/homey-forum');
const BASE_URL = 'https://community.athom.com';
const SEARCH_URL = `${BASE_URL}/search?q=tuya%20zigbee`;
const MAX_PAGES = 10; // Number of search result pages to scrape
const DELAY_BETWEEN_REQUESTS = 2000; // ms

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Fetches a web page and returns its HTML content
 */
async function fetchPage(url) {
  try {
    console.log(`🌐 Fetching: ${url}`);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 30000
    });
    
    return response.data;
  } catch (error) {
    console.error(`❌ Error fetching ${url}:`, error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
    }
    return null;
  }
}

/**
 * Extracts topic URLs from search results page
 */
function extractTopicLinks(html) {
  const $ = cheerio.load(html);
  const links = [];
  
  // Find all topic links in search results
  $('.search-results .search-result a.title').each((i, element) => {
    const href = $(element).attr('href');
    if (href && href.startsWith('/t/')) {
      links.push(new URL(href, BASE_URL).href);
    }
  });
  
  return links;
}

/**
 * Extracts device information from a forum topic
 */
function extractDeviceInfo(html, url) {
  const $ = cheerio.load(html);
  const info = {
    url,
    title: $('h1.fancy-title').text().trim(),
    author: $('.topic-meta .creator .names span:first').text().trim(),
    date: $('.topic-meta .post-date').attr('title') || $('.topic-meta .post-date').text().trim(),
    content: $('.topic-body .post').first().text().trim().replace(/\s+/g, ' '),
    devices: [],
    tags: [],
    replies: []
  };
  
  // Extract tags
  $('.topic-tags .discourse-tag').each((i, element) => {
    info.tags.push($(element).text().trim());
  });
  
  // Extract device mentions (simplified example - would need refinement)
  const deviceRegex = /(TS\d{4}[A-Z]?|tuya[\s-]?[a-z0-9]+)/gi;
  const deviceMatches = info.content.match(deviceRegex) || [];
  info.devices = [...new Set(deviceMatches)]; // Remove duplicates
  
  // Extract replies
  $('.topic-post').slice(1).each((i, element) => {
    const $post = $(element);
    info.replies.push({
      author: $post.find('.poster .names .first a').text().trim(),
      date: $post.find('.post-date').attr('title') || $post.find('.post-date').text().trim(),
      content: $post.find('.post-content').text().trim().replace(/\s+/g, ' ')
    });
  });
  
  return info;
}

/**
 * Saves the extracted information to a JSON file
 */
function saveResults(data, filename) {
  const filePath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`💾 Saved ${data.length} items to ${filePath}`);
}

/**
 * Delays execution for the specified number of milliseconds
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main function to scrape the Homey forum
 */
async function scrapeHomeyForum() {
  try {
    console.log('🚀 Starting Homey forum scraper...');
    
    // Array to store all topic links
    const allTopicLinks = [];
    
    // Scrape multiple pages of search results
    for (let page = 1; page <= MAX_PAGES; page++) {
      console.log(`📄 Processing search page ${page}...`);
      const searchUrl = `${SEARCH_URL}&page=${page}`;
      const html = await fetchPage(searchUrl);
      
      if (!html) {
        console.warn(`Skipping page ${page} due to error`);
        continue;
      }
      
      const topicLinks = extractTopicLinks(html);
      if (topicLinks.length === 0) break; // No more results
      
      allTopicLinks.push(...topicLinks);
      console.log(`Found ${topicLinks.length} topics on page ${page}`);
      
      // Be nice to the server
      await delay(DELAY_BETWEEN_REQUESTS);
    }
    
    // Remove duplicate topic links
    const uniqueTopicLinks = [...new Set(allTopicLinks)];
    console.log(`\n🔍 Found ${uniqueTopicLinks.length} unique topics to process`);
    
    // Scrape each topic
    const topicData = [];
    for (const [index, topicUrl] of uniqueTopicLinks.entries()) {
      console.log(`\n📝 Processing topic ${index + 1}/${uniqueTopicLinks.length}: ${topicUrl}`);
      
      const html = await fetchPage(topicUrl);
      if (!html) continue;
      
      const topicInfo = extractDeviceInfo(html, topicUrl);
      topicData.push(topicInfo);
      
      // Save progress after each topic
      if (topicData.length % 5 === 0) {
        saveResults(topicData, `homey-forum-topics-${topicData.length}.json`);
      }
      
      // Be nice to the server
      await delay(DELAY_BETWEEN_REQUESTS);
    }
    
    // Save final results
    saveResults(topicData, 'homey-forum-topics-final.json');
    console.log('\n✅ Forum scraping completed successfully!');
    
    return topicData;
    
  } catch (error) {
    console.error('❌ Error during scraping:', error);
    throw error;
  }
}

// Run the scraper
scrapeHomeyForum().catch(console.error);
