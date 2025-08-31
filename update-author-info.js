const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Configuration
const CONFIG = {
  author: {
    name: 'dlnraja',
    email: 'dylan.rajasekaram@gmail.com',
    url: 'https://github.com/dlnraja'
  },
  // Files to update
  filesToUpdate: [
    'package.json',
    'README.md',
    '**/*.js',
    '**/*.json',
    '**/*.md'
  ],
  // Directories to exclude
  excludeDirs: [
    'node_modules',
    '.git',
    'coverage',
    'dist',
    'build'
  ]
};

// Patterns to search and replace
const REPLACEMENT_PATTERNS = [
  // Email patterns
  {
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: CONFIG.author.email
  },
  // Username patterns
  {
    pattern: /(author|maintainer|contributor)[\s:]*[\w\s-]*dlnraja[\w\s-]*/gi,
    replacement: (match) => match.replace(/dlnraja/gi, CONFIG.author.name)
  },
  // GitHub URL patterns
  {
    pattern: /github\.com\/[\w-]+\/[\w-]+/g,
    replacement: `github.com/${CONFIG.author.name}/tuya_repair`
  }
];

async function updateFile(filePath) {
  try {
    // Skip if file doesn't exist
    if (!fs.existsSync(filePath)) {
      return false;
    }

    // Skip binary files
    const isBinary = await isBinaryFile(filePath);
    if (isBinary) {
      return false;
    }

    // Read file content
    let content = await readFile(filePath, 'utf8');
    let updated = false;

    // Apply replacements
    for (const { pattern, replacement } of REPLACEMENT_PATTERNS) {
      if (content.match(pattern)) {
        content = content.replace(pattern, replacement);
        updated = true;
      }
    }

    // Write back if changes were made
    if (updated) {
      await writeFile(filePath, content, 'utf8');
      console.log(`✅ Updated: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

async function isBinaryFile(filePath) {
  const buffer = Buffer.alloc(512);
  const fd = await fs.promises.open(filePath, 'r');
  try {
    const { bytesRead } = await fd.read(buffer, 0, 512, 0);
    return buffer.includes(0, 0, bytesRead);
  } finally {
    await fd.close();
  }
}

async function findFiles(dir, patterns, excludeDirs = []) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    // Skip excluded directories
    if (entry.isDirectory() && !excludeDirs.includes(entry.name)) {
      files.push(...(await findFiles(fullPath, patterns, excludeDirs)));
    } else if (entry.isFile()) {
      // Check if file matches any pattern
      const relativePath = path.relative(process.cwd(), fullPath);
      
      for (const pattern of patterns) {
        const regex = new RegExp(
          '^' + 
          pattern
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*')
            .replace(/\//g, '\\/') + 
          '$'
        );
        
        if (relativePath.match(regex)) {
          files.push(fullPath);
          break;
        }
      }
    }
  }
  
  return files;
}

async function main() {
  console.log('Updating author information...\n');
  
  // Find all files to update
  const files = await findFiles(
    process.cwd(),
    CONFIG.filesToUpdate,
    CONFIG.excludeDirs
  );
  
  console.log(`Found ${files.length} files to process\n`);
  
  // Update each file
  let updatedCount = 0;
  for (const file of files) {
    const wasUpdated = await updateFile(file);
    if (wasUpdated) {
      updatedCount++;
    }
  }
  
  // Update Git configuration
  console.log('\nUpdating Git configuration...');
  try {
    const { execSync } = require('child_process');
    execSync(`git config user.name "${CONFIG.author.name}"`);
    execSync(`git config user.email "${CONFIG.author.email}"`);
    console.log('✅ Git configuration updated');
  } catch (error) {
    console.error('❌ Error updating Git configuration:', error.message);
  }
  
  console.log('\nUpdate complete!');
  console.log(`- Files processed: ${files.length}`);
  console.log(`- Files updated: ${updatedCount}`);
}

// Run the script
main().catch(console.error);
