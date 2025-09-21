const fs = require('fs');

console.log('🎨 SMART IMAGES - Homey SDK3 + Johan Bendz');

// Couleurs par type (Johan Bendz)
const colors = {
    motion: '#2196F3', plug: '#9C27B0', switch: '#4CAF50', 
    temp: '#FF9800', sensor: '#03A9F4', light: '#FFD700', default: '#4CAF50'
};

fs.readdirSync('drivers').forEach(d => {
    const assets = `drivers/${d}/assets`;
    if (!fs.existsSync(assets)) fs.mkdirSync(assets, {recursive: true});
    
    // Déterminer couleur
    let color = colors.default;
    if (d.includes('motion')) color = colors.motion;
    else if (d.includes('plug')) color = colors.plug;
    else if (d.includes('switch')) color = colors.switch;
    else if (d.includes('temp')) color = colors.temp;
    else if (d.includes('sensor')) color = colors.sensor;
    else if (d.includes('light')) color = colors.light;
    
    // Générer SVG professionnel
    ['small.svg','large.svg','xlarge.svg'].forEach(size => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
<stop offset="0%" style="stop-color:${color};stop-opacity:1" />
<stop offset="100%" style="stop-color:${color}CC;stop-opacity:1" />
</linearGradient></defs>
<rect width="100" height="100" fill="url(#grad)" rx="12"/>
<circle cx="50" cy="50" r="20" fill="white" opacity="0.9"/>
</svg>`;
        fs.writeFileSync(`${assets}/${size}`, svg);
    });
});

console.log('✅ Images générées');
