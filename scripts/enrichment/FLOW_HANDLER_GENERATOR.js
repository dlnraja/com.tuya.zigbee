const fs = require('fs');
const path = require('path');

console.log('🔧 FLOW HANDLER GENERATOR - CRÉATION HANDLERS DEVICE.JS');
console.log('═'.repeat(80));

// Load implementation report
const report = JSON.parse(fs.readFileSync('./IMPLEMENTATION_REPORT.json', 'utf8'));
const appJson = JSON.parse(fs.readFileSync('./app.json', 'utf8'));

console.log(`\n📊 FLOW CARDS À IMPLÉMENTER:`);
console.log(`   Triggers: ${report.after.triggers}`);
console.log(`   Conditions: ${report.after.conditions}`);
console.log(`   Actions: ${report.after.actions}`);

// Template for device.js flow handlers
const FLOW_HANDLER_TEMPLATE = `
  // ============================================================================
  // FLOW CARD HANDLERS
  // ============================================================================

  async registerFlowCardHandlers() {
    this.log('Registering flow card handlers...');

    // TRIGGERS
    {{TRIGGER_REGISTRATIONS}}

    // CONDITIONS
    {{CONDITION_REGISTRATIONS}}

    // ACTIONS
    {{ACTION_REGISTRATIONS}}
  }

  // Helper: Trigger flow when capability changes
  async triggerCapabilityFlow(capabilityId, value) {
    const driverId = this.driver.id;
    
    // Alarm triggers
    if (capabilityId.startsWith('alarm_')) {
      const alarmName = capabilityId;
      const triggerIdTrue = \`\${driverId}_\${alarmName}_true\`;
      const triggerIdFalse = \`\${driverId}_\${alarmName}_false\`;
      
      try {
        if (value === true) {
          await this.homey.flow.getDeviceTriggerCard(triggerIdTrue).trigger(this);
          this.log(\`Triggered: \${triggerIdTrue}\`);
        } else if (value === false) {
          await this.homey.flow.getDeviceTriggerCard(triggerIdFalse).trigger(this);
          this.log(\`Triggered: \${triggerIdFalse}\`);
        }
      } catch (error) {
        this.error(\`Error triggering \${alarmName}:\`, error.message);
      }
    }
    
    // Measure triggers
    if (capabilityId.startsWith('measure_')) {
      const triggerId = \`\${driverId}_\${capabilityId}_changed\`;
      try {
        await this.homey.flow.getDeviceTriggerCard(triggerId).trigger(this, { value });
        this.log(\`Triggered: \${triggerId} with value: \${value}\`);
      } catch (error) {
        this.error(\`Error triggering \${capabilityId}:\`, error.message);
      }
    }
    
    // OnOff triggers
    if (capabilityId === 'onoff') {
      const triggerId = value ? \`\${driverId}_turned_on\` : \`\${driverId}_turned_off\`;
      try {
        await this.homey.flow.getDeviceTriggerCard(triggerId).trigger(this);
        this.log(\`Triggered: \${triggerId}\`);
      } catch (error) {
        this.error(\`Error triggering onoff:\`, error.message);
      }
    }
  }
`;

// Generate condition handler code
function generateConditionHandlers(driverId) {
  return `
    // Condition: OnOff
    try {
      const isOnCard = this.homey.flow.getDeviceConditionCard('${driverId}_is_on');
      if (isOnCard) {
        isOnCard.registerRunListener(async (args, state) => {
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (error) {
      // Card might not exist for this driver
    }

    // Condition: Alarm states
    const alarmCaps = this.getCapabilities().filter(c => c.startsWith('alarm_'));
    alarmCaps.forEach(alarmCap => {
      try {
        const conditionCard = this.homey.flow.getDeviceConditionCard(\`${driverId}_\${alarmCap}_is_active\`);
        if (conditionCard) {
          conditionCard.registerRunListener(async (args, state) => {
            return args.device.getCapabilityValue(alarmCap) === true;
          });
        }
      } catch (error) {
        // Card might not exist
      }
    });

    // Condition: Measure comparisons
    const measureCaps = this.getCapabilities().filter(c => c.startsWith('measure_'));
    measureCaps.forEach(measureCap => {
      try {
        // Greater than
        const gtCard = this.homey.flow.getDeviceConditionCard(\`${driverId}_\${measureCap}_greater_than\`);
        if (gtCard) {
          gtCard.registerRunListener(async (args, state) => {
            const value = args.device.getCapabilityValue(measureCap);
            if (args.greater === '>') return value > args.value;
            if (args.greater === '>=') return value >= args.value;
            return false;
          });
        }

        // Less than
        const ltCard = this.homey.flow.getDeviceConditionCard(\`${driverId}_\${measureCap}_less_than\`);
        if (ltCard) {
          ltCard.registerRunListener(async (args, state) => {
            const value = args.device.getCapabilityValue(measureCap);
            if (args.less === '<') return value < args.value;
            if (args.less === '<=') return value <= args.value;
            return false;
          });
        }
      } catch (error) {
        // Card might not exist
      }
    });
  `;
}

