#!/usr/bin/env python3
"""
Comprehensive Driver Enhancer for Ultimate Zigbee Hub
Analyzes sources, enhances drivers with maximum capabilities, clusters, and features
"""

import os
import json
import re
from pathlib import Path

class DriverEnhancer:
    def __init__(self, project_path):
        self.project_path = Path(project_path)
        self.drivers_path = self.project_path / "drivers"
        
        # Comprehensive Zigbee clusters and capabilities based on Johan Bendz standards
        self.zigbee_clusters = {
            'sensors': {
                'motion_sensor': {
                    'clusters': ['basic', 'powerConfiguration', 'identify', 'iasZone', 'illuminanceMeasurement', 'occupancySensing'],
                    'capabilities': ['alarm_motion', 'measure_battery', 'measure_luminance'],
                    'settings': [
                        {'id': 'motion_sensitivity', 'type': 'dropdown', 'label': 'Motion Sensitivity', 'value': 'medium'},
                        {'id': 'occupancy_timeout', 'type': 'number', 'label': 'Occupancy Timeout (seconds)', 'value': 60},
                        {'id': 'illuminance_threshold', 'type': 'number', 'label': 'Illuminance Threshold (lux)', 'value': 50}
                    ]
                },
                'contact_sensor': {
                    'clusters': ['basic', 'powerConfiguration', 'identify', 'iasZone', 'temperatureMeasurement'],
                    'capabilities': ['alarm_contact', 'measure_battery', 'measure_temperature'],
                    'settings': [
                        {'id': 'invert_contact', 'type': 'checkbox', 'label': 'Invert Contact State', 'value': False},
                        {'id': 'tamper_detection', 'type': 'checkbox', 'label': 'Enable Tamper Detection', 'value': True}
                    ]
                },
                'temperature_humidity_sensor': {
                    'clusters': ['basic', 'powerConfiguration', 'identify', 'temperatureMeasurement', 'relativeHumidity'],
                    'capabilities': ['measure_temperature', 'measure_humidity', 'measure_battery'],
                    'settings': [
                        {'id': 'temp_offset', 'type': 'number', 'label': 'Temperature Offset (°C)', 'value': 0},
                        {'id': 'humidity_offset', 'type': 'number', 'label': 'Humidity Offset (%)', 'value': 0},
                        {'id': 'reporting_interval', 'type': 'number', 'label': 'Reporting Interval (minutes)', 'value': 5}
                    ]
                },
                'presence_sensor': {
                    'clusters': ['basic', 'powerConfiguration', 'identify', 'occupancySensing', 'illuminanceMeasurement'],
                    'capabilities': ['alarm_motion', 'measure_battery', 'measure_luminance'],
                    'settings': [
                        {'id': 'detection_range', 'type': 'number', 'label': 'Detection Range (meters)', 'value': 6},
                        {'id': 'presence_timeout', 'type': 'number', 'label': 'Presence Timeout (minutes)', 'value': 2}
                    ]
                },
                'multisensor': {
                    'clusters': ['basic', 'powerConfiguration', 'identify', 'occupancySensing', 'illuminanceMeasurement', 'temperatureMeasurement', 'relativeHumidity'],
                    'capabilities': ['alarm_motion', 'measure_temperature', 'measure_humidity', 'measure_luminance', 'measure_battery'],
                    'settings': [
                        {'id': 'motion_sensitivity', 'type': 'dropdown', 'label': 'Motion Sensitivity', 'value': 'medium'},
                        {'id': 'temp_offset', 'type': 'number', 'label': 'Temperature Offset (°C)', 'value': 0},
                        {'id': 'humidity_offset', 'type': 'number', 'label': 'Humidity Offset (%)', 'value': 0}
                    ]
                },
                'air_quality_sensor': {
                    'clusters': ['basic', 'powerConfiguration', 'identify', 'pm25Measurement', 'formaldehydeMeasurement'],
                    'capabilities': ['measure_pm25', 'measure_formaldehyde', 'measure_battery'],
                    'settings': [
                        {'id': 'air_quality_threshold', 'type': 'number', 'label': 'Air Quality Alert Threshold', 'value': 35}
                    ]
                },
                'smoke_detector': {
                    'clusters': ['basic', 'powerConfiguration', 'identify', 'iasZone'],
                    'capabilities': ['alarm_smoke', 'measure_battery'],
                    'settings': [
                        {'id': 'smoke_sensitivity', 'type': 'dropdown', 'label': 'Smoke Sensitivity', 'value': 'medium'}
                    ]
                },
                'co_detector': {
                    'clusters': ['basic', 'powerConfiguration', 'identify', 'iasZone', 'carbonMonoxideMeasurement'],
                    'capabilities': ['alarm_co', 'measure_battery'],
                    'settings': [
                        {'id': 'co_sensitivity', 'type': 'dropdown', 'label': 'CO Sensitivity', 'value': 'high'}
                    ]
                },
                'water_leak_detector': {
                    'clusters': ['basic', 'powerConfiguration', 'identify', 'iasZone'],
                    'capabilities': ['alarm_water', 'measure_battery'],
                    'settings': [
                        {'id': 'detection_sensitivity', 'type': 'dropdown', 'label': 'Water Detection Sensitivity', 'value': 'high'}
                    ]
                }
            },
            'lights': {
                'smart_light': {
                    'clusters': ['basic', 'identify', 'groups', 'scenes', 'onOff', 'levelControl'],
                    'capabilities': ['onoff', 'dim'],
                    'settings': [
                        {'id': 'transition_time', 'type': 'number', 'label': 'Transition Time (seconds)', 'value': 1}
                    ]
                },
                'rgb_light': {
                    'clusters': ['basic', 'identify', 'groups', 'scenes', 'onOff', 'levelControl', 'colorControl'],
                    'capabilities': ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature'],
                    'settings': [
                        {'id': 'transition_time', 'type': 'number', 'label': 'Color Transition Time (seconds)', 'value': 1},
                        {'id': 'color_loop', 'type': 'checkbox', 'label': 'Enable Color Loop', 'value': False}
                    ]
                }
            },
            'switches': {
                'light_switch': {
                    'clusters': ['basic', 'identify', 'onOff'],
                    'capabilities': ['onoff'],
                    'settings': [
                        {'id': 'switch_type', 'type': 'dropdown', 'label': 'Switch Type', 'value': 'toggle'}
                    ]
                },
                'dimmer_switch': {
                    'clusters': ['basic', 'identify', 'onOff', 'levelControl'],
                    'capabilities': ['onoff', 'dim'],
                    'settings': [
                        {'id': 'min_brightness', 'type': 'number', 'label': 'Minimum Brightness (%)', 'value': 1},
                        {'id': 'fade_duration', 'type': 'number', 'label': 'Fade Duration (seconds)', 'value': 2}
                    ]
                },
                'scene_switch': {
                    'clusters': ['basic', 'identify', 'onOff', 'scenes'],
                    'capabilities': ['onoff'],
                    'settings': [
                        {'id': 'scene_count', 'type': 'number', 'label': 'Scene Count', 'value': 4}
                    ]
                }
            },
            'plugs': {
                'smart_plug': {
                    'clusters': ['basic', 'identify', 'onOff'],
                    'capabilities': ['onoff'],
                    'settings': [
                        {'id': 'power_on_behavior', 'type': 'dropdown', 'label': 'Power-On Behavior', 'value': 'remember'}
                    ]
                },
                'energy_plug': {
                    'clusters': ['basic', 'identify', 'onOff', 'electricalMeasurement', 'meteringCluster'],
                    'capabilities': ['onoff', 'measure_power', 'measure_voltage', 'measure_current', 'meter_power'],
                    'settings': [
                        {'id': 'energy_reporting', 'type': 'number', 'label': 'Energy Reporting (minutes)', 'value': 1},
                        {'id': 'overload_protection', 'type': 'number', 'label': 'Overload Threshold (W)', 'value': 2300}
                    ]
                }
            },
            'covers': {
                'curtain_motor': {
                    'clusters': ['basic', 'identify', 'windowCovering'],
                    'capabilities': ['windowcoverings_set', 'windowcoverings_tilt_set'],
                    'settings': [
                        {'id': 'motor_speed', 'type': 'dropdown', 'label': 'Motor Speed', 'value': 'medium'},
                        {'id': 'calibration_mode', 'type': 'checkbox', 'label': 'Calibration Mode', 'value': False}
                    ]
                }
            },
            'climate': {
                'thermostat': {
                    'clusters': ['basic', 'identify', 'thermostat', 'temperatureMeasurement', 'relativeHumidity'],
                    'capabilities': ['target_temperature', 'measure_temperature', 'measure_humidity', 'thermostat_mode'],
                    'settings': [
                        {'id': 'heating_system', 'type': 'dropdown', 'label': 'Heating System', 'value': 'gas'},
                        {'id': 'eco_mode', 'type': 'checkbox', 'label': 'Eco Mode', 'value': True}
                    ]
                }
            },
            'remotes': {
                'scene_remote_2gang': {
                    'clusters': ['basic', 'identify', 'onOff', 'scenes'],
                    'capabilities': [],
                    'settings': [
                        {'id': 'button_mode', 'type': 'dropdown', 'label': 'Button Mode', 'value': 'single'}
                    ]
                },
                'scene_remote_4gang': {
                    'clusters': ['basic', 'identify', 'onOff', 'scenes'],
                    'capabilities': [],
                    'settings': [
                        {'id': 'button_layout', 'type': 'dropdown', 'label': 'Button Layout', 'value': '2x2'}
                    ]
                }
            }
        }
        
        # Enhanced manufacturer IDs from multiple sources
        self.manufacturer_ids = {
            'tuya': ['_TZ3000_', '_TZ3210_', '_TZ3040_', '_TZE200_', '_TYZB01_', '_TZ1800_', '_TZ2000_'],
            'aqara': ['lumi.', 'LUMI'],
            'xiaomi': ['XIAOMI'],
            'ikea': ['IKEA', 'TRADFRI'],
            'philips': ['Philips'],
            'osram': ['OSRAM'],
            'dresden': ['dresden elektronik'],
            'heiman': ['HEIMAN', 'HM-'],
            'neo': ['NEO_', 'NAS-'],
            'sonoff': ['SONOFF', 'eWeLink'],
            'moes': ['_TZE200_', '_TZ3000_'],
            'lidl': ['_TZ3000_', 'HG06337'],
            'zemismart': ['_TZ3000_', '_TZE200_']
        }
    
    def get_device_category(self, driver_name):
        """Determine device category from driver name"""
        if 'sensor' in driver_name or 'detector' in driver_name:
            if 'motion' in driver_name:
                return 'sensors', 'motion_sensor'
            elif 'contact' in driver_name:
                return 'sensors', 'contact_sensor' 
            elif 'temperature' in driver_name or 'humidity' in driver_name:
                return 'sensors', 'temperature_humidity_sensor'
            elif 'presence' in driver_name:
                return 'sensors', 'presence_sensor'
            elif 'multi' in driver_name:
                return 'sensors', 'multisensor'
            elif 'air_quality' in driver_name:
                return 'sensors', 'air_quality_sensor'
            elif 'smoke' in driver_name:
                return 'sensors', 'smoke_detector'
            elif 'co_detector' in driver_name:
                return 'sensors', 'co_detector'
            elif 'water_leak' in driver_name:
                return 'sensors', 'water_leak_detector'
        elif 'light' in driver_name:
            if 'rgb' in driver_name:
                return 'lights', 'rgb_light'
            else:
                return 'lights', 'smart_light'
        elif 'switch' in driver_name:
            if 'dimmer' in driver_name:
                return 'switches', 'dimmer_switch'
            elif 'scene' in driver_name:
                return 'switches', 'scene_switch'
            else:
                return 'switches', 'light_switch'
        elif 'plug' in driver_name:
            if 'energy' in driver_name:
                return 'plugs', 'energy_plug'
            else:
                return 'plugs', 'smart_plug'
        elif 'curtain' in driver_name or 'motor' in driver_name:
            return 'covers', 'curtain_motor'
        elif 'thermostat' in driver_name:
            return 'climate', 'thermostat'
        elif 'remote' in driver_name:
            if '2gang' in driver_name:
                return 'remotes', 'scene_remote_2gang'
            elif '4gang' in driver_name:
                return 'remotes', 'scene_remote_4gang'
        
        # Default fallback
        return 'sensors', 'motion_sensor'
    
    def create_enhanced_driver_compose(self, driver_name, category, device_type):
        """Create enhanced driver.compose.json with maximum capabilities"""
        config = self.zigbee_clusters[category][device_type]
        
        driver_compose = {
            "id": driver_name,
            "name": {
                "en": self._get_device_display_name(driver_name)
            },
            "class": self._get_device_class(device_type),
            "capabilities": config['capabilities'],
            "zigbee": {
                "manufacturerName": ["_TZ3000_", "_TZE200_", "_TYZB01_", "TUYA", "Smart Home"],
                "productId": ["TS0001", "TS0011", "TS0012", "TS004F", "TS011F", "TS0121", "TS013F"],
                "endpoints": {
                    "1": {
                        "clusters": config['clusters']
                    }
                },
                "learnmode": {
                    "image": f"/drivers/{driver_name}/assets/learn.svg",
                    "instruction": {
                        "en": f"Press and hold the button on your {self._get_device_display_name(driver_name)} for 3 seconds until the LED starts blinking rapidly."
                    }
                }
            },
            "images": {
                "small": f"/drivers/{driver_name}/assets/images/small.png",
                "large": f"/drivers/{driver_name}/assets/images/large.png"
            },
            "settings": config.get('settings', [])
        }
        
        # Add energy capabilities if applicable
        if 'energy' in driver_name:
            driver_compose["energy"] = {
                "batteries": ["CR2032", "AA"],
                "approximation": {
                    "usageConstant": 5
                }
            }
        
        return driver_compose
    
    def _get_device_display_name(self, driver_name):
        """Convert driver name to display name"""
        name_map = {
            'air_quality_sensor': 'Air Quality Sensor',
            'co_detector': 'Carbon Monoxide Detector',
            'contact_sensor': 'Contact Sensor',
            'curtain_motor': 'Curtain Motor',
            'dimmer_switch': 'Dimmer Switch',
            'energy_plug': 'Energy Monitoring Smart Plug',
            'light_switch': 'Light Switch',
            'motion_sensor': 'Motion Sensor',
            'multisensor': 'Multi-Sensor',
            'presence_sensor': 'Presence Sensor',
            'rgb_light': 'RGB Light',
            'scene_remote_2gang': '2-Gang Scene Remote',
            'scene_remote_4gang': '4-Gang Scene Remote',
            'scene_switch': 'Scene Switch',
            'smart_light': 'Smart Light',
            'smart_plug': 'Smart Plug',
            'smoke_detector': 'Smoke Detector',
            'temperature_humidity_sensor': 'Temperature & Humidity Sensor',
            'thermostat': 'Smart Thermostat',
            'water_leak_detector': 'Water Leak Detector'
        }
        return name_map.get(driver_name, driver_name.replace('_', ' ').title())
    
    def _get_device_class(self, device_type):
        """Get Homey device class"""
        class_map = {
            'motion_sensor': 'sensor',
            'contact_sensor': 'sensor',
            'temperature_humidity_sensor': 'sensor',
            'presence_sensor': 'sensor',
            'multisensor': 'sensor',
            'air_quality_sensor': 'sensor',
            'smoke_detector': 'sensor',
            'co_detector': 'sensor',
            'water_leak_detector': 'sensor',
            'smart_light': 'light',
            'rgb_light': 'light',
            'light_switch': 'switch',
            'dimmer_switch': 'switch',
            'scene_switch': 'switch',
            'smart_plug': 'socket',
            'energy_plug': 'socket',
            'curtain_motor': 'windowcoverings',
            'thermostat': 'thermostat',
            'scene_remote_2gang': 'remote',
            'scene_remote_4gang': 'remote'
        }
        return class_map.get(device_type, 'other')
    
    def create_enhanced_device_js(self, driver_name, category, device_type):
        """Create enhanced device.js with comprehensive functionality"""
        config = self.zigbee_clusters[category][device_type]
        
        device_js = f'''const {{ ZigBeeDevice }} = require('homey-zigbeedriver');

class {driver_name.title().replace('_', '')}Device extends ZigBeeDevice {{
    
    async onNodeInit({{ zclNode }}) {{
        
        // Enable debug logging
        this.enableDebug();
        
        // Print node info
        this.printNode();
        
        // Register capabilities
        await this.registerCapabilities();
        
        // Configure reporting
        await this.configureReporting();
        
        // Set up flow triggers
        this.setupFlowTriggers();
        
        this.log('{self._get_device_display_name(driver_name)} has been initialized');
    }}
    
    async registerCapabilities() {{
        const capabilities = {json.dumps(config['capabilities'], indent=8)};
        
        for (const capability of capabilities) {{
            if (this.hasCapability(capability)) {{
                this.log(`Capability ${{capability}} already registered`);
                continue;
            }}
            
            try {{
                await this.addCapability(capability);
                this.log(`Added capability: ${{capability}}`);
            }} catch (error) {{
                this.error(`Failed to add capability ${{capability}}:`, error);
            }}
        }}
    }}
    
    async configureReporting() {{
        try {{
            // Configure cluster reporting based on device type
            {self._generate_reporting_config(category, device_type)}
        }} catch (error) {{
            this.error('Failed to configure reporting:', error);
        }}
    }}
    
    setupFlowTriggers() {{
        // Register flow card triggers
        {self._generate_flow_triggers(category, device_type)}
    }}
    
    onSettings({{ oldSettings, newSettings, changedKeys }}) {{
        this.log('Settings changed:', changedKeys);
        
        // Handle settings changes
        changedKeys.forEach(key => {{
            this.log(`Setting ${{key}} changed from ${{oldSettings[key]}} to ${{newSettings[key]}}`);
            this.handleSettingChange(key, newSettings[key]);
        }});
        
        return Promise.resolve(true);
    }}
    
    handleSettingChange(key, value) {{
        // Handle individual setting changes
        switch(key) {{
            {self._generate_settings_handlers(config.get('settings', []))}
            default:
                this.log(`Unhandled setting change: ${{key}} = ${{value}}`);
        }}
    }}
    
    onDeleted() {{
        this.log('{self._get_device_display_name(driver_name)} has been deleted');
    }}
}}

module.exports = {driver_name.title().replace('_', '')}Device;
'''
        return device_js
    
    def _generate_reporting_config(self, category, device_type):
        """Generate reporting configuration based on device type"""
        if category == 'sensors':
            return '''
            // Configure sensor reporting
            if (this.zclNode.endpoints[1].clusters.occupancySensing) {
                await this.zclNode.endpoints[1].clusters.occupancySensing.configureReporting('occupancy', {
                    minInterval: 0,
                    maxInterval: 600,
                    minChange: null
                });
            }
            
            if (this.zclNode.endpoints[1].clusters.temperatureMeasurement) {
                await this.zclNode.endpoints[1].clusters.temperatureMeasurement.configureReporting('measuredValue', {
                    minInterval: 60,
                    maxInterval: 3600,
                    minChange: 100
                });
            }
            
            if (this.zclNode.endpoints[1].clusters.relativeHumidity) {
                await this.zclNode.endpoints[1].clusters.relativeHumidity.configureReporting('measuredValue', {
                    minInterval: 60,
                    maxInterval: 3600,
                    minChange: 500
                });
            }'''
        elif category == 'lights':
            return '''
            // Configure light reporting
            await this.zclNode.endpoints[1].clusters.onOff.configureReporting('onOff', {
                minInterval: 0,
                maxInterval: 600
            });
            
            if (this.zclNode.endpoints[1].clusters.levelControl) {
                await this.zclNode.endpoints[1].clusters.levelControl.configureReporting('currentLevel', {
                    minInterval: 1,
                    maxInterval: 3600,
                    minChange: 1
                });
            }'''
        elif category == 'plugs':
            return '''
            // Configure plug reporting
            await this.zclNode.endpoints[1].clusters.onOff.configureReporting('onOff', {
                minInterval: 0,
                maxInterval: 600
            });
            
            if (this.zclNode.endpoints[1].clusters.electricalMeasurement) {
                await this.zclNode.endpoints[1].clusters.electricalMeasurement.configureReporting('activePower', {
                    minInterval: 5,
                    maxInterval: 600,
                    minChange: 1
                });
            }'''
        else:
            return '// No specific reporting configuration needed'
    
    def _generate_flow_triggers(self, category, device_type):
        """Generate flow triggers based on device type"""
        if category == 'sensors':
            return '''
        // Motion/presence detection triggers
        this.registerCapabilityListener('alarm_motion', (value) => {
            this.homey.flow.getDeviceTriggerCard('motion_detected')
                .trigger(this, {}, { motion: value })
                .catch(this.error);
        });
        
        this.registerCapabilityListener('alarm_contact', (value) => {
            this.homey.flow.getDeviceTriggerCard('contact_changed')
                .trigger(this, {}, { contact: value })
                .catch(this.error);
        });'''
        elif category == 'lights':
            return '''
        // Light state change triggers
        this.registerCapabilityListener('onoff', (value) => {
            this.homey.flow.getDeviceTriggerCard('light_turned_on_off')
                .trigger(this, {}, { power: value })
                .catch(this.error);
        });'''
        else:
            return '// No specific flow triggers needed'
    
    def _generate_settings_handlers(self, settings):
        """Generate settings change handlers"""
        handlers = []
        for setting in settings:
            setting_id = setting['id']
            handlers.append(f'''
            case '{setting_id}':
                this.log(`{setting_id} changed to ${{value}}`);
                // Handle {setting_id} change
                break;''')
        
        return ''.join(handlers)
    
    def enhance_all_drivers(self):
        """Enhance all drivers with maximum capabilities"""
        results = {
            'enhanced_drivers': [],
            'errors': []
        }
        
        if not self.drivers_path.exists():
            results['errors'].append("Drivers directory not found")
            return results
        
        for driver_dir in self.drivers_path.iterdir():
            if driver_dir.is_dir() and not driver_dir.name.startswith('.'):
                driver_name = driver_dir.name
                
                try:
                    # Determine device category and type
                    category, device_type = self.get_device_category(driver_name)
                    
                    # Create enhanced driver.compose.json
                    compose_content = self.create_enhanced_driver_compose(driver_name, category, device_type)
                    compose_path = driver_dir / "driver.compose.json"
                    
                    with open(compose_path, 'w', encoding='utf-8') as f:
                        json.dump(compose_content, f, indent=2, ensure_ascii=False)
                    
                    # Create enhanced device.js
                    device_js_content = self.create_enhanced_device_js(driver_name, category, device_type)
                    device_js_path = driver_dir / "device.js"
                    
                    with open(device_js_path, 'w', encoding='utf-8') as f:
                        f.write(device_js_content)
                    
                    results['enhanced_drivers'].append({
                        'driver': driver_name,
                        'category': category,
                        'device_type': device_type,
                        'capabilities': len(compose_content['capabilities']),
                        'clusters': len(compose_content['zigbee']['endpoints']['1']['clusters']),
                        'settings': len(compose_content.get('settings', []))
                    })
                    
                    print(f"[ENHANCED] {driver_name} - {category}/{device_type}")
                    
                except Exception as e:
                    error_msg = f"Failed to enhance {driver_name}: {str(e)}"
                    results['errors'].append(error_msg)
                    print(f"[ERROR] {error_msg}")
        
        # Save enhancement report
        report_path = self.project_path / "driver_enhancement_report.json"
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        print(f"\nDriver Enhancement Complete!")
        print(f"Enhanced drivers: {len(results['enhanced_drivers'])}")
        print(f"Errors: {len(results['errors'])}")
        print(f"Report saved to: {report_path}")
        
        return results

def main():
    project_path = r"c:\Users\HP\Desktop\tuya_repair"
    enhancer = DriverEnhancer(project_path)
    results = enhancer.enhance_all_drivers()
    
    if results['errors']:
        print("\nErrors encountered:")
        for error in results['errors']:
            print(f"  - {error}")

if __name__ == "__main__":
    main()
