#!/usr/bin/env node
/**
 * copilot-protection.js
 * ========================
 * Détecte et bloque l'usage de GitHub Copilot dans les workflows
 * 
 * Règle C1 (CRITIQUE): Aucun workflow ne doit utiliser GitHub Copilot
 * Usage détecté = workflow failure automatique
 * 
 * Usage: node .github/scripts/copilot-protection.js [--fix]
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ROOT_DIR = path.resolve(__dirname, '../..');
const WORKFLOWS_DIR = path.join(ROOT_DIR, '.github/workflows');

const ARGV = process.argv.slice(2);
const FIX_MODE = ARGV.includes('--fix');

// Patterns GitHub Copilot interdits
const COPLOT_PATTERNS = [
  { pattern: /github[_-]?copilot/i, description: 'github-copilot' },
  { pattern: /copilot[_-]?infer/i, description: 'copilot-infer' },
  { pattern: /copilot[_-]?complete/i, description: 'copilot-complete' },
  { pattern: /openai\/copilot/i, description: 'openai-copilot' },
  { pattern: /copilot[_-]v\d+/i, description: 'copilot-vX' }
];

// Stats
let stats = {
  workflows: 0,
  clean: 0,
  violations: []
};

/**
 * Scan un fichier YML pour détecter usage Copilot
 */
function scanWorkflow(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(ROOT_DIR, filePath);
    const violations = [];
    
    for (const { pattern, description } of COPLOT_PATTERNS) {
      const matches = content.match(new RegExp(pattern, 'gi'));
      if (matches) {
        // Trouver la ligne exacte
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (pattern.test(line)) {
            violations.push({
              line: idx + 1,
              content: line.trim(),
              type: description
            });
          }
        });
      }
    }
    
    if (violations.length > 0) {
      stats.violations.push({
        file: relativePath,
        violations
      });
    } else {
      stats.clean++;
    }
    
    stats.workflows++;
    return violations.length === 0;
  } catch (err) {
    console.error(`Erreur scan ${filePath}: ${err.message}`);
    return true;
  }
}

/**
 * Scan tous les workflows
 */
function scanAllWorkflows() {
  console.log('🔍 Scan des workflows GitHub Actions...\n');
  
  if (!fs.existsSync(WORKFLOWS_DIR)) {
    console.log('⚠️  Dossier .github/workflows non trouvé');
    return;
  }
  
  const files = fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
  
  for (const file of files) {
    const filePath = path.join(WORKFLOWS_DIR, file);
    scanWorkflow(filePath);
  }
}

/**
 * Génère le rapport
 */
function generateReport() {
  console.log('\n===========================================');
  console.log('🛡️  COPILOT PROTECTION — RAPPORT');
  console.log('===========================================');
  console.log(`Workflows scannés : ${stats.workflows}`);
  console.log(`Clean (0 Copilot)  : ${stats.clean}`);
  console.log(`Violations         : ${stats.violations.length}`);
  console.log('===========================================\n');
  
  if (stats.violations.length > 0) {
    console.log('❌ VIOLATIONS DÉTECTÉES :\n');
    stats.violations.forEach((v, idx) => {
      console.log(`${idx + 1}. 📄 ${v.file}`);
      v.violations.forEach((viol, vidx) => {
        console.log(`   Ligne ${viol.line}: ${viol.content}`);
        console.log(`   Type: ${viol.type}`);
      });
      console.log('');
    });
    
    console.log('🚫 ACTION REQUISE:');
    console.log('   Ces workflows utilisent GitHub Copilot (facturation imminente).');
    console.log('   Veuillez remplacer par des alternatives gratuites :');
    console.log('   - NVIDIA NIM (800 req/jour, gratuit)');
    console.log('   - HuggingFace (500 req/jour, gratuit)');
    console.log('   - Groq (500 req/jour, gratuit)');
  } else {
    console.log('✅ PROTECTION ACTIVE — Zéro usage GitHub Copilot détecté');
    console.log('');
    console.log('💡 Rappel: NVIDIA NIM est prioritaire (800 req/jour gratuit)');
    console.log('   Voir: ai-helper.js pour les limites de rate limiting');
  }
  
  // Exit code
  process.exit(stats.violations.length === 0 ? 0 : 1);
}

/**
 * Mode Fix (supprime les lignes Copilot)
 */
function applyFixes() {
  console.log('🔧 Mode FIX activé...\n');
  console.log('⚠️  Correction automatique NON implémentée.');
  console.log('   Veuillez supprimer manuellement les lignes utilisant Copilot.');
  console.log('');
  console.log('Alternatives recommandées:');
  console.log('   - NVIDIA NIM: ${{ secrets.NVIDIA_API_KEY }}');
  console.log('   - HuggingFace: ${{ secrets.HF_TOKEN }}');
  console.log('   - Groq: ${{ secrets.GROQ_API_KEY }}');
}

// Main
function main() {
  console.log('🛡️  Copilot Protection v1.0.0');
  console.log('===========================================\n');
  
  if (FIX_MODE) {
    applyFixes();
  }
  
  scanAllWorkflows();
  generateReport();
}

main();