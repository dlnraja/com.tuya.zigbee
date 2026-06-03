#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const PACKAGE_JSON_PATH = path.join(PROJECT_ROOT, 'package.json');
const APP_JSON_PATH = path.join(PROJECT_ROOT, 'app.json');
const CREDITS_MD_PATH = path.join(PROJECT_ROOT, 'docs', 'CREDITS.md');
const USER_DEVICE_EXPECTATIONS_PATH = path.join(PROJECT_ROOT, 'docs', 'rules', 'USER_DEVICE_EXPECTATIONS.md');
const FORUM_ACTIVITY_REPORT_PATH = path.join(PROJECT_ROOT, '.github', 'state', 'forum-activity-report.json');

// Helper to safely read JSON
function readJson(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e.message);
  }
  return null;
}

// Scrape contributors from text
function scrapeContributorsFromDocs() {
  const contributors = new Set();
  
  // 1. Scrape USER_DEVICE_EXPECTATIONS.md
  try {
    if (fs.existsSync(USER_DEVICE_EXPECTATIONS_PATH)) {
      const content = fs.readFileSync(USER_DEVICE_EXPECTATIONS_PATH, 'utf8');
      // Matches | Username | ...
      const regex = /\|\s*([a-zA-Z0-9_\-\.]+)\s*\|/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        const name = match[1].trim();
        if (name && name !== 'User' && name !== 'Username' && name.length > 2) {
          contributors.add(name);
        }
      }
    }
  } catch (e) {
    console.warn('Could not scrape USER_DEVICE_EXPECTATIONS.md', e.message);
  }

  // 2. Scrape forum report
  const forumReport = readJson(FORUM_ACTIVITY_REPORT_PATH);
  if (forumReport && forumReport.username) {
    contributors.add(forumReport.username);
  }

  return Array.from(contributors).sort();
}

function updatePackageJson(contributors) {
  const pkg = readJson(PACKAGE_JSON_PATH);
  if (!pkg) return false;

  const currentContributors = pkg.contributors || [];
  const currentSet = new Set(currentContributors.map(c => typeof c === 'string' ? c : c.name));

  let added = 0;
  for (const c of contributors) {
    if (!currentSet.has(c)) {
      currentContributors.push(c);
      added++;
    }
  }

  if (added > 0) {
    pkg.contributors = currentContributors;
    fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`✅ Added ${added} new contributors to package.json`);
  } else {
    console.log(`✅ package.json contributors already up to date.`);
  }
  return true;
}

function updateAppJson(contributors) {
  const app = readJson(APP_JSON_PATH);
  if (!app) return false;

  // Add a thank you note to the description or author object
  if (typeof app.author === 'string') {
    app.author = {
      name: app.author,
      email: "support@example.com"
    };
  }

  // Optionally we can add community contributors to a custom field in app.json
  app.communityContributors = contributors;
  
  fs.writeFileSync(APP_JSON_PATH, JSON.stringify(app, null, 2) + '\n');
  console.log(`✅ Updated communityContributors in app.json with ${contributors.length} people.`);
  return true;
}

function updateCreditsMd(contributors) {
  let content = `# Credits & Contributors\n\n> Auto-generated from project analysis.\n> Last updated: ${new Date().toISOString().split('T')[0]}\n\n`;
  content += `A huge thank you to the following community members who have reported issues, provided diagnostic logs, requested devices, or contributed code:\n\n`;
  
  for (const c of contributors) {
    content += `- **${c}**\n`;
  }

  fs.writeFileSync(CREDITS_MD_PATH, content);
  console.log(`✅ Updated docs/CREDITS.md with ${contributors.length} contributors.`);
}

function main() {
  console.log('🤖 Starting Smart Enrichment: Generating Credits...');
  
  const contributors = scrapeContributorsFromDocs();
  
  // Clean up some generic names that might have been caught
  const cleanContributors = contributors.filter(c => 
    !['Action', 'Status', 'Date', 'Type', 'Brand', 'Model', 'ID', 'Note'].includes(c) &&
    !c.toLowerCase().includes('bot')
  );

  console.log(`Found ${cleanContributors.length} unique contributors.`);

  updatePackageJson(cleanContributors);
  updateAppJson(cleanContributors);
  updateCreditsMd(cleanContributors);

  console.log('🎉 Smart Enrichment Credits Update Complete!');
}

main();
