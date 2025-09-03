const deepseek = require('deepseek-sdk');
const config = require('../../deepseek.config');

async function main() {
  const results = await deepseek.enrich({
    sources: ['homey_forum', 'github', 'zigbee_db'],
    modes: ['thinking', 'non_thinking'],
    output_formats: ['json', 'markdown']
  });
  console.log(results);
}

main().catch(console.error);
