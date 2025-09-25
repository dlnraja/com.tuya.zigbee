const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔧 QUICK FORUM FIXES - Community Issues');

// Enhanced IDs from forum feedback
const forumIDs = [
    "_TZE284_aao6qtcs", "_TZ3000_mmtwjmaq", "_TZE200_cwbvmsar", 
    "TS011F", "TS0201", "TS0001", "TS130F", "Tuya", "MOES"
];

// Apply to all drivers
fs.readdirSync('drivers').forEach(d => {
    const p = `drivers/${d}/driver.compose.json`;
    if (fs.existsSync(p)) {
        const c = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (c.zigbee) {
            c.zigbee.manufacturerName = forumIDs;
            c.zigbee.productId = ["TS0001", "TS011F", "TS0201"];
        }
        
        // Add energy capabilities for plugs (forum request)
        if (d.includes('plug') && c.capabilities) {
            if (!c.capabilities.includes('measure_power')) {
                c.capabilities.push('measure_power');
            }
        }
        
        fs.writeFileSync(p, JSON.stringify(c, null, 2));
    }
});

// Update version
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.version = '4.0.6';
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

console.log('✅ Forum fixes applied - v4.0.6');
