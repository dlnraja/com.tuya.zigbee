const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const URLS_FILE = path.join(__dirname, '../../data/universal_tuya_urls.json');
const ENRICHMENT_FILE = path.join(__dirname, '../../data/enriched_intelligence.json');

async function enrichCategory(category) {
  console.log(`🧠 Processing category for enrichment: ${category.name}`);
  const enrichedItems = [];
  const antiBotDomains = ['baidu.com', 'zhihu.com', '4pda.to', 'csdn.net'];

  for (const item of category.urls) {
    const isAntiBot = antiBotDomains.some(domain => item.url.includes(domain));
    
    if ((item.priority === '🔴 Critique' || item.priority === '🟠 Haute') && !isAntiBot) {
      console.log(`   ✨ Enriching: ${item.url}`);
      try {
        const response = await axios.get(item.url, { 
          timeout: 10000,
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8'
          }
        });
        const $ = cheerio.load(response.data);
        const title = $('title').text().trim() || 'No title';
        const description = $('meta[name="description"]').attr('content') || 
                            $('meta[property="og:description"]').attr('content') || 
                            'No description found';
        
        enrichedItems.push({
          id: item.id,
          url: item.url,
          title,
          description,
          enrichedAt: new Date().toISOString(),
          category: category.name
        });
      } catch (e) {
        console.warn(`   ⚠️ Could not scrape ${item.url}: ${e.message}`);
      }
    } else if (isAntiBot) {
      console.log(`   🛡️ Skipping anti-bot source: ${item.url}`);
    }
  }
  return enrichedItems;
}

async function run() {
  console.log('🌟 Starting Intelligent Enrichment Engine...');

  if (!fs.existsSync(URLS_FILE)) {
    console.error('❌ URL database not found.');
    return;
  }

  const data = JSON.parse(fs.readFileSync(URLS_FILE, 'utf8'));
  const allEnriched = [];

  for (const category of data.categories) {
    const enriched = await enrichCategory(category);
    allEnriched.push(...enriched);
  }

  fs.writeFileSync(ENRICHMENT_FILE, JSON.stringify({
    lastRun: new Date().toISOString(),
    sourceCount: allEnriched.length,
    data: allEnriched
  }, null, 2));

  console.log(`✅ Enrichment complete! Saved ${allEnriched.length} high-priority records to ${ENRICHMENT_FILE}`);
}

run().catch(console.error);