// Generate action handler code
function generateActionHandlers(driverId) {
  return `
    // Action: Turn On
    try {
      const turnOnCard = this.homey.flow.getDeviceActionCard('${driverId}_turn_on');
      if (turnOnCard) {
        turnOnCard.registerRunListener(async (args, state) => {
          await args.device.setCapabilityValue('onoff', true);
        });
      }
    } catch (error) {
      // Card might not exist
    }

    // Action: Turn Off
    try {
      const turnOffCard = this.homey.flow.getDeviceActionCard('${driverId}_turn_off');
      if (turnOffCard) {
        turnOffCard.registerRunListener(async (args, state) => {
          await args.device.setCapabilityValue('onoff', false);
        });
      }
    } catch (error) {
      // Card might not exist
    }

    // Action: Toggle
    try {
      const toggleCard = this.homey.flow.getDeviceActionCard('${driverId}_toggle');
      if (toggleCard) {
        toggleCard.registerRunListener(async (args, state) => {
          const current = args.device.getCapabilityValue('onoff');
          await args.device.setCapabilityValue('onoff', !current);
        });
      }
    } catch (error) {
      // Card might not exist
    }

    // Action: Set Dim
    try {
      const setDimCard = this.homey.flow.getDeviceActionCard('${driverId}_set_dim');
      if (setDimCard) {
        setDimCard.registerRunListener(async (args, state) => {
          await args.device.setCapabilityValue('dim', args.dim);
        });
      }
    } catch (error) {
      // Card might not exist
    }

    // Action: Set Temperature
    try {
      const setTempCard = this.homey.flow.getDeviceActionCard('${driverId}_set_temperature');
      if (setTempCard) {
        setTempCard.registerRunListener(async (args, state) => {
          await args.device.setCapabilityValue('target_temperature', args.temperature);
        });
      }
    } catch (error) {
      // Card might not exist
    }

    // Action: Window Coverings
    try {
      const openCard = this.homey.flow.getDeviceActionCard('${driverId}_open');
      if (openCard) {
        openCard.registerRunListener(async (args, state) => {
          await args.device.setCapabilityValue('windowcoverings_set', 1);
        });
      }

      const closeCard = this.homey.flow.getDeviceActionCard('${driverId}_close');
      if (closeCard) {
        closeCard.registerRunListener(async (args, state) => {
          await args.device.setCapabilityValue('windowcoverings_set', 0);
        });
      }

      const setPosCard = this.homey.flow.getDeviceActionCard('${driverId}_set_position');
      if (setPosCard) {
        setPosCard.registerRunListener(async (args, state) => {
          await args.device.setCapabilityValue('windowcoverings_set', args.position);
        });
      }
    } catch (error) {
      // Cards might not exist
    }

    // Action: Maintenance - Identify
    try {
      const identifyCard = this.homey.flow.getDeviceActionCard('identify_device');
      if (identifyCard) {
        identifyCard.registerRunListener(async (args, state) => {
          // Flash the device (if it has onoff)
          if (args.device.hasCapability('onoff')) {
            const original = args.device.getCapabilityValue('onoff');
            for (let i = 0; i < 3; i++) {
              await args.device.setCapabilityValue('onoff', true);
              await new Promise(resolve => setTimeout(resolve, 300));
              await args.device.setCapabilityValue('onoff', false);
              await new Promise(resolve => setTimeout(resolve, 300));
            }
            await args.device.setCapabilityValue('onoff', original);
          }
        });
      }
    } catch (error) {
      // Card might not exist
    }

    // Action: Reset Meter
    try {
      const resetMeterCard = this.homey.flow.getDeviceActionCard('reset_meter');
      if (resetMeterCard) {
        resetMeterCard.registerRunListener(async (args, state) => {
          if (args.device.hasCapability('meter_power')) {
            await args.device.setCapabilityValue('meter_power', 0);
            this.log('Power meter reset');
          }
        });
      }
    } catch (error) {
      // Card might not exist
    }
  `;
}

