const fs = require('fs');
const path = require('path');

class DocumentationGenerator {
  constructor() {
    this.docs = {};
  }
  
  addSection(sectionName, content) {
    this.docs[sectionName] = content;
  }
  
  generateMarkdown() {
    let markdown = '# Documentation du Projet\n\n';
    
    for (const [section, content] of Object.entries(this.docs)) {
      markdown += `## ${section}\n\n`;
      markdown += `${content}\n\n`;
    }
    
    return markdown;
  }
  
  saveToFile(filename = 'GENERATED_DOCS.md') {
    const markdown = this.generateMarkdown();
    fs.writeFileSync(filename, markdown);
    console.log(`📚 Documentation générée: ${filename}`);
  }
}

module.exports = DocumentationGenerator;