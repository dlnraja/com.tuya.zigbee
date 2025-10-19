const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

console.log('🎨 RÉGÉNÉRATION COMPLÈTE DES IMAGES - STYLE SDK3 CORRECT\n');

// Palettes de couleurs par catégorie
const categoryColors = {
    sensor: '#4CAF50',
    climate: '#FF9800',
    socket: '#9C27B0',
    light: '#FFC107',
    switch: '#2196F3',
    curtain: '#00BCD4',
    security: '#F44336',
    other: '#607D8B'
};

// Déterminer catégorie depuis nom driver
function getCategoryColor(driverName) {
    if (driverName.includes('sensor') || driverName.includes('motion') || driverName.includes('contact')) {
        return categoryColors.sensor;
    }
    if (driverName.includes('temperature') || driverName.includes('humidity') || driverName.includes('thermostat') || driverName.includes('trv')) {
        return categoryColors.climate;
    }
    if (driverName.includes('plug') || driverName.includes('socket') || driverName.includes('energy')) {
        return categoryColors.socket;
    }
    if (driverName.includes('light') || driverName.includes('bulb') || driverName.includes('led')) {
        return categoryColors.light;
    }
    if (driverName.includes('switch') || driverName.includes('button') || driverName.includes('controller')) {
        return categoryColors.switch;
    }
    if (driverName.includes('curtain') || driverName.includes('blind') || driverName.includes('shade')) {
        return categoryColors.curtain;
    }
    if (driverName.includes('alarm') || driverName.includes('smoke') || driverName.includes('security')) {
        return categoryColors.security;
    }
    return categoryColors.other;
}

// Dessiner icône device générique
function drawDeviceIcon(ctx, centerX, centerY, size, color) {
    // Carré arrondi avec ombre
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
    
    // Fond blanc arrondi
    ctx.fillStyle = '#FFFFFF';
    const cornerRadius = size * 0.2;
    ctx.beginPath();
    ctx.moveTo(centerX - size/2 + cornerRadius, centerY - size/2);
    ctx.lineTo(centerX + size/2 - cornerRadius, centerY - size/2);
    ctx.quadraticCurveTo(centerX + size/2, centerY - size/2, centerX + size/2, centerY - size/2 + cornerRadius);
    ctx.lineTo(centerX + size/2, centerY + size/2 - cornerRadius);
    ctx.quadraticCurveTo(centerX + size/2, centerY + size/2, centerX + size/2 - cornerRadius, centerY + size/2);
    ctx.lineTo(centerX - size/2 + cornerRadius, centerY + size/2);
    ctx.quadraticCurveTo(centerX - size/2, centerY + size/2, centerX - size/2, centerY + size/2 - cornerRadius);
    ctx.lineTo(centerX - size/2, centerY - size/2 + cornerRadius);
    ctx.quadraticCurveTo(centerX - size/2, centerY - size/2, centerX - size/2 + cornerRadius, centerY - size/2);
    ctx.closePath();
    ctx.fill();
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Icône device (cercle avec antenne zigbee)
    const iconSize = size * 0.5;
    
    // Cercle principal
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(centerX, centerY, iconSize * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    // Antenne zigbee (3 ondes)
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.04;
    for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, iconSize * 0.4 + (i * size * 0.08), -Math.PI/4, Math.PI/4);
        ctx.stroke();
    }
}

