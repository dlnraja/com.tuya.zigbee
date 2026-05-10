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
 *   node .github/scripts/internet-research-tool.js homeyforum "140352"
 *   node .github/scripts/internet-research-tool.js gh-issues
 *   node .github/scripts/internet-research-tool.js gh-prs
 *   node .github/scripts/internet-research-tool.js blakadder "TZE200"
 *   node .github/scripts/internet-research-tool.js z2m "TS0601"
 *   node .github/scripts/internet-research-tool.js collect
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

// Recursively scan Markdown and TXT files and extract all URLs matching http:// or https://
function extractUrlsFromFiles() {
  const urls = new Map(); // url -> Array of files it appeared in
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
        if (['.md', '.txt'].includes(ext)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const matches = content.match(/https?:\/\/[^\s)\]"\']+/gi);
            if (matches) {
              for (let url of matches) {
                // Clean trailing characters like punctuation, etc.
                url = url.replace(/[.,;:]+$/, '');
                // Skip local paths or schema references or generic test paths
                if (url.includes('127.0.0.1') || url.includes('localhost') || url.includes('schemas.xml') || url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.js')) continue;
                
                const relPath = path.relative(rootDir, fullPath);
                if (!urls.has(url)) {
                  urls.set(url, []);
                }
                if (!urls.get(url).includes(relPath)) {
                  urls.get(url).push(relPath);
                }
              }
            }
          } catch (e) {
            // Skip unreadable files
          }
        }
      }
    }
  }
  
  scanDir(rootDir);
  return urls;
}

