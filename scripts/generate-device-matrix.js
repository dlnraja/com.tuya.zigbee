#!/usr/bin/env node
'use strict';

/**
 * Generate Device Matrix for GitHub Pages
 * Creates a JSON database of all supported devices with driver mappings
 */

const fs = require('fs');
const path = require('path');

const matrix = {
  lastUpdated: new Date().toISOString(),
  version: '1.0',
  devices: []
};

const driversDir = path.join(__dirname, '..', 'drivers');

function processDriver(driverPath, driverName) {
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) return;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    const zigbee = compose.zigbee;
    
    if (!zigbee) return;

    const productIds = Array.isArray(zigbee.productId) ? zigbee.productId : [zigbee.productId];
    const manufacturers = zigbee.manufacturerName 
      ? (Array.isArray(zigbee.manufacturerName) ? zigbee.manufacturerName : [zigbee.manufacturerName])
      : [];

    // Create entry for each combination
    productIds.forEach(productId => {
      if (manufacturers.length > 0) {
        manufacturers.forEach(manufacturer => {
          matrix.devices.push({
            driverId: driverName,
            driverName: compose.name?.en || driverName,
            productId: productId,
            manufacturerName: manufacturer,
            modelId: zigbee.modelId || null,
            class: compose.class || 'other',
            capabilities: compose.capabilities || [],
            endpoints: Object.keys(zigbee.endpoints || {}).length,
            category: categorizeDriver(compose),
            icon: `/drivers/${driverName}/assets/images/small.png`
          });
        });
      } else {
        // No manufacturerName specified - generic entry
        matrix.devices.push({
          driverId: driverName,
          driverName: compose.name?.en || driverName,
          productId: productId,
          manufacturerName: null,
          modelId: zigbee.modelId || null,
          class: compose.class || 'other',
          capabilities: compose.capabilities || [],
          endpoints: Object.keys(zigbee.endpoints || {}).length,
          category: categorizeDriver(compose),
          icon: `/drivers/${driverName}/assets/images/small.png`,
          warning: 'Generic fingerprint - may cause collisions'
        });
      }
    });

  } catch (err) {
    console.error(`Error processing ${driverName}:`, err.message);
  }
}

function categorizeDriver(compose) {
  const capabilities = compose.capabilities || [];
  const className = compose.class || '';

  if (capabilities.includes('alarm_motion') || className === 'sensor') {
    return 'Motion & Presence';
  }
  if (capabilities.includes('measure_temperature')) {
    return 'Climate & Environment';
  }
  if (className === 'socket' || className === 'light') {
    return 'Power & Lighting';
  }
  if (capabilities.includes('alarm_contact')) {
    return 'Security & Safety';
  }
  if (className === 'button') {
    return 'Automation Control';
  }

  return 'Other';
}

// Scan all drivers
const drivers = fs.readdirSync(driversDir);
console.log(`Processing ${drivers.length} drivers...\n`);

drivers.forEach(driverName => {
  const driverPath = path.join(driversDir, driverName);
  if (fs.statSync(driverPath).isDirectory()) {
    processDriver(driverPath, driverName);
  }
});

// Generate statistics
const stats = {
  totalDrivers: matrix.devices.length,
  byCategory: {},
  byProductId: {},
  warnings: matrix.devices.filter(d => d.warning).length
};

matrix.devices.forEach(device => {
  stats.byCategory[device.category] = (stats.byCategory[device.category] || 0) + 1;
  stats.byProductId[device.productId] = (stats.byProductId[device.productId] || 0) + 1;
});

matrix.stats = stats;

// Save matrix
const outputPath = path.join(__dirname, '..', 'docs', 'device-matrix.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(matrix, null, 2));

console.log('✅ Device matrix generated!');
console.log(`   Total devices: ${stats.totalDrivers}`);
console.log(`   Categories: ${Object.keys(stats.byCategory).length}`);
console.log(`   Warnings: ${stats.warnings}`);
console.log(`\n📄 Saved to: ${outputPath}\n`);

// Also generate HTML index
generateHTML(matrix, path.join(__dirname, '..', 'docs', 'index.html'));

function generateHTML(matrix, outputPath) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Universal Tuya Zigbee - Device Database</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        header {
            background: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h1 { color: #333; margin-bottom: 10px; }
        .search-box {
            background: white;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        input {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 16px;
        }
        .device-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }
        .device-card {
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        }
        .device-card:hover { transform: translateY(-4px); }
        .device-name { font-weight: bold; font-size: 18px; margin-bottom: 10px; }
        .device-info { color: #666; font-size: 14px; margin-bottom: 5px; }
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            margin: 2px;
        }
        .badge-category { background: #e3f2fd; color: #1976d2; }
        .badge-warning { background: #fff3cd; color: #856404; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🏠 Universal Tuya Zigbee Device Database</h1>
            <p>Find the correct driver for your Zigbee device</p>
            <p style="color: #666; font-size: 14px; margin-top: 10px;">
                Last updated: ${matrix.lastUpdated} • ${matrix.stats.totalDrivers} devices
            </p>
        </header>

        <div class="search-box">
            <input type="text" id="searchInput" placeholder="Search by productId, manufacturer, or device type...">
        </div>

        <div class="device-grid" id="deviceGrid">
            <!-- Populated by JavaScript -->
        </div>
    </div>

    <script>
        const devices = ${JSON.stringify(matrix.devices)};
        const grid = document.getElementById('deviceGrid');
        const searchInput = document.getElementById('searchInput');

        function renderDevices(filteredDevices) {
            grid.innerHTML = '';
            filteredDevices.forEach(device => {
                const card = document.createElement('div');
                card.className = 'device-card';
                card.innerHTML = \`
                    <div class="device-name">\${device.driverName}</div>
                    <div class="device-info">Product ID: \${device.productId}</div>
                    <div class="device-info">Manufacturer: \${device.manufacturerName || 'Any'}</div>
                    <div class="device-info">Endpoints: \${device.endpoints}</div>
                    <div style="margin-top: 10px;">
                        <span class="badge badge-category">\${device.category}</span>
                        \${device.warning ? '<span class="badge badge-warning">⚠️ Generic</span>' : ''}
                    </div>
                \`;
                grid.appendChild(card);
            });
        }

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = devices.filter(device => 
                device.productId.toLowerCase().includes(query) ||
                (device.manufacturerName || '').toLowerCase().includes(query) ||
                device.driverName.toLowerCase().includes(query) ||
                device.category.toLowerCase().includes(query)
            );
            renderDevices(filtered);
        });

        // Initial render
        renderDevices(devices);
    </script>
</body>
</html>`;

  fs.writeFileSync(outputPath, html);
  console.log(`📄 HTML index saved to: ${outputPath}\n`);
}