// Créer image small (75x75)
function createSmallImage(driverPath, driverName) {
    const canvas = createCanvas(75, 75);
    const ctx = canvas.getContext('2d');
    
    // Fond dégradé
    const gradient = ctx.createRadialGradient(37.5, 37.5, 0, 37.5, 37.5, 50);
    gradient.addColorStop(0, '#F5F5F5');
    gradient.addColorStop(1, '#E0E0E0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 75, 75);
    
    // Dessiner icône
    const color = getCategoryColor(driverName);
    drawDeviceIcon(ctx, 37.5, 37.5, 55, color);
    
    const buffer = canvas.toBuffer('image/png');
    const outputPath = path.join(driverPath, 'assets', 'small.png');
    fs.writeFileSync(outputPath, buffer);
    
    return true;
}

// Créer image large (500x500)
function createLargeImage(driverPath, driverName) {
    const canvas = createCanvas(500, 500);
    const ctx = canvas.getContext('2d');
    
    // Fond dégradé
    const gradient = ctx.createRadialGradient(250, 250, 0, 250, 250, 350);
    gradient.addColorStop(0, '#F5F5F5');
    gradient.addColorStop(1, '#E0E0E0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 500, 500);
    
    // Dessiner icône plus grande
    const color = getCategoryColor(driverName);
    drawDeviceIcon(ctx, 250, 250, 350, color);
    
    const buffer = canvas.toBuffer('image/png');
    const outputPath = path.join(driverPath, 'assets', 'large.png');
    fs.writeFileSync(outputPath, buffer);
    
    return true;
}

// Créer images app-level
function createAppImages() {
    console.log('📐 Création images app-level...\n');
    
    const assetsDir = path.join(process.cwd(), 'assets', 'images');
    
    // Small (250x175)
    const canvasSmall = createCanvas(250, 175);
    const ctxSmall = canvasSmall.getContext('2d');
    
    // Dégradé bleu
    const gradSmall = ctxSmall.createLinearGradient(0, 0, 0, 175);
    gradSmall.addColorStop(0, '#1E88E5');
    gradSmall.addColorStop(1, '#1565C0');
    ctxSmall.fillStyle = gradSmall;
    ctxSmall.fillRect(0, 0, 250, 175);
    
    // Logo maison + zigbee
    ctxSmall.fillStyle = '#FFFFFF';
    ctxSmall.beginPath();
    ctxSmall.moveTo(125, 40);
    ctxSmall.lineTo(175, 75);
    ctxSmall.lineTo(175, 120);
    ctxSmall.lineTo(75, 120);
    ctxSmall.lineTo(75, 75);
    ctxSmall.closePath();
    ctxSmall.fill();
    
    // Texte
    ctxSmall.fillStyle = '#FFFFFF';
    ctxSmall.font = 'bold 16px Arial';
    ctxSmall.textAlign = 'center';
    ctxSmall.fillText('Universal Tuya', 125, 150);
    
    const bufferSmall = canvasSmall.toBuffer('image/png');
    fs.writeFileSync(path.join(assetsDir, 'small.png'), bufferSmall);
    console.log('✅ assets/images/small.png');
    
    // Large (500x350)
    const canvasLarge = createCanvas(500, 350);
    const ctxLarge = canvasLarge.getContext('2d');
    
    const gradLarge = ctxLarge.createLinearGradient(0, 0, 0, 350);
    gradLarge.addColorStop(0, '#1E88E5');
    gradLarge.addColorStop(1, '#1565C0');
    ctxLarge.fillStyle = gradLarge;
    ctxLarge.fillRect(0, 0, 500, 350);
    
    // Logo plus grand
    ctxLarge.fillStyle = '#FFFFFF';
    ctxLarge.beginPath();
    ctxLarge.moveTo(250, 80);
    ctxLarge.lineTo(350, 150);
    ctxLarge.lineTo(350, 240);
    ctxLarge.lineTo(150, 240);
    ctxLarge.lineTo(150, 150);
    ctxLarge.closePath();
    ctxLarge.fill();
    
    ctxLarge.font = 'bold 32px Arial';
    ctxLarge.textAlign = 'center';
    ctxLarge.fillText('Universal Tuya Zigbee', 250, 300);
    
    const bufferLarge = canvasLarge.toBuffer('image/png');
    fs.writeFileSync(path.join(assetsDir, 'large.png'), bufferLarge);
    console.log('✅ assets/images/large.png');
}

// Parcourir tous les drivers
function processAllDrivers() {
    console.log('🔄 Traitement des drivers...\n');
    
    const driversDir = path.join(process.cwd(), 'drivers');
    const drivers = fs.readdirSync(driversDir).filter(f => {
        const driverPath = path.join(driversDir, f);
        return fs.statSync(driverPath).isDirectory();
    });
    
    let processed = 0;
    
    for (const driver of drivers) {
        const driverPath = path.join(driversDir, driver);
        const assetsPath = path.join(driverPath, 'assets');
        
        // Créer dossier assets si manquant
        if (!fs.existsSync(assetsPath)) {
            fs.mkdirSync(assetsPath, { recursive: true });
        }
        
        // Générer images
        try {
            createSmallImage(driverPath, driver);
            createLargeImage(driverPath, driver);
            processed++;
            
            if (processed % 20 === 0) {
                console.log(`   Processed ${processed}/${drivers.length} drivers...`);
            }
        } catch (error) {
            console.log(`   ⚠️ ${driver}: ${error.message}`);
        }
    }
    
    console.log(`\n✅ ${processed} drivers traités`);
    return processed;
}

// Exécution
console.log('============================================');
console.log('  RÉGÉNÉRATION IMAGES SDK3 PROFESSIONNELLES');
console.log('============================================\n');

try {
    createAppImages();
    console.log('');
    const count = processAllDrivers();
    
    console.log('\n============================================');
    console.log('✅ TERMINÉ!');
    console.log(`   - 2 images app-level`);
    console.log(`   - ${count * 2} images drivers (small + large)`);
    console.log(`   - Total: ${2 + count * 2} images PNG`);
    console.log('============================================\n');
    
} catch (error) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
}
