const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const FILES = [
  {
    file: 'drivers/sensor_climate_smart/device.js',
    fixes: [
      {
        target: 'const flowCardId = `sensor_climate_smart_hybrid_climate_sensor_smart_hybrid_smart_scene_panel_switch_${g}_changed`;',
        replacement: 'const flowCardId = `sensor_climate_smart_climate_sensor_smart_smart_scene_panel_switch_${g}_changed`;'
      },
      {
        target: 'this.homey.flow.getTriggerCard(\'sensor_climate_smart_hybrid_climate_sensor_smart_hybrid_smart_scene_panel_scene_activated\')',
        replacement: 'this.homey.flow.getTriggerCard(\'sensor_climate_smart_climate_sensor_smart_smart_scene_panel_scene_activated\')'
      },
      {
        target: 'this._setupDPReporting();',
        replacement: `// Register custom flow action listeners
    for (let g = 1; g <= 4; g++) {
      const actionId = \`sensor_climate_smart_climate_sensor_smart_smart_scene_panel_set_switch_\${g}\`;
      const actionCard = (() => { try { return this.homey.flow.getActionCard(actionId); } catch (e) { return null; } })();
      if (actionCard) {
        actionCard.registerRunListener(async (args) => {
          this.log(\`[SCENE-PANEL] Flow action set switch \${g} to \${args.state}\`);
          const cap = \`onoff.gang\${g}\`;
          if (this.hasCapability(cap)) {
            await this.setCapabilityValue(cap, !!args.state).catch(() => {});
          }
          const dp = 23 + g;
          await this.sendDP(dp, 1, args.state ? 1 : 0);
        });
      }
    }

    this._setupDPReporting();`
      }
    ]
  },
  {
    file: 'drivers/climate_sensor_smart/device.js',
    fixes: [
      {
        target: 'const flowCardId = `climate_sensor_smart_hybrid_smart_scene_panel_switch_${g}_changed`;',
        replacement: 'const flowCardId = `climate_sensor_smart_smart_scene_panel_switch_${g}_changed`;'
      },
      {
        target: 'this.homey.flow.getTriggerCard(\'climate_sensor_smart_hybrid_smart_scene_panel_scene_activated\')',
        replacement: 'this.homey.flow.getTriggerCard(\'climate_sensor_smart_smart_scene_panel_scene_activated\')'
      },
      {
        target: 'this._setupDPReporting();',
        replacement: `// Register custom flow action listeners
    for (let g = 1; g <= 4; g++) {
      const actionId = \`climate_sensor_smart_smart_scene_panel_set_switch_\${g}\`;
      const actionCard = (() => { try { return this.homey.flow.getActionCard(actionId); } catch (e) { return null; } })();
      if (actionCard) {
        actionCard.registerRunListener(async (args) => {
          this.log(\`[SCENE-PANEL] Flow action set switch \${g} to \${args.state}\`);
          const cap = \`onoff.gang\${g}\`;
          if (this.hasCapability(cap)) {
            await this.setCapabilityValue(cap, !!args.state).catch(() => {});
          }
          const dp = 23 + g;
          await this.sendDP(dp, 1, args.state ? 1 : 0);
        });
      }
    }

    this._setupDPReporting();`
      }
    ]
  }
];

console.log('=== Applying Flow Action & Trigger Fixes ===');

for (const fix of FILES) {
  const filePath = path.join(ROOT, fix.file);
  if (!fs.existsSync(filePath)) {
    console.error(`[-] File not found: ${fix.file}`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const hasCRLF = content.includes('\r\n');
  content = content.replace(/\r\n/g, '\n');

  let modified = false;
  for (const f of fix.fixes) {
    const normalizedTarget = f.target.replace(/\r\n/g, '\n');
    const normalizedReplacement = f.replacement.replace(/\r\n/g, '\n');

    if (content.includes(normalizedTarget)) {
      content = content.replace(normalizedTarget, normalizedReplacement);
      modified = true;
      console.log(`[+] Patched pattern in: ${fix.file}`);
    } else {
      console.log(`[-] Pattern not found in: ${fix.file} -> ${normalizedTarget.substring(0, 50)}`);
    }
  }

  if (modified) {
    if (hasCRLF) content = content.replace(/\n/g, '\r\n');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[✓] Successfully updated: ${fix.file}`);
  }
}
console.log('=== Flow Fixes Finished ===');
