#!/usr/bin/env node
'use strict';

/**
 * 🚀 APPLY CUSTOM PAIRING TO ALL DRIVERS
 * 
 * Crée la structure custom pairing officielle Homey pour tous les drivers
 * même si ils ont les mêmes productIds/manufacturerNames
 * 
 * Les utilisateurs choisiront le bon driver pendant le pairing Zigbee
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname);
const DRIVERS_DIR = path.join(ROOT, 'drivers');

// Template HTML pour custom pairing view
const PAIRING_HTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Select Driver</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        
        .container { max-width: 800px; margin: 0 auto; }
        
        header {
            background: white;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        h1 { font-size: 24px; color: #333; margin-bottom: 8px; }
        .subtitle { color: #666; font-size: 14px; }
        
        .warning {
            background: #fff3cd;
            border: 2px solid #ffc107;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
        }
        
        .device-info {
            background: white;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 120px 1fr;
            gap: 8px;
            font-size: 14px;
        }
        
        .driver-option {
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .driver-option:hover { border-color: #667eea; }
        .driver-option.selected {
            border-color: #667eea;
            background: linear-gradient(135deg, rgba(102,126,234,0.1), rgba(118,75,162,0.1));
        }
        
        button {
            width: 100%;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            padding: 15px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
        }
        
        button:disabled { background: #ccc; cursor: not-allowed; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>⚠️ Multiple Drivers Match</h1>
            <p class="subtitle">Select the correct driver for your device</p>
        </header>

        <div class="warning">
            <strong>Manual Selection Required</strong><br>
            Multiple drivers can handle this device.
        </div>

        <div class="device-info">
            <h3>Device Information</h3>
            <div class="info-grid">
                <span>Manufacturer:</span><span id="manufacturer">Loading...</span>
                <span>Product ID:</span><span id="productId">Loading...</span>
                <span>Model:</span><span id="modelId">Loading...</span>
            </div>
        </div>

        <div id="driverList"></div>

        <button id="continueBtn" disabled onclick="confirmSelection()">
            Continue with Selected Driver
        </button>
    </div>

    <script>
        let selectedDriver = null;
        
        Homey.ready();

        Homey.on('candidates', function(data) {
            renderDrivers(data);
        });

        Homey.on('device_info', function(info) {
            document.getElementById('manufacturer').textContent = info.manufacturerName || 'Unknown';
            document.getElementById('productId').textContent = info.productId || 'Unknown';
            document.getElementById('modelId').textContent = info.modelId || 'N/A';
        });

        function renderDrivers(candidates) {
            const list = document.getElementById('driverList');
            list.innerHTML = '';

            candidates.forEach((driver, i) => {
                const div = document.createElement('div');
                div.className = 'driver-option';
                div.innerHTML = \`
                    <div style="font-weight:600; font-size:16px;">\${driver.name}</div>
                    <div style="color:#666; font-size:13px;">\${driver.description || ''}</div>
                    <div style="margin-top:8px;">
                        <span style="background:#667eea; color:white; padding:4px 8px; border-radius:4px; font-size:12px;">
                            Score: \${driver.score || 0}
                        </span>
                    </div>
                \`;
                div.onclick = () => selectDriver(driver, div);
                list.appendChild(div);

                if (i === 0) selectDriver(driver, div);
            });
        }

        function selectDriver(driver, element) {
            document.querySelectorAll('.driver-option').forEach(el => el.classList.remove('selected'));
            element.classList.add('selected');
            selectedDriver = driver;
            document.getElementById('continueBtn').disabled = false;
        }

        async function confirmSelection() {
            if (!selectedDriver) return;

            try {
                const result = await Homey.emit('driver_selected', selectedDriver.id);
                if (result && result.success) {
                    Homey.nextView();
                }
            } catch (err) {
                await Homey.alert('Error: ' + err.message);
            }
        }
    </script>
</body>
</html>
`;

const stats = {
  driversProcessed: 0,
  pairFoldersCreated: 0,
  htmlCreated: 0,
  manifestsUpdated: 0
};

/**
 * Main execution
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  🚀 APPLY CUSTOM PAIRING TO ALL DRIVERS                  ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const drivers = fs.readdirSync(DRIVERS_DIR);

  for (const driverName of drivers) {
    const driverPath = path.join(DRIVERS_DIR, driverName);
    const composePath = path.join(driverPath, 'driver.compose.json');

    if (!fs.existsSync(composePath)) continue;

    try {
      const driver = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      stats.driversProcessed++;

      // Create pair folder
      const pairPath = path.join(driverPath, 'pair');
      if (!fs.existsSync(pairPath)) {
        fs.mkdirSync(pairPath, { recursive: true });
        stats.pairFoldersCreated++;
        console.log(`✅ Created pair folder: ${driverName}`);
      }

      // Create select-driver.html
      const htmlPath = path.join(pairPath, 'select-driver.html');
      if (!fs.existsSync(htmlPath)) {
        fs.writeFileSync(htmlPath, PAIRING_HTML);
        stats.htmlCreated++;
        console.log(`✅ Created HTML: ${driverName}/pair/select-driver.html`);
      }

      // Update manifest to include custom pairing view
      if (!driver.pair || !Array.isArray(driver.pair)) {
        driver.pair = [];
      }

      // Check if select_driver view already exists
      const hasSelectDriver = driver.pair.some(p => p.id === 'select_driver');

      if (!hasSelectDriver) {
        // Insert select_driver after list_devices if exists
        const listIndex = driver.pair.findIndex(p => p.id === 'list_devices' || p.template === 'list_devices');

        if (listIndex >= 0) {
          // Update list_devices navigation
          if (!driver.pair[listIndex].navigation) {
            driver.pair[listIndex].navigation = {};
          }
          driver.pair[listIndex].navigation.next = 'select_driver';

          // Insert select_driver
          driver.pair.splice(listIndex + 1, 0, {
            id: 'select_driver'
            // No template = custom view
          });

          // Update next view after select_driver
          const nextIndex = listIndex + 2;
          if (nextIndex < driver.pair.length) {
            driver.pair[listIndex + 1].navigation = {
              next: driver.pair[nextIndex].id
            };
          }

        } else {
          // No list_devices, add complete flow
          driver.pair = [
            {
              id: 'list_devices',
              template: 'list_devices',
              navigation: { next: 'select_driver' }
            },
            {
              id: 'select_driver',
              navigation: { next: 'add_devices' }
            },
            {
              id: 'add_devices',
              template: 'add_devices'
            }
          ];
        }

        fs.writeFileSync(composePath, JSON.stringify(driver, null, 2) + '\n');
        stats.manifestsUpdated++;
        console.log(`✅ Updated manifest: ${driverName}`);
      }

    } catch (err) {
      console.error(`❌ Error processing ${driverName}:`, err.message);
    }
  }

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  📊 FINAL STATISTICS                                     ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`✅ Drivers processed: ${stats.driversProcessed}`);
  console.log(`✅ Pair folders created: ${stats.pairFoldersCreated}`);
  console.log(`✅ HTML files created: ${stats.htmlCreated}`);
  console.log(`✅ Manifests updated: ${stats.manifestsUpdated}`);

  console.log('\n🎉 CUSTOM PAIRING APPLIED TO ALL DRIVERS!');
  console.log('\n📋 NEXT STEPS:');
  console.log('1. Test pairing: homey app run');
  console.log('2. Pair a device with multiple matching drivers');
  console.log('3. Verify custom view appears and selection works');
  console.log('4. Commit: git add -A && git commit -m "feat: Custom pairing for all drivers"');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
