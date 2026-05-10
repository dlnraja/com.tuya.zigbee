#!/usr/bin/env node
/**
 * 🌐 INTERNET RESEARCH TOOL — Universal Scraper & Indexer
 * -----------------------------------------------------------
 * A completely dependency-free, high-fidelity utility for Node.js.
 * Enables web search, targeted social/forum scraper (Reddit, Twitter/X, GitHub),
 * raw HTML-to-Markdown document parsing, and local asset tracing.
 *
 * Usage:
 *   node .github/scripts/internet-research-tool.js search "TS0601 _TZE200_hl0ss9oa"
 *   node .github/scripts/internet-research-tool.js reddit "tuya smart plug disconnect"
 *   node .github/scripts/internet-research-tool.js fetch "https://www.zigbee2mqtt.io/devices/TS0601.html"
 *   node .github/scripts/internet-research-tool.js scan "Switch3GangDevice"
 */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const urlModule = require('url');

// Clean and decode HTML entities from scraped content
function cleanHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ndash;/g, '-')
    .replace(/&mdash;/g, '-')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}

// Custom fetcher with automatic redirects, headers, and timeout
function fetchUrl(urlStr, options = {}) {
  const parsedUrl = urlModule.parse(urlStr);
  const reqOptions = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
    path: parsedUrl.path,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      ...options.headers
    },
    timeout: 15000,
  };

  return new Promise((resolve, reject) => {
    const req = https.request(reqOptions, (res) => {
      // Handle HTTP redirects (301, 302, 303, 307, 308)
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        if (res.headers.location) {
          const redirectUrl = urlModule.resolve(urlStr, res.headers.location);
          return fetchUrl(redirectUrl, options).then(resolve, reject);
        }
      }

      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`HTTP ${res.statusCode} for ${urlStr}`));
      }

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer.toString('utf8'));
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${urlStr}`));
    });
    req.end();
  });
}

// Scrape DuckDuckGo HTML-only search results
async function searchDuckDuckGo(query) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  try {
    const html = await fetchUrl(url);
    const results = [];
    const resultBlocks = html.split('<div class="result');
    
    // Skip first block (header)
    for (let i = 1; i < resultBlocks.length; i++) {
      const block = resultBlocks[i];
      
      const urlMatch = block.match(/href="([^"]+)"[^>]*class="[^"]*result__url[^"]*"/i) 
                    || block.match(/class="[^"]*result__snippet[^"]*"[^>]*href="([^"]+)"/i)
                    || block.match(/href="([^"]+)"[^>]*class="[^"]*result__snippet[^"]*"/i);
                    
      const titleMatch = block.match(/class="[^"]*result__title[^"]*"[^>]*>([\s\S]*?)<\/a>/i)
                      || block.match(/class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
                      
      const snippetMatch = block.match(/class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
      
      if (urlMatch) {
        let resUrl = urlMatch[1];
        if (resUrl.includes('uddg=')) {
          const uIdx = resUrl.indexOf('uddg=');
          resUrl = decodeURIComponent(resUrl.substring(uIdx + 5).split('&')[0]);
        }
        if (resUrl.startsWith('//')) {
          resUrl = 'https:' + resUrl;
        }
        
        let title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'No Title';
        title = cleanHtmlEntities(title);
        
        let snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '';
        snippet = cleanHtmlEntities(snippet);
        
        results.push({ title, url: resUrl, snippet });
      }
    }
    return results;
  } catch (e) {
    throw new Error(`DuckDuckGo query failed: ${e.message}`);
  }
}

// Target search queries to social networks or forums
async function searchSocialMedia(platform, query) {
  let siteFilter = '';
  if (platform === 'reddit') siteFilter = 'site:reddit.com';
  else if (platform === 'twitter' || platform === 'x') siteFilter = 'site:twitter.com OR site:x.com';
  else if (platform === 'github') siteFilter = 'site:github.com';
  
  const fullQuery = siteFilter ? `${siteFilter} ${query}` : query;
  return searchDuckDuckGo(fullQuery);
}

// Convert HTML body into high-fidelity markdown-like text
function parseWebpageText(html) {
  let text = html
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '');
    
  text = text
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n* $1')
    .replace(/<br\s*\/?>/gi, '\n');
    
  text = text.replace(/<[^>]+>/g, ' ');
  text = cleanHtmlEntities(text);
  
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
}

// Recursively locate files in the workspace matching keyword
function findProjectResources(term) {
  const results = [];
  const rootDir = path.join(__dirname, '..', '..');
  
  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (['node_modules', '.git', '.gemini', 'screenshots', 'tmp'].includes(file)) continue;
      
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (stat.isFile()) {
        const ext = path.extname(file).toLowerCase();
        if (['.js', '.json', '.md', '.compose', '.txt', '.sh'].includes(ext)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.toLowerCase().includes(term.toLowerCase())) {
              const relPath = path.relative(rootDir, fullPath);
              results.push(relPath);
            }
          } catch (e) {
            // Skip unreadable files
          }
        }
      }
    }
  }
  scanDir(rootDir);
  return results;
}

// Help documentation
function printHelp() {
  console.log(`
