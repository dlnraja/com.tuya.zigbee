#!/usr/bin/env node
'use strict';

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { extractZipPrefer7z } = require('../../utils/archiver');

const ROOT = process.cwd();
const SOURCES_DIR = path.join(ROOT, 'scripts', 'sources');
const LOCAL_DIR = path.join(SOURCES_DIR, 'local');
const BACKUP_DIR = path.join(ROOT, '.backup');
const REPORTS_DIR = path.join(LOCAL_DIR, 'reports');

function analyzeBackupZip(zipPath) {
  console.log(`🔍 Analyse du backup: ${path.basename(zipPath)}`);
  try {
    const stats = fs.statSync(zipPath);
    const fileSize = stats.size;
    const fileDate = stats.mtime;

    const tempDir = path.join(LOCAL_DIR, 'temp_extraction', path.basename(zipPath, '.zip'));
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const res = extractZipPrefer7z(zipPath, tempDir);
    if (!res.ok) throw new Error(`Extraction failed via ${res.method}: ${res.error || 'unknown'}`);

    const structure = analyzeDirectoryStructure(tempDir);
    fs.rmSync(tempDir, { recursive: true, force: true });

    return {
      filename: path.basename(zipPath),
      fileSize: `${(fileSize / 1024 / 1024).toFixed(2)} MB`,
      fileDate: fileDate.toISOString(),
      structure,
      totalFiles: countFiles(structure),
      totalDrivers: countDrivers(structure)
    };
  } catch (error) {
    console.log(`❌ Erreur lors de l'analyse de ${zipPath}:`, error.message);
    return { filename: path.basename(zipPath), error: error.message };
  }
}

function analyzeDirectoryStructure(dirPath, maxDepth = 3, currentDepth = 0) {
  if (currentDepth >= maxDepth) return { type: 'file', name: path.basename(dirPath) };
  try {
    const items = fs.readdirSync(dirPath);
    const structure = { type: 'directory', name: path.basename(dirPath), items: {}, count: 0 };
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      if (stats.isDirectory()) structure.items[item] = analyzeDirectoryStructure(itemPath, maxDepth, currentDepth + 1);
      else structure.items[item] = { type: 'file', name: item, size: stats.size, modified: stats.mtime.toISOString() };
      structure.count++;
    }
    return structure;
  } catch (error) {
    return { type: 'error', name: path.basename(dirPath), error: error.message };
  }
}

function countFiles(structure) {
  if (structure.type === 'file') return 1;
  if (structure.type === 'error') return 0;
  let count = 0; for (const item of Object.values(structure.items)) count += countFiles(item); return count;
}

function countDrivers(structure) {
  if (structure.type === 'file') return structure.name.includes('driver') ? 1 : 0;
  if (structure.type === 'error') return 0;
  let count = 0; for (const item of Object.values(structure.items)) count += countDrivers(item); return count;
}

async function analyzeAllBackups() {
  console.log('🚀 Début de l\'analyse des backups...');
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('⚠️ Dossier .backup non trouvé');
    return { backups: [], summary: { totalBackups: 0 } };
  }
  const backupItems = fs.readdirSync(BACKUP_DIR);
  const zipFiles = backupItems.filter(item => item.endsWith('.zip'));
  if (zipFiles.length === 0) {
    console.log('⚠️ Aucun fichier ZIP trouvé dans .backup');
    return { backups: [], summary: { totalBackups: 0 } };
  }
  const results = []; const startTime = Date.now();
  for (const zipFile of zipFiles) {
    const zipPath = path.join(BACKUP_DIR, zipFile);
    const analysis = analyzeBackupZip(zipPath);
    results.push(analysis); await new Promise(r => setTimeout(r, 250));
  }
  const duration = Date.now() - startTime;
  const report = {
    timestamp: new Date().toISOString(), duration: `${duration}ms`, backupDirectory: BACKUP_DIR, backups: results,
    summary: {
      totalBackups: results.length,
      totalFiles: results.reduce((s, b) => s + (b.totalFiles || 0), 0),
      totalDrivers: results.reduce((s, b) => s + (b.totalDrivers || 0), 0),
      totalSize: results.reduce((s, b) => s + parseFloat(b.fileSize?.replace(' MB', '') || '0'), 0),
      errors: results.filter(b => b.error).length
    }
  };
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(REPORTS_DIR, `backup-analysis-${timestamp}.json`);
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n✅ Rapport d'analyse des backups sauvegardé: ${reportPath}`);
  return report;
}

function analyzeGitCommits() {
  console.log('🔍 Analyse des commits Git...');
  try {
    const logResult = spawnSync('git', ['log', '--oneline', '--since=30.days', '--pretty=format:%h|%an|%ad|%s'], { shell: true, stdio: 'pipe', cwd: ROOT });
    if (logResult.status !== 0) throw new Error(`Erreur git log: ${logResult.stderr?.toString()}`);
    const commits = logResult.stdout.toString().trim().split('\n').filter(Boolean).map(line => { const [hash, author, date, subject] = line.split('|'); return { hash, author, date, subject }; });
    const keywords = ['tuya', 'zigbee', 'driver', 'device', 'enrich', 'reorganize'];
    const commitsWithKeywords = commits.map(c => { const s = c.subject.toLowerCase(); const foundKeywords = keywords.filter(k => s.includes(k)); return { ...c, foundKeywords, hasRelevantKeywords: foundKeywords.length > 0 }; });
    const relevantCommits = commitsWithKeywords.filter(c => c.hasRelevantKeywords);
    return { totalCommits: commits.length, relevantCommits: relevantCommits.length, commits: commitsWithKeywords, keywords, analysisDate: new Date().toISOString() };
  } catch (error) {
    console.log(`❌ Erreur lors de l'analyse des commits:`, error.message);
    return { error: error.message, analysisDate: new Date().toISOString() };
  }
}

async function main() {
  try {
    [SOURCES_DIR, LOCAL_DIR, REPORTS_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));
    const backupReport = await analyzeAllBackups();
    const gitReport = analyzeGitCommits();
    const combined = { timestamp: new Date().toISOString(), backupAnalysis: backupReport, gitAnalysis: gitReport, summary: { totalBackups: backupReport.summary.totalBackups, totalCommits: gitReport.totalCommits || 0, relevantCommits: gitReport.relevantCommits || 0, totalFiles: backupReport.summary.totalFiles, totalDrivers: backupReport.summary.totalDrivers } };
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const out = path.join(REPORTS_DIR, `local-analysis-combined-${ts}.json`);
    fs.writeFileSync(out, JSON.stringify(combined, null, 2));
    console.log(`\n✅ Rapport combiné sauvegardé: ${out}`);
    console.log('\n🎉 Analyse locale terminée avec succès !');
  } catch (e) {
    console.error('❌ Erreur lors de l\'analyse locale:', e);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { analyzeAllBackups, analyzeGitCommits };
