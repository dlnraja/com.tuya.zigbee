#!/usr/bin/env node
/**
 * IMAGE ORCHESTRATOR
 * Coordonne la génération/téléchargement/redimensionnement intelligent des images
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function exec(command) {
  try {
    const result = execSync(command, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout || error.stderr };
  }
}

function step1_generateSVG() {
  log('\n' + '='.repeat(70), 'bright');
  log('STEP 1: GÉNÉRATION IMAGES SVG CONTEXTUELLES', 'bright');
  log('='.repeat(70), 'bright');
  
  log('\n🎨 Generating intelligent SVG images for all drivers...', 'blue');
  
  const result = exec('node scripts/images/INTELLIGENT_IMAGE_GENERATOR.js');
  
  if (result.success || result.output) {
    log(result.output || '');
    log('✅ SVG generation completed', 'green');
    return true;
  } else {
    log('❌ SVG generation failed', 'red');
    log(result.error, 'red');
    return false;
  }
}

function step2_downloadRealImages() {
  log('\n' + '='.repeat(70), 'bright');
  log('STEP 2: TÉLÉCHARGEMENT IMAGES RÉELLES DEPUIS INTERNET', 'bright');
  log('='.repeat(70), 'bright');
  
  log('\n🌐 Downloading real product images from Zigbee2MQTT...', 'blue');
  
  const result = exec('node scripts/images/DOWNLOAD_PRODUCT_IMAGES.js');
  
  if (result.success || result.output) {
    log(result.output || '');
    log('✅ Image download completed', 'green');
    return true;
  } else {
    log('⚠️  Image download had issues (continuing...)', 'yellow');
    log(result.output || result.error, 'yellow');
    return true; // Continue même si le téléchargement échoue
  }
}

function step3_resizeImages() {
  log('\n' + '='.repeat(70), 'bright');
  log('STEP 3: REDIMENSIONNEMENT AUX TAILLES HOMEY SDK3', 'bright');
  log('='.repeat(70), 'bright');
  
  log('\n📐 Resizing images to 75x75, 500x500, 1000x1000...', 'blue');
  
  const result = exec('node scripts/images/RESIZE_PRODUCT_IMAGES.js');
  
  if (result.success || result.output) {
    log(result.output || '');
    log('✅ Image resizing completed', 'green');
    return true;
  } else {
    log('⚠️  Image resizing had issues', 'yellow');
    log(result.output || result.error, 'yellow');
    log('\n💡 Note: ImageMagick is required for resizing', 'cyan');
    log('   Install: choco install imagemagick (Windows)', 'cyan');
    return true; // Continue avec les SVG
  }
}

function step4_validateImages() {
  log('\n' + '='.repeat(70), 'bright');
  log('STEP 4: VALIDATION DES IMAGES GÉNÉRÉES', 'bright');
  log('='.repeat(70), 'bright');
  
  log('\n✅ Validating image presence and sizes...', 'blue');
  
  const driversDir = path.join(ROOT, 'drivers');
  const drivers = fs.readdirSync(driversDir)
    .filter(name => {
      const fullPath = path.join(driversDir, name);
      return fs.statSync(fullPath).isDirectory() && !name.startsWith('.');
    });
  
  let validCount = 0;
  let missingCount = 0;
  const issues = [];
  
  for (const driverName of drivers) {
    const assetsDir = path.join(driversDir, driverName, 'assets');
    
    if (!fs.existsSync(assetsDir)) {
      missingCount++;
      issues.push({ driver: driverName, issue: 'no_assets_dir' });
      continue;
    }
    
    // Vérifier présence des 3 tailles
    const hasSmall = fs.existsSync(path.join(assetsDir, 'small.png')) || 
                     fs.existsSync(path.join(assetsDir, 'small.svg'));
    const hasLarge = fs.existsSync(path.join(assetsDir, 'large.png')) || 
                     fs.existsSync(path.join(assetsDir, 'large.svg'));
    const hasXlarge = fs.existsSync(path.join(assetsDir, 'xlarge.png')) || 
                      fs.existsSync(path.join(assetsDir, 'xlarge.svg'));
    
    if (hasSmall && hasLarge && hasXlarge) {
      validCount++;
    } else {
      missingCount++;
      issues.push({
        driver: driverName,
        issue: 'missing_sizes',
        missing: [
          !hasSmall ? 'small' : null,
          !hasLarge ? 'large' : null,
          !hasXlarge ? 'xlarge' : null
        ].filter(Boolean)
      });
    }
  }
  
  log(`\n📊 Validation Results:`, 'cyan');
  log(`   Total drivers: ${drivers.length}`, 'white');
  log(`   Valid: ${validCount}`, 'green');
  log(`   Issues: ${missingCount}`, missingCount > 0 ? 'yellow' : 'green');
  
  if (issues.length > 0 && issues.length <= 10) {
    log(`\n⚠️  Issues found:`, 'yellow');
    for (const issue of issues) {
      log(`   - ${issue.driver}: ${issue.issue}`, 'yellow');
    }
  }
  
  // Rapport
  const report = {
    date: new Date().toISOString(),
    totalDrivers: drivers.length,
    valid: validCount,
    issues: missingCount,
    details: issues
  };
  
  const reportPath = path.join(ROOT, 'reports', 'IMAGE_VALIDATION_REPORT.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  
  log(`\n📄 Report saved: ${reportPath}`, 'cyan');
  
  return validCount > 0;
}

function displaySummary() {
  log('\n' + '='.repeat(70), 'bright');
  log('✅ IMAGE ORCHESTRATION COMPLETE!', 'green');
  log('='.repeat(70), 'bright');
  
  // Lire les rapports
  const reportsDir = path.join(ROOT, 'reports');
  
  try {
    const genReport = JSON.parse(fs.readFileSync(path.join(reportsDir, 'IMAGE_GENERATION_REPORT.json'), 'utf8'));
    const dlReport = JSON.parse(fs.readFileSync(path.join(reportsDir, 'IMAGE_DOWNLOAD_REPORT.json'), 'utf8'));
    const valReport = JSON.parse(fs.readFileSync(path.join(reportsDir, 'IMAGE_VALIDATION_REPORT.json'), 'utf8'));
    
    log('\n📊 Summary:', 'cyan');
    log(`\n  SVG Generation:`, 'yellow');
    log(`    Generated: ${genReport.generated} drivers`, 'white');
    log(`    Skipped: ${genReport.skipped} drivers`, 'white');
    
    log(`\n  Real Images Download:`, 'yellow');
    log(`    Downloaded: ${dlReport.downloaded} images`, 'white');
    log(`    Failed: ${dlReport.failed} images`, 'white');
    
    log(`\n  Final Validation:`, 'yellow');
    log(`    Valid: ${valReport.valid} drivers`, 'green');
    log(`    Issues: ${valReport.issues} drivers`, valReport.issues > 0 ? 'yellow' : 'green');
    
  } catch (e) {
    log('\n⚠️  Could not read all reports', 'yellow');
  }
  
  log('\n📁 Generated Files:', 'cyan');
  log('   drivers/*/assets/small.svg (or .png)', 'white');
  log('   drivers/*/assets/large.svg (or .png)', 'white');
  log('   drivers/*/assets/xlarge.svg (or .png)', 'white');
  log('   drivers/*/assets/image-info.json', 'white');
  log('   drivers/*/assets/product-original.jpg (if downloaded)', 'white');
  
  log('\n🚀 Next Steps:', 'cyan');
  log('   1. Review images: ls drivers/*/assets/', 'white');
  log('   2. Check reports in ./reports/', 'white');
  log('   3. Validate app: homey app validate', 'white');
  log('   4. Commit: git add drivers/*/assets && git commit', 'white');
  
  log('\n' + '='.repeat(70), 'bright');
}

async function main() {
  log('\n' + '█'.repeat(70), 'bright');
  log('█' + ' '.repeat(68) + '█', 'bright');
  log('█        IMAGE ORCHESTRATOR - GÉNÉRATION INTELLIGENTE IMAGES       █', 'bright');
  log('█' + ' '.repeat(68) + '█', 'bright');
  log('█'.repeat(70), 'bright');
  
  const startTime = Date.now();
  
  const steps = [
    { name: 'Generate SVG', fn: step1_generateSVG },
    { name: 'Download Real Images', fn: step2_downloadRealImages },
    { name: 'Resize Images', fn: step3_resizeImages },
    { name: 'Validate Images', fn: step4_validateImages }
  ];
  
  let completedSteps = 0;
  
  for (const step of steps) {
    const success = step.fn();
    
    if (success) {
      completedSteps++;
    } else {
      log(`\n❌ Step "${step.name}" failed. Stopping pipeline.`, 'red');
      log(`\n✅ Completed: ${completedSteps}/${steps.length} steps`, 'yellow');
      process.exit(1);
    }
  }
  
  // Display summary
  displaySummary();
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  log(`\n⏱️  Total time: ${duration}s`, 'cyan');
  log('\n', 'reset');
}

main();
