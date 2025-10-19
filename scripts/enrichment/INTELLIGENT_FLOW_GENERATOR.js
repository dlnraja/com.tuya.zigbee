#!/usr/bin/env node
'use strict';

const fs = require('fs').promises;
const path = require('path');

/**
 * INTELLIGENT FLOW GENERATOR
 * Analyzes each device deeply to create contextual, smart flows
 * Based on real-world use cases and device capabilities
 */

// Deep analysis patterns for each device type
const DEVICE_INTELLIGENCE = {
  
  // SECURITY DEVICES
  security: {
    patterns: ['lock', 'alarm', 'siren', 'sos', 'panic', 'emergency'],
    context: 'Critical safety and security',
    priority: 100,
    flows: {
      triggers: [
        {
          id: 'security_breach',
          when: ['alarm_triggered', 'door_forced', 'tamper_detected'],
          description: 'Critical security event requiring immediate action',
          useCase: 'Send notifications, trigger sirens, call emergency contacts',
          tokens: ['timestamp', 'location', 'severity']
        },
        {
          id: 'armed_state_changed',
          when: ['armed', 'disarmed'],
          description: 'Security system state changed',
          useCase: 'Log events, adjust home mode, notify users',
          tokens: ['previous_state', 'new_state', 'user']
        }
      ],
      conditions: [
        {
          id: 'is_armed',
          logic: 'Check if security system is armed',
          useCase: 'Prevent automation when armed'
        },
        {
          id: 'recent_activity',
          logic: 'Check if security event in last N minutes',
          useCase: 'Avoid false alarms, rate limiting'
        }
      ],
      actions: [
        {
          id: 'emergency_protocol',
          execute: 'Activate full security protocol',
          useCase: 'Turn on all lights, lock all doors, trigger sirens, send alerts'
        }
      ]
    }
  },
  
  // MOTION & PRESENCE SENSORS
  presence: {
    patterns: ['motion', 'pir', 'occupancy', 'presence', 'radar', 'mmwave'],
    context: 'Occupancy detection for automation & security',
    priority: 95,
    flows: {
      triggers: [
        {
          id: 'presence_detected',
          when: ['motion_detected', 'occupancy_true'],
          description: 'Someone entered the area',
          useCase: 'Turn on lights, adjust climate, log activity',
          tokens: ['luminance', 'temperature', 'time_of_day'],
          smartLogic: 'Different actions based on time (night vs day), luminance level'
        },
        {
          id: 'no_presence_timeout',
          when: ['motion_cleared', 'occupancy_false'],
          description: 'Area vacant for configured duration',
          useCase: 'Turn off lights, reduce heating, activate security',
          tokens: ['duration_vacant', 'last_activity']
        },
        {
          id: 'unusual_activity',
          when: ['motion_at_night', 'unexpected_presence'],
          description: 'Activity detected when not expected',
          useCase: 'Security alert, wake up notification',
          tokens: ['expected_state', 'actual_state']
        }
      ],
      conditions: [
        {
          id: 'anyone_home',
          logic: 'Check if any motion sensor detected presence recently',
          useCase: 'Home/Away mode detection'
        },
        {
          id: 'room_occupied',
          logic: 'Specific room currently occupied',
          useCase: 'Room-specific automations'
        }
      ],
      actions: [
        {
          id: 'adaptive_lighting',
          execute: 'Adjust lights based on presence + luminance + time',
          useCase: 'Smart lighting that adapts to context'
        },
        {
          id: 'presence_based_climate',
          execute: 'Adjust temperature based on occupancy',
          useCase: 'Energy saving while maintaining comfort'
        }
      ]
    }
  },
  
  // CONTACT SENSORS (Doors, Windows)
  contact: {
    patterns: ['contact', 'door', 'window', 'opening'],
    context: 'Entry monitoring for security & climate',
    priority: 90,
    flows: {
      triggers: [
        {
          id: 'entry_opened',
          when: ['contact_opened', 'door_opened'],
          description: 'Door or window opened',
          useCase: 'Welcome home, security check, climate adjustment',
          tokens: ['which_entry', 'armed_status', 'outside_temperature'],
          smartLogic: 'If armed: security alert. If climate active: pause heating/cooling. If night: log entry.'
        },
        {
          id: 'entry_left_open',
          when: ['contact_open_timeout'],
          description: 'Entry left open beyond threshold',
          useCase: 'Energy saving alert, security warning',
          tokens: ['duration_open', 'energy_wasted']
        },
        {
          id: 'all_entries_closed',
          when: ['all_contacts_closed'],
          description: 'All doors and windows secured',
          useCase: 'Ready for security arm, activate climate',
          tokens: ['total_entries', 'time_to_close']
        }
      ],
      conditions: [
        {
          id: 'any_entry_open',
          logic: 'Check if any door/window is open',
          useCase: 'Block HVAC activation, security check'
        },
        {
          id: 'specific_entry_state',
          logic: 'Check state of specific door/window',
          useCase: 'Location-based automation'
        }
      ],
      actions: [
        {
          id: 'secure_home',
          execute: 'Close automated curtains, lock doors, arm system',
          useCase: 'Leaving home or bedtime routine'
        }
      ]
    }
  },
  
  // CLIMATE SENSORS (Temperature, Humidity)
  climate: {
    patterns: ['temperature', 'temp', 'humid', 'climate', 'thermostat'],
    context: 'Environmental monitoring for comfort & efficiency',
    priority: 85,
    flows: {
      triggers: [
        {
          id: 'temperature_threshold',
          when: ['temp_too_high', 'temp_too_low'],
          description: 'Temperature outside comfort zone',
          useCase: 'Activate HVAC, send alerts, adjust blinds',
          tokens: ['current_temp', 'threshold', 'trend'],
          smartLogic: 'Consider outdoor temp, time of day, occupancy for optimal action'
        },
        {
          id: 'humidity_alert',
          when: ['humidity_too_high', 'humidity_too_low'],
          description: 'Humidity levels problematic',
          useCase: 'Activate dehumidifier, open windows, send mold warning',
          tokens: ['current_humidity', 'threshold', 'mold_risk']
        },
        {
          id: 'perfect_conditions',
          when: ['temp_and_humidity_optimal'],
          description: 'Ideal climate conditions achieved',
          useCase: 'Log success, energy report, maintain settings',
          tokens: ['temp', 'humidity', 'energy_used']
        }
      ],
      conditions: [
        {
          id: 'temperature_in_range',
          logic: 'Temperature within comfort range',
          useCase: 'Skip HVAC activation if already comfortable'
        },
        {
          id: 'climate_stable',
          logic: 'Climate stable for N minutes',
          useCase: 'Avoid frequent HVAC cycling'
        }
      ],
      actions: [
        {
          id: 'smart_climate_control',
          execute: 'Optimize temperature based on occupancy, time, weather',
          useCase: 'Maximum comfort with minimal energy'
        },
        {
          id: 'ventilation_strategy',
          execute: 'Open/close windows based on inside vs outside conditions',
          useCase: 'Natural climate control when beneficial'
        }
      ]
    }
  },
  
  // AIR QUALITY SENSORS
  airQuality: {
    patterns: ['co2', 'tvoc', 'formaldehyde', 'pm25', 'pm10', 'air', 'quality'],
    context: 'Health & safety air monitoring',
    priority: 95,
    flows: {
      triggers: [
        {
          id: 'air_quality_warning',
          when: ['co2_high', 'tvoc_high', 'pm25_high'],
          description: 'Air quality degraded',
          useCase: 'Open windows, activate purifier, send health alert',
          tokens: ['pollutant_type', 'level', 'health_risk'],
          smartLogic: 'Different actions for different pollutants'
        },
        {
          id: 'air_quality_critical',
          when: ['dangerous_levels'],
          description: 'Air quality dangerous',
          useCase: 'Emergency ventilation, evacuate notification',
          tokens: ['pollutant', 'level', 'safe_threshold']
        }
      ],
      conditions: [
        {
          id: 'air_quality_good',
          logic: 'All air quality metrics in healthy range',
          useCase: 'Safe to close windows, turn off purifier'
        }
      ],
      actions: [
        {
          id: 'improve_air_quality',
          execute: 'Activate all air quality improvement devices',
          useCase: 'Purifiers, ventilation, humidifiers coordination'
        }
      ]
    }
  },
  
  // ENERGY MONITORING
  energy: {
    patterns: ['power', 'energy', 'watt', 'current', 'voltage', 'consumption'],
    context: 'Energy monitoring & optimization',
    priority: 80,
    flows: {
      triggers: [
        {
          id: 'high_consumption',
          when: ['power_spike', 'consumption_threshold'],
          description: 'Abnormally high energy use',
          useCase: 'Alert for forgotten devices, detect malfunctions',
          tokens: ['power_w', 'baseline', 'cost_impact']
        },
        {
          id: 'device_power_state',
          when: ['device_powered_on', 'standby_detected'],
          description: 'Device power state changed',
          useCase: 'Track usage, detect vampires, automate shutoff',
          tokens: ['state', 'power_draw', 'duration']
        },
        {
          id: 'daily_energy_report',
          when: ['daily_threshold', 'cost_exceeded'],
          description: 'Daily energy summary',
          useCase: 'Cost tracking, usage patterns, savings tips',
          tokens: ['total_kwh', 'cost', 'comparison_yesterday']
        }
      ],
      conditions: [
        {
          id: 'consuming_power',
          logic: 'Device currently drawing power',
          useCase: 'Detect if device actually running'
        },
        {
          id: 'peak_hours',
          logic: 'Currently in peak rate period',
          useCase: 'Delay high-power tasks'
        }
      ],
      actions: [
        {
          id: 'load_shedding',
          execute: 'Turn off non-essential devices during peak',
          useCase: 'Reduce costs, prevent overload'
        }
      ]
    }
  },
  
  // SMART LIGHTS
  lighting: {
    patterns: ['light', 'bulb', 'lamp', 'led', 'strip', 'dimmer'],
    context: 'Lighting automation for ambiance & efficiency',
    priority: 75,
    flows: {
      triggers: [
        {
          id: 'light_state_changed',
          when: ['turned_on', 'turned_off', 'dimmed'],
          description: 'Light state changed',
          useCase: 'Sync other lights, log usage, trigger scenes',
          tokens: ['state', 'brightness', 'color']
        }
      ],
      conditions: [
        {
          id: 'lights_on_in_room',
          logic: 'Any light on in specific room',
          useCase: 'Avoid turning on more lights'
        },
        {
          id: 'natural_light_sufficient',
          logic: 'Luminance sensor shows enough daylight',
          useCase: 'Skip turning on lights during day'
        }
      ],
      actions: [
        {
          id: 'adaptive_scene',
          execute: 'Set scene based on time, activity, presence',
          useCase: 'Morning bright, evening warm, night dim'
        },
        {
          id: 'circadian_rhythm',
          execute: 'Adjust color temperature to match sun',
          useCase: 'Support natural wake/sleep cycle'
        },
        {
          id: 'all_lights_control',
          execute: 'Master control for all lights',
          useCase: 'One-touch all on/off, panic mode'
        }
      ]
    }
  },
  
  // SAFETY SENSORS
  safety: {
    patterns: ['smoke', 'gas', 'co', 'leak', 'water', 'flood', 'fire'],
    context: 'Life-safety critical monitoring',
    priority: 100,
    flows: {
      triggers: [
        {
          id: 'safety_alarm',
          when: ['smoke_detected', 'gas_detected', 'leak_detected'],
          description: 'Life-safety alarm triggered',
          useCase: 'Emergency alert, shut off utilities, evacuate',
          tokens: ['alarm_type', 'severity', 'location'],
          smartLogic: 'Different protocols for smoke vs gas vs water'
        },
        {
          id: 'safety_test',
          when: ['test_mode_activated'],
          description: 'Safety device test',
          useCase: 'Log test, verify functionality, remind maintenance',
          tokens: ['device', 'last_test', 'battery_level']
        }
      ],
      conditions: [
        {
          id: 'any_safety_alarm',
          logic: 'Any safety sensor in alarm state',
          useCase: 'Block normal automation during emergency'
        }
      ],
      actions: [
        {
          id: 'emergency_shutdown',
          execute: 'Shut off gas, water, HVAC based on alarm type',
          useCase: 'Prevent further damage/danger'
        },
        {
          id: 'evacuation_protocol',
          execute: 'Unlock doors, turn on path lights, alert emergency contacts',
          useCase: 'Safe evacuation assistance'
        }
      ]
    }
  }
};

