const fs = require('fs');

console.log('🎨 PRO IMAGES - Homey SDK3 compliant');

const colors = {motion: '#2196F3', plug: '#9C27B0', switch: '#4CAF50', temp: '#FF9800', sensor: '#03A9F4', light: '#FFD700', default: '#4CAF50'};

fs.readdirSync('drivers').forEach(d => {
    const dir = `drivers/${d}/assets`;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
    
    let c = colors.default;
    if (d.includes('motion')) c = colors.motion;
    else if (d.includes('plug')) c = colors.plug;
    else if (d.includes('switch')) c = colors.switch;
    else if (d.includes('temp')) c = colors.temp;
    else if (d.includes('sensor')) c = colors.sensor;
    else if (d.includes('light')) c = colors.light;
    
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${c}" rx="15"/><circle cx="50" cy="50" r="22" fill="white" opacity="0.95"/></svg>`;
    
    ['small.svg','large.svg','xlarge.svg'].forEach(s => fs.writeFileSync(`${dir}/${s}`, svg));
});

console.log('✅ PRO images créées');
