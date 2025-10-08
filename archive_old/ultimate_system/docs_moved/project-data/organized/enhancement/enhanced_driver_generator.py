#!/usr/bin/env python3
import json
import os
import shutil
from datetime import datetime

class EnhancedDriverGenerator:
    def __init__(self):
        self.scraped_db_path = 'data/enhanced_sources/enhanced_device_database.json'
        self.drivers_dir = 'drivers'
        self.generated_drivers = []
        self.updated_drivers = []
        
        # Load scraped device database
        with open(self.scraped_db_path, 'r', encoding='utf-8') as f:
            self.device_db = json.load(f)
    
    def generate_driver_compose(self, device_info):
        """Generate driver.compose.json for device"""
        device_name = device_info['name']
        manufacturer = device_info['manufacturer']
        model = device_info['model']
        capabilities = device_info['capabilities']
        zigbee_info = device_info['zigbee_info']
        
        # Determine device class
        device_class = self.determine_device_class(device_name, capabilities)
        
        # Generate clusters based on capabilities
        clusters = self.generate_clusters_for_capabilities(capabilities)
        
        driver_compose = {
            "id": self.generate_driver_id(device_name),
            "name": {"en": device_name},
            "class": device_class,
            "capabilities": capabilities,
            "zigbee": {
                "manufacturerName": zigbee_info['manufacturerName'],
                "productId": zigbee_info['productId'],
                "endpoints": {
                    "1": {
                        "clusters": clusters
                    }
                },
                "learnmode": {
                    "image": f"/drivers/{self.generate_driver_id(device_name)}/assets/learn.svg",
                    "instruction": {
                        "en": f"Press and hold the button on your {device_name} for 3 seconds until the LED starts blinking rapidly."
                    }
                }
            },
            "images": {
                "small": f"/drivers/{self.generate_driver_id(device_name)}/assets/images/small.png",
                "large": f"/drivers/{self.generate_driver_id(device_name)}/assets/images/large.png"
            },
            "settings": self.generate_settings(device_name, capabilities)
        }
        
        # Add energy.batteries if measure_battery capability exists
        if 'measure_battery' in capabilities:
            driver_compose['energy'] = {
                "batteries": ["CR2032", "AA"]
            }
        
        return driver_compose
    
    def generate_device_js(self, device_info):
        """Generate device.js for device"""
        device_name = device_info['name']
        capabilities = device_info['capabilities']
        driver_id = self.generate_driver_id(device_name)
        
        # Generate capability registrations
        capability_registrations = self.generate_capability_registrations(capabilities)
        
        device_js = f"""const {{ ZigBeeDevice }} = require('homey-zigbeedriver');

class {self.to_pascal_case(driver_id)}Device extends ZigBeeDevice {{
    
    async onNodeInit({{ zclNode }}) {{
        
        // Enable debug logging
        this.enableDebug();
        
        // Print node info
        this.printNode();
        
        // Register capabilities with proper cluster mappings
        await this.registerCapabilitiesAndReporting();
        
        // Set up flow triggers if applicable
        this.setupFlowTriggers();
        
        this.log('{device_name} has been initialized');
    }}
    
    async registerCapabilitiesAndReporting() {{
        try {{
{capability_registrations}
            
            this.log('All capabilities registered successfully with cluster mappings');
        }} catch (error) {{
            this.error('Failed to register capabilities:', error);
        }}
    }}
    
    setupFlowTriggers() {{
{self.generate_flow_triggers(capabilities, driver_id)}
    }}
    
    onSettings({{ oldSettings, newSettings, changedKeys }}) {{
        this.log('Settings changed:', changedKeys);
        
        changedKeys.forEach(key => {{
            this.log(`Setting ${{key}} changed from ${{oldSettings[key]}} to ${{newSettings[key]}}`);
            this.handleSettingChange(key, newSettings[key]);
        }});
        
        return Promise.resolve(true);
    }}
    
    handleSettingChange(key, value) {{
        // Handle setting changes based on device type
        this.log(`Setting change: ${{key}} = ${{value}}`);
    }}
    
    onDeleted() {{
        this.log('{device_name} has been deleted');
    }}
}}

module.exports = {self.to_pascal_case(driver_id)}Device;"""
        
        return device_js
    
    def determine_device_class(self, device_name, capabilities):
        """Determine appropriate device class"""
        name_lower = device_name.lower()
        
        if any(cap.startswith('alarm_') for cap in capabilities) or 'sensor' in name_lower:
            return 'sensor'
        elif 'dim' in capabilities:
            return 'light'
        elif 'onoff' in capabilities and ('switch' in name_lower or 'plug' in name_lower):
            if 'plug' in name_lower:
                return 'socket'
            else:
                return 'light'
        elif 'target_temperature' in capabilities or 'thermostat' in name_lower:
            return 'thermostat'
        elif 'button' in name_lower or 'remote' in name_lower:
            return 'button'
        else:
            return 'sensor'
    
    def generate_clusters_for_capabilities(self, capabilities):
        """Generate cluster list based on capabilities"""
        clusters = [0, 1, 3]  # Basic, PowerConfiguration, Identify
        
        capability_cluster_map = {
            'onoff': [6],
            'dim': [8],
            'measure_temperature': [1026],
            'measure_humidity': [1029], 
            'alarm_motion': [1030],
            'alarm_contact': [1280],
            'alarm_smoke': [1280],
            'alarm_water': [1280],
            'alarm_co': [1280],
            'measure_power': [2820],
            'meter_power': [1794],
            'colorControl': [768],
            'windowCovering': [258],
            'target_temperature': [513],
            'measure_pm25': [1042],
            'illuminanceMeasurement': [1024]
        }
        
        for capability in capabilities:
            if capability in capability_cluster_map:
                clusters.extend(capability_cluster_map[capability])
        
        return sorted(list(set(clusters)))
    
    def generate_capability_registrations(self, capabilities):
        """Generate capability registration code"""
        registrations = []
        
        capability_cluster_map = {
            'onoff': 6,
            'dim': 8,
            'measure_temperature': 1026,
            'measure_humidity': 1029,
            'alarm_motion': 1030,
            'alarm_contact': 1280,
            'alarm_smoke': 1280,
            'alarm_water': 1280,
            'alarm_co': 1280,
            'measure_battery': 1,
            'measure_power': 2820,
            'meter_power': 1794,
            'target_temperature': 513,
            'measure_pm25': 1042
        }
        
        for capability in capabilities:
            if capability in capability_cluster_map:
                cluster_id = capability_cluster_map[capability]
                
                if capability.startswith('alarm_'):
                    report_opts = """reportOpts: {
                            configureAttributeReporting: {
                                minInterval: 0,
                                maxInterval: 600,
                                minChange: null
                            }
                        }"""
                elif capability.startswith('measure_'):
                    if capability == 'measure_battery':
                        report_opts = """reportOpts: {
                            configureAttributeReporting: {
                                minInterval: 0,
                                maxInterval: 43200,
                                minChange: 1
                            }
                        }"""
                    else:
                        report_opts = """reportOpts: {
                            configureAttributeReporting: {
                                minInterval: 60,
                                maxInterval: 3600,
                                minChange: 100
                            }
                        }"""
                else:
                    report_opts = """reportOpts: {
                        configureAttributeReporting: {
                            minInterval: 0,
                            maxInterval: 600,
                            minChange: null
                        }
                    }"""
                
                registration = f"""            // {capability.replace('_', ' ').title()} capability
            if (this.hasCapability('{capability}')) {{
                await this.registerCapability('{capability}', {cluster_id}, {{
                    {report_opts}
                }});
            }}"""
                registrations.append(registration)
        
        return '\n\n'.join(registrations)
    
    def generate_flow_triggers(self, capabilities, driver_id):
        """Generate flow trigger setup code"""
        triggers = []
        
        if 'alarm_smoke' in capabilities:
            triggers.append(f"""        // Smoke alarm triggers
        this.registerCapabilityListener('alarm_smoke', (value) => {{
            if (value) {{
                this.homey.flow.getDeviceTriggerCard('smoke_alarm_triggered')
                    .trigger(this, {{}}, {{ smoke_detected: true }})
                    .catch(this.error);
            }} else {{
                this.homey.flow.getDeviceTriggerCard('smoke_alarm_cleared')
                    .trigger(this, {{}}, {{ smoke_detected: false }})
                    .catch(this.error);
            }}
        }});""")
        
        if 'alarm_motion' in capabilities:
            triggers.append(f"""        // Motion sensor triggers
        this.registerCapabilityListener('alarm_motion', (value) => {{
            this.homey.flow.getDeviceTriggerCard('motion_detected')
                .trigger(this, {{}}, {{ motion: value }})
                .catch(this.error);
        }});""")
        
        if 'alarm_contact' in capabilities:
            triggers.append(f"""        // Contact sensor triggers
        this.registerCapabilityListener('alarm_contact', (value) => {{
            this.homey.flow.getDeviceTriggerCard('contact_changed')
                .trigger(this, {{}}, {{ contact_open: value }})
                .catch(this.error);
        }});""")
        
        return '\n\n'.join(triggers) if triggers else '        // No specific flow triggers for this device type'
    
    def generate_settings(self, device_name, capabilities):
        """Generate device settings"""
        settings = []
        
        # Common settings based on capabilities
        if 'measure_temperature' in capabilities:
            settings.append({
                "id": "temperature_offset",
                "type": "number",
                "label": {"en": "Temperature Offset (°C)"},
                "value": 0,
                "min": -10,
                "max": 10,
                "step": 0.1
            })
        
        if any(cap.startswith('alarm_') for cap in capabilities):
            settings.append({
                "id": "sensitivity",
                "type": "dropdown",
                "label": {"en": "Sensitivity"},
                "value": "medium",
                "values": [
                    {"id": "low", "label": {"en": "Low"}},
                    {"id": "medium", "label": {"en": "Medium"}},
                    {"id": "high", "label": {"en": "High"}}
                ]
            })
        
        if 'measure_battery' in capabilities:
            settings.append({
                "id": "battery_threshold",
                "type": "number",
                "label": {"en": "Low Battery Threshold (%)"},
                "value": 20,
                "min": 5,
                "max": 50
            })
        
        return settings
    
    def generate_driver_id(self, device_name):
        """Generate driver ID from device name"""
        # Convert to lowercase, remove special chars, replace spaces with underscores
        import re
        driver_id = re.sub(r'[^\w\s-]', '', device_name.lower())
        driver_id = re.sub(r'[-\s]+', '_', driver_id)
        return driver_id[:50]  # Limit length
    
    def to_pascal_case(self, snake_str):
        """Convert snake_case to PascalCase"""
        return ''.join(word.capitalize() for word in snake_str.split('_'))
    
    def create_driver_directory(self, driver_id):
        """Create driver directory structure"""
        driver_path = os.path.join(self.drivers_dir, driver_id)
        os.makedirs(driver_path, exist_ok=True)
        os.makedirs(os.path.join(driver_path, 'assets', 'images'), exist_ok=True)
        return driver_path
    
    def process_all_devices(self):
        """Process all devices from scraped database"""
        print(f"Processing {len(self.device_db)} devices...")
        
        for device_key, device_info in self.device_db.items():
            try:
                print(f"Creating driver for: {device_info['name']}")
                
                driver_id = self.generate_driver_id(device_info['name'])
                driver_path = self.create_driver_directory(driver_id)
                
                # Generate driver.compose.json
                driver_compose = self.generate_driver_compose(device_info)
                with open(os.path.join(driver_path, 'driver.compose.json'), 'w', encoding='utf-8') as f:
                    json.dump(driver_compose, f, indent=2, ensure_ascii=False)
                
                # Generate device.js
                device_js = self.generate_device_js(device_info)
                with open(os.path.join(driver_path, 'device.js'), 'w', encoding='utf-8') as f:
                    f.write(device_js)
                
                self.generated_drivers.append({
                    'driver_id': driver_id,
                    'device_name': device_info['name'],
                    'manufacturer': device_info['manufacturer'],
                    'model': device_info['model'],
                    'path': driver_path,
                    'source_issue': device_info.get('issue_url', '')
                })
                
            except Exception as e:
                print(f"Error creating driver for {device_info['name']}: {e}")
        
        return self.generated_drivers
    
    def generate_summary_report(self):
        """Generate summary report of driver generation"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_devices_processed': len(self.device_db),
            'drivers_generated': len(self.generated_drivers),
            'drivers_updated': len(self.updated_drivers),
            'generated_drivers': self.generated_drivers,
            'updated_drivers': self.updated_drivers,
            'device_type_breakdown': self.analyze_device_types()
        }
        
        os.makedirs('data/driver_generation', exist_ok=True)
        with open('data/driver_generation/generation_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"Generated {len(self.generated_drivers)} new drivers")
        print(f"Updated {len(self.updated_drivers)} existing drivers")
        print(f"Report saved to data/driver_generation/generation_report.json")
        
        return report
    
    def analyze_device_types(self):
        """Analyze types of generated devices"""
        type_counts = {}
        for driver in self.generated_drivers:
            device_name = driver['device_name'].lower()
            for device_type in ['sensor', 'switch', 'light', 'plug', 'thermostat', 'detector', 'valve']:
                if device_type in device_name:
                    type_counts[device_type] = type_counts.get(device_type, 0) + 1
                    break
            else:
                type_counts['other'] = type_counts.get('other', 0) + 1
        return type_counts

if __name__ == "__main__":
    generator = EnhancedDriverGenerator()
    generated_drivers = generator.process_all_devices()
    report = generator.generate_summary_report()
