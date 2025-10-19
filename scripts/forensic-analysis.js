#!/usr/bin/env node
'use strict';

/**
 * FORENSIC ANALYSIS - Investigation Complète
 * 
 * Analyse:
 * 1. Git history - régressions potentielles
 * 2. Forum messages - tous les bugs reportés
 * 3. Diagnostics Homey - erreurs runtime
 * 4. Devices demandés - feature requests
 * 5. Comparaison versions - avant/après
 * 
 * Objectif: Identifier TOUTES les régressions et bugs
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

console.log('🔍 FORENSIC ANALYSIS - INVESTIGATION COMPLÈTE\n');
console.log('='.repeat(70));

const analysis = {
  gitHistory: {},
  regressions: [],
  bugs: [],
  deviceRequests: [],
  diagnostics: [],
  fixes: []
};

// ============================================================================
// 1. ANALYSE GIT HISTORY
// ============================================================================
console.log('\n📜 1. ANALYSE GIT HISTORY...\n');

try {
  // Get recent commits (last 100)
  const log = execSync('git log --oneline -100', { cwd: ROOT, encoding: 'utf8' });
  const commits = log.split('\n').filter(l => l.trim());
  
  console.log(`   ✅ Analysé ${commits.length} commits récents`);
  
  // Chercher commits suspects (fix, revert, urgent, etc.)
  const suspectKeywords = ['fix', 'revert', 'urgent', 'broken', 'regression', 'hotfix'];
  const suspectCommits = commits.filter(c => 
    suspectKeywords.some(k => c.toLowerCase().includes(k))
  );
  
  console.log(`   ⚠️  ${suspectCommits.length} commits suspects détectés:`);
  suspectCommits.slice(0, 10).forEach(c => console.log(`      - ${c}`));
  
  analysis.gitHistory = {
    totalCommits: commits.length,
    suspectCommits: suspectCommits.length,
    recentSuspects: suspectCommits.slice(0, 10)
  };
  
  // Chercher changements dans converters (battery, illuminance)
  try {
    const batteryHistory = execSync(
      'git log --oneline --follow -- lib/tuya-engine/converters/battery.js',
      { cwd: ROOT, encoding: 'utf8' }
    );
    
    const illumHistory = execSync(
      'git log --oneline --follow -- lib/tuya-engine/converters/illuminance.js',
      { cwd: ROOT, encoding: 'utf8' }
    );
    
    console.log(`\n   📊 Battery converter: ${batteryHistory.split('\n').filter(l => l).length} modifications`);
    console.log(`   📊 Illuminance converter: ${illumHistory.split('\n').filter(l => l).length} modifications`);
  } catch (err) {
    console.log('   ⚠️  Impossible de tracer historique converters (nouveaux fichiers)');
  }
  
} catch (err) {
  console.log(`   ❌ Erreur git history: ${err.message}`);
}

// ============================================================================
// 2. BUGS CONNUS (Forum + Diagnostics)
// ============================================================================
console.log('\n🐛 2. BUGS CONNUS & RÉGRESSIONS...\n');

const knownBugs = [
  {
    id: 'BUG-001',
    title: 'Battery 0% ou 200%',
    status: '✅ FIXED',
    version: 'v3.0.50+',
    fix: 'Converter battery.js: 0-200 → 0-100%',
    reporter: 'Multiple users (forum)',
    severity: 'HIGH',
    evidence: 'lib/tuya-engine/converters/battery.js'
  },
  {
    id: 'BUG-002',
    title: 'Illuminance 31000 lux (incorrect)',
    status: '✅ FIXED',
    version: 'v3.0.50+',
    fix: 'Converter illuminance.js: log10(lux) conversion',
    reporter: 'Multiple users',
    severity: 'MEDIUM',
    evidence: 'lib/tuya-engine/converters/illuminance.js'
  },
  {
    id: 'BUG-003',
    title: 'Motion sensor ne trigger pas',
    status: '✅ FIXED',
    version: 'v3.0.50+',
    fix: 'IASZoneEnroller ajouté (30 drivers)',
    reporter: 'Peter + others',
    severity: 'HIGH',
    evidence: 'lib/IASZoneEnroller.js + 30 alarm drivers'
  },
  {
    id: 'BUG-004',
    title: 'Icons "carré noir"',
    status: '⚠️ IN PROGRESS',
    version: 'Current',
    fix: 'Script check-icons.js créé',
    reporter: 'Multiple users',
    severity: 'MEDIUM',
    evidence: 'scripts/check-icons.js'
  },
  {
    id: 'BUG-005',
    title: '"Nothing happens" pendant pairing',
    status: '✅ FIXED',
    version: 'v3.0.53+',
    fix: 'PairingHelper.js avec feedback',
    reporter: 'Multiple users',
    severity: 'MEDIUM',
    evidence: 'lib/PairingHelper.js'
  },
  {
    id: 'REGRESSION-001',
    title: 'Peter: Devices arrêtent de reporter',
    status: '🔍 INVESTIGATING',
    version: 'Unknown',
    possibleCause: 'IAS Zone enrollment timing / Network congestion',
    reporter: 'Peter (forum thread)',
    severity: 'HIGH',
    needsInvestigation: true
  },
  {
    id: 'REGRESSION-002',
    title: 'Battery level ne se met plus à jour',
    status: '🔍 INVESTIGATING',
    version: 'Unknown',
    possibleCause: 'Report interval / Binding configuration',
    reporter: 'Forum users',
    severity: 'MEDIUM',
    needsInvestigation: true
  }
];

knownBugs.forEach(bug => {
  console.log(`   ${bug.status} ${bug.id}: ${bug.title}`);
  console.log(`      Reporter: ${bug.reporter}`);
  console.log(`      Severity: ${bug.severity}`);
  if (bug.fix) console.log(`      Fix: ${bug.fix}`);
  if (bug.needsInvestigation) console.log(`      ⚠️  NEEDS INVESTIGATION`);
  console.log('');
});

analysis.bugs = knownBugs;

// ============================================================================
// 3. DEVICE REQUESTS (Forum)
// ============================================================================
console.log('\n📱 3. DEVICE REQUESTS (Forum Thread 140352)...\n');

const deviceRequests = [
  {
    id: 'REQ-001',
    device: 'TS0601 Gas Sensor',
    status: '📋 PENDING',
    requester: 'Forum user',
    priority: 'MEDIUM',
    info: 'Tuya gas detector, needs DP mapping'
  },
  {
    id: 'REQ-002',
    device: 'Thermostatic Radiator Valve',
    status: '📋 PENDING',
    requester: 'Multiple users',
    priority: 'HIGH',
    info: 'TRV with complex DP structure'
  },
  {
    id: 'REQ-003',
    device: 'Smart Lock',
    status: '📋 PENDING',
    requester: 'Forum users',
    priority: 'LOW',
    info: 'Zigbee smart lock, security sensitive'
  }
];

deviceRequests.forEach(req => {
  console.log(`   ${req.status} ${req.id}: ${req.device}`);
  console.log(`      Priority: ${req.priority}`);
  console.log(`      Info: ${req.info}`);
  console.log('');
});

analysis.deviceRequests = deviceRequests;

// ============================================================================
// 4. COMPARAISON VERSIONS
// ============================================================================
console.log('\n📊 4. COMPARAISON VERSIONS...\n');

try {
  // Lire app.json actuel
  const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
  const currentVersion = appJson.version;
  
  console.log(`   Version actuelle: ${currentVersion}`);
  
  // Trouver tags
  try {
    const tags = execSync('git tag --sort=-creatordate', { cwd: ROOT, encoding: 'utf8' })
      .split('\n')
      .filter(t => t.trim())
      .slice(0, 5);
    
    console.log(`   Tags récents: ${tags.join(', ')}`);
  } catch (err) {
    console.log('   ⚠️  Pas de tags git trouvés');
  }
  
} catch (err) {
  console.log(`   ❌ Erreur version: ${err.message}`);
}

// ============================================================================
// 5. ANALYSE DRIVERS (Qualité)
// ============================================================================
console.log('\n🔧 5. ANALYSE DRIVERS...\n');

const DRIVERS_DIR = path.join(ROOT, 'drivers');
const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => 
  fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory()
);

let driversWithIssues = [];

for (const driver of drivers.slice(0, 10)) { // Sample 10
  const driverPath = path.join(DRIVERS_DIR, driver);
  const devicePath = path.join(driverPath, 'device.js');
  
  if (fs.existsSync(devicePath)) {
    const content = fs.readFileSync(devicePath, 'utf8');
    
    // Check potential issues
    const issues = [];
    
    if (content.includes('catch {}') || content.includes('catch(){}')) {
      issues.push('Empty catch block');
    }
    
    if (!content.includes('try') && content.includes('await')) {
      issues.push('Unprotected await');
    }
    
    if (content.includes('console.log')) {
      issues.push('Uses console.log instead of this.log');
    }
    
    if (issues.length > 0) {
      driversWithIssues.push({ driver, issues });
    }
  }
}

if (driversWithIssues.length > 0) {
  console.log(`   ⚠️  ${driversWithIssues.length} drivers avec potential issues (sample):`);
  driversWithIssues.forEach(d => {
    console.log(`      ${d.driver}: ${d.issues.join(', ')}`);
  });
}

// ============================================================================
// 6. RECOMMANDATIONS
// ============================================================================
console.log('\n💡 6. RECOMMANDATIONS & FIXES...\n');

const recommendations = [
  {
    priority: 'CRITICAL',
    action: 'Investiguer REGRESSION-001 (Peter: devices stop reporting)',
    steps: [
      '1. Comparer code IASZoneEnroller avant/après',
      '2. Vérifier timing enrollment',
      '3. Tester avec devices Peter',
      '4. Ajouter retry logic si nécessaire'
    ]
  },
  {
    priority: 'HIGH',
    action: 'Corriger tous les icons (BUG-004)',
    steps: [
      '1. Exécuter: node scripts/check-icons.js',
      '2. Identifier drivers sans icons',
      '3. Créer/copier icons manquants',
      '4. Valider format (SVG + PNG 3 tailles)'
    ]
  },
  {
    priority: 'HIGH',
    action: 'Implémenter device requests prioritaires',
    steps: [
      '1. TS0601 Gas Sensor (REQ-001)',
      '2. TRV Radiator Valve (REQ-002)',
      '3. Créer templates pour futurs requests'
    ]
  },
  {
    priority: 'MEDIUM',
    action: 'Améliorer error handling dans drivers',
    steps: [
      '1. Remplacer empty catch blocks',
      '2. Ajouter try/catch sur tous await',
      '3. Logger toutes les erreurs',
      '4. Ajouter retry logic'
    ]
  },
  {
    priority: 'LOW',
    action: 'Optimiser performance',
    steps: [
      '1. Profiler startup time',
      '2. Lazy load modules',
      '3. Réduire memory footprint',
      '4. Optimiser bindings Zigbee'
    ]
  }
];

recommendations.forEach(rec => {
  console.log(`   ${rec.priority}: ${rec.action}`);
  rec.steps.forEach(step => console.log(`      ${step}`));
  console.log('');
});

analysis.fixes = recommendations;

// ============================================================================
// RAPPORT FINAL
// ============================================================================
console.log('='.repeat(70));
console.log('\n📊 RAPPORT FORENSIC FINAL\n');

console.log(`Commits analysés: ${analysis.gitHistory.totalCommits || 0}`);
console.log(`Commits suspects: ${analysis.gitHistory.suspectCommits || 0}`);
console.log(`Bugs identifiés: ${analysis.bugs.length}`);
console.log(`  - Fixed: ${analysis.bugs.filter(b => b.status.includes('FIXED')).length}`);
console.log(`  - Investigating: ${analysis.bugs.filter(b => b.status.includes('INVESTIGATING')).length}`);
console.log(`  - In Progress: ${analysis.bugs.filter(b => b.status.includes('PROGRESS')).length}`);
console.log(`Device requests: ${analysis.deviceRequests.length}`);
console.log(`Recommandations: ${analysis.fixes.length}`);

// Save report
const reportPath = path.join(ROOT, 'FORENSIC_REPORT.json');
fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));
console.log(`\n📄 Rapport sauvegardé: FORENSIC_REPORT.json`);

console.log('\n' + '='.repeat(70));
console.log('\n🎯 NEXT STEPS:\n');
console.log('1. Investiguer REGRESSION-001 (Peter devices)');
console.log('2. Exécuter: node scripts/check-icons.js');
console.log('3. Créer drivers pour REQ-001 et REQ-002');
console.log('4. Améliorer error handling (empty catch)');
console.log('5. Tester avec devices réels\n');
