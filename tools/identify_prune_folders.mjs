import fs from 'fs';
import path from 'path';

const repoRoot = process.cwd();
const outputPath = path.join(repoRoot, 'tools', 'prune_map.json');

function isSafeToPrune(dir) {
  // Check if the directory is empty
  const entries = fs.readdirSync(dir);
  if (entries.length === 0) {
    return true;
  }
  
  // Check if the directory only contains files that are ignored (e.g., by .gitignore)
  // For now, we'll just mark empty directories as safe
  return false;
}

function findSafePruneFolders() {
  const safeFolders = [];
  
  function traverse(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    // Check if this directory is safe to prune
    if (isSafeToPrune(dir)) {
      safeFolders.push(dir);
    }
    
    // Recurse into subdirectories
    for (const entry of entries) {
      if (entry.isDirectory()) {
        traverse(path.join(dir, entry.name));
      }
    }
  }
  
  traverse(repoRoot);
  
  // Write the list to prune_map.json
  fs.writeFileSync(outputPath, JSON.stringify(safeFolders, null, 2));
}

findSafePruneFolders();
console.log('Prune folder identification completed');