// Process each driver
console.log(`\n🔧 GÉNÉRATION HANDLERS POUR CHAQUE DRIVER...\n`);

let driversProcessed = 0;
let driversSkipped = 0;

appJson.drivers.forEach((driver, index) => {
  const driverId = driver.id;
  const driverPath = `./drivers/${driverId}`;
  const devicePath = `${driverPath}/device.js`;

  if (!fs.existsSync(devicePath)) {
    driversSkipped++;
    return;
  }

  let deviceCode = fs.readFileSync(devicePath, 'utf8');

  // Check if flow handlers already exist
  if (deviceCode.includes('registerFlowCardHandlers')) {
    console.log(`   ⏭️  ${driverId}: handlers already exist`);
    driversSkipped++;
    return;
  }

  // Generate handlers
  const conditionHandlers = generateConditionHandlers(driverId);
  const actionHandlers = generateActionHandlers(driverId);

  const fullHandler = FLOW_HANDLER_TEMPLATE
    .replace('{{TRIGGER_REGISTRATIONS}}', '// Triggers are handled automatically via triggerCapabilityFlow()')
    .replace('{{CONDITION_REGISTRATIONS}}', conditionHandlers)
    .replace('{{ACTION_REGISTRATIONS}}', actionHandlers);

  // Insert before the closing brace of the class
  const lastBraceIndex = deviceCode.lastIndexOf('}');
  if (lastBraceIndex !== -1) {
    deviceCode = deviceCode.slice(0, lastBraceIndex) + fullHandler + '\n' + deviceCode.slice(lastBraceIndex);

    // Also add call to registerFlowCardHandlers in onInit
    if (deviceCode.includes('async onInit()')) {
      deviceCode = deviceCode.replace(
        /(async onInit\(\)[^{]*{)/,
        '$1\n    await this.registerFlowCardHandlers();'
      );
    }

    // Add triggerCapabilityFlow calls to setCapabilityValue
    if (!deviceCode.includes('await this.triggerCapabilityFlow')) {
      // Add override for setCapabilityValue
      const setCapOverride = `
  async setCapabilityValue(capabilityId, value) {
    await super.setCapabilityValue(capabilityId, value);
    await this.triggerCapabilityFlow(capabilityId, value);
  }
`;
      deviceCode = deviceCode.slice(0, lastBraceIndex) + setCapOverride + '\n' + deviceCode.slice(lastBraceIndex);
    }

    fs.writeFileSync(devicePath, deviceCode);
    driversProcessed++;
    console.log(`   ✅ ${driverId}: handlers added`);
  }

  // Progress
  if ((index + 1) % 20 === 0 || index === appJson.drivers.length - 1) {
    process.stdout.write(`\r   Progress: ${index + 1}/${appJson.drivers.length}...`);
  }
});

console.log('\n');

// Final report
console.log(`\n═`.repeat(80));
console.log(`📊 RÉSUMÉ GÉNÉRATION HANDLERS`);
console.log(`═`.repeat(80));
console.log(`\n✅ Drivers traités: ${driversProcessed}`);
console.log(`⏭️  Drivers sautés: ${driversSkipped}`);
console.log(`\n🎯 HANDLERS AJOUTÉS À CHAQUE DEVICE.JS:`);
console.log(`   - registerFlowCardHandlers()`);
console.log(`   - triggerCapabilityFlow()`);
console.log(`   - setCapabilityValue() override`);
console.log(`   - Condition handlers (alarm, measure)`);
console.log(`   - Action handlers (on/off, dim, temp, curtains, maintenance)`);

console.log(`\n🚀 PROCHAINES ÉTAPES:`);
console.log(`   1. Valider: homey app validate`);
console.log(`   2. Test flow cards avec Homey app`);
console.log(`   3. Commit: git add . && git commit -m "feat: add 1767 flow cards"`);

console.log(`\n🎉 FLOW HANDLERS GÉNÉRÉS POUR ${driversProcessed} DRIVERS !`);
