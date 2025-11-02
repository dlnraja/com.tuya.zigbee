#!/usr/bin/env node

/**
 * AUTO-GENERATE CHANGELOG
 * Automatically generate CHANGELOG.md from git commits
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CHANGELOG_FILE = path.join(__dirname, '..', '..', 'CHANGELOG.md');
const APP_JSON = path.join(__dirname, '..', '..', 'app.json');

console.log('\n📝 AUTO-GENERATING CHANGELOG\n');
console.log('═'.repeat(70));

// Get current version
function getCurrentVersion() {
    try {
        const appJson = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
        return appJson.version || '0.0.0';
    } catch (error) {
        return '0.0.0';
    }
}

// Get commits since last version tag
function getCommitsSinceLastTag() {
    try {
        // Get all commits
        const commits = execSync('git log --pretty=format:"%H|||%s|||%ad" --date=short', {
            encoding: 'utf8'
        }).split('\n').filter(Boolean);
        
        return commits.map(line => {
            const [hash, subject, date] = line.split('|||');
            return { hash, subject, date };
        });
    } catch (error) {
        return [];
    }
}

// Categorize commits
function categorizeCommits(commits) {
    const categories = {
        feat: [],
        fix: [],
        docs: [],
        chore: [],
        refactor: [],
        test: [],
        other: []
    };
    
    commits.forEach(commit => {
        const subject = commit.subject;
        
        if (subject.startsWith('feat:') || subject.startsWith('feat(')) {
            categories.feat.push(commit);
        } else if (subject.startsWith('fix:') || subject.startsWith('fix(')) {
            categories.fix.push(commit);
        } else if (subject.startsWith('docs:') || subject.startsWith('docs(')) {
            categories.docs.push(commit);
        } else if (subject.startsWith('chore:') || subject.startsWith('chore(')) {
            categories.chore.push(commit);
        } else if (subject.startsWith('refactor:') || subject.startsWith('refactor(')) {
            categories.refactor.push(commit);
        } else if (subject.startsWith('test:') || subject.startsWith('test(')) {
            categories.test.push(commit);
        } else {
            categories.other.push(commit);
        }
    });
    
    return categories;
}

// Format commit for changelog
function formatCommit(commit) {
    const subject = commit.subject.replace(/^(feat|fix|docs|chore|refactor|test)(\([^\)]+\))?:\s*/, '');
    const shortHash = commit.hash.substring(0, 7);
    return `- ${subject} ([${shortHash}](https://github.com/dlnraja/com.tuya.zigbee/commit/${commit.hash}))`;
}

// Generate changelog section for version
function generateVersionSection(version, commits) {
    const categories = categorizeCommits(commits);
    const date = new Date().toISOString().split('T')[0];
    
    let section = `## [${version}] - ${date}\n\n`;
    
    if (categories.feat.length > 0) {
        section += '### ✨ Features\n\n';
        categories.feat.forEach(commit => {
            section += formatCommit(commit) + '\n';
        });
        section += '\n';
    }
    
    if (categories.fix.length > 0) {
        section += '### 🐛 Bug Fixes\n\n';
        categories.fix.forEach(commit => {
            section += formatCommit(commit) + '\n';
        });
        section += '\n';
    }
    
    if (categories.docs.length > 0) {
        section += '### 📚 Documentation\n\n';
        categories.docs.forEach(commit => {
            section += formatCommit(commit) + '\n';
        });
        section += '\n';
    }
    
    if (categories.refactor.length > 0) {
        section += '### ♻️ Code Refactoring\n\n';
        categories.refactor.forEach(commit => {
            section += formatCommit(commit) + '\n';
        });
        section += '\n';
    }
    
    if (categories.chore.length > 0) {
        section += '### 🔧 Chores\n\n';
        categories.chore.forEach(commit => {
            section += formatCommit(commit) + '\n';
        });
        section += '\n';
    }
    
    if (categories.other.length > 0) {
        section += '### 📦 Other Changes\n\n';
        categories.other.forEach(commit => {
            section += formatCommit(commit) + '\n';
        });
        section += '\n';
    }
    
    return section;
}

// Main execution
const currentVersion = getCurrentVersion();
const commits = getCommitsSinceLastTag();

console.log(`\nCurrent version: ${currentVersion}`);
console.log(`Found ${commits.length} commits\n`);

if (commits.length === 0) {
    console.log('⚠️  No new commits found');
    process.exit(0);
}

// Read existing changelog
let existingChangelog = '';
if (fs.existsSync(CHANGELOG_FILE)) {
    existingChangelog = fs.readFileSync(CHANGELOG_FILE, 'utf8');
}

// Generate new section
const newSection = generateVersionSection(currentVersion, commits);

// Create updated changelog
let updatedChangelog;

if (existingChangelog) {
    // Insert after header
    const headerEnd = existingChangelog.indexOf('\n\n') + 2;
    updatedChangelog = existingChangelog.substring(0, headerEnd) + 
                      newSection + 
                      existingChangelog.substring(headerEnd);
} else {
    // Create new changelog
    updatedChangelog = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

${newSection}`;
}

// Save changelog
fs.writeFileSync(CHANGELOG_FILE, updatedChangelog);

console.log(`✅ CHANGELOG updated: ${CHANGELOG_FILE}`);
console.log(`\n📝 Added section for version ${currentVersion}`);
console.log(`   - ${commits.length} commits processed`);
console.log('\n✅ AUTO-GENERATION COMPLETE!\n');

process.exit(0);
