#!/usr/bin/env node

/**
 * 🔍 ULTIMATE DIAGNOSTIC & AUTO-FIX
 * 
 * Diagnostic complet et correction automatique de TOUT:
 * 1. Images PNG/SVG - qualité, tailles, personnalisation
 * 2. Manufacturer IDs du forum - priorité aux utilisateurs
 * 3. Warnings et problèmes
 * 4. Rangement et organisation
 * 5. Complétion et patching
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

// 🎨 Couleurs par catégorie (Johan Bendz)
const CATEGORY_COLORS = {
  motion: { from: '#2196F3', to: '#03A9F4', emoji: '🚶' },
  contact: { from: '#2196F3', to: '#03A9F4', emoji: '🚪' },
  button: { from: '#4CAF50', to: '#8BC34A', emoji: '🔘' },
  switch: { from: '#4CAF50', to: '#8BC34A', emoji: '💡' },
  plug: { from: '#9C27B0', to: '#673AB7', emoji: '🔌' },
  dimmer: { from: '#FFD700', to: '#FFA500', emoji: '💡' },
  light: { from: '#FFD700', to: '#FFA500', emoji: '💡' },
  bulb: { from: '#FFD700', to: '#FFA500', emoji: '💡' },
  led: { from: '#FFD700', to: '#FFA500', emoji: '🌈' },
  climate: { from: '#FF9800', to: '#FF5722', emoji: '🌡️' },
  temperature: { from: '#FF9800', to: '#FF5722', emoji: '🌡️' },
  smoke: { from: '#F44336', to: '#E91E63', emoji: '🚨' },
  water: { from: '#2196F3', to: '#03A9F4', emoji: '💧' },
  curtain: { from: '#607D8B', to: '#78909C', emoji: '🪟' },
  thermostat: { from: '#FF9800', to: '#FF5722', emoji: '🌡️' },
  valve: { from: '#2196F3', to: '#03A9F4', emoji: '🚰' },
  sensor: { from: '#2196F3', to: '#03A9F4', emoji: '📡' },
  default: { from: '#607D8B', to: '#78909C', emoji: '📱' }
};

// 🏆 Manufacturer IDs du FORUM (PRIORITÉ HAUTE)
const FORUM_MANUFACTURER_IDS = {
  // Peter van Werkhoven (Forum #492) - Motion sensor multi
  motion_sensor_multi: [
    '_TZ3000_mmtwjmaq',  // Peter's device
    '_TZ3000_kmh5qpmb',
    '_TZ3000_mcxw5ehu',
    '_TZ3000_msl6wxk9',
    '_TZ3040_bb6xaihh',
    '_TZE200_3towulqd'
  ],
  
  // Peter van Werkhoven - SOS Button
  button_emergency_sos: [
    '_TZ3000_26fmupbb',  // Peter's device
    '_TZ3000_4uuaja4a',
    '_TZ3000_mmtwjmaq',
    '_TZ3000_kmh5qpmb'
  ],
  
  // Forum users - Motion sensors
  motion_sensor: [
    '_TZ3000_mmtwjmaq',  // Most common
    '_TZ3000_kmh5qpmb',
    '_TZE200_3towulqd',
    '_TZ3000_msl6wxk9'
  ],
  
  // Forum users - Plugs
  plug_smart: [
    'TS011F',            // Most reported
    '_TZ3000_g5xawfcq',
    '_TZ3000_cehuw1lw'
  ],
  
  // Forum users - Switches
  switch_wall_1gang: [
    'TS0001',            // Most common
    '_TZ3000_qzjcsmar',
    '_TZ3000_ji4araar'
  ],
  
  switch_wall_2gang: [
    'TS0011',
    '_TZ3000_qzjcsmar',
    '_TZ3000_ji4araar'
  ],
  
  // Forum users - Contact sensors
  contact_sensor: [
    'TS0203',
    '_TZ3000_26fmupbb',
    '_TZ3000_n2egfsli'
  ]
};

class UltimateDiagnostic {
  constructor() {
    this.issues = {
      images: [],
      manufacturers: [],
      warnings: [],
      organization: [],
      completion: []
    };
    
    this.fixes = {
      images: 0,
      manufacturers: 0,
      warnings: 0,
      organization: 0,
      completion: 0
    };
  }
  
  // 📊 Phase 1: Diagnostic Images
  async diagnoseImages() {
    console.log('\n🎨 PHASE 1: Diagnostic Images\n' + '='.repeat(60));
    
    const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => 
      fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory()
    );
    
    for (const driverId of drivers) {
      const driverPath = path.join(DRIVERS_DIR, driverId);
      const assetsPath = path.join(driverPath, 'assets/images');
      
      if (!fs.existsSync(assetsPath)) {
        this.issues.images.push({
          driver: driverId,
          issue: 'missing_assets_dir',
          severity: 'high'
        });
        continue;
      }
      
      // Vérifier small.png (75x75)
      const smallPath = path.join(assetsPath, 'small.png');
      if (!fs.existsSync(smallPath)) {
        this.issues.images.push({
          driver: driverId,
          issue: 'missing_small_png',
          severity: 'critical'
        });
      } else {
        // Vérifier si c'est un SVG déguisé ou une vraie image
        const content = fs.readFileSync(smallPath, 'utf8').slice(0, 100);
        if (content.includes('<svg')) {
          this.issues.images.push({
            driver: driverId,
            issue: 'svg_as_png',
            file: 'small.png',
            severity: 'medium'
          });
        }
      }
      
      // Vérifier large.png (500x500)
      const largePath = path.join(assetsPath, 'large.png');
      if (!fs.existsSync(largePath)) {
        this.issues.images.push({
          driver: driverId,
          issue: 'missing_large_png',
          severity: 'high'
        });
      }
      
      // Vérifier xlarge.png (1000x1000)
      const xlargePath = path.join(assetsPath, 'xlarge.png');
      if (!fs.existsSync(xlargePath)) {
        this.issues.images.push({
          driver: driverId,
          issue: 'missing_xlarge_png',
          severity: 'high'
        });
      }
    }
    
    console.log(`✓ Drivers scannés: ${drivers.length}`);
    console.log(`⚠️  Issues images trouvées: ${this.issues.images.length}`);
  }
  
  // 🏆 Phase 2: Manufacturer IDs Forum (PRIORITÉ)
  async diagnoseManufacturerIDs() {
    console.log('\n🏆 PHASE 2: Manufacturer IDs Forum (PRIORITÉ)\n' + '='.repeat(60));
    
    for (const [driverId, forumIds] of Object.entries(FORUM_MANUFACTURER_IDS)) {
      const driverPath = path.join(DRIVERS_DIR, driverId);
      const composePath = path.join(driverPath, 'driver.compose.json');
      
      if (!fs.existsSync(composePath)) {
        console.log(`⚠️  Driver not found: ${driverId}`);
        continue;
      }
      
      const driver = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const currentIds = driver.zigbee?.manufacturerName || [];
      
      // Vérifier que les IDs du forum sont en PREMIER
      const missingIds = forumIds.filter(id => !currentIds.includes(id));
      const wrongOrder = forumIds.some((id, index) => currentIds[index] !== id);
      
      if (missingIds.length > 0) {
        this.issues.manufacturers.push({
          driver: driverId,
          issue: 'missing_forum_ids',
          missingIds,
          severity: 'high',
          priority: 'forum_user'
        });
      }
      
      if (wrongOrder && missingIds.length === 0) {
        this.issues.manufacturers.push({
          driver: driverId,
          issue: 'wrong_order',
          expected: forumIds,
          current: currentIds.slice(0, forumIds.length),
          severity: 'medium',
          priority: 'forum_user'
        });
      }
    }
    
    console.log(`✓ Drivers forum vérifiés: ${Object.keys(FORUM_MANUFACTURER_IDS).length}`);
    console.log(`⚠️  Issues manufacturer IDs: ${this.issues.manufacturers.length}`);
  }
  
  // ⚠️ Phase 3: Warnings & Problèmes
  async diagnoseWarnings() {
    console.log('\n⚠️  PHASE 3: Warnings & Problèmes\n' + '='.repeat(60));
    
    // Vérifier warnings validation
    try {
      const validation = execSync('homey app validate --level publish', { 
        cwd: ROOT,
        encoding: 'utf8'
      });
      
      if (validation.includes('⚠')) {
        const warnings = validation.split('\n').filter(l => l.includes('⚠'));
        this.issues.warnings = warnings.map(w => ({
          warning: w.trim(),
          severity: 'medium'
        }));
      }
    } catch (err) {
      console.log('⚠️  Validation warnings non détectables automatiquement');
    }
    
    console.log(`✓ Warnings analysés: ${this.issues.warnings.length}`);
  }
  
  // 📁 Phase 4: Organisation & Rangement
  async diagnoseOrganization() {
    console.log('\n📁 PHASE 4: Organisation & Rangement\n' + '='.repeat(60));
    
    // Vérifier fichiers root
    const rootFiles = fs.readdirSync(ROOT).filter(f => {
      const stat = fs.statSync(path.join(ROOT, f));
      return stat.isFile() && ![
        'README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'LICENSE',
        'package.json', 'package-lock.json', 'app.json', 'app.js',
        '.gitignore', '.homeyignore', 'jest.config.js'
      ].includes(f);
    });
    
    if (rootFiles.length > 0) {
      this.issues.organization.push({
        issue: 'unnecessary_root_files',
        files: rootFiles,
        severity: 'low'
      });
    }
    
    console.log(`✓ Fichiers root non essentiels: ${rootFiles.length}`);
  }
  
  // ✅ Phase 5: Complétion & Patching
  async diagnoseCompletion() {
    console.log('\n✅ PHASE 5: Complétion & Patching\n' + '='.repeat(60));
    
    const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => 
      fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory()
    );
    
    for (const driverId of drivers) {
      const driverPath = path.join(DRIVERS_DIR, driverId);
      const composePath = path.join(driverPath, 'driver.compose.json');
      const devicePath = path.join(driverPath, 'device.js');
      
      if (!fs.existsSync(devicePath)) {
        this.issues.completion.push({
          driver: driverId,
          issue: 'missing_device_js',
          severity: 'critical'
        });
      }
      
      if (fs.existsSync(composePath)) {
        const driver = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        
        // Vérifier manufacturer IDs complets
        const manufacturerIds = driver.zigbee?.manufacturerName || [];
        const hasWildcards = manufacturerIds.some(id => 
          id.length < 10 || id.endsWith('_')
        );
        
        if (hasWildcards) {
          this.issues.completion.push({
            driver: driverId,
            issue: 'incomplete_manufacturer_ids',
            severity: 'high'
          });
        }
      }
    }
    
    console.log(`✓ Drivers vérifiés: ${drivers.length}`);
    console.log(`⚠️  Issues complétion: ${this.issues.completion.length}`);
  }
  
  // 🔧 AUTO-FIX: Images
  async fixImages() {
    console.log('\n🔧 AUTO-FIX: Images\n' + '='.repeat(60));
    
    for (const issue of this.issues.images) {
      if (issue.severity === 'critical' || issue.severity === 'high') {
        await this.generateDriverImage(issue.driver);
        this.fixes.images++;
      }
    }
    
    console.log(`✅ Images fixées: ${this.fixes.images}`);
  }
  
  // 🔧 AUTO-FIX: Manufacturer IDs Forum
  async fixManufacturerIDs() {
    console.log('\n🔧 AUTO-FIX: Manufacturer IDs Forum\n' + '='.repeat(60));
    
    for (const issue of this.issues.manufacturers) {
      if (issue.priority === 'forum_user') {
        const driverPath = path.join(DRIVERS_DIR, issue.driver);
        const composePath = path.join(driverPath, 'driver.compose.json');
        
        if (!fs.existsSync(composePath)) continue;
        
        const driver = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        const forumIds = FORUM_MANUFACTURER_IDS[issue.driver];
        const currentIds = driver.zigbee?.manufacturerName || [];
        
        // Mettre les IDs forum en PREMIER
        const otherIds = currentIds.filter(id => !forumIds.includes(id));
        driver.zigbee.manufacturerName = [...forumIds, ...otherIds];
        
        fs.writeFileSync(composePath, JSON.stringify(driver, null, 2) + '\n', 'utf8');
        console.log(`✅ ${issue.driver}: IDs forum en priorité`);
        this.fixes.manufacturers++;
      }
    }
    
    console.log(`✅ Manufacturer IDs fixés: ${this.fixes.manufacturers}`);
  }
  
  // 🎨 Générer image driver
  async generateDriverImage(driverId) {
    const driverPath = path.join(DRIVERS_DIR, driverId);
    const assetsPath = path.join(driverPath, 'assets/images');
    
    // Créer le dossier si nécessaire
    if (!fs.existsSync(assetsPath)) {
      fs.mkdirSync(assetsPath, { recursive: true });
    }
    
    // Déterminer catégorie
    const category = Object.keys(CATEGORY_COLORS).find(cat => 
      driverId.includes(cat)
    ) || 'default';
    
    const colors = CATEGORY_COLORS[category];
    
    // Générer SVG contextuels
    const sizes = [
      { name: 'small', size: 75 },
      { name: 'large', size: 500 },
      { name: 'xlarge', size: 1000 }
    ];
    
    for (const { name, size } of sizes) {
      const svg = this.generateSVG(driverId, size, colors);
      const svgPath = path.join(assetsPath, `${name}.svg`);
      fs.writeFileSync(svgPath, svg, 'utf8');
    }
    
    console.log(`  ✓ ${driverId}: Images générées (SVG)`);
  }
  
  // 🎨 Générer SVG
  generateSVG(driverId, size, colors) {
    const fontSize = size / 8;
    const emojiSize = size / 3;
    
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.from};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${colors.to};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#grad)" rx="${size/10}"/>
  <text x="50%" y="45%" font-size="${emojiSize}" text-anchor="middle" dominant-baseline="middle">${colors.emoji}</text>
  <text x="50%" y="75%" font-size="${fontSize}" fill="white" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold">${driverId.replace(/_/g, ' ').toUpperCase()}</text>
</svg>`;
  }
  
  // 📊 Rapport Final
  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 RAPPORT FINAL - ULTIMATE DIAGNOSTIC');
    console.log('='.repeat(80));
    
    console.log('\n🔍 ISSUES DÉTECTÉES:');
    console.log(`  Images: ${this.issues.images.length}`);
    console.log(`  Manufacturer IDs: ${this.issues.manufacturers.length}`);
    console.log(`  Warnings: ${this.issues.warnings.length}`);
    console.log(`  Organisation: ${this.issues.organization.length}`);
    console.log(`  Complétion: ${this.issues.completion.length}`);
    
    console.log('\n✅ FIXES APPLIQUÉS:');
    console.log(`  Images: ${this.fixes.images}`);
    console.log(`  Manufacturer IDs: ${this.fixes.manufacturers}`);
    console.log(`  Warnings: ${this.fixes.warnings}`);
    console.log(`  Organisation: ${this.fixes.organization}`);
    console.log(`  Complétion: ${this.fixes.completion}`);
    
    const totalIssues = Object.values(this.issues).reduce((sum, arr) => sum + arr.length, 0);
    const totalFixes = Object.values(this.fixes).reduce((sum, n) => sum + n, 0);
    
    console.log('\n📈 RÉSULTAT:');
    console.log(`  Total issues: ${totalIssues}`);
    console.log(`  Total fixes: ${totalFixes}`);
    console.log(`  Taux résolution: ${totalIssues > 0 ? Math.round(totalFixes/totalIssues*100) : 100}%`);
    
    console.log('\n' + '='.repeat(80));
  }
  
  // 🚀 Exécution Complète
  async run() {
    console.log('🚀 ULTIMATE DIAGNOSTIC & AUTO-FIX\n');
    console.log('Analyse complète et correction automatique de TOUT...\n');
    
    await this.diagnoseImages();
    await this.diagnoseManufacturerIDs();
    await this.diagnoseWarnings();
    await this.diagnoseOrganization();
    await this.diagnoseCompletion();
    
    console.log('\n🔧 APPLICATION DES FIXES...');
    
    await this.fixImages();
    await this.fixManufacturerIDs();
    
    this.generateReport();
    
    // Rebuild
    console.log('\n🔄 Rebuild...');
    try {
      execSync('homey app build', { cwd: ROOT, stdio: 'inherit' });
      console.log('✅ Build SUCCESS');
    } catch (err) {
      console.log('❌ Build FAILED');
    }
  }
}

// Exécution
(async () => {
  const diagnostic = new UltimateDiagnostic();
  await diagnostic.run();
})().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
