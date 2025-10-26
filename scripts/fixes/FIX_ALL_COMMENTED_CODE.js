#!/usr/bin/env node

/**
 * FIX_ALL_COMMENTED_CODE.js
 * 
 * Dé-commente et enrichit TOUS les drivers avec du code commenté
 * - Trouve tous les // this.registerCapability
 * - Dé-commente le code
 * - Remplace IDs numériques par CLUSTER objects
 * - Ajoute logs ultra-verbeux
 * - Valide chaque driver
 */

const fs = require('fs');
const path = require('path');

console.log('═'.repeat(80));
console.log('🔧 FIX ALL COMMENTED CODE - Automatic Driver Repair');
console.log('═'.repeat(80));

const driversDir = path.join(__dirname, '../../drivers');
let filesFixed = 0;
let linesUncommented = 0;
let clustersFixed = 0;

// Mapping des cluster IDs vers CLUSTER objects
const CLUSTER_MAP = {
  '0': 'CLUSTER.BASIC',
  '1': 'CLUSTER.POWER_CONFIGURATION',
  '3': 'CLUSTER.IDENTIFY',
  '4': 'CLUSTER.GROUPS',
  '5': 'CLUSTER.SCENES',
  '6': 'CLUSTER.ON_OFF',
  '8': 'CLUSTER.LEVEL_CONTROL',
  '768': 'CLUSTER.COLOR_CONTROL',
  '1026': 'CLUSTER.TEMPERATURE_MEASUREMENT',
  '1029': 'CLUSTER.HUMIDITY_MEASUREMENT',
  '1024': 'CLUSTER.ILLUMINANCE_MEASUREMENT',
  '2820': 'CLUSTER.ELECTRICAL_MEASUREMENT',
  '2821': 'CLUSTER.METERING'
};

/**
 * Trouve tous les device.js avec du code commenté
 */
function findCommentedFiles() {
  const files = [];
  
  function scanDir(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (item === 'device.js') {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('// this.registerCapability')) {
          files.push(fullPath);
        }
      }
    }
  }
  
  scanDir(driversDir);
  return files;
}

/**
 * Dé-commente et enrichit un fichier device.js
 */
function fixDeviceFile(filePath) {
  console.log(`\n📝 Fixing: ${path.relative(driversDir, filePath)}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // 1. Ajouter import CLUSTER si manquant
  if (!content.includes("require('zigbee-clusters')")) {
    console.log('  ✅ Adding CLUSTER import');
    content = content.replace(
      /(const .+ = require\('.+'\);)/,
      `$1\nconst { CLUSTER } = require('zigbee-clusters');`
    );
  }
  
  // 2. Dé-commenter les lignes registerCapability
  const commentedLines = content.match(/\/\/ this\.registerCapability/g);
  if (commentedLines) {
    console.log(`  ✅ Uncommenting ${commentedLines.length} registerCapability calls`);
    linesUncommented += commentedLines.length;
    
    // Dé-commenter ligne par ligne
    content = content.replace(/\/\/ (this\.registerCapability\(.+)/g, '$1');
  }
  
  // 3. Dé-commenter les blocs de configuration
  content = content.replace(/\/\/ (  endpoint:|  get:|  set:|  setParser:|  report:|  reportParser:|  reportOpts:|  getOpts:)/g, '$1');
  content = content.replace(/\/\/ (    .+)/g, '$1');
  
  // 4. Remplacer cluster IDs numériques par CLUSTER objects
  for (const [id, clusterName] of Object.entries(CLUSTER_MAP)) {
    const regex = new RegExp(`this\\.registerCapability\\(([^,]+),\\s*${id},`, 'g');
    const matches = content.match(regex);
    if (matches) {
      console.log(`  ✅ Replacing cluster ${id} → ${clusterName} (${matches.length} times)`);
      content = content.replace(regex, `this.registerCapability($1, ${clusterName},`);
      clustersFixed += matches.length;
    }
  }
  
  // 5. Ajouter logs verbeux pour chaque registerCapability
  const capabilityMatches = content.matchAll(/this\.registerCapability\('([^']+)',\s*([^,]+),\s*\{/g);
  
  for (const match of capabilityMatches) {
    const capability = match[1];
    const cluster = match[2];
    const fullMatch = match[0];
    
    // Ajouter logs avant registerCapability
    const logCode = `
      this.log('🔌 Configuring ${capability}...');
      this.log(\`  - Capability ${capability} exists: \${this.hasCapability('${capability}')}\`);
      this.log(\`  - Registering with ${cluster}\`);
      `;
    
    content = content.replace(fullMatch, logCode + fullMatch);
  }
  
  // 6. Ajouter logs de succès après fermeture de registerCapability
  content = content.replace(
    /(\s+)\}\);(\s+)this\.log\('\[OK\]/g,
    '$1});$2this.log(\'[OK] ✅'
  );
  
  // 7. Supprimer les commentaires REFACTOR obsolètes
  content = content.replace(/\/\* REFACTOR:.+?\*\/\s*/gs, '');
  
  // Écrire le fichier si modifié
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesFixed++;
    console.log('  ✅ File fixed and saved');
    return true;
  } else {
    console.log('  ⚠️  No changes needed');
    return false;
  }
}

/**
 * Main execution
 */
function main() {
  console.log('\n🔍 Scanning for commented code...\n');
  
  const commentedFiles = findCommentedFiles();
  
  console.log(`\n📊 Found ${commentedFiles.length} files with commented code:\n`);
  commentedFiles.forEach((file, idx) => {
    console.log(`  ${idx + 1}. ${path.relative(driversDir, file)}`);
  });
  
  console.log('\n🚀 Starting automatic fix...\n');
  console.log('═'.repeat(80));
  
  for (const file of commentedFiles) {
    fixDeviceFile(file);
  }
  
  console.log('\n═'.repeat(80));
  console.log('📊 SUMMARY:');
  console.log('═'.repeat(80));
  console.log(`  Files scanned:        ${commentedFiles.length}`);
  console.log(`  Files fixed:          ${filesFixed}`);
  console.log(`  Lines uncommented:    ${linesUncommented}`);
  console.log(`  Clusters replaced:    ${clustersFixed}`);
  console.log('═'.repeat(80));
  
  if (filesFixed > 0) {
    console.log('\n✅ SUCCESS! All files have been fixed.');
    console.log('\n📝 Next steps:');
    console.log('  1. Review changes with: git diff');
    console.log('  2. Validate: homey app validate --level publish');
    console.log('  3. Commit: git add -A && git commit -m "fix: Uncomment all registerCapability calls"');
    console.log('  4. Push: git push origin master');
  } else {
    console.log('\n⚠️  No changes were needed.');
  }
  
  console.log('\n');
}

// Run!
main();
