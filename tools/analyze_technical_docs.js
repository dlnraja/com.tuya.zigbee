const fs = require('fs');
const { DeepSeekEnhancer } = require('../lib/deepseek_enhanced');

async function analyzeTechnicalDocs() {
  const docs = JSON.parse(fs.readFileSync('data/technical_docs.json'));
  const deepseek = new DeepSeekEnhancer({
    mode: 'hybrid-thinking',
    analysisDepth: 'deep',
    timeout: 45000
  });
  
  const processedDocs = await deepseek.processTechnicalDocs(docs);
  fs.writeFileSync('analysis/processed_technical_docs.json', JSON.stringify(processedDocs, null, 2));
  console.log('✅ Technical docs processed and saved to analysis/processed_technical_docs.json');
}

analyzeTechnicalDocs().catch(console.error);
