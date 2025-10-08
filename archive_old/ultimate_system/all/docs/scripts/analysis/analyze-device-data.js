const fs = require('fs');
const path = require('path');
const natural = require('natural');
const { TfIdf } = natural;
const { execSync } = require('child_process');

// Configuration
const DATA_DIR = path.join(__dirname, '../../research');
const OUTPUT_DIR = path.join(__dirname, '../../data/device-database');
const DEVICE_DB_FILE = path.join(OUTPUT_DIR, 'device-database.json');
const DEVICE_MATRIX_FILE = path.join(__dirname, '../../docs/sources/DEVICE_MATRIX.md');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Initialize TF-IDF for text analysis
const tfidf = new TfIdf();

/**
 * Load and parse JSON files from a directory
 */
function loadJsonFiles(dir) {
  const files = fs.readdirSync(dir).filter(file => file.endsWith('.json'));
  const data = [];
  
  for (const file of files) {
    try {
      const filePath = path.join(dir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const jsonData = JSON.parse(content);
      
      // Handle both arrays and single objects
      if (Array.isArray(jsonData)) {
        data.push(...jsonData);
      } else {
        data.push(jsonData);
      }
    } catch (error) {
      console.error(`Error parsing ${file}:`, error.message);
    }
  }
  
  return data;
}

/**
 * Extract device information from text using regex patterns
 */
function extractDeviceInfo(text) {
  if (!text) return [];
  
  const patterns = [
    // Tuya device model patterns (e.g., TS0121, ZG-227ZL)
    /(?:^|\s|\()([A-Z]{1,3}[0-9]{2,4}[A-Z]?[0-9A-Z-]*)(?=\s|\)|$)/g,
    // Zigbee model patterns (e.g., ZG-227ZL, ZB-SW01)
    /(?:^|\s|\()(Z[GB]-[A-Z0-9-]+)(?=\s|\)|$)/gi,
    // Other common patterns
    /(?:^|\s|\()(T[YZ][X]?[0-9]{3,}[A-Z]?)(?=\s|\)|$)/gi,
  ];
  
  const devices = new Set();
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const model = match[1].toUpperCase().trim();
      // Skip common false positives
      if (!['WIFI', 'ZIGBEE', 'ZHA', 'ZLL', 'Z3', 'ZB3', 'Z2M'].includes(model)) {
        devices.add(model);
      }
    }
  }
  
  return Array.from(devices);
}

/**
 * Analyze text to extract device features and capabilities
 */
function analyzeText(text) {
  if (!text) return [];
  
  const features = [];
  const lowerText = text.toLowerCase();
  
  // Device types
  const deviceTypes = [
    'sensor', 'switch', 'plug', 'bulb', 'light', 'thermostat', 'lock', 'motion',
    'contact', 'temperature', 'humidity', 'water', 'leak', 'vibration', 'smoke',
    'gas', 'door', 'window', 'button', 'remote', 'outlet', 'dimmer', 'curtain',
    'blind', 'shade', 'valve', 'relay', 'siren', 'alarm', 'camera', 'speaker'
  ];
  
  // Protocols and standards
  const protocols = ['zigbee', 'zha', 'zll', 'zb3', 'z2m', 'tuya', 'mqtt', 'wifi'];
  
  // Extract features
  for (const type of deviceTypes) {
    if (lowerText.includes(type)) {
      features.push(`type:${type}`);
    }
  }
  
  for (const proto of protocols) {
    if (lowerText.includes(proto)) {
      features.push(`protocol:${proto}`);
    }
  }
  
  // Extract potential device models
  const devices = extractDeviceInfo(text);
  
  return {
    features: [...new Set(features)], // Remove duplicates
    devices
  };
}

/**
 * Process repository data to extract device information
 */
