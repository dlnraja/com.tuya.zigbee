const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const WORKFLOWS_DIR = path.join(__dirname, '../../.github/workflows');
const ROOT_DIR = path.join(__dirname, '../../');

function testWorkflows() {
  console.log('=== GITHUB WORKFLOWS VALIDATION REPORT ===\n');

  const files = fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
  console.log(`Found ${files.length} workflow files.\n`);

  let syntaxErrors = 0;
  let brokenScripts = 0;
  let legacyPaths = 0;
  let duplicateNames = {};
  
  for (const file of files) {
    const filePath = path.join(WORKFLOWS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    let parsed;
    try {
      parsed = yaml.load(content);
    } catch (e) {
      console.error(`❌ [SYNTAX ERROR] ${file}:\n  ${e.message.split('\n')[0]}`);
      syntaxErrors++;
      continue;
    }

    if (parsed && parsed.name) {
      if (duplicateNames[parsed.name]) {
        console.warn(`⚠️  [DUPLICATE NAME] "${parsed.name}" is used in ${file} and ${duplicateNames[parsed.name]}`);
      } else {
        duplicateNames[parsed.name] = file;
      }
    }

    // Check for broken script references and legacy paths in the raw content
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      // Check scripts
      const scriptMatch = line.match(/\.github\/scripts\/([a-zA-Z0-9_.-]+)/g);
      if (scriptMatch) {
        scriptMatch.forEach(scriptPath => {
          const absolutePath = path.join(ROOT_DIR, scriptPath);
          if (!fs.existsSync(absolutePath)) {
            console.error(`❌ [BROKEN SCRIPT] ${file}:${index + 1} -> ${scriptPath} does not exist!`);
            brokenScripts++;
          }
        });
      }

      // Check legacy rules
      if (line.includes('.cursorrules') && !line.includes('.ai/rules/')) {
        console.warn(`⚠️  [LEGACY PATH] ${file}:${index + 1} references .cursorrules without .ai/rules/ prefix`);
        legacyPaths++;
      }
      if (line.includes('.windsurfrules') && !line.includes('.ai/rules/')) {
        console.warn(`⚠️  [LEGACY PATH] ${file}:${index + 1} references .windsurfrules without .ai/rules/ prefix`);
        legacyPaths++;
      }
      
      // Check for forum posting
      if (!line.includes('#') && (line.includes('post-forum-update') || line.includes('forum-updater'))) {
        console.error(`🚨 [FORUM POSTING ACTIVE] ${file}:${index + 1} -> ${line.trim()}`);
      }
    });
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Syntax Errors:  ${syntaxErrors}`);
  console.log(`Broken Scripts: ${brokenScripts}`);
  console.log(`Legacy Paths:   ${legacyPaths}`);
  console.log('==========================================');
}

testWorkflows();
