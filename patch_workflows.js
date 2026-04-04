const fs = require('fs');
const path = require('path');

const workflowsDir = path.join(__dirname, '.github', 'workflows');
const allKeys = `
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

function ensureAllKeys(content) {
    let lines = content.split('\n');
    let inEnv = false;
    let indent = '';
    let hasGoog = false;
    let envStartIndex = -1;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.match(/^(\s+)env:\s*$/)) {
            inEnv = true;
            indent = line.match(/^(\s+)/)[1] + '  ';
            envStartIndex = i;
            hasGoog = false;
            continue;
        }

        if (inEnv && line.trim().length > 0 && !line.startsWith(indent)) {
            inEnv = false;
        }

        if (inEnv && line.includes('GOOGLE_API_KEY:')) {
            hasGoog = true;
        }

        // We only patch env blocks that have GOOGLE_API_KEY but might be missing others
        if (inEnv && hasGoog && !line.includes('OPENROUTER_API_KEY')) {
            // Need to patch this block! But wait, regex replace is safer overall.
        }
    }
}

const files = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
let updatedCount = 0;

for (const file of files) {
    const filePath = path.join(workflowsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // We want to make sure the env block contains all the keys.
    // Rather than parsing line by line, let's use a regex that finds GOOGLE_API_KEY line
    // and if OPENROUTER_API_KEY isn't nearby, we append the missing keys.
    const keysToCheck = [
        ['OPENROUTER_API_KEY', 'OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY || \'\' }}'],
        ['HF_TOKEN', 'HF_TOKEN: ${{ secrets.HF_TOKEN || \'\' }}'],
        ['CEREBRAS_API_KEY', 'CEREBRAS_API_KEY: ${{ secrets.CEREBRAS_API_KEY || \'\' }}'],
        ['TOGETHER_API_KEY', 'TOGETHER_API_KEY: ${{ secrets.TOGETHER_API_KEY || \'\' }}'],
        ['KIMI_API_KEY', 'KIMI_API_KEY: ${{ secrets.KIMI_API_KEY || \'\' }}'],
        ['MISTRAL_API_KEY', 'MISTRAL_API_KEY: ${{ secrets.MISTRAL_API_KEY || \'\' }}']
    ];

    let changed = false;
    keysToCheck.forEach(([keyName, keyStr]) => {
        if (content.includes('GOOGLE_API_KEY') && !content.includes(keyName)) {
            // Replace GOOGLE_API_KEY with GOOGLE_API_KEY + new keys based on its indentation
            content = content.replace(/^(\s+)GOOGLE_API_KEY:\s*(\$\{\{.*\}\})$/gm, `$1GOOGLE_API_KEY: $2\n$1${keyStr}`);
            changed = true;
        }
    });

    if (changed) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${file}`);
        updatedCount++;
    }
}

console.log(`Updated ${updatedCount} YAML files.`);
