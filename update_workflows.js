/**
 * Inject AI provider env vars into ALL workflows that call .github/scripts/*.js
 * Also fix any broken cron entries
 */
const fs = require('fs');
const path = require('path');

const dir = '.github/workflows';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.yml'));

const AI_ENV_BLOCK = `      # === AI providers — circular chain (ai-helper.js) ===
      GOOGLE_API_KEY: \${{ secrets.GOOGLE_API_KEY }}
      OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
      DEEPSEEK_API_KEY: \${{ secrets.DEEPSEEK_API_KEY }}
      GROQ_API_KEY: \${{ secrets.GROQ_API_KEY || '' }}
      HF_TOKEN: \${{ secrets.HF_TOKEN || '' }}
      MISTRAL_API_KEY: \${{ secrets.MISTRAL_API_KEY || '' }}
      OPENROUTER_API_KEY: \${{ secrets.OPENROUTER_API_KEY || '' }}
      CEREBRAS_API_KEY: \${{ secrets.CEREBRAS_API_KEY || '' }}
      TOGETHER_API_KEY: \${{ secrets.TOGETHER_API_KEY || '' }}
      KIMI_API_KEY: \${{ secrets.KIMI_API_KEY || '' }}`;

// These workflows DON'T need AI keys (pure validation, publishing, labeling)
const SKIP = new Set([
  'code-quality.yml', 'validate.yml', 'validate-drivers.yml',
  'deploy-pages.yml', 'dependabot-auto-merge.yml', 'labeler.yml',
  'stale.yml', 'notifications.yml', 'auto-reopen-on-comment.yml',
  'auto-close-supported.yml', 'sync-changelog-readme.yml',
  'collect-diagnostics.yml', 'cleanup-wrong-threads.yml',
  'forum-cleanup-flagged.yml', 'forum-merge-posts.yml',
  'gmail-token-keepalive.yml', 'gmail-diagnostics.yml',
  'update-forum-post-1.yml', 'daily-promote-to-test.yml'
]);

let modified = 0;
let skipped = 0;
let already = 0;

for (const f of files) {
  const fp = path.join(dir, f);
  let code = fs.readFileSync(fp, 'utf8');
  
  // Skip if it already has all AI keys
  if (code.includes('CEREBRAS_API_KEY:')) {
    already++;
    continue;
  }
  
  // Skip if it doesn't call any node scripts
  if (SKIP.has(f)) {
    skipped++;
    continue;
  }
  
  const callsScripts = /node\s+\.github\/scripts\//.test(code);
  if (!callsScripts) {
    skipped++;
    continue;
  }
  
  // Fix broken crons
  code = code.replace(/- # cron disabled[^\n]*/g, "- cron: '0 5 31 2 *'  # Feb 31 = never runs");
  
  // Find the job-level env: block or inject one before 'steps:'
  // Strategy: find the first `    steps:` and inject env block before it
  // But we need to check if there's already a job-level env
  
  const jobEnvMatch = code.match(/(    runs-on:[^\n]*\n)(    timeout-minutes:[^\n]*\n)?(    env:\n)/);
  if (jobEnvMatch) {
    // There's already a job-level env: — append our keys to it
    const idx = code.indexOf(jobEnvMatch[0]) + jobEnvMatch[0].length;
    // Check what follows — it should be indented env vars
    const afterEnv = code.substring(idx, idx + 200);
    // Only inject if our keys aren't there
    if (!afterEnv.includes('CEREBRAS_API_KEY')) {
      code = code.substring(0, idx) + AI_ENV_BLOCK + '\n' + code.substring(idx);
    }
  } else {
    // No job-level env — inject one before steps
    // Find `    steps:` that follows runs-on
    const stepsMatch = code.match(/(    runs-on:[^\n]*\n(?:    [^\n]*\n)*?)\n(    steps:)/);
    if (stepsMatch) {
      const insertPos = code.indexOf(stepsMatch[0]) + stepsMatch[1].length;
      const envInjection = `\n    env:\n${AI_ENV_BLOCK}\n\n`;
      code = code.substring(0, insertPos) + envInjection + code.substring(insertPos);
    } else {
      // Fallback: simple injection before first `    steps:`
      code = code.replace(
        /^(    steps:)/m,
        `    env:\n${AI_ENV_BLOCK}\n\n    steps:`
      );
    }
  }
  
  fs.writeFileSync(fp, code);
  modified++;
  console.log(`  ✅ ${f}`);
}

console.log(`\nDone: ${modified} modified, ${already} already had keys, ${skipped} skipped (no scripts)`);