// Capability to intelligence mapping
const CAPABILITY_INTELLIGENCE = {
  'alarm_motion': 'presence',
  'alarm_contact': 'contact',
  'alarm_smoke': 'safety',
  'alarm_co': 'safety',
  'alarm_gas': 'safety',
  'alarm_water': 'safety',
  'alarm_generic': 'security',
  'locked': 'security',
  'measure_temperature': 'climate',
  'measure_humidity': 'climate',
  'measure_co2': 'airQuality',
  'measure_pm25': 'airQuality',
  'measure_power': 'energy',
  'measure_current': 'energy',
  'onoff': 'lighting',
  'dim': 'lighting',
  'light_hue': 'lighting'
};

function analyzeDriverIntelligence(driver) {
  const intelligence = {
    primary: null,
    secondary: [],
    capabilities: driver.capabilities || [],
    context: null,
    priority: 0,
    useCases: [],
    smartFlows: []
  };
  
  // Analyze by name patterns
  const nameLower = driver.name.toLowerCase();
  for (const [category, config] of Object.entries(DEVICE_INTELLIGENCE)) {
    if (config.patterns.some(pattern => nameLower.includes(pattern))) {
      if (!intelligence.primary) {
        intelligence.primary = category;
        intelligence.context = config.context;
        intelligence.priority = config.priority;
      } else {
        intelligence.secondary.push(category);
      }
    }
  }
  
  // Analyze by capabilities
  for (const cap of driver.capabilities) {
    const category = CAPABILITY_INTELLIGENCE[cap];
    if (category && !intelligence.primary) {
      intelligence.primary = category;
      const config = DEVICE_INTELLIGENCE[category];
      intelligence.context = config.context;
      intelligence.priority = config.priority;
    } else if (category && category !== intelligence.primary) {
      if (!intelligence.secondary.includes(category)) {
        intelligence.secondary.push(category);
      }
    }
  }
  
  // Generate smart flows based on intelligence
  if (intelligence.primary) {
    const primaryConfig = DEVICE_INTELLIGENCE[intelligence.primary];
    intelligence.smartFlows = primaryConfig.flows;
  }
  
  // Add secondary intelligence
  intelligence.secondary.forEach(cat => {
    const config = DEVICE_INTELLIGENCE[cat];
    if (config && config.flows) {
      // Merge flows from secondary categories
      if (!intelligence.smartFlows) intelligence.smartFlows = { triggers: [], conditions: [], actions: [] };
      
      if (config.flows.triggers) {
        config.flows.triggers.forEach(t => {
          if (!intelligence.smartFlows.triggers.find(existing => existing.id === t.id)) {
            intelligence.smartFlows.triggers.push(t);
          }
        });
      }
      if (config.flows.conditions) {
        config.flows.conditions.forEach(c => {
          if (!intelligence.smartFlows.conditions.find(existing => existing.id === c.id)) {
            intelligence.smartFlows.conditions.push(c);
          }
        });
      }
      if (config.flows.actions) {
        config.flows.actions.forEach(a => {
          if (!intelligence.smartFlows.actions.find(existing => existing.id === a.id)) {
            intelligence.smartFlows.actions.push(a);
          }
        });
      }
    }
  });
  
  return intelligence;
}

