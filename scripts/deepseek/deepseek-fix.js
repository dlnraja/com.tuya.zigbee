const deepseek = require('deepseek-sdk');
const config = require('../../deepseek.config');

async function main() {
  const issues = await deepseek.analyzeProjectStructure();
  issues.forEach(issue => {
    if (issue.type === 'missing_file') {
      deepseek.generateFile(issue.template, issue.path);
    } else if (issue.type === 'validation_error') {
      deepseek.fixValidationError(issue.details);
    }
  });
}

main().catch(console.error);
