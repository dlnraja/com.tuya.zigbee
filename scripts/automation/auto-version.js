#!/usr/bin/env node

/**
 * AUTO-UPDATE VERSION NUMBERS
 * Automatically increment version based on commit types
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const APP_JSON = path.join(__dirname, '..', '..', 'app.json');

console.log('\n🔢 AUTO-VERSION UPDATE\n');
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

// Parse version
function parseVersion(version) {
    const parts = version.split('.').map(Number);
    return {
        major: parts[0] || 0,
        minor: parts[1] || 0,
        patch: parts[2] || 0
    };
}

// Get commits since last tag
function getCommitsSinceLastVersion() {
    try {
        const commits = execSync('git log --pretty=format:"%s" HEAD~10..HEAD', {
            encoding: 'utf8'
        }).split('\n').filter(Boolean);
        
        return commits;
    } catch (error) {
        return [];
    }
}

// Determine version bump type
function determineBumpType(commits) {
    let bumpType = 'patch'; // default
    
    for (const commit of commits) {
        const lower = commit.toLowerCase();
        
        // Major version indicators
        if (lower.includes('breaking change') || 
            lower.includes('breaking:') ||
            lower.includes('major:')) {
            return 'major';
        }
        
        // Minor version indicators
        if (lower.startsWith('feat:') || 
            lower.startsWith('feat(') ||
            lower.includes('feature:')) {
            bumpType = 'minor';
        }
        
        // Patch is default (fix, chore, docs, etc.)
    }
    
    return bumpType;
}

// Increment version
function incrementVersion(version, bumpType) {
    const parsed = parseVersion(version);
    
    switch (bumpType) {
        case 'major':
            parsed.major++;
            parsed.minor = 0;
            parsed.patch = 0;
            break;
        case 'minor':
            parsed.minor++;
            parsed.patch = 0;
            break;
        case 'patch':
        default:
            parsed.patch++;
            break;
    }
    
    return `${parsed.major}.${parsed.minor}.${parsed.patch}`;
}

// Update app.json version
function updateAppJsonVersion(newVersion) {
    try {
        const appJson = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
        appJson.version = newVersion;
        fs.writeFileSync(APP_JSON, JSON.stringify(appJson, null, 2));
        return true;
    } catch (error) {
        console.error(`❌ Error updating app.json: ${error.message}`);
        return false;
    }
}

// Create git tag
function createGitTag(version) {
    try {
        execSync(`git tag -a v${version} -m "Release v${version}"`, {
            stdio: 'ignore'
        });
        console.log(`✅ Created git tag: v${version}`);
        return true;
    } catch (error) {
        console.log(`⚠️  Could not create git tag: ${error.message}`);
        return false;
    }
}

// Main execution
const currentVersion = getCurrentVersion();
const commits = getCommitsSinceLastVersion();

console.log(`\nCurrent version: ${currentVersion}`);
console.log(`Analyzing ${commits.length} recent commits...\n`);

if (commits.length === 0) {
    console.log('⚠️  No commits found for analysis');
    console.log(`Keeping version: ${currentVersion}\n`);
    process.exit(0);
}

// Determine bump type
const bumpType = determineBumpType(commits);
const newVersion = incrementVersion(currentVersion, bumpType);

console.log(`Bump type: ${bumpType}`);
console.log(`New version: ${currentVersion} → ${newVersion}\n`);

// Update version
if (updateAppJsonVersion(newVersion)) {
    console.log(`✅ app.json updated to ${newVersion}`);
    
    // Create git tag
    createGitTag(newVersion);
    
    console.log('\n✅ VERSION UPDATE COMPLETE!\n');
    
    // Output for GitHub Actions
    if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(
            process.env.GITHUB_OUTPUT,
            `new_version=${newVersion}\n`
        );
        fs.appendFileSync(
            process.env.GITHUB_OUTPUT,
            `old_version=${currentVersion}\n`
        );
        fs.appendFileSync(
            process.env.GITHUB_OUTPUT,
            `bump_type=${bumpType}\n`
        );
    }
} else {
    console.log('\n❌ VERSION UPDATE FAILED\n');
    process.exit(1);
}

process.exit(0);
