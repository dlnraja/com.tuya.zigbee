// 🎨 GÉNÉRATEUR D'IMAGES HOMEY SDK3 + JOHAN BENDZ
const fs = require('fs');
const path = require('path');

class ImageGenerator {
    constructor() {
        this.SIZES = {
            small: {w: 75, h: 75},
            large: {w: 250, h: 175}, 
            xlarge: {w: 500, h: 350}
        };
        
        this.CATEGORIES = {
            '1gang': '1 button switch',
            '2gang': '2 buttons switch', 
            '3gang': '3 buttons switch',
            'motion': 'PIR sensor dome',
            'plug': 'smart outlet',
            'energy': 'energy monitor plug',
            'temp': 'temperature sensor'
        };
    }

    generateAll() {
        console.log('🎨 GÉNÉRATION IMAGES DÉMARRÉE');
        
        const drivers = fs.readdirSync('drivers');
        
        drivers.forEach(driver => {
            const category = this.detectCategory(driver);
            this.createImageSpecs(driver, category);
        });
        
        console.log(`✅ ${drivers.length} drivers traités`);
    }

    detectCategory(driverName) {
        const name = driverName.toLowerCase();
        
        if (name.includes('3gang')) return '3gang';
        if (name.includes('2gang')) return '2gang';  
        if (name.includes('1gang') || name.includes('switch')) return '1gang';
        if (name.includes('motion') || name.includes('pir')) return 'motion';
        if (name.includes('energy')) return 'energy';
        if (name.includes('plug')) return 'plug';
        if (name.includes('temp')) return 'temp';
        
        return 'generic';
    }

    createImageSpecs(driver, category) {
        const assetsDir = `drivers/${driver}/assets`;
        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, {recursive: true});
        }

        Object.entries(this.SIZES).forEach(([size, dims]) => {
            const spec = {
                driver,
                category,
                size,
                dimensions: `${dims.w}x${dims.h}px`,
                description: this.CATEGORIES[category] || 'smart device',
                homeySDK3: true,
                johanBenzStyle: true,
                aiRecognition: true,
                instructions: [
                    'White background or transparent',
                    'Professional minimalist style',
                    'No brand logos',
                    'High contrast for AI recognition',
                    'Homey SDK3 compliant dimensions'
                ]
            };
            
            fs.writeFileSync(
                `${assetsDir}/${size}-spec.json`,
                JSON.stringify(spec, null, 2)
            );
            
            const placeholder = `# ${driver.toUpperCase()} - ${size.toUpperCase()}
Product: ${spec.description}
Size: ${spec.dimensions}
Style: Johan Bendz inspired, unbranded
Recognition: AI/OpenCV optimized
Background: White/transparent
Quality: Homey SDK3 compliant`;
            
            fs.writeFileSync(`${assetsDir}/${size}.placeholder`, placeholder);
        });
        
        console.log(`📷 ${driver}: 3 spécifications créées`);
    }
}

// EXÉCUTION
const generator = new ImageGenerator();
generator.generateAll();
console.log('🎉 GÉNÉRATION TERMINÉE');
