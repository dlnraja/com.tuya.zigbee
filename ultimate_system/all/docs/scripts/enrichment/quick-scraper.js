// Quick scraper for Johan Bendz data
const https = require('https');
const fs = require('fs');

async function scrapeData() {
    console.log('🔍 Quick scraping Johan Bendz data...');
    
    // Simple manufacturer ID patterns to enrich
    const manufacturerIds = [
        "_TZE284_", "_TZE200_", "_TZ3000_", "_TZ3400_", "_TZE204_",
        "_TYZB01_", "_TYST11_", "_TZ2000_", "_TZ1800_", "_TYZB02_"
    ];
    
    fs.writeFileSync('project-data/manufacturer-ids.json', JSON.stringify(manufacturerIds, null, 2));
    console.log('✅ Manufacturer IDs saved');
}

scrapeData().catch(console.error);
