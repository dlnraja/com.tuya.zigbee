const fs = require('fs');

console.log('🔧 JSON REPAIR - Fix Syntax Errors');

try {
    // 1. Lire le fichier en mode raw
    let content = fs.readFileSync('app.json', 'utf8');
    console.log('✅ app.json lu');
    
    // 2. Réparer les erreurs JSON courantes
    let repaired = false;
    
    // Supprimer {{ ... }}
    if (content.includes('{{ ... }}')) {
        content = content.replace(/{{ ... }}/g, '');
        repaired = true;
        console.log('✅ {{ ... }} supprimé');
    }
    
    // Supprimer virgules en trop
    content = content.replace(/,(\s*[\}\]])/g, '$1');
    
    // Supprimer doubles virgules
    content = content.replace(/,,+/g, ',');
    
    // 3. Tester si le JSON est valide maintenant
    try {
        const parsed = JSON.parse(content);
        console.log(`✅ JSON valide - ${parsed.drivers.length} drivers`);
        
        // 4. Réécrire le fichier proprement
        fs.writeFileSync('app.json', JSON.stringify(parsed, null, 2));
        console.log('✅ app.json réparé et réécrit');
        
        // 5. Clean cache
        if (fs.existsSync('.homeybuild')) {
            fs.rmSync('.homeybuild', { recursive: true, force: true });
            console.log('✅ Cache nettoyé');
        }
        
        console.log('\n🎯 JSON REPAIR COMPLETE!');
        
    } catch(parseError) {
        console.log(`❌ Erreur JSON persistante: ${parseError.message}`);
        
        // 6. Fallback: créer un nouveau app.json minimal
        console.log('🔄 Création app.json minimal...');
        
        const minimal = {
            id: "com.tuya.zigbee",
            version: "2.0.5", 
            compatibility: ">=5.0.0",
            sdk: 3,
            name: { en: "Universal Tuya Zigbee" },
            description: { en: "Universal Zigbee device support for Tuya devices" },
            category: ["appliances"],
            permissions: [],
            images: { small: "/assets/images/small.png", large: "/assets/images/large.png" },
            author: { name: "Community" },
            drivers: []
        };
        
        fs.writeFileSync('app.json', JSON.stringify(minimal, null, 2));
        console.log('✅ app.json minimal créé');
    }
    
} catch(error) {
    console.log(`❌ Erreur: ${error.message}`);
}
