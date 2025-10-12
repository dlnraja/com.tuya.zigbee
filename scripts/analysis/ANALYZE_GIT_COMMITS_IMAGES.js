#!/usr/bin/env node
'use strict';

/**
 * ANALYZE GIT COMMITS - IMAGES
 * 
 * Analyse les commits Git pour trouver:
 * - Quand les images étaient bonnes
 * - Quand ça a cassé
 * - Quels changements ont causé les problèmes
 */

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

function execGit(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch (err) {
    return null;
  }
}

function getRecentCommits(count = 50) {
  const output = execGit(`git log -${count} --pretty=format:"%H|%s|%ai|%an"`);
  if (!output) return [];
  
  return output.split('\n').map(line => {
    const [hash, subject, date, author] = line.split('|');
    return { hash, subject, date, author };
  });
}

function getCommitDiff(hash, filepath) {
  return execGit(`git show ${hash}:${filepath}`);
}

function getChangedFiles(hash) {
  const output = execGit(`git diff-tree --no-commit-id --name-only -r ${hash}`);
  return output ? output.split('\n').filter(Boolean) : [];
}

async function analyzeCommit(commit) {
  const changedFiles = getChangedFiles(commit.hash);
  
  // Filtrer les fichiers liés aux images
  const imageChanges = changedFiles.filter(f => 
    f.endsWith('.png') || 
    f.includes('assets/images') ||
    f.includes('driver') && f.includes('assets')
  );
  
  const appJsonChanged = changedFiles.includes('app.json');
  const homeycomposeChanged = changedFiles.some(f => f.includes('.homeycompose'));
  
  const validationChanges = changedFiles.filter(f => 
    f.includes('validate') || 
    f.includes('FIX') ||
    f.includes('IMAGE')
  );
  
  return {
    commit,
    imageChanges: imageChanges.length,
    imageFiles: imageChanges,
    appJsonChanged,
    homeycomposeChanged,
    validationChanges,
    totalChanges: changedFiles.length
  };
}

function searchForKeywords(commits, keywords) {
  return commits.filter(c => {
    const text = `${c.subject} ${c.author}`.toLowerCase();
    return keywords.some(kw => text.includes(kw.toLowerCase()));
  });
}

async function main() {
  console.log('🔍 GIT COMMITS ANALYZER - IMAGES\n');
  console.log('='.repeat(60));
  console.log();
  
  console.log('📊 Fetching recent commits...\n');
  const commits = getRecentCommits(100);
  console.log(`Found ${commits.length} recent commits\n`);
  
  // Rechercher les commits liés aux images
  const imageKeywords = ['image', 'fix', 'validation', 'assets', 'png', 'size'];
  const imageCommits = searchForKeywords(commits, imageKeywords);
  
  console.log(`📸 Commits mentioning images: ${imageCommits.length}\n`);
  
  // Analyser chaque commit d'image
  const analyses = [];
  for (const commit of imageCommits.slice(0, 20)) {
    const analysis = await analyzeCommit(commit);
    analyses.push(analysis);
  }
  
  // Trouver les commits avec beaucoup de changements d'images
  const significantImageChanges = analyses.filter(a => a.imageChanges > 5);
  
  console.log('🎯 SIGNIFICANT IMAGE CHANGES:\n');
  significantImageChanges.forEach(a => {
    console.log(`Commit: ${a.commit.hash.substring(0, 8)}`);
    console.log(`Date: ${a.commit.date}`);
    console.log(`Subject: ${a.commit.subject}`);
    console.log(`Image changes: ${a.imageChanges}`);
    console.log(`App.json changed: ${a.appJsonChanged}`);
    if (a.imageFiles.length > 0 && a.imageFiles.length <= 10) {
      console.log('Files:');
      a.imageFiles.forEach(f => console.log(`  - ${f}`));
    }
    console.log();
  });
  
  // Trouver les commits de validation
  const validationCommits = analyses.filter(a => a.validationChanges.length > 0);
  
  console.log('✅ VALIDATION-RELATED COMMITS:\n');
  validationCommits.slice(0, 10).forEach(a => {
    console.log(`${a.commit.hash.substring(0, 8)} - ${a.commit.subject}`);
    console.log(`  Date: ${a.commit.date}`);
    console.log(`  Validation files: ${a.validationChanges.join(', ')}`);
    console.log();
  });
  
  // Chercher "success" vs "failed"
  const successCommits = searchForKeywords(commits, ['success', 'validated', 'publish']);
  const failedCommits = searchForKeywords(commits, ['failed', 'error', 'fix', 'issue']);
  
  console.log('📊 COMMIT PATTERNS:\n');
  console.log(`✅ Success/Validated: ${successCommits.length}`);
  console.log(`❌ Failed/Error/Fix: ${failedCommits.length}`);
  console.log();
  
  // Derniers commits de succès
  console.log('🎉 RECENT SUCCESS COMMITS:\n');
  successCommits.slice(0, 5).forEach(c => {
    console.log(`${c.hash.substring(0, 8)} - ${c.subject}`);
    console.log(`  Date: ${c.date}`);
    console.log();
  });
  
  // Générer rapport
  const report = {
    analyzedAt: new Date().toISOString(),
    totalCommits: commits.length,
    imageRelatedCommits: imageCommits.length,
    significantImageChanges: significantImageChanges.map(a => ({
      hash: a.commit.hash,
      subject: a.commit.subject,
      date: a.commit.date,
      imageChanges: a.imageChanges,
      files: a.imageFiles
    })),
    successCommits: successCommits.slice(0, 10).map(c => ({
      hash: c.hash,
      subject: c.subject,
      date: c.date
    })),
    recommendations: [
      'Review commits with significant image changes',
      'Check validation commits for patterns',
      'Compare current state with last successful validation',
      'Clean cache directories before validation'
    ]
  };
  
  const reportPath = path.join(__dirname, '..', '..', 'reports', 'GIT_IMAGES_ANALYSIS.json');
  await fs.ensureDir(path.dirname(reportPath));
  await fs.writeJson(reportPath, report, { spaces: 2 });
  
  console.log('='.repeat(60));
  console.log(`\n✅ Report saved to: ${reportPath}`);
  console.log('\n📝 KEY FINDINGS:');
  console.log(`   - ${imageCommits.length} commits modified images`);
  console.log(`   - ${significantImageChanges.length} with significant changes`);
  console.log(`   - ${successCommits.length} successful validations found`);
  console.log('\n💡 NEXT STEPS:');
  console.log('   1. Review significant image commits');
  console.log('   2. Compare with last successful commit');
  console.log('   3. Check for cache/build artifacts');
  console.log('   4. Validate image dimensions');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
