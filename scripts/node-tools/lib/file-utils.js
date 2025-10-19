/**
 * File system utilities
 * @module file-utils
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Read JSON file
 * @param {string} filePath - Path to JSON file
 * @returns {Promise<Object>}
 */
export async function readJSON(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read JSON file ${filePath}: ${error.message}`);
  }
}

/**
 * Write JSON file with pretty formatting
 * @param {string} filePath - Path to JSON file
 * @param {Object} data - Data to write
 * @param {number} indent - Indentation spaces (default: 2)
 */
export async function writeJSON(filePath, data, indent = 2) {
  try {
    const content = JSON.stringify(data, null, indent);
    await fs.writeFile(filePath, content, 'utf8');
  } catch (error) {
    throw new Error(`Failed to write JSON file ${filePath}: ${error.message}`);
  }
}

/**
 * Read text file
 * @param {string} filePath - Path to text file
 * @returns {Promise<string>}
 */
export async function readText(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read text file ${filePath}: ${error.message}`);
  }
}

/**
 * Write text file
 * @param {string} filePath - Path to text file
 * @param {string} content - Content to write
 */
export async function writeText(filePath, content) {
  try {
    await fs.writeFile(filePath, content, 'utf8');
  } catch (error) {
    throw new Error(`Failed to write text file ${filePath}: ${error.message}`);
  }
}

/**
 * Check if file or directory exists
 * @param {string} filePath - Path to check
 * @returns {Promise<boolean>}
 */
export async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure directory exists, create if not
 * @param {string} dirPath - Directory path
 */
export async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
  }
}

/**
 * Find files matching pattern
 * @param {string} pattern - Glob pattern
 * @param {Object} options - Glob options
 * @returns {Promise<string[]>}
 */
export async function findFiles(pattern, options = {}) {
  try {
    return await glob(pattern, {
      ignore: ['**/node_modules/**', '**/.git/**'],
      ...options
    });
  } catch (error) {
    throw new Error(`Failed to find files with pattern ${pattern}: ${error.message}`);
  }
}

/**
 * Get files in directory
 * @param {string} dirPath - Directory path
 * @param {Object} options - Options
 * @returns {Promise<Array>}
 */
export async function getFiles(dirPath, options = {}) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    const files = [];
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        if (options.recursive) {
          const subFiles = await getFiles(fullPath, options);
          files.push(...subFiles);
        }
      } else if (entry.isFile()) {
        if (!options.extension || entry.name.endsWith(options.extension)) {
          files.push(fullPath);
        }
      }
    }
    
    return files;
  } catch (error) {
    throw new Error(`Failed to get files from ${dirPath}: ${error.message}`);
  }
}

/**
 * Copy file
 * @param {string} src - Source file
 * @param {string} dest - Destination file
 */
export async function copyFile(src, dest) {
  try {
    await ensureDir(path.dirname(dest));
    await fs.copyFile(src, dest);
  } catch (error) {
    throw new Error(`Failed to copy ${src} to ${dest}: ${error.message}`);
  }
}

/**
 * Delete file
 * @param {string} filePath - File to delete
 */
export async function deleteFile(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw new Error(`Failed to delete ${filePath}: ${error.message}`);
    }
  }
}

/**
 * Get file stats
 * @param {string} filePath - File path
 * @returns {Promise<Object>}
 */
export async function getStats(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      modified: stats.mtime,
      created: stats.birthtime,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile()
    };
  } catch (error) {
    throw new Error(`Failed to get stats for ${filePath}: ${error.message}`);
  }
}

/**
 * Get project root directory
 * @returns {string}
 */
export function getProjectRoot() {
  let currentDir = __dirname;
  
  // Go up until we find package.json or reach root
  while (currentDir !== path.parse(currentDir).root) {
    const packagePath = path.join(currentDir, 'package.json');
    if (fs.existsSync(packagePath)) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  
  throw new Error('Could not find project root (no package.json found)');
}

/**
 * Format file size in human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string}
 */
export function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

export default {
  readJSON,
  writeJSON,
  readText,
  writeText,
  exists,
  ensureDir,
  findFiles,
  getFiles,
  copyFile,
  deleteFile,
  getStats,
  getProjectRoot,
  formatSize
};
