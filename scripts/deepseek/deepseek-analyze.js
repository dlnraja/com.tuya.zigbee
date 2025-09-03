const deepseek = require('deepseek-sdk');
const config = require('../../deepseek.config');

async function main() {
  const analysis = await deepseek.analyzeProject({
    mode: 'thinking',
    config: config
  });
  console.log(JSON.stringify(analysis, null, 2));
}

main().catch(console.error);