// Help documentation
function printHelp() {
  console.log(`
🛡️  INTERNET RESEARCH TOOL — CLI ASSISTANT
===========================================================
A native dependency-free script for web search, document retrieval,
forum scanning, and workspace asset indexing.

Usage:
  node .github/scripts/internet-research-tool.js <command> [argument]

Commands:
  search <query>     Perform a general web search on DuckDuckGo
  reddit <query>     Filter search specifically for Reddit discussion threads
  twitter <query>    Filter search specifically for Twitter/X posts
  github <query>     Filter search specifically for GitHub issues and code
  fetch <url>        Download any webpage and parse it to clean Markdown
  scan <term>        Locate files in the repository matching any keyword
  urls               Extract and list all external references/URLs in project files
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

  if (cmd === 'help' || (!arg && !['urls', 'collect', 'gh-issues', 'gh-prs'].includes(cmd))) {
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

      case 'urls': {
        console.log(`🔗 [Project URL Extractor] Extracting reference links from workspace...\n`);
        const urlsMap = extractUrlsFromFiles();
        if (!urlsMap.size) {
          console.log('No external URLs found.');
          return;
        }
        console.log(`Extracted ${urlsMap.size} unique URL(s):\n`);
        const sortedUrls = [...urlsMap.keys()].sort();
        sortedUrls.forEach((u, idx) => {
          console.log(`[${idx + 1}] ${u}`);
          console.log(`    Cross-referenced in:`);
          urlsMap.get(u).slice(0, 5).forEach(f => console.log(`      - ${f}`));
          if (urlsMap.get(u).length > 5) {
            console.log(`      - ... and ${urlsMap.get(u).length - 5} other file(s)`);
          }
          console.log();
        });
        break;
      }

      case 'homeyforum': {
        console.log(`🏠 [Homey Forum Scraper] Fetching thread content: ${arg}...\n`);
        const forumUrl = arg.includes('community.homey.app') ? arg
          : `https://community.homey.app/t/${arg}`;
        const html = await fetchUrl(forumUrl);
        const posts = [];
        const postBlocks = html.split(/class="topic-body"|"post"/i);
        for (let i = 1; i < postBlocks.length && i <= 20; i++) {
          const block = postBlocks[i];
          const authorMatch = block.match(/class="[^"]*names[^"]*"[^>]*>([^<]+)/i);
          const dateMatch = block.match(/datetime="([^"]+)"/i);
          const contentMatch = block.match(/class="[^"]*post[^"]*cooked[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
          if (contentMatch) {
            const text = contentMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            posts.push({
              author: authorMatch ? authorMatch[1].trim() : 'Unknown',
              date: dateMatch ? dateMatch[1] : 'Unknown',
              text: text.substring(0, 500)
            });
          }
        }
        if (!posts.length) { console.log('No posts parsed from forum thread.'); return; }
        posts.forEach((p, i) => console.log(`[${i + 1}] ${p.author} (${p.date}):\n    ${p.text}\n`));
        break;
      }

      case 'gh-issues':
      case 'gh-prs': {
        const isPRs = cmd === 'gh-prs';
        const repo = arg || 'dlnraja/com.tuya.zigbee';
        const apiUrl = `https://api.github.com/repos/${repo}/${isPRs ? 'pulls' : 'issues'}?state=all&per_page=30&sort=updated`;
        console.log(`🐙 [GitHub ${isPRs ? 'PRs' : 'Issues'}] Fetching from ${repo}...\n`);
        const json = await fetchUrl(apiUrl, { headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'universal-tuya-research' } });
        const items = JSON.parse(json);
        if (!items.length) { console.log('No items found.'); return; }
        items.forEach((item, idx) => {
          const state = item.state === 'open' ? '🟢' : '🔴';
          console.log(`${state} [${item.number}] ${item.title}`);
          console.log(`    Author: ${item.user?.login || 'N/A'} | Updated: ${item.updated_at?.substring(0, 10)}`);
          if (item.labels?.length) console.log(`    Labels: ${item.labels.map(l => l.name).join(', ')}`);
          console.log();
        });
        break;
      }

      case 'blakadder': {
        const query = arg || '';
        console.log(`📡 [Blakadder Scraper] Searching devices for: "${query}"...\n`);
        const blUrl = query
          ? `https://zigbee.blakadder.com/search.html?q=${encodeURIComponent(query)}`
          : 'https://zigbee.blakadder.com/all.html';
        const html = await fetchUrl(blUrl);
        const devices = [];
        const linkRegex = /href="([^"]*\.html)"[^>]*>([^<]+)</g;
        let match;
        while ((match = linkRegex.exec(html)) !== null) {
          const href = match[1];
          const name = match[2].trim();
          if (href.includes('/') && name.length > 2 && !href.includes('index')) {
            devices.push({ name, url: `https://zigbee.blakadder.com/${href}` });
          }
        }
        const unique = [...new Map(devices.map(d => [d.name, d])).values()].slice(0, 30);
        unique.forEach((d, i) => console.log(`[${i + 1}] ${d.name}\n    ${d.url}`));
        break;
      }

      case 'z2m': {
        const query = arg || 'tuya';
        console.log(`⚡ [Z2M Converters] Searching for: "${query}"...\n`);
        const z2mUrl = `https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts`;
        const tsSource = await fetchUrl(z2mUrl);
        const matches = [];
        const modelRegex = new RegExp(`model:\\s*'([^']*${query}[^']*)'|vendor:\\s*'([^']*${query}[^']*)'`, 'gi');
        let m;
        while ((m = modelRegex.exec(tsSource)) !== null) {
          const ctx = tsSource.substring(Math.max(0, m.index - 200), Math.min(tsSource.length, m.index + 200));
          const modelMatch = ctx.match(/model:\s*'([^']+)'/);
          const vendorMatch = ctx.match(/vendor:\s*'([^']+)'/);
          matches.push({ model: modelMatch?.[1] || 'N/A', vendor: vendorMatch?.[1] || 'N/A' });
        }
        const uniqModels = [...new Map(matches.map(m => [m.model, m])).values()].slice(0, 20);
        uniqModels.forEach((m, i) => console.log(`[${i + 1}] ${m.vendor} / ${m.model}`));
        break;
      }

      case 'collect': {
        console.log(`🔄 [Aggregated Collector] Running full scan of project, forums, GitHub, Blakadder, Z2M...\n`);
        const output = { timestamp: new Date().toISOString(), projectUrls: {}, github: { issues: [], prs: [] }, blakadder: [], z2m: [] };
        // 1. Project URLs
        const urlsMap = extractUrlsFromFiles();
        output.projectUrls = { count: urlsMap.size, topUrls: [...urlsMap.keys()].slice(0, 50) };
        // 2. GitHub Issues
        try {
          const ghJson = await fetchUrl('https://api.github.com/repos/dlnraja/com.tuya.zigbee/issues?state=open&per_page=20', { headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'universal-tuya-research' } });
          output.github.issues = JSON.parse(ghJson).map(i => ({ number: i.number, title: i.title, updated: i.updated_at }));
        } catch (e) { output.github.issuesError = e.message; }
        // 3. GitHub PRs
        try {
          const prJson = await fetchUrl('https://api.github.com/repos/dlnraja/com.tuya.zigbee/pulls?state=open&per_page=20', { headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'universal-tuya-research' } });
          output.github.prs = JSON.parse(prJson).map(p => ({ number: p.number, title: p.title, updated: p.updated_at }));
        } catch (e) { output.github.prsError = e.message; }
        // Save report
        const reportPath = path.join(__dirname, '..', '..', 'tmp', 'research-collect-report.json');
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
        fs.writeFileSync(reportPath, JSON.stringify(output, null, 2));
        console.log(`✅ Aggregated report saved to: ${reportPath}`);
        console.log(`   Project URLs: ${output.projectUrls.count}`);
        console.log(`   GitHub Issues: ${output.github.issues.length}`);
        console.log(`   GitHub PRs: ${output.github.prs.length}`);
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
