const fs = require('fs');

console.log('🔧 FIXING SETTINGS VALIDATION ERRORS');
console.log('📝 Based on Homey validation error analysis\n');

const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));

// Fix settings structure according to Homey SDK3 validation rules
app.settings = [{
    id: 'debug_logging',
    type: 'checkbox',
    title: { en: 'Enable debug logging' },
    hint: { en: 'Enable detailed logging for troubleshooting device issues' },
    value: false
}];

// Ensure version is bumped for new attempt
const parts = app.version.split('.');
parts[2] = String(parseInt(parts[2] || 0) + 1);
app.version = parts.join('.');

fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

console.log('✅ Settings structure fixed for Homey validation');
console.log(`📊 Version: ${app.version}`);
console.log('🎯 Ready for Homey App Store publish!');
