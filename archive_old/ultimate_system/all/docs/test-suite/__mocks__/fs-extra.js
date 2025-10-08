'use strict';

const fs = jest.requireActual('fs-extra');
const path = require('path');

// Mock file system
let mockFs = {};

// Create a mock implementation of fs-extra methods
const fsExtra = {
  ...fs,
  
  // Mock readFile
  readFile: jest.fn((filePath, options) => {
    const encoding = typeof options === 'string' ? options : (options && options.encoding) || 'utf8';
    const content = mockFs[filePath];
    if (content === undefined) {
      const error = new Error(`ENOENT: no such file or directory, open '${filePath}'`);
      error.code = 'ENOENT';
      return Promise.reject(error);
    }
    return Promise.resolve(encoding === 'utf8' ? content : Buffer.from(content, 'utf8'));
  }),
  
  // Mock writeFile
  writeFile: jest.fn((filePath, data, options) => {
    const encoding = typeof options === 'string' ? options : (options && options.encoding) || 'utf8';
    mockFs[filePath] = encoding === 'utf8' ? data : data.toString('utf8');
    return Promise.resolve();
  }),
  
  // Mock readJson
  readJson: jest.fn((filePath, options) => {
    const content = mockFs[filePath];
    if (content === undefined) {
      const error = new Error(`ENOENT: no such file or directory, open '${filePath}'`);
      error.code = 'ENOENT';
      return Promise.reject(error);
    }
    try {
      return Promise.resolve(JSON.parse(content));
    } catch (e) {
      return Promise.reject(e);
    }
  }),
  
  // Mock writeJson
  writeJson: jest.fn((filePath, data, options) => {
    const spaces = options && options.spaces ? options.spaces : 2;
    mockFs[filePath] = JSON.stringify(data, null, spaces) + '\n';
    return Promise.resolve();
  }),
  
  // Mock exists
  exists: jest.fn((filePath) => {
    return Promise.resolve(mockFs[filePath] !== undefined);
  }),
  
  // Mock mkdirp
  mkdirp: jest.fn((dirPath) => {
    // Just resolve, don't actually create directories in tests
    return Promise.resolve();
  }),
  
  // Mock pathExists
  pathExists: jest.fn((filePath) => {
    return Promise.resolve(mockFs[filePath] !== undefined);
  }),
  
  // Mock remove
  remove: jest.fn((filePath) => {
    if (mockFs[filePath] === undefined) {
      const error = new Error(`ENOENT: no such file or directory, unlink '${filePath}'`);
      error.code = 'ENOENT';
      return Promise.reject(error);
    }
    delete mockFs[filePath];
    return Promise.resolve();
  }),
  
  // Mock copy
  copy: jest.fn((src, dest) => {
    if (mockFs[src] === undefined) {
      const error = new Error(`ENOENT: no such file or directory, copy '${src}' -> '${dest}'`);
      error.code = 'ENOENT';
      return Promise.reject(error);
    }
    mockFs[dest] = mockFs[src];
    return Promise.resolve();
  }),
  
  // Mock readdir
  readdir: jest.fn((dirPath) => {
    const dir = path.normalize(dirPath);
    const files = Object.keys(mockFs)
      .filter(filePath => {
        const dirname = path.dirname(filePath);
        return path.normalize(dirname) === dir;
      })
      .map(filePath => path.basename(filePath));
    
    if (files.length === 0) {
      const error = new Error(`ENOENT: no such file or directory, scandir '${dirPath}'`);
      error.code = 'ENOENT';
      return Promise.reject(error);
    }
    
    return Promise.resolve(files);
  }),
  
  // Mock lstat
  lstat: jest.fn((filePath) => {
    if (mockFs[filePath] === undefined) {
      const error = new Error(`ENOENT: no such file or directory, lstat '${filePath}'`);
      error.code = 'ENOENT';
      return Promise.reject(error);
    }
    
    return Promise.resolve({
      isFile: () => true,
      isDirectory: () => false,
      isSymbolicLink: () => false,
    });
  }),
  
  // Mock ensureDir
  ensureDir: jest.fn((dirPath) => {
    // Just resolve, don't actually create directories in tests
    return Promise.resolve();
  }),
  
  // Mock outputFile
  outputFile: jest.fn((filePath, data, options) => {
    const encoding = typeof options === 'string' ? options : (options && options.encoding) || 'utf8';
    mockFs[filePath] = encoding === 'utf8' ? data : data.toString('utf8');
    return Promise.resolve();
  }),
  
  // Mock outputJson
  outputJson: jest.fn((filePath, data, options) => {
    const spaces = options && options.spaces ? options.spaces : 2;
    mockFs[filePath] = JSON.stringify(data, null, spaces) + '\n';
    return Promise.resolve();
  }),
  
  // Mock readJsonSync
  readJsonSync: jest.fn((filePath, options) => {
    const content = mockFs[filePath];
    if (content === undefined) {
      const error = new Error(`ENOENT: no such file or directory, open '${filePath}'`);
      error.code = 'ENOENT';
      throw error;
    }
    return JSON.parse(content);
  }),
  
  // Mock writeJsonSync
  writeJsonSync: jest.fn((filePath, data, options) => {
    const spaces = options && options.spaces ? options.spaces : 2;
    mockFs[filePath] = JSON.stringify(data, null, spaces) + '\n';
  }),
  
  // Mock existsSync
  existsSync: jest.fn((filePath) => {
    return mockFs[filePath] !== undefined;
  }),
  
  // Mock mkdirpSync
  mkdirpSync: jest.fn((dirPath) => {
    // No-op for tests
  }),
  
  // Mock readFileSync
  readFileSync: jest.fn((filePath, options) => {
    const encoding = typeof options === 'string' ? options : (options && options.encoding) || 'utf8';
    const content = mockFs[filePath];
    if (content === undefined) {
      const error = new Error(`ENOENT: no such file or directory, open '${filePath}'`);
      error.code = 'ENOENT';
      throw error;
    }
    return encoding === 'utf8' ? content : Buffer.from(content, 'utf8');
  }),
  
  // Mock writeFileSync
  writeFileSync: jest.fn((filePath, data, options) => {
    const encoding = typeof options === 'string' ? options : (options && options.encoding) || 'utf8';
    mockFs[filePath] = encoding === 'utf8' ? data : data.toString('utf8');
  }),
  
  // Mock outputFileSync
  outputFileSync: jest.fn((filePath, data, options) => {
    const encoding = typeof options === 'string' ? options : (options && options.encoding) || 'utf8';
    mockFs[filePath] = encoding === 'utf8' ? data : data.toString('utf8');
  }),
  
  // Mock outputJsonSync
  outputJsonSync: jest.fn((filePath, data, options) => {
    const spaces = options && options.spaces ? options.spaces : 2;
    mockFs[filePath] = JSON.stringify(data, null, spaces) + '\n';
  }),
  
  // Mock ensureDirSync
  ensureDirSync: jest.fn((dirPath) => {
    // No-op for tests
  }),
  
  // Mock removeSync
  removeSync: jest.fn((filePath) => {
    if (mockFs[filePath] === undefined) {
      const error = new Error(`ENOENT: no such file or directory, unlink '${filePath}'`);
      error.code = 'ENOENT';
      throw error;
    }
    delete mockFs[filePath];
  }),
  
  // Mock copySync
  copySync: jest.fn((src, dest) => {
    if (mockFs[src] === undefined) {
      const error = new Error(`ENOENT: no such file or directory, copy '${src}' -> '${dest}'`);
      error.code = 'ENOENT';
      throw error;
    }
    mockFs[dest] = mockFs[src];
  }),
  
  // Mock readdirSync
  readdirSync: jest.fn((dirPath) => {
    const dir = path.normalize(dirPath);
    const files = Object.keys(mockFs)
      .filter(filePath => {
        const dirname = path.dirname(filePath);
        return path.normalize(dirname) === dir;
      })
      .map(filePath => path.basename(filePath));
    
    if (files.length === 0) {
      const error = new Error(`ENOENT: no such file or directory, scandir '${dirPath}'`);
      error.code = 'ENOENT';
      throw error;
    }
    
    return files;
  }),
  
  // Mock lstatSync
  lstatSync: jest.fn((filePath) => {
    if (mockFs[filePath] === undefined) {
      const error = new Error(`ENOENT: no such file or directory, lstat '${filePath}'`);
      error.code = 'ENOENT';
      throw error;
    }
    
    return {
      isFile: () => true,
      isDirectory: () => false,
      isSymbolicLink: () => false,
    };
  }),
  
  // Mock emptyDir
  emptyDir: jest.fn((dirPath) => {
    // Just resolve, don't actually empty directories in tests
    return Promise.resolve();
  }),
  
  // Mock emptyDirSync
  emptyDirSync: jest.fn((dirPath) => {
    // No-op for tests
  }),
  
  // Mock ensureFile
  ensureFile: jest.fn((filePath) => {
    // Just resolve, don't actually create files in tests
    return Promise.resolve();
  }),
  
  // Mock ensureFileSync
  ensureFileSync: jest.fn((filePath) => {
    // No-op for tests
  }),
  
  // Mock ensureLink
  ensureLink: jest.fn((src, dest) => {
    // Just resolve, don't actually create links in tests
    return Promise.resolve();
  }),
  
  // Mock ensureLinkSync
  ensureLinkSync: jest.fn((src, dest) => {
    // No-op for tests
  }),
  
  // Mock ensureSymlink
  ensureSymlink: jest.fn((src, dest, type) => {
    // Just resolve, don't actually create symlinks in tests
    return Promise.resolve();
  }),
  
  // Mock ensureSymlinkSync
  ensureSymlinkSync: jest.fn((src, dest, type) => {
    // No-op for tests
  }),
  
  // Mock move
  move: jest.fn((src, dest, options) => {
    if (mockFs[src] === undefined) {
      const error = new Error(`ENOENT: no such file or directory, rename '${src}' -> '${dest}'`);
      error.code = 'ENOENT';
      return Promise.reject(error);
    }
    
    mockFs[dest] = mockFs[src];
    delete mockFs[src];
    return Promise.resolve();
  }),
  
  // Mock moveSync
  moveSync: jest.fn((src, dest, options) => {
    if (mockFs[src] === undefined) {
      const error = new Error(`ENOENT: no such file or directory, rename '${src}' -> '${dest}'`);
      error.code = 'ENOENT';
      throw error;
    }
    
    mockFs[dest] = mockFs[src];
    delete mockFs[src];
  }),
  
  // Mock pathExistsSync
  pathExistsSync: jest.fn((filePath) => {
    return mockFs[filePath] !== undefined;
  }),
  
  // Mock readJsonSync
  readJSONSync: jest.fn((filePath, options) => {
    return fsExtra.readJsonSync(filePath, options);
  }),
  
  // Mock readJson
  readJSON: jest.fn((filePath, options) => {
    return fsExtra.readJson(filePath, options);
  }),
  
  // Mock writeJsonSync
  writeJSONSync: jest.fn((filePath, data, options) => {
    return fsExtra.writeJsonSync(filePath, data, options);
  }),
  
  // Mock writeJson
  writeJSON: jest.fn((filePath, data, options) => {
    return fsExtra.writeJson(filePath, data, options);
  }),
  
  // Mock outputJson
  outputJSON: jest.fn((filePath, data, options) => {
    return fsExtra.outputJson(filePath, data, options);
  }),
  
  // Mock outputJsonSync
  outputJSONSync: jest.fn((filePath, data, options) => {
    return fsExtra.outputJsonSync(filePath, data, options);
  }),
  
  // Mock readJsonSync with reviver
  readJsonSync: jest.fn((filePath, options) => {
    const content = fsExtra.readFileSync(filePath, 'utf8');
    const reviver = options && typeof options === 'object' && options.reviver;
    return JSON.parse(content, reviver);
  }),
  
  // Mock readJson with reviver
  readJson: jest.fn((filePath, options) => {
    return fsExtra.readFile(filePath, 'utf8').then(content => {
      const reviver = options && typeof options === 'object' && options.reviver;
      return JSON.parse(content, reviver);
    });
  }),
  
  // Mock writeJsonSync with replacer and spaces
  writeJsonSync: jest.fn((filePath, data, options) => {
    const spaces = options && typeof options === 'object' ? options.spaces : 2;
    const replacer = options && typeof options === 'object' && options.replacer;
    const content = JSON.stringify(data, replacer, spaces) + '\n';
    return fsExtra.writeFileSync(filePath, content, 'utf8');
  }),
  
  // Mock writeJson with replacer and spaces
  writeJson: jest.fn((filePath, data, options) => {
    const spaces = options && typeof options === 'object' ? options.spaces : 2;
    const replacer = options && typeof options === 'object' && options.replacer;
    const content = JSON.stringify(data, replacer, spaces) + '\n';
    return fsExtra.writeFile(filePath, content, 'utf8');
  }),
  
  // Mock outputJson with replacer and spaces
  outputJson: jest.fn((filePath, data, options) => {
    const spaces = options && typeof options === 'object' ? options.spaces : 2;
    const replacer = options && typeof options === 'object' && options.replacer;
    const content = JSON.stringify(data, replacer, spaces) + '\n';
    return fsExtra.outputFile(filePath, content, 'utf8');
  }),
  
  // Mock outputJsonSync with replacer and spaces
  outputJsonSync: jest.fn((filePath, data, options) => {
    const spaces = options && typeof options === 'object' ? options.spaces : 2;
    const replacer = options && typeof options === 'object' && options.replacer;
    const content = JSON.stringify(data, replacer, spaces) + '\n';
    return fsExtra.outputFileSync(filePath, content, 'utf8');
  }),
  
  // Mock createReadStream
  createReadStream: jest.fn((filePath, options) => {
    if (mockFs[filePath] === undefined) {
      const error = new Error(`ENOENT: no such file or directory, open '${filePath}'`);
      error.code = 'ENOENT';
      throw error;
    }
    
    const { Readable } = require('stream');
    const stream = new Readable();
    stream.push(mockFs[filePath]);
    stream.push(null);
    return stream;
  }),
  
  // Mock createWriteStream
  createWriteStream: jest.fn((filePath, options) => {
    const { Writable } = require('stream');
    const chunks = [];
    
    const stream = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(chunk);
        callback();
      },
      final(callback) {
        const data = Buffer.concat(chunks).toString('utf8');
        mockFs[filePath] = data;
        callback();
      }
    });
    
    return stream;
  }),
  
  // Mock appendFile
  appendFile: jest.fn((filePath, data, options) => {
    const encoding = typeof options === 'string' ? options : (options && options.encoding) || 'utf8';
    const content = encoding === 'utf8' ? data : data.toString(encoding);
    
    if (mockFs[filePath] === undefined) {
      mockFs[filePath] = '';
    }
    
    mockFs[filePath] += content;
    return Promise.resolve();
  }),
  
  // Mock appendFileSync
  appendFileSync: jest.fn((filePath, data, options) => {
    const encoding = typeof options === 'string' ? options : (options && options.encoding) || 'utf8';
    const content = encoding === 'utf8' ? data : data.toString(encoding);
    
    if (mockFs[filePath] === undefined) {
      mockFs[filePath] = '';
    }
    
    mockFs[filePath] += content;
  }),
  
  // Mock chmod
  chmod: jest.fn((filePath, mode) => {
    if (mockFs[filePath] === undefined) {
      const error = new Error(`ENOENT: no such file or directory, chmod '${filePath}'`);
      error.code = 'ENOENT';
      return Promise.reject(error);
    }
    
    return Promise.resolve();
  }),
  
  // Mock chmodSync
  chmodSync: jest.fn((filePath, mode) => {
    if (mockFs[filePath] === undefined) {
      const error = new Error(`ENOENT: no such file or directory, chmod '${filePath}'`);
      error.code = 'ENOENT';
      throw error;
    }
  }),
  
  // Mock chown
  chown: jest.fn((filePath, uid, gid) => {
    if (mockFs[filePath] === undefined) {
      const error = new Error(`ENOENT: no such file or directory, chown '${filePath}'`);
      error.code = 'ENOENT';
      return Promise.reject(error);
    }
    
    return Promise.resolve();
  }),
  
  // Mock chownSync
  chownSync: jest.fn((filePath, uid, gid) => {
    if (mockFs[filePath] === undefined) {
      const error = new Error(`ENOENT: no such file or directory, chown '${filePath}'`);
      error.code = 'ENOENT';
      throw error;
    }
  }),
  
  // Mock copyFile
  copyFile: jest.fn((src, dest, flags, callback) => {
    if (typeof flags === 'function') {
      callback = flags;
      flags = undefined;
    }
    
    if (mockFs[src] === undefined) {
      const error = new Error(`ENOENT: no such file or directory, copyfile '${src}' -> '${dest}'`);
      error.code = 'ENOENT';
      
      if (callback) {
        callback(error);
        return;
      }
      
      return Promise.reject(error);
    }
    
    mockFs[dest] = mockFs[src];
    
    if (callback) {
      callback(null);
      return;
    }
    
    return Promise.resolve();
  }),
  
  // Mock copyFileSync
  copyFileSync: jest.fn((src, dest, flags) => {
    if (mockFs[src] === undefined) {
      const error = new Error(`ENOENT: no such file or directory, copyfile '${src}' -> '${dest}'`);
      error.code = 'ENOENT';
      throw error;
    }
    
    mockFs[dest] = mockFs[src];
  }),
  
  // Mock createFile
  createFile: jest.fn((filePath) => {
    if (mockFs[filePath] === undefined) {
      mockFs[filePath] = '';
      return Promise.resolve();
    }
    
    return Promise.resolve();
  }),
  
  // Mock createFileSync
  createFileSync: jest.fn((filePath) => {
    if (mockFs[filePath] === undefined) {
      mockFs[filePath] = '';
    }
  }),
  
  // Mock createLink
  createLink: jest.fn((src, dest) => {
    // Just resolve, don't actually create links in tests
    return Promise.resolve();
  }),
  
  // Mock createLinkSync
  createLinkSync: jest.fn((src, dest) => {
    // No-op for tests
  }),
  
  // Mock createSymlink
  createSymlink: jest.fn((src, dest, type) => {
    // Just resolve, don't actually create symlinks in tests
    return Promise.resolve();
  }),
  
  // Mock createSymlinkSync
  createSymlinkSync: jest.fn((src, dest, type) => {
    // No-op for tests
  }),
  
  // Mock emptyDir
  emptydir: jest.fn((dirPath) => {
    // Just resolve, don't actually empty directories in tests
    return Promise.resolve();
  }),
  
  // Mock emptyDirSync
  emptydirSync: jest.fn((dirPath) => {
    // No-op for tests
  }),
  
  // Mock ensureFile
  ensureFile: jest.fn((filePath) => {
    // Just resolve, don't actually create files in tests
    return Promise.resolve();
  }),
  
  // Mock ensureFileSync
  ensureFileSync: jest.fn((filePath) => {
    // No-op for tests
  }),
  
  // Mock ensureLink
  ensureLink: jest.fn((src, dest) => {
    // Just resolve, don't actually create links in tests
    return Promise.resolve();
  }),
  
  // Mock ensureLinkSync
  ensureLinkSync: jest.fn((src, dest) => {
    // No-op for tests
  }),
  
  // Mock ensureSymlink
  ensureSymlink: jest.fn((src, dest, type) => {
    // Just resolve, don't actually create symlinks in tests
    return Promise.resolve();
  }),
  
  // Mock ensureSymlinkSync
  ensureSymlinkSync: jest.fn((src, dest, type) => {
    // No-op for tests
  })
};

// Add mock reset function
fsExtra.__resetMocks = () => {
  mockFs = {};
};

// Add mock setFile function for testing
fsExtra.__setMockFile = (filePath, content) => {
  mockFs[filePath] = content;
};

// Add mock getFile function for testing
fsExtra.__getMockFile = (filePath) => {
  return mockFs[filePath];
};

// Add mock getMockFs function for testing
fsExtra.__getMockFs = () => {
  return { ...mockFs };
};

module.exports = fsExtra;
