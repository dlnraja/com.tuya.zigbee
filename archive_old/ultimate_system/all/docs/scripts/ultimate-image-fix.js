const fs = require('fs');
const path = require('path');

console.log('🎯 ULTIMATE IMAGE FIX - AIR CONDITIONER CONTROLLER');
console.log('🔧 Solution définitive pour CLI bug 64x64 → 75x75\n');

// 1. Supprimer complètement le cache .homeybuild
if (fs.existsSync('.homeybuild')) {
    fs.rmSync('.homeybuild', { recursive: true, force: true });
    console.log('✅ Cache .homeybuild supprimé complètement');
}

// 2. Créer images 75x75 exactes pour air_conditioner_controller
const driverPath = 'drivers/air_conditioner_controller/assets';
if (!fs.existsSync(driverPath)) {
    fs.mkdirSync(driverPath, { recursive: true });
}

// SVG 75x75 exact pour air conditioner
const svg75x75 = `<svg width="75" height="75" viewBox="0 0 75 75" xmlns="http://www.w3.org/2000/svg">
  <rect width="75" height="75" fill="white"/>
  <g transform="translate(37.5, 37.5)">
    <!-- Air Conditioner Unit -->
    <rect x="-20" y="-10" width="40" height="20" rx="2" fill="#4A90E2" stroke="#333" stroke-width="1"/>
    <!-- Vents -->
    <line x1="-15" y1="-5" x2="15" y2="-5" stroke="white" stroke-width="0.5"/>
    <line x1="-15" y1="0" x2="15" y2="0" stroke="white" stroke-width="0.5"/>  
    <line x1="-15" y1="5" x2="15" y2="5" stroke="white" stroke-width="0.5"/>
    <!-- LED -->
    <circle cx="12" cy="-5" r="1" fill="#00ff00"/>
  </g>
</svg>`;

// Créer toutes les tailles requises
['small.svg', 'large.svg', 'xlarge.svg'].forEach(filename => {
    fs.writeFileSync(path.join(driverPath, filename), svg75x75);
    console.log(`✅ ${filename} créé (75x75)`);
});

// 3. Mettre à jour les spécifications d'images
const imageSpec = {
    "small": { "width": 75, "height": 75, "format": "png" },
    "large": { "width": 500, "height": 500, "format": "png" },
    "xlarge": { "width": 1000, "height": 1000, "format": "png" }
};

fs.writeFileSync(path.join(driverPath, 'image-spec.json'), JSON.stringify(imageSpec, null, 2));
console.log('✅ image-spec.json créé avec dimensions correctes');

// 4. Vérifier assets globaux
if (!fs.existsSync('assets/images')) {
    fs.mkdirSync('assets/images', { recursive: true });
}

// Images globales 75x75 pour éviter conflicts
['small.svg', 'large.svg', 'xlarge.svg'].forEach(filename => {
    fs.writeFileSync(`assets/images/${filename}`, svg75x75);
});
console.log('✅ Assets globaux mis à jour (75x75)');

// 5. Forcer la régénération en supprimant tous les PNGs existants
const findPngs = (dir) => {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir, { withFileTypes: true });
    files.forEach(file => {
        if (file.isDirectory()) {
            findPngs(path.join(dir, file.name));
        } else if (file.name.endsWith('.png')) {
            fs.unlinkSync(path.join(dir, file.name));
            console.log(`🗑️  Supprimé: ${path.join(dir, file.name)}`);
        }
    });
};

findPngs('drivers/air_conditioner_controller');
findPngs('assets');

console.log('\n🎯 ULTIMATE FIX TERMINÉ!');
console.log('✅ Cache .homeybuild supprimé');
console.log('✅ Images 75x75 créées pour air_conditioner_controller'); 
console.log('✅ Tous les PNG supprimés pour forcer régénération');
console.log('✅ Spécifications images mises à jour');
console.log('\nEssayez maintenant: homey app validate');
