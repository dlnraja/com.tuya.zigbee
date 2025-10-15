const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

console.log('🎨 GÉNÉRATION ICÔNES SPÉCIFIQUES PAR TYPE DE DEVICE\n');

// Fonction pour dessiner icône selon type de device
function drawDeviceIcon(ctx, centerX, centerY, size, deviceType, color) {
    // Carré arrondi blanc avec ombre
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = size * 0.15;
    ctx.shadowOffsetY = size * 0.05;
    
    const cornerRadius = size * 0.15;
    ctx.fillStyle = '#FFFFFF';
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
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    // Dessiner icône spécifique
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.05;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    const iconSize = size * 0.35;
    
    switch(deviceType) {
        case 'motion':
            // Icône personne en mouvement
            ctx.beginPath();
            ctx.arc(centerX, centerY - iconSize * 0.5, iconSize * 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(centerX, centerY - iconSize * 0.2);
            ctx.lineTo(centerX, centerY + iconSize * 0.5);
            ctx.moveTo(centerX - iconSize * 0.4, centerY);
            ctx.lineTo(centerX + iconSize * 0.4, centerY);
            ctx.moveTo(centerX, centerY + iconSize * 0.5);
            ctx.lineTo(centerX - iconSize * 0.3, centerY + iconSize * 0.9);
            ctx.moveTo(centerX, centerY + iconSize * 0.5);
            ctx.lineTo(centerX + iconSize * 0.3, centerY + iconSize * 0.9);
            ctx.stroke();
            // Ondes
            for(let i = 1; i <= 2; i++) {
                ctx.beginPath();
                ctx.arc(centerX, centerY, iconSize * 0.6 + i * size * 0.08, -Math.PI/3, Math.PI/3);
                ctx.stroke();
            }
            break;
            
        case 'contact':
            // Icône porte/fenêtre
            ctx.strokeRect(centerX - iconSize * 0.6, centerY - iconSize * 0.7, iconSize * 0.5, iconSize * 1.4);
            ctx.strokeRect(centerX + iconSize * 0.1, centerY - iconSize * 0.7, iconSize * 0.5, iconSize * 1.4);
            ctx.beginPath();
            ctx.arc(centerX + iconSize * 0.4, centerY, iconSize * 0.1, 0, Math.PI * 2);
            ctx.fill();
            break;
            
        case 'temperature':
            // Icône thermomètre
            ctx.beginPath();
            ctx.arc(centerX, centerY + iconSize * 0.5, iconSize * 0.25, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(centerX - iconSize * 0.12, centerY - iconSize * 0.8, iconSize * 0.24, iconSize * 1.3);
            ctx.strokeRect(centerX - iconSize * 0.12, centerY - iconSize * 0.8, iconSize * 0.24, iconSize * 1.3);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(centerX - iconSize * 0.06, centerY - iconSize * 0.6, iconSize * 0.12, iconSize * 0.8);
            break;
            
        case 'plug':
            // Icône prise électrique
            ctx.strokeRect(centerX - iconSize * 0.6, centerY - iconSize * 0.5, iconSize * 1.2, iconSize);
            ctx.beginPath();
            ctx.moveTo(centerX - iconSize * 0.25, centerY - iconSize * 0.3);
            ctx.lineTo(centerX - iconSize * 0.25, centerY - iconSize * 0.05);
            ctx.moveTo(centerX + iconSize * 0.25, centerY - iconSize * 0.3);
            ctx.lineTo(centerX + iconSize * 0.25, centerY - iconSize * 0.05);
            ctx.stroke();
            ctx.strokeRect(centerX - iconSize * 0.15, centerY + iconSize * 0.1, iconSize * 0.3, iconSize * 0.25);
            break;
            
        case 'light':
            // Icône ampoule
            ctx.beginPath();
            ctx.arc(centerX, centerY - iconSize * 0.2, iconSize * 0.45, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(centerX - iconSize * 0.15, centerY + iconSize * 0.2, iconSize * 0.3, iconSize * 0.4);
            ctx.strokeRect(centerX - iconSize * 0.2, centerY + iconSize * 0.6, iconSize * 0.4, iconSize * 0.15);
            // Rayons
            for(let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
                const x1 = centerX + Math.cos(angle) * iconSize * 0.6;
                const y1 = centerY - iconSize * 0.2 + Math.sin(angle) * iconSize * 0.6;
                const x2 = centerX + Math.cos(angle) * iconSize * 0.85;
                const y2 = centerY - iconSize * 0.2 + Math.sin(angle) * iconSize * 0.85;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
            break;
            
        case 'switch':
            // Icône interrupteur
            ctx.strokeRect(centerX - iconSize * 0.5, centerY - iconSize * 0.6, iconSize, iconSize * 1.2);
            ctx.fillRect(centerX - iconSize * 0.25, centerY - iconSize * 0.4, iconSize * 0.5, iconSize * 0.6);
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(centerX, centerY - iconSize * 0.1, iconSize * 0.12, 0, Math.PI * 2);
            ctx.fill();
            break;
            
        case 'curtain':
            // Icône rideau
            ctx.beginPath();
            ctx.moveTo(centerX - iconSize * 0.7, centerY - iconSize * 0.8);
            ctx.lineTo(centerX + iconSize * 0.7, centerY - iconSize * 0.8);
            ctx.stroke();
            for(let i = -2; i <= 2; i++) {
                ctx.beginPath();
                ctx.moveTo(centerX + i * iconSize * 0.25, centerY - iconSize * 0.7);
                ctx.quadraticCurveTo(
                    centerX + i * iconSize * 0.25 + iconSize * 0.1, centerY,
                    centerX + i * iconSize * 0.25, centerY + iconSize * 0.7
                );
                ctx.stroke();
            }
            break;
            
        case 'smoke':
            // Icône détecteur de fumée
            ctx.beginPath();
            ctx.arc(centerX, centerY, iconSize * 0.7, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(centerX, centerY, iconSize * 0.5, 0, Math.PI * 2);
            ctx.stroke();
            // Fumée
            ctx.beginPath();
            ctx.moveTo(centerX - iconSize * 0.1, centerY - iconSize * 0.2);
            ctx.quadraticCurveTo(centerX - iconSize * 0.3, centerY - iconSize * 0.5, centerX - iconSize * 0.15, centerY - iconSize * 0.8);
            ctx.moveTo(centerX + iconSize * 0.1, centerY - iconSize * 0.2);
            ctx.quadraticCurveTo(centerX + iconSize * 0.3, centerY - iconSize * 0.5, centerX + iconSize * 0.15, centerY - iconSize * 0.8);
            ctx.stroke();
            break;
            
        case 'thermostat':
            // Icône thermostat
            ctx.beginPath();
            ctx.arc(centerX, centerY, iconSize * 0.7, 0, Math.PI * 2);
            ctx.stroke();
            // Cadran
            for(let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
                const x1 = centerX + Math.cos(angle) * iconSize * 0.55;
                const y1 = centerY + Math.sin(angle) * iconSize * 0.55;
                const x2 = centerX + Math.cos(angle) * iconSize * 0.65;
                const y2 = centerY + Math.sin(angle) * iconSize * 0.65;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
            // Aiguille
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(centerX + iconSize * 0.4, centerY - iconSize * 0.3);
            ctx.stroke();
            break;
            
        case 'siren':
            // Icône sirène
            ctx.beginPath();
            ctx.moveTo(centerX - iconSize * 0.4, centerY + iconSize * 0.5);
            ctx.lineTo(centerX - iconSize * 0.6, centerY - iconSize * 0.5);
            ctx.lineTo(centerX + iconSize * 0.6, centerY - iconSize * 0.5);
            ctx.lineTo(centerX + iconSize * 0.4, centerY + iconSize * 0.5);
            ctx.closePath();
            ctx.fill();
            // Ondes sonores
            for(let i = 1; i <= 3; i++) {
                ctx.beginPath();
                ctx.arc(centerX, centerY - iconSize * 0.5, i * iconSize * 0.3, -Math.PI * 0.7, -Math.PI * 0.3);
                ctx.stroke();
            }
            break;
            
        default:
            // Icône générique zigbee
            ctx.beginPath();
            ctx.arc(centerX, centerY, iconSize * 0.4, 0, Math.PI * 2);
            ctx.fill();
            for(let i = 1; i <= 3; i++) {
                ctx.beginPath();
                ctx.arc(centerX, centerY, iconSize * 0.4 + i * size * 0.08, -Math.PI/4, Math.PI/4);
                ctx.stroke();
            }
    }
}

// Détecter type de device depuis nom driver
function getDeviceType(driverName) {
    const name = driverName.toLowerCase();
    
    if (name.includes('motion') || name.includes('pir')) return 'motion';
    if (name.includes('contact') || name.includes('door') || name.includes('window')) return 'contact';
    if (name.includes('temperature') || name.includes('humidity') || name.includes('climate')) return 'temperature';
    if (name.includes('plug') || name.includes('socket') || name.includes('energy')) return 'plug';
    if (name.includes('light') || name.includes('bulb') || name.includes('led')) return 'light';
    if (name.includes('switch') || name.includes('button') || name.includes('controller')) return 'switch';
    if (name.includes('curtain') || name.includes('blind') || name.includes('shade')) return 'curtain';
    if (name.includes('smoke') || name.includes('gas')) return 'smoke';
    if (name.includes('thermostat') || name.includes('trv')) return 'thermostat';
    if (name.includes('siren') || name.includes('alarm')) return 'siren';
    
    return 'generic';
}

// Couleurs selon type
function getDeviceColor(deviceType) {
    const colors = {
        motion: '#4CAF50',
        contact: '#2196F3',
        temperature: '#FF9800',
        plug: '#9C27B0',
        light: '#FFC107',
        switch: '#00BCD4',
        curtain: '#795548',
        smoke: '#F44336',
        thermostat: '#FF5722',
        siren: '#E91E63',
        generic: '#607D8B'
    };
    return colors[deviceType] || colors.generic;
}

// Créer image
function createDeviceImage(driverPath, driverName, size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Fond dégradé
    const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size * 0.7);
    gradient.addColorStop(0, '#F5F5F5');
    gradient.addColorStop(1, '#E0E0E0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    // Détecter type et couleur
    const deviceType = getDeviceType(driverName);
    const color = getDeviceColor(deviceType);
    
    // Dessiner icône
    drawDeviceIcon(ctx, size/2, size/2, size * 0.75, deviceType, color);
    
    return canvas.toBuffer('image/png');
}

// Traiter tous les drivers
function processAllDrivers() {
    const driversDir = path.join(process.cwd(), 'drivers');
    const drivers = fs.readdirSync(driversDir).filter(f => {
        return fs.statSync(path.join(driversDir, f)).isDirectory();
    });
    
    let processed = 0;
    const typeCount = {};
    
    for (const driver of drivers) {
        const driverPath = path.join(driversDir, driver);
        const assetsPath = path.join(driverPath, 'assets');
        
        if (!fs.existsSync(assetsPath)) {
            fs.mkdirSync(assetsPath, { recursive: true });
        }
        
        const deviceType = getDeviceType(driver);
        typeCount[deviceType] = (typeCount[deviceType] || 0) + 1;
        
        try {
            // Small 75x75
            const bufferSmall = createDeviceImage(driverPath, driver, 75);
            fs.writeFileSync(path.join(assetsPath, 'small.png'), bufferSmall);
            
            // Large 500x500
            const bufferLarge = createDeviceImage(driverPath, driver, 500);
            fs.writeFileSync(path.join(assetsPath, 'large.png'), bufferLarge);
            
            processed++;
            
            if (processed % 20 === 0) {
                console.log(`   ${processed}/${drivers.length} drivers...`);
            }
        } catch (error) {
            console.log(`   ⚠️ ${driver}: ${error.message}`);
        }
    }
    
    console.log(`\n✅ ${processed} drivers traités\n`);
    console.log('📊 Types détectés:');
    Object.entries(typeCount).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
    });
    
    return processed;
}

// Exécution
console.log('================================================');
console.log('  GÉNÉRATION ICÔNES SPÉCIFIQUES PAR TYPE DEVICE');
console.log('================================================\n');

try {
    const count = processAllDrivers();
    
    console.log('\n================================================');
    console.log('✅ TERMINÉ!');
    console.log(`   - ${count * 2} images drivers`);
    console.log('   - Icônes spécifiques par type');
    console.log('   - Couleurs adaptées');
    console.log('================================================\n');
    
} catch (error) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
}
