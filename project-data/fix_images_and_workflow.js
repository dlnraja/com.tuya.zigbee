const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

console.log('🎨 ANALYSE ET CORRECTION IMAGES + WORKFLOW AUTO-PROMOTION\n');

// 1. Analyser les images du build téléchargé
const referenceImagesDir = path.join(__dirname, 'assets', 'images');
const driversDir = path.join(__dirname, 'drivers');

const results = {
    appImages: {},
    driverImages: {},
    issues: []
};

// Vérifier images app-level
const appSmall = path.join(referenceImagesDir, 'small.png');
const appLarge = path.join(referenceImagesDir, 'large.png');

if (fs.existsSync(appSmall)) {
    const stats = fs.statSync(appSmall);
    results.appImages.small = { exists: true, size: stats.size };
} else {
    results.issues.push('❌ assets/images/small.png manquant');
}

if (fs.existsSync(appLarge)) {
    const stats = fs.statSync(appLarge);
    results.appImages.large = { exists: true, size: stats.size };
} else {
    results.issues.push('❌ assets/images/large.png manquant');
}

// Créer images app-level avec style attendu
function createAppImages() {
    console.log('📐 Création images app-level professionnelles...\n');
    
    // Small: 250x175
    const canvasSmall = createCanvas(250, 175);
    const ctxSmall = canvasSmall.getContext('2d');
    
    // Fond blanc
    ctxSmall.fillStyle = '#FFFFFF';
    ctxSmall.fillRect(0, 0, 250, 175);
    
    // Forme maison avec gradient
    const gradientSmall = ctxSmall.createLinearGradient(0, 0, 0, 175);
    gradientSmall.addColorStop(0, '#1E88E5');
    gradientSmall.addColorStop(1, '#1565C0');
    ctxSmall.fillStyle = gradientSmall;
    
    // Maison simplifiée
    ctxSmall.beginPath();
    ctxSmall.moveTo(125, 40);
    ctxSmall.lineTo(180, 75);
    ctxSmall.lineTo(180, 130);
    ctxSmall.lineTo(70, 130);
    ctxSmall.lineTo(70, 75);
    ctxSmall.closePath();
    ctxSmall.fill();
    
    // Texte "Local Control"
    ctxSmall.fillStyle = '#333333';
    ctxSmall.font = 'bold 12px Arial';
    ctxSmall.textAlign = 'center';
    ctxSmall.fillText('Local Zigbee', 125, 155);
    ctxSmall.font = '10px Arial';
    ctxSmall.fillText('Homey Pro', 125, 168);
    
    const bufferSmall = canvasSmall.toBuffer('image/png');
    fs.writeFileSync(appSmall, bufferSmall);
    console.log('✅ Created assets/images/small.png (250x175)');
    
    // Large: 500x350
    const canvasLarge = createCanvas(500, 350);
    const ctxLarge = canvasLarge.getContext('2d');
    
    // Fond blanc
    ctxLarge.fillStyle = '#FFFFFF';
    ctxLarge.fillRect(0, 0, 500, 350);
    
    // Forme maison plus grande
    const gradientLarge = ctxLarge.createLinearGradient(0, 0, 0, 350);
    gradientLarge.addColorStop(0, '#1E88E5');
    gradientLarge.addColorStop(1, '#1565C0');
    ctxLarge.fillStyle = gradientLarge;
    
    ctxLarge.beginPath();
    ctxLarge.moveTo(250, 80);
    ctxLarge.lineTo(360, 150);
    ctxLarge.lineTo(360, 260);
    ctxLarge.lineTo(140, 260);
    ctxLarge.lineTo(140, 150);
    ctxLarge.closePath();
    ctxLarge.fill();
    
    // Texte plus grand
    ctxLarge.fillStyle = '#333333';
    ctxLarge.font = 'bold 24px Arial';
    ctxLarge.textAlign = 'center';
    ctxLarge.fillText('Universal Tuya Zigbee', 250, 300);
    ctxLarge.font = '18px Arial';
    ctxLarge.fillText('100% Local Control', 250, 325);
    
    const bufferLarge = canvasLarge.toBuffer('image/png');
    fs.writeFileSync(appLarge, bufferLarge);
    console.log('✅ Created assets/images/large.png (500x350)\n');
}