function processRepositoryData(repos) {
  const devices = new Map();
  
  for (const repo of repos) {
    try {
      // Skip if no relevant data
      if (!repo.name && !repo.description && !repo.readme) continue;
      
      const text = [
        repo.name || '',
        repo.description || '',
        repo.readme || '',
        (repo.topics || []).join(' '),
      ].join(' ');
      
      const analysis = analyzeText(text);
      
      // Add devices found in this repository
      for (const model of analysis.devices) {
        if (!devices.has(model)) {
          devices.set(model, {
            model,
            sources: [],
            features: new Set(),
            repositories: [],
            lastSeen: new Date().toISOString(),
            firstSeen: new Date().toISOString()
          });
        }
        
        const device = devices.get(model);
        
        // Add features
        analysis.features.forEach(feature => device.features.add(feature));
        
        // Add repository reference
        if (repo.html_url && !device.repositories.includes(repo.html_url)) {
          device.repositories.push(repo.html_url);
        }
        
        // Update timestamps
        const repoDate = new Date(repo.updated_at || repo.pushed_at || repo.created_at);
        if (repoDate < new Date(device.firstSeen)) {
          device.firstSeen = repoDate.toISOString();
        }
      }
      
    } catch (error) {
      console.error('Error processing repository:', error);
    }
  }
  
  // Convert Sets to arrays for JSON serialization
  const result = Array.from(devices.values()).map(device => ({
    ...device,
    features: Array.from(device.features),
    source: 'github',
    status: 'unverified',
    notes: ''
  }));
  
  return result;
}

/**
 * Process forum data to extract device information
 */
function processForumData(posts) {
  const devices = new Map();
  
  for (const post of posts) {
    try {
      const text = [
        post.title || '',
        post.content || '',
        (post.tags || []).join(' '),
        ...(post.replies || []).map(r => r.content).join(' ')
      ].join(' ');
      
      const analysis = analyzeText(text);
      
      // Add devices found in this post
      for (const model of analysis.devices) {
        if (!devices.has(model)) {
          devices.set(model, {
            model,
            sources: [],
            features: new Set(),
            forumPosts: [],
            lastSeen: new Date().toISOString(),
            firstSeen: new Date().toISOString()
          });
        }
        
        const device = devices.get(model);
        
        // Add features
        analysis.features.forEach(feature => device.features.add(feature));
        
        // Add forum post reference
        if (post.url && !device.forumPosts.includes(post.url)) {
          device.forumPosts.push({
            url: post.url,
            title: post.title,
            date: post.date
          });
        }
        
        // Update timestamps
        if (post.date) {
          const postDate = new Date(post.date);
          if (postDate < new Date(device.firstSeen)) {
            device.firstSeen = postDate.toISOString();
          }
        }
      }
      
    } catch (error) {
      console.error('Error processing forum post:', error);
    }
  }
  
  // Convert Sets to arrays for JSON serialization
  const result = Array.from(devices.values()).map(device => ({
    ...device,
    features: Array.from(device.features),
    source: 'forum',
    status: 'unverified',
    notes: ''
  }));
  
  return result;
}

/**
 * Merge device information from multiple sources
 */
function mergeDeviceData(...sources) {
  const merged = new Map();
  
  for (const devices of sources) {
    for (const device of devices) {
      const key = device.model;
      
      if (!merged.has(key)) {
        merged.set(key, {
          ...device,
          features: new Set(device.features || []),
          sources: Array.isArray(device.sources) ? [...device.sources] : [device.source],
          repositories: Array.isArray(device.repositories) ? [...device.repositories] : [],
          forumPosts: Array.isArray(device.forumPosts) ? [...device.forumPosts] : [],
          lastSeen: device.lastSeen,
          firstSeen: device.firstSeen,
          status: device.status || 'unverified',
          notes: device.notes || ''
        });
      } else {
        const existing = merged.get(key);
        
        // Merge features
        device.features.forEach(f => existing.features.add(f));
        
        // Merge sources
        if (device.source && !existing.sources.includes(device.source)) {
          existing.sources.push(device.source);
        }
        
        // Merge repositories
        if (Array.isArray(device.repositories)) {
          for (const repo of device.repositories) {
            if (!existing.repositories.includes(repo)) {
              existing.repositories.push(repo);
            }
          }
        }
        
        // Merge forum posts
        if (Array.isArray(device.forumPosts)) {
          for (const post of device.forumPosts) {
            if (!existing.forumPosts.some(p => p.url === post.url)) {
              existing.forumPosts.push(post);
            }
          }
        }
        
        // Update timestamps
        if (device.lastSeen) {
          const lastSeen = new Date(device.lastSeen);
          const currentLastSeen = new Date(existing.lastSeen);
          if (lastSeen > currentLastSeen) {
            existing.lastSeen = device.lastSeen;
          }
        }
        
        if (device.firstSeen) {
          const firstSeen = new Date(device.firstSeen);
          const currentFirstSeen = new Date(existing.firstSeen);
          if (firstSeen < currentFirstSeen) {
            existing.firstSeen = device.firstSeen;
          }
        }
        
        // Update status if more reliable information is available
        if (device.status && device.status !== 'unverified' && existing.status === 'unverified') {
          existing.status = device.status;
        }
        
        // Merge notes
        if (device.notes && !existing.notes.includes(device.notes)) {
          existing.notes += (existing.notes ? '\n' : '') + device.notes;
        }
      }
    }
  }
  
  // Convert Sets back to arrays
  return Array.from(merged.values()).map(device => ({
    ...device,
    features: Array.from(device.features),
    source: Array.from(new Set(device.sources)),
    repositoryCount: device.repositories.length,
    forumPostCount: device.forumPosts.length,
    lastUpdated: new Date().toISOString()
  }));
}

