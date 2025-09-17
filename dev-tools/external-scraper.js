const https = require('https');
const fs = require('fs');

console.log('🌐 EXTERNAL SOURCES SCRAPER - CYCLE 2/10');

const sources = [
    'https://zigbee.blakadder.com/by_manufacturer.html',
    'https://www.zigbee2mqtt.io/supported-devices/'
];

let scrapedData = { timestamp: new Date().toISOString(), sources: [] };

async function scrape(url) {
    return new Promise((resolve) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`✅ Scraped: ${url} (${data.length} chars)`);
                resolve(data);
            });
        }).on('error', (e) => {
            console.log(`❌ Failed: ${url} - ${e.message}`);
            resolve('');
        });
    });
}

(async () => {
    for (const url of sources) {
        const content = await scrape(url);
        scrapedData.sources.push({ url, size: content.length });
    }
    
    fs.writeFileSync('./dev-tools/external-data.json', JSON.stringify(scrapedData, null, 2));
    console.log('📄 External data saved');
})();
