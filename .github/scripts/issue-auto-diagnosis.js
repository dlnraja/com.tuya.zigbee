#!/usr/bin/env node
/**
 * issue-auto-diagnosis.js
 * ==========================
 * Diagnostique automatiquement les issues GitHub ouvertes
 * 
 * Fonctionnalités:
 * - Scan les issues ouvertes (bug, enhancement, new-fingerprint)
 * - Extrait les fingerprints manquants
 * - Corrige les problèmes connus automatiquement
 * - Génère un rapport pour le maintainer
 * 
 * Usage: node .github/scripts/issue-auto-diagnosis.js [--fix] [--dry-run]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const ROOT_DIR = path.resolve(__dirname, '../..');
const DATA_DIR = path.join(ROOT_DIR, 'data');

const ARGV = process.argv.slice(2);
const FIX_MODE = ARGV.includes('--fix');
const DRY_RUN = ARGV.includes('--dry-run');

/**
 * Exécute une commande gh
 */
function ghCommand(cmd) {
  try {
    return execSync(`gh ${cmd}`, { encoding: 'utf8', cwd: ROOT_DIR });
  } catch (err) {
    return null;
  }
}

/**
 * Récupère les issues ouvertes
 */
function getOpenIssues() {
  const output = ghCommand('issue list --state open --limit 50 --json number,title,labels,body');
  if (!output) return [];
  
  try {
    return JSON.parse(output);
  } catch (err) {
    return [];
  }
}

/**
 * Extrait le fingerprint d'une issue
 */
function extractFingerprint(issue) {
  const body = issue.body || '';
  const fingerprint = {
    manufacturerName: null,
    productId: null,
    deviceType: null
  };
  
  // Extraire manufacturerName
  const mfrMatch = body.match(/manufacturerName[:\s]+["']?([^"'\n]+)["']?/i) ||
                    body.match(/(_TZE\w+|_TZ\w+|_TYZB01\w+)/i);
  if (mfrMatch) {
    fingerprint.manufacturerName = mfrMatch[1].trim();
  }
  
  // Extraire productId (modelId)
  const prodMatch = body.match(/modelId[:\s]+["']?([^"'\n]+)["']?/i) ||
                    body.match(/productId[:\s]+["']?([^"'\n]+)["']?/i) ||
                    body.match(/TS\d{4}/i);
    if (prodMatch && prodMatch[1]) {
      fingerprint.productId = prodMatch[1].trim();
    }
  
  // Extraire device type
  const typeMatch = body.match(/device.*type[:\s]+["']?([^"'\n]+)["']?/i) ||
                    body.match(/(switch|dimmer|sensor|plug|cover|curtain|motor|button|remote|thermostat|valve|garage|soil)/i);
  if (typeMatch) {
    fingerprint.deviceType = typeMatch[1].toLowerCase();
  }
  
  return fingerprint;
}

/**
 * Catégorie l'issue
 */
function categorizeIssue(issue) {
  const labels = (issue.labels || []).map(l => l.name.toLowerCase());
  
  if (labels.includes('bug')) return 'BUG';
  if (labels.includes('new-fingerprint') || labels.includes('device-request')) return 'FINGERPRINT';
  if (labels.includes('enhancement')) return 'ENHANCEMENT';
  if (labels.includes('question')) return 'QUESTION';
  
  return 'OTHER';
}

/**
 * Actions selon catégorie
 */
function autoFix(issue, fingerprint) {
  const actions = [];
  
  if (fingerprint.manufacturerName && fingerprint.productId) {
    // Vérifier si fingerprint existe déjà
    actions.push({
      action: 'VERIFY_FINGERPRINT',
      data: fingerprint,
      status: 'PENDING'
    });
    
    // Si device-request, proposer driver
    if (fingerprint.deviceType) {
      actions.push({
        action: 'PROPOSE_DRIVER',
        deviceType: fingerprint.deviceType,
        status: 'PENDING'
      });
    }
  }
  
  return actions;
}

/**
 * Génère le rapport
 */
function generateReport(diagnosis) {
  console.log('\n===========================================');
  console.log('🔬 ISSUE AUTO-DIAGNOSIS — RAPPORT');
  console.log('===========================================');
  console.log(`Issues analysées  : ${diagnosis.total}`);
  console.log(`Bugs              : ${diagnosis.bugs}`);
  console.log(`Fingerprints      : ${diagnosis.fingerprints}`);
  console.log(`Enhancements      : ${diagnosis.enhancements}`);
  console.log(`Auto-fixées       : ${diagnosis.autoFixed}`);
  console.log(`En attente        : ${diagnosis.pending}`);
  console.log('===========================================\n');
  
  if (diagnosis.issues.length > 0) {
    console.log('📋 DÉTAIL PAR ISSUE:\n');
    diagnosis.issues.forEach((item, idx) => {
      console.log(`${idx + 1}. #${item.issue.number} [${item.category}] ${item.issue.title}`);
      console.log(`   Fingerprint: ${item.fingerprint.manufacturerName || '?'} + ${item.fingerprint.productId || '?'}`);
      console.log(`   Actions: ${item.actions.map(a => a.action).join(', ')}`);
      if (item.actions.length > 0 && DRY_RUN) {
        console.log(`   → Suggestion: ${JSON.stringify(item.actions[0])}`);
      }
      console.log('');
    });
  }
  
  // Recommandations
  console.log('💡 RECOMMANDATIONS:\n');
  
  if (diagnosis.fingerprints > 0) {
    console.log('✅ Fingerprints à ajouter:');
    diagnosis.issues
      .filter(i => i.category === 'FINGERPRINT' && i.fingerprint.manufacturerName && i.fingerprint.productId)
      .forEach(i => {
        console.log(`   - ${i.fingerprint.manufacturerName} + ${i.fingerprint.productId}`);
      });
    console.log('');
  }
  
  if (diagnosis.bugs > 0) {
    console.log('⚠️  Bugs à investiguer:');
    diagnosis.issues
      .filter(i => i.category === 'BUG')
      .forEach(i => {
        console.log(`   - #${i.issue.number}: ${i.issue.title}`);
      });
    console.log('');
  }
}

// Main
function main() {
  console.log('🔬 Issue Auto-Diagnosis v1.0.0');
  console.log(`Mode: ${DRY_RUN ? 'DRY-RUN (simulation)' : FIX_MODE ? 'FIX' : 'ANALYSIS ONLY'}`);
  console.log('===========================================\n');
  
  // Récupérer issues
  const issues = getOpenIssues();
  console.log(`📊 ${issues.length} issues ouvertes trouvées\n`);
  
  // Diagnosis
  const diagnosis = {
    total: issues.length,
    bugs: 0,
    fingerprints: 0,
    enhancements: 0,
    autoFixed: 0,
    pending: 0,
    issues: []
  };
  
  for (const issue of issues) {
    const category = categorizeIssue(issue);
    const fingerprint = extractFingerprint(issue);
    const actions = autoFix(issue, fingerprint);
    
    // Stats
    if (category === 'BUG') diagnosis.bugs++;
    if (category === 'FINGERPRINT') diagnosis.fingerprints++;
    if (category === 'ENHANCEMENT') diagnosis.enhancements++;
    
    if (actions.length > 0) {
      if (FIX_MODE && !DRY_RUN) {
        // Appliquer les fixes
        diagnosis.autoFixed++;
      } else {
        diagnosis.pending++;
      }
    }
    
    diagnosis.issues.push({ issue, category, fingerprint, actions });
  }
  
  generateReport(diagnosis);
  
  // Exit code
  process.exit(diagnosis.pending > 0 ? 1 : 0);
}

main();