// Créer images drivers avec icône + texte
function createDriverImages() {
    console.log('📐 Création images drivers professionnelles...\n');
    
    const drivers = fs.readdirSync(driversDir).filter(d => {
        const driverPath = path.join(driversDir, d);
        return fs.statSync(driverPath).isDirectory();
    });
    
    const categoryColors = {
        motion: '#2196F3',     // Blue
        sensor: '#03A9F4',     // Light Blue
        switch: '#4CAF50',     // Green
        light: '#FFA500',      // Orange
        plug: '#9C27B0',       // Purple
        climate: '#FF5722',    // Deep Orange
        security: '#F44336',   // Red
        curtain: '#607D8B',    // Blue Grey
        fan: '#00BCD4',        // Cyan
        detector: '#E91E63'    // Pink
    };
    
    drivers.forEach(driver => {
        const assetsDir = path.join(driversDir, driver, 'assets');
        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true });
        }
        
        // Déterminer couleur selon catégorie
        let color = '#1E88E5'; // Default blue
        for (const [key, value] of Object.entries(categoryColors)) {
            if (driver.includes(key)) {
                color = value;
                break;
            }
        }
        
        // Small: 75x75
        const canvasSmall = createCanvas(75, 75);
        const ctxSmall = canvasSmall.getContext('2d');
        
        // Fond blanc
        ctxSmall.fillStyle = '#FFFFFF';
        ctxSmall.fillRect(0, 0, 75, 75);
        
        // Icône circulaire avec gradient
        const gradientSmall = ctxSmall.createRadialGradient(37.5, 30, 5, 37.5, 30, 25);
        gradientSmall.addColorStop(0, color);
        gradientSmall.addColorStop(1, adjustColorBrightness(color, -20));
        ctxSmall.fillStyle = gradientSmall;
        ctxSmall.beginPath();
        ctxSmall.arc(37.5, 30, 20, 0, Math.PI * 2);
        ctxSmall.fill();
        
        // Texte descriptif
        ctxSmall.fillStyle = '#333333';
        ctxSmall.font = '8px Arial';
        ctxSmall.textAlign = 'center';
        const shortName = driver.replace(/_/g, ' ').substring(0, 15);
        ctxSmall.fillText(shortName, 37.5, 62);
        
        const bufferSmall = canvasSmall.toBuffer('image/png');
        fs.writeFileSync(path.join(assetsDir, 'small.png'), bufferSmall);
        
        // Large: 500x500
        const canvasLarge = createCanvas(500, 500);
        const ctxLarge = canvasLarge.getContext('2d');
        
        // Fond blanc
        ctxLarge.fillStyle = '#FFFFFF';
        ctxLarge.fillRect(0, 0, 500, 500);
        
        // Icône plus grande
        const gradientLarge = ctxLarge.createRadialGradient(250, 200, 20, 250, 200, 150);
        gradientLarge.addColorStop(0, color);
        gradientLarge.addColorStop(1, adjustColorBrightness(color, -20));
        ctxLarge.fillStyle = gradientLarge;
        ctxLarge.beginPath();
        ctxLarge.arc(250, 200, 120, 0, Math.PI * 2);
        ctxLarge.fill();
        
        // Texte descriptif
        ctxLarge.fillStyle = '#333333';
        ctxLarge.font = 'bold 20px Arial';
        ctxLarge.textAlign = 'center';
        const fullName = driver.replace(/_/g, ' ');
        ctxLarge.fillText(fullName, 250, 380);
        ctxLarge.font = '16px Arial';
        ctxLarge.fillText('Local Zigbee', 250, 410);
        
        const bufferLarge = canvasLarge.toBuffer('image/png');
        fs.writeFileSync(path.join(assetsDir, 'large.png'), bufferLarge);
        
        console.log(`✅ ${driver}: small.png (75x75) + large.png (500x500)`);
    });
}

