const fs = require('fs');

// Remove problematic driver directory
if (fs.existsSync('drivers/air_quality_monitor')) {
    fs.rmSync('drivers/air_quality_monitor', { recursive: true });
    console.log('Removed air_quality_monitor');
}

// Clean cache
if (fs.existsSync('.homeybuild')) {
    fs.rmSync('.homeybuild', { recursive: true });
    console.log('Cache cleaned');
}

console.log('Done');
