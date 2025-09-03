const { DeepSeekEnhancer } = require('../lib/deepseek_enhanced');
const fs = require('fs');

async function runDeepSeekEnhancedAnalysis() {
  const config = JSON.parse(fs.readFileSync('deepseek_enhanced.config.yml', 'utf8'));
  const deepseek = new DeepSeekEnhancer(config);
  
  // Analyse des commits
  const commitMessages = JSON.parse(fs.readFileSync('analysis/commit_analysis.json'));
  const commitAnalysis = await deepseek.analyzeCommits(commitMessages);
  
  // Analyse des documentations techniques
  const technicalDocs = JSON.parse(fs.readFileSync('data/technical_docs.json'));
  const docsAnalysis = await deepseek.processTechnicalDocs(technicalDocs);
  
  // Enregistrement des résultats
  fs.writeFileSync('analysis/enhanced_commit_analysis.json', JSON.stringify(commitAnalysis, null, 2));
  fs.writeFileSync('analysis/enhanced_docs_analysis.json', JSON.stringify(docsAnalysis, null, 2));
  
  console.log('✅ Enhanced analysis completed and saved to analysis/');
}

runDeepSeekEnhancedAnalysis().catch(console.error);
