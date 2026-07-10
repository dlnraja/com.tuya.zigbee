const fs = require('fs');
const path = require('path');
const axios = require('axios');

const URLS_FILE = path.join(__dirname, '../../data/universal_tuya_urls.json');
const REPORT_DIR = path.join(__dirname, '../../reports');
const REPORT_FILE = path.join(REPORT_DIR, 'url_audit_report.json');
const MD_REPORT_FILE = path.join(REPORT_DIR, 'URL_AUDIT.md');

if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

async function checkUrl(url, categoryName) {
  const isApi = categoryName && categoryName.includes('CATÉGORIE 6');
  try {
    const response = await axios.get(url, { 
      timeout: isApi ? 5000 : 15000, // API calls should be faster, portals slower
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
      },
      validateStatus: () => true 
    });

    // 401 is actually a good sign for an API (means it's there but needs a key)
    const isOk = (response.status >= 200 && response.status < 400) || (isApi && response.status === 401);
    
    return {
      status: response.status,
      ok: isOk,
      responseTime: response.headers['request-duration'] || 'unknown'
    };
  } catch (error) {
    return {
      status: 'ERROR',
      ok: false,
      error: error.message
    };
  }
}

async function run() {
  console.log('🚀 Starting deep URL audit...');
  
  if (!fs.existsSync(URLS_FILE)) {
    console.error('❌ URL database not found at:', URLS_FILE);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(URLS_FILE, 'utf8'));
  const results = [];
  let total = 0;
  let alive = 0;
  let dead = 0;

  for (const category of data.categories) {
    console.log(`\n📂 Auditing category: ${category.name}`);
    const categoryResults = {
      name: category.name,
      items: []
    };

    for (const item of category.urls) {
      total++;
      console.log(`  🔍 Checking [${item.id}] ${item.url}...`);
      const check = await checkUrl(item.url, category.name);
      
      const resultItem = {
        ...item,
        audit: check
      };
      
      if (check.ok) {
        alive++;
      } else {
        dead++;
      }
      
      categoryResults.items.push(resultItem);
    }
    results.push(categoryResults);
  }

  const finalReport = {
    timestamp: new Date().toISOString(),
    stats: { total, alive, dead },
    categories: results
  };

  fs.writeFileSync(REPORT_FILE, JSON.stringify(finalReport, null, 2));

  // Generate Markdown Report
  let md = `# 🌐 ULTIMATE URL AUDIT REPORT\n\n`;
  md += `**Date**: ${new Date().toLocaleString()}\n`;
  md += `**Total URLs**: ${total}\n`;
  md += `**Alive**: ✅ ${alive}\n`;
  md += `**Dead/Issues**: ❌ ${dead}\n\n`;

  for (const cat of results) {
    md += `## ${cat.name}\n\n`;
    md += `| ID | URL | Priority | Status | Health |\n`;
    md += `|----|-----|----------|--------|--------|\n`;
    for (const item of cat.items) {
      const health = item.audit.ok ? '✅ OK' : `❌ FAIL (${item.audit.status || item.audit.error})`;
      md += `| ${item.id} | [Link](${item.url}) | ${item.priority || item.lang || 'N/A'} | ${item.audit.status} | ${health} |\n`;
    }
    md += `\n`;
  }

  fs.writeFileSync(MD_REPORT_FILE, md);

  console.log(`\n✅ Audit complete!`);
  console.log(`📊 Stats: ${alive} alive, ${dead} dead.`);
  console.log(`📄 Reports saved to:`);
  console.log(`   - ${REPORT_FILE}`);
  console.log(`   - ${MD_REPORT_FILE}`);
}

run().catch(err => {
  console.error('Fatal error during audit:', err);
  process.exit(1);
});
