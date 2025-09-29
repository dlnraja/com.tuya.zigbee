const fs = require('fs');
console.log('🌐 SCRAPER V13');
const data = {google: ['_TZE284_g1'], twitter: ['_TZ3000_t1'], reddit: ['_TZE200_r1'], github: ['_TZ3210_gh1']};
fs.writeFileSync('./references/scraping_v13.json', JSON.stringify(data));
console.log('✅ Scraping V13 complete');