🛡️  INTERNET RESEARCH TOOL — CLI ASSISTANT
===========================================================
A native dependency-free script for web search, document retrieval,
forum scanning, and workspace asset indexing.

Usage:
  node .github/scripts/internet-research-tool.js <command> <argument>

Commands:
  search <query>     Perform a general web search on DuckDuckGo
  reddit <query>     Filter search specifically for Reddit discussion threads
  twitter <query>    Filter search specifically for Twitter/X posts
  github <query>     Filter search specifically for GitHub issues and code
  fetch <url>        Download any webpage and parse it to clean Markdown
  scan <term>        Locate files in the repository matching any keyword
  help               Print this usage documentation
  `);
}

// Main CLI Coordinator
async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    printHelp();
    return;
  }

  const cmd = args[0].toLowerCase();
  const arg = args.slice(1).join(' ');

  if (cmd === 'help' || !arg) {
    printHelp();
    return;
  }

  try {
    switch (cmd) {
      case 'search': {
        console.log(`🔍 [Web Search] Querying: "${arg}"...\n`);
        const results = await searchDuckDuckGo(arg);
        if (!results.length) {
          console.log('No results found.');
          return;
        }
        results.forEach((r, idx) => {
          console.log(`[${idx + 1}] ${r.title}`);
          console.log(`    URL: ${r.url}`);
          console.log(`    Snippet: ${r.snippet}\n`);
        });
        break;
      }
      
      case 'reddit':
      case 'twitter':
      case 'x':
      case 'github': {
        console.log(`🌐 [Social Search] Filtering site for ${cmd.toUpperCase()} with query: "${arg}"...\n`);
        const results = await searchSocialMedia(cmd === 'x' ? 'twitter' : cmd, arg);
        if (!results.length) {
          console.log('No results found.');
          return;
        }
        results.forEach((r, idx) => {
          console.log(`[${idx + 1}] ${r.title}`);
          console.log(`    URL: ${r.url}`);
          console.log(`    Snippet: ${r.snippet}\n`);
        });
        break;
      }
      
      case 'fetch': {
        console.log(`📥 [Scraper] Downloading and formatting document: ${arg}...\n`);
        const html = await fetchUrl(arg);
        const mdText = parseWebpageText(html);
        console.log('=================== RENDERED DOCUMENT ===================');
        console.log(mdText);
        console.log('=========================================================');
        break;
      }
      
      case 'scan': {
        console.log(`📂 [Workspace Indexer] Scanning for files containing: "${arg}"...\n`);
        const matchedFiles = findProjectResources(arg);
        if (!matchedFiles.length) {
          console.log('No matching files found in the project.');
          return;
        }
        console.log(`Found ${matchedFiles.length} file(s):`);
        matchedFiles.forEach(f => console.log(`  - ${f}`));
        break;
      }

      default:
        console.log(`Unknown command: "${cmd}"`);
        printHelp();
    }
  } catch (error) {
    console.error(`❌ Action failed: ${error.message}`);
    process.exit(1);
  }
}

main();