async function main() {
  console.log('🧠 INTELLIGENT FLOW GENERATOR\n');
  console.log('Analyzing devices with deep contextual understanding...\n');
  
  // Load detailed analysis
  const analysisPath = path.join(__dirname, '../../reports/SDK3_DRIVERS_DETAILED.json');
  const analysisData = await fs.readFile(analysisPath, 'utf8');
  const allDrivers = JSON.parse(analysisData);
  
  console.log(`📊 Total drivers: ${allDrivers.length}\n`);
  
  const intelligentAnalysis = [];
  
  for (const driver of allDrivers) {
    const intelligence = analyzeDriverIntelligence(driver);
    
    if (intelligence.primary) {
      intelligentAnalysis.push({
        driver: driver.name,
        displayName: driver.displayName,
        intelligence: intelligence,
        capabilities: driver.capabilities,
        class: driver.class
      });
    }
  }
  
  // Sort by priority
  intelligentAnalysis.sort((a, b) => b.intelligence.priority - a.intelligence.priority);
  
  // Generate report
  console.log('🎯 INTELLIGENCE ANALYSIS:\n');
  
  const byCategory = {};
  intelligentAnalysis.forEach(item => {
    const cat = item.intelligence.primary;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(item);
  });
  
  console.log('Categories found:');
  Object.entries(byCategory).sort((a, b) => b[1].length - a[1].length).forEach(([cat, items]) => {
    const config = DEVICE_INTELLIGENCE[cat];
    console.log(`\n📦 ${cat.toUpperCase()} (${items.length} drivers)`);
    console.log(`   Context: ${config.context}`);
    console.log(`   Priority: ${config.priority}`);
    console.log(`   Smart Flows: ${config.flows.triggers.length}T + ${config.flows.conditions.length}C + ${config.flows.actions.length}A`);
    console.log(`   Top devices: ${items.slice(0, 3).map(i => i.displayName).join(', ')}`);
  });
  
  // Save intelligent analysis
  const reportPath = path.join(__dirname, '../../reports/INTELLIGENT_FLOW_ANALYSIS.json');
  await fs.writeFile(reportPath, JSON.stringify({
    total: intelligentAnalysis.length,
    byCategory: Object.entries(byCategory).map(([cat, items]) => ({
      category: cat,
      count: items.length,
      config: DEVICE_INTELLIGENCE[cat],
      drivers: items
    })).sort((a, b) => b.config.priority - a.config.priority),
    timestamp: new Date().toISOString()
  }, null, 2));
  
  console.log(`\n✅ Report saved: ${reportPath}`);
  console.log(`\n📊 Summary:`);
  console.log(`   Total intelligent drivers: ${intelligentAnalysis.length}`);
  console.log(`   Categories: ${Object.keys(byCategory).length}`);
  console.log(`   Avg flows per driver: ${(intelligentAnalysis.reduce((sum, item) => {
    const flows = item.intelligence.smartFlows;
    return sum + (flows ? flows.triggers.length + flows.conditions.length + flows.actions.length : 0);
  }, 0) / intelligentAnalysis.length).toFixed(1)}`);
}

main().catch(console.error);