function adjustColorBrightness(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255))
        .toString(16).slice(1);
}

// Modifier workflow pour auto-promotion draft->test
function updateWorkflowAutoPromotion() {
    console.log('\n🔧 Modification workflow pour auto-promotion Draft→Test...\n');
    
    const workflowPath = path.join(__dirname, '.github', 'workflows', 'homey-app-store.yml');
    
    const workflowContent = `name: Homey App Store Auto-Publish with Draft→Test Promotion

on:
  push:
    branches:
      - master

jobs:
  publish:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install Homey CLI
        run: npm install -g homey
        
      - name: Login to Homey
        run: |
          echo "\$\{\{ secrets.HOMEY_TOKEN \}\}" | homey login --token
          
      - name: Validate app
        run: homey app validate --level=publish
        
      - name: Publish app (creates Draft build)
        id: publish
        run: |
          BUILD_OUTPUT=\$(homey app publish 2>&1)
          echo "\$BUILD_OUTPUT"
          BUILD_ID=\$(echo "\$BUILD_OUTPUT" | grep -oP 'Build #\\K[0-9]+' || echo "")
          if [ -z "\$BUILD_ID" ]; then
            echo "❌ Failed to extract build ID"
            exit 1
          fi
          echo "BUILD_ID=\$BUILD_ID" >> \$GITHUB_OUTPUT
          echo "✅ Build #\$BUILD_ID created (Draft)"
          
      - name: Auto-promote Draft to Test
        run: |
          BUILD_ID="\$\{\{ steps.publish.outputs.BUILD_ID \}\}"
          echo "🚀 Promoting Build #\$BUILD_ID from Draft to Test..."
          
          # Use Homey API to promote build
          curl -X POST \\
            -H "Authorization: Bearer \$\{\{ secrets.HOMEY_TOKEN \}\}" \\
            -H "Content-Type: application/json" \\
            "https://api.developer.homey.app/app/com.dlnraja.tuya.zigbee/build/\$BUILD_ID/promote" \\
            -d '{"target": "test"}'
          
          echo "✅ Build #\$BUILD_ID promoted to Test"
          
      - name: Summary
        run: |
          echo "📊 Publication Summary:"
          echo "  - Build ID: \$\{\{ steps.publish.outputs.BUILD_ID \}\}"
          echo "  - Status: Test (auto-promoted)"
          echo "  - URL: https://homey.app/a/com.dlnraja.tuya.zigbee/test/"
`;
    
    fs.writeFileSync(workflowPath, workflowContent);
    console.log('✅ Workflow mis à jour avec auto-promotion Draft→Test');
    console.log('   Fichier: .github/workflows/homey-app-store.yml\n');
}

// Exécution
try {
    console.log('='.repeat(60));
    console.log('ÉTAPE 1: Création images app-level');
    console.log('='.repeat(60));
    createAppImages();
    
    console.log('='.repeat(60));
    console.log('ÉTAPE 2: Création images drivers');
    console.log('='.repeat(60));
    createDriverImages();
    
    console.log('='.repeat(60));
    console.log('ÉTAPE 3: Mise à jour workflow');
    console.log('='.repeat(60));
    updateWorkflowAutoPromotion();
    
    console.log('='.repeat(60));
    console.log('✅ TOUTES LES CORRECTIONS APPLIQUÉES');
    console.log('='.repeat(60));
    console.log('\n📋 RÉSUMÉ:');
    console.log('  ✅ Images app-level: 250x175 + 500x350 avec style maison+texte');
    console.log('  ✅ Images drivers: 75x75 + 500x500 avec icônes colorées + texte');
    console.log('  ✅ Workflow: Auto-promotion Draft→Test configurée');
    console.log('\n🚀 PROCHAINES ÉTAPES:');
    console.log('  1. git add .');
    console.log('  2. git commit -m "fix: images cohérentes + auto-promotion workflow"');
    console.log('  3. git push origin master');
    console.log('  4. Le build sera automatiquement promu de Draft à Test\n');
    
} catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
}
