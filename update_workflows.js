const fs = require('fs');
const files = [
  'monthly-api-discovery.yml',
  'monthly-comprehensive-sync.yml',
  'monthly-irdb-sync.yml',
  'monthly-scan.yml'
];
const envBlock = `    env:
      # AI providers — circular chain (ai-helper.js handles rate limiting)
      GOOGLE_API_KEY: \${{ secrets.GOOGLE_API_KEY }}
      OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
      DEEPSEEK_API_KEY: \${{ secrets.DEEPSEEK_API_KEY }}
      GROQ_API_KEY: \${{ secrets.GROQ_API_KEY || '' }}
      HF_TOKEN: \${{ secrets.HF_TOKEN || '' }}
      MISTRAL_API_KEY: \${{ secrets.MISTRAL_API_KEY || '' }}
      OPENROUTER_API_KEY: \${{ secrets.OPENROUTER_API_KEY || '' }}
      CEREBRAS_API_KEY: \${{ secrets.CEREBRAS_API_KEY || '' }}
      TOGETHER_API_KEY: \${{ secrets.TOGETHER_API_KEY || '' }}
      KIMI_API_KEY: \${{ secrets.KIMI_API_KEY || '' }}
      GH_PAT: \${{ secrets.GH_PAT }}
      GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}

    steps:`;

for (const f of files) {
  const p = '.github/workflows/' + f;
  if (!fs.existsSync(p)) continue;
  let code = fs.readFileSync(p, 'utf8');
  
  // 1. Fix cron
  code = code.replace(/- # cron disabled[^\n]*/g, `- cron: '0 5 31 2 *'  # Feb 31 = never runs`);
  if (!code.includes('on:\n  schedule:\n    - cron:')) {
    // some might have different formats
    code = code.replace(/schedule:\n      - cron:/g, 'schedule:\n    - cron:');
  }
  
  // 2. Add env
  if (!code.includes('CEREBRAS_API_KEY:')) {
    code = code.replace(/    steps:/g, envBlock);
  }
  
  fs.writeFileSync(p, code);
  console.log('Fixed ' + f);
}