/**
 * Generate a markdown table of devices
 */
function generateDeviceMatrix(devices) {
  // Sort devices by model
  const sortedDevices = [...devices].sort((a, b) => a.model.localeCompare(b.model));
  
  // Generate markdown table
  const table = [
    '| Model | Type | Status | Sources | First Seen | Last Seen | Notes |',
    '|-------|------|--------|---------|------------|-----------|-------|'
  ];
  
  for (const device of sortedDevices) {
    // Extract device type from features
    const type = device.features
      .find(f => f.startsWith('type:'))?.replace('type:', '') || 'unknown';
    
    // Format sources
    const sources = [];
    if (device.repositoryCount > 0) sources.push(`GitHub (${device.repositoryCount})`);
    if (device.forumPostCount > 0) sources.push(`Forum (${device.forumPostCount})`);
    
    // Add row to table
    table.push([
      device.model,
      type,
      device.status,
      sources.join('<br>'),
      device.firstSeen.split('T')[0],
      device.lastSeen.split('T')[0],
      device.notes.replace(/\n/g, '<br>') || ' ',
    ].join(' | '));
  }
  
  return table.join('\n');
}

/**
 * Save device data to a JSON file
 */
function saveDeviceDatabase(devices) {
  const data = {
    metadata: {
      generatedAt: new Date().toISOString(),
      deviceCount: devices.length,
      source: 'homey-tuya-zigbee',
      version: '1.0.0'
    },
    devices
  };
  
  fs.writeFileSync(DEVICE_DB_FILE, JSON.stringify(data, null, 2));
  console.log(`💾 Saved ${devices.length} devices to ${DEVICE_DB_FILE}`);
  
  // Generate and save device matrix
  const matrixContent = `# Tuya Zigbee Device Matrix

> Last updated: ${new Date().toISOString()}

This document contains a comprehensive list of Tuya Zigbee devices and their compatibility status with the Homey integration.

## Legend
- ✅ Fully Supported
- 🟡 Beta/Partial Support
- ❌ Not Supported
- ⚠️ Requires Configuration
- ❓ Unknown/Untested

## Device List

${generateDeviceMatrix(devices)}

## Contributing

To add or update device information, please [open an issue](https://github.com/your-repo/issues/new?template=device-request.md) or submit a pull request.
`;
  
  fs.writeFileSync(DEVICE_MATRIX_FILE, matrixContent);
  console.log(`📊 Updated device matrix: ${DEVICE_MATRIX_FILE}`);
}

/**
 * Main function to analyze device data
 */
async function analyzeDeviceData() {
  try {
    console.log('🔍 Analyzing device data...');
    
    // Load data from different sources
    const githubData = loadJsonFiles(path.join(DATA_DIR, 'github'));
    const forumData = loadJsonFiles(path.join(DATA_DIR, 'homey-forum'));
    
    console.log(`- Loaded ${githubData.length} GitHub repositories`);
    console.log(`- Loaded ${forumData.length} forum posts`);
    
    // Process data from each source
    const githubDevices = processRepositoryData(githubData);
    const forumDevices = processForumData(forumData);
    
    console.log(`- Found ${githubDevices.length} devices in GitHub repositories`);
    console.log(`- Found ${forumDevices.length} devices in forum posts`);
    
    // Merge device information
    const mergedDevices = mergeDeviceData(githubDevices, forumDevices);
    console.log(`- Total unique devices: ${mergedDevices.length}`);
    
    // Save results
    saveDeviceDatabase(mergedDevices);
    
    console.log('\n✅ Device analysis completed successfully!');
    
  } catch (error) {
    console.error('❌ Error analyzing device data:', error);
    process.exit(1);
  }
}

// Install required dependencies if not already installed
try {
  require('natural');
} catch (error) {
  console.log('Installing required dependencies...');
  execSync('npm install natural', { stdio: 'inherit' });
}

// Run the analysis
analyzeDeviceData().catch(console.error);
