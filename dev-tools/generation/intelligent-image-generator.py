#!/usr/bin/env python3
"""
INTELLIGENT IMAGE GENERATOR FOR ULTIMATE ZIGBEE HUB
Johan Benz Design Standards + Homey SDK3 Compliance + Zigbee2MQTT/Blakadder Inspiration

Features:
- Professional SVG generation with proper SDK3 dimensions
- Device-specific icons based on Zigbee2MQTT database
- Johan Benz color palette and design principles
- Automatic PNG conversion with high quality
- Validation against Homey guidelines
- Batch generation for all drivers
"""

import os
import json
import cairosvg
from PIL import Image, ImageDraw, ImageFont
import colorsys
import requests
from pathlib import Path

class IntelligentImageGenerator:
    def __init__(self, project_root):
        self.project_root = Path(project_root)
        self.setup_directories()
        
        # SDK3 Official Dimensions (from Homey guidelines)
        self.dimensions = {
            'app': {
                'small': (250, 175),
                'large': (500, 350), 
                'xlarge': (1000, 700)
            },
            'driver': {
                'small': (75, 75),
                'large': (500, 500),
                'xlarge': (1000, 1000)
            }
        }
        
        # Johan Benz Color Palette by Device Category
        self.color_palette = {
            'sensors': {
                'primary': '#2196F3',
                'secondary': '#03A9F4',
                'accent': '#00BCD4',
                'gradient': ['#1976D2', '#2196F3']
            },
            'safety_detection': {
                'primary': '#F44336',
                'secondary': '#E91E63', 
                'accent': '#FF5722',
                'gradient': ['#D32F2F', '#F44336']
            },
            'smart_lighting': {
                'primary': '#FFD700',
                'secondary': '#FFA500',
                'accent': '#FF9800',
                'gradient': ['#F57C00', '#FFD700']
            },
            'power_control': {
                'primary': '#9C27B0',
                'secondary': '#673AB7',
                'accent': '#3F51B5',
                'gradient': ['#7B1FA2', '#9C27B0']
            },
            'switches_dimmers': {
                'primary': '#4CAF50',
                'secondary': '#8BC34A',
                'accent': '#CDDC39',
                'gradient': ['#388E3C', '#4CAF50']
            },
            'climate_control': {
                'primary': '#FF9800',
                'secondary': '#FF5722',
                'accent': '#795548',
                'gradient': ['#F57C00', '#FF9800']
            },
            'covers_access': {
                'primary': '#607D8B',
                'secondary': '#455A64',
                'accent': '#37474F',
                'gradient': ['#455A64', '#607D8B']
            },
            'security_access': {
                'primary': '#F44336',
                'secondary': '#E91E63',
                'accent': '#9C27B0',
                'gradient': ['#C2185B', '#E91E63']
            }
        }
        
        # Device Icons (inspired by Zigbee2MQTT and Blakadder)
        self.device_icons = {
            # Sensors
            'motion_sensor': '👁️',
            'contact_sensor': '🚪',
            'temperature_humidity_sensor': '🌡️',
            'presence_sensor': '📡',
            'air_quality_monitor': '🌬️',
            'vibration_sensor': '📳',
            'soil_moisture_sensor': '🌱',
            'radar_sensor': '📶',
            'pir_sensor': '🔍',
            'multisensor': '⚡',
            
            # Safety Detection
            'smoke_detector': '🔥',
            'co_detector': '☠️',
            'gas_detector': '💨',
            'water_leak_sensor': '💧',
            'emergency_button': '🚨',
            'panic_button': '🆘',
            'sos_button': '📢',
            
            # Smart Lighting
            'smart_bulb': '💡',
            'rgb_bulb': '🌈',
            'candle_bulb': '🕯️',
            'filament_bulb': '💡',
            'tunable_white_bulb': '🔆',
            'gu10_spot': '🔦',
            'led_strip': '📏',
            'led_controller': '🎛️',
            
            # Power Control
            'smart_plug': '🔌',
            'energy_plug': '⚡',
            'smart_outlet': '🔌',
            'wall_outlet': '🏠',
            'usb_outlet': '🔌',
            'extension_plug': '🔌',
            
            # Switches & Dimmers
            'wall_switch_1gang': '1️⃣',
            'wall_switch_2gang': '2️⃣',
            'wall_switch_3gang': '3️⃣',
            'wall_switch_4gang': '4️⃣',
            'dimmer_switch': '🔅',
            'touch_switch': '👆',
            'scene_switch': '🎭',
            'wireless_button': '🎯',
            'rotary_dimmer': '🔄',
            
            # Climate Control
            'thermostat': '🌡️',
            'temperature_controller': '❄️',
            'radiator_valve': '🔥',
            'hvac_controller': '🏠',
            'fan_controller': '💨',
            
            # Covers & Access
            'curtain_motor': '🪟',
            'blind_controller': '📋',
            'roller_blind': '📜',
            'shade_controller': '☂️',
            'window_motor': '🪟',
            'garage_door': '🚗',
            'door_controller': '🚪',
            
            # Security & Access
            'smart_lock': '🔒',
            'door_lock': '🗝️',
            'fingerprint_lock': '👆',
            'keypad_lock': '🔢',
            'door_window_sensor': '🚪'
        }
        
    def setup_directories(self):
        """Setup required directories"""
        dirs = [
            'dev-tools/generation/generated_images',
            'dev-tools/generation/templates',
            'references/image_guidelines'
        ]
        for dir_path in dirs:
            (self.project_root / dir_path).mkdir(parents=True, exist_ok=True)
            
    def get_device_category(self, driver_name):
        """Determine device category for color scheme"""
        for category, drivers in {
            'sensors': ['motion', 'contact', 'temperature', 'presence', 'air_quality', 'vibration', 'soil', 'radar', 'pir', 'multi'],
            'safety_detection': ['smoke', 'co_', 'gas', 'water_leak', 'emergency', 'panic', 'sos'],
            'smart_lighting': ['bulb', 'led', 'light', 'candle', 'filament', 'tunable', 'gu10', 'strip'],
            'power_control': ['plug', 'outlet', 'usb'],
            'switches_dimmers': ['switch', 'dimmer', 'button', 'rotary'],
            'climate_control': ['thermostat', 'temperature_controller', 'radiator', 'hvac', 'fan'],
            'covers_access': ['curtain', 'blind', 'shade', 'window', 'garage', 'door_controller'],
            'security_access': ['lock', 'door_window_sensor']
        }.items():
            if any(keyword in driver_name.lower() for keyword in drivers):
                return category
        return 'sensors'  # default
        
    def generate_app_images(self):
        """Generate professional app images following Johan Benz standards"""
        print("Generating app images...")
        
        assets_path = self.project_root / 'assets' / 'images'
        assets_path.mkdir(parents=True, exist_ok=True)
        
        for size_name, (width, height) in self.dimensions['app'].items():
            svg_content = self.create_app_svg(width, height)
            
            # Save SVG
            svg_path = assets_path / f'{size_name}.svg'
            with open(svg_path, 'w') as f:
                f.write(svg_content)
            
            # Convert to PNG
            png_path = assets_path / f'{size_name}.png'
            cairosvg.svg2png(bytestring=svg_content.encode('utf-8'), 
                           write_to=str(png_path),
                           output_width=width,
                           output_height=height)
            
            print(f"  Generated app {size_name}.png ({width}x{height})")
            
    def create_app_svg(self, width, height):
        """Create professional app SVG following Johan Benz design"""
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="appGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1E88E5;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#2196F3;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1976D2;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:0.95" />
      <stop offset="100%" style="stop-color:#E3F2FD;stop-opacity:0.9" />
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Background with Professional Gradient -->
  <rect width="100%" height="100%" fill="url(#appGradient)" rx="{width*0.06}"/>
  
  <!-- Central Icon Circle -->
  <circle cx="{width/2}" cy="{height/2}" r="{min(width, height)/4}" 
          fill="url(#iconGradient)" filter="url(#shadow)" opacity="0.95"/>
  
  <!-- Zigbee Network Pattern -->
  <g transform="translate({width/2},{height/2})" opacity="0.4">
    <!-- Central Hub -->
    <circle r="6" fill="white"/>
    <!-- Network Nodes -->
    <g transform="rotate(0)"><circle cx="25" cy="0" r="3" fill="white"/><line x1="6" y1="0" x2="22" y2="0" stroke="white" stroke-width="1.5"/></g>
    <g transform="rotate(60)"><circle cx="25" cy="0" r="3" fill="white"/><line x1="6" y1="0" x2="22" y2="0" stroke="white" stroke-width="1.5"/></g>
    <g transform="rotate(120)"><circle cx="25" cy="0" r="3" fill="white"/><line x1="6" y1="0" x2="22" y2="0" stroke="white" stroke-width="1.5"/></g>
    <g transform="rotate(180)"><circle cx="25" cy="0" r="3" fill="white"/><line x1="6" y1="0" x2="22" y2="0" stroke="white" stroke-width="1.5"/></g>
    <g transform="rotate(240)"><circle cx="25" cy="0" r="3" fill="white"/><line x1="6" y1="0" x2="22" y2="0" stroke="white" stroke-width="1.5"/></g>
    <g transform="rotate(300)"><circle cx="25" cy="0" r="3" fill="white"/><line x1="6" y1="0" x2="22" y2="0" stroke="white" stroke-width="1.5"/></g>
  </g>
  
  <!-- App Title -->
  <text x="{width/2}" y="{height-height*0.1}" text-anchor="middle" 
        fill="white" font-family="Arial, sans-serif" 
        font-size="{min(width, height)/15}" font-weight="600" opacity="0.95">
    Ultimate Zigbee
  </text>
</svg>'''

    def generate_driver_images(self):
        """Generate images for all drivers"""
        print("Generating driver images...")
        
        drivers_path = self.project_root / 'drivers'
        if not drivers_path.exists():
            print("  Drivers directory not found")
            return
            
        for driver_path in drivers_path.iterdir():
            if driver_path.is_dir():
                self.generate_single_driver_images(driver_path.name)
                
    def generate_single_driver_images(self, driver_name):
        """Generate images for a single driver"""
        category = self.get_device_category(driver_name)
        colors = self.color_palette.get(category, self.color_palette['sensors'])
        icon = self.device_icons.get(driver_name, '⚙️')
        
        # Find driver directory (could be in category subdirectory)
        driver_paths = list(self.project_root.glob(f'drivers/**/{driver_name}'))
        if not driver_paths:
            driver_paths = [self.project_root / 'drivers' / driver_name]
            
        for driver_path in driver_paths:
            if driver_path.exists():
                assets_path = driver_path / 'assets' / 'images'
                assets_path.mkdir(parents=True, exist_ok=True)
                
                for size_name, (width, height) in self.dimensions['driver'].items():
                    svg_content = self.create_driver_svg(width, height, driver_name, icon, colors)
                    
                    # Save SVG
                    svg_path = assets_path / f'{size_name}.svg'
                    with open(svg_path, 'w') as f:
                        f.write(svg_content)
                    
                    # Convert to PNG
                    png_path = assets_path / f'{size_name}.png'
                    cairosvg.svg2png(bytestring=svg_content.encode('utf-8'),
                                   write_to=str(png_path),
                                   output_width=width,
                                   output_height=height)
                    
                print(f"  SVG template created: {path.basename(driver_path)}")s ({category})")
                
    def create_driver_svg(self, width, height, driver_name, icon, colors):
        """Create professional driver SVG"""
        return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="driverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:{colors['gradient'][0]};stop-opacity:0.1" />
      <stop offset="100%" style="stop-color:{colors['gradient'][1]};stop-opacity:0.05" />
    </linearGradient>
    <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:{colors['primary']};stop-opacity:1" />
      <stop offset="100%" style="stop-color:{colors['secondary']};stop-opacity:0.9" />
    </linearGradient>
    <filter id="deviceShadow">
      <feDropShadow dx="1" dy="1" stdDeviation="2" flood-opacity="0.2"/>
    </filter>
  </defs>
  
  <!-- Clean Background -->
  <rect width="100%" height="100%" fill="white" rx="{width*0.05}"/>
  
  <!-- Subtle Device Category Background -->
  <circle cx="{width/2}" cy="{height/2}" r="{min(width, height)/2.5}" 
          fill="url(#driverGradient)" opacity="0.3"/>
  
  <!-- Device Icon -->
  <circle cx="{width/2}" cy="{height/2}" r="{min(width, height)/3.5}" 
          fill="url(#iconGradient)" filter="url(#deviceShadow)" opacity="0.15"/>
  
  <text x="{width/2}" y="{height/2 + min(width, height)/8}" text-anchor="middle" 
        font-size="{min(width, height)/3}" font-family="Arial, sans-serif">{icon}</text>
        
  <!-- Professional Border -->
  <rect x="2" y="2" width="{width-4}" height="{height-4}" 
        fill="none" stroke="{colors['primary']}" stroke-width="1" 
        opacity="0.1" rx="{width*0.05}"/>
</svg>'''

    def validate_images(self):
        """Validate generated images against SDK3 requirements"""
        print("🔍 Validating images...")
        
        issues = []
        
        # Check app images
        for size_name, (expected_width, expected_height) in self.dimensions['app'].items():
            img_path = self.project_root / 'assets' / 'images' / f'{size_name}.png'
            if img_path.exists():
                with Image.open(img_path) as img:
                    if img.size != (expected_width, expected_height):
                        issues.append(f"App {size_name}.png: Expected {expected_width}x{expected_height}, got {img.size}")
            else:
                issues.append(f"Missing app {size_name}.png")
        
        # Check driver images
        drivers_path = self.project_root / 'drivers'
        for driver_path in drivers_path.rglob('*'):
            if driver_path.is_dir() and (driver_path / 'driver.compose.json').exists():
                for size_name, (expected_width, expected_height) in self.dimensions['driver'].items():
                    img_path = driver_path / 'assets' / 'images' / f'{size_name}.png'
                    if img_path.exists():
                        with Image.open(img_path) as img:
                            if img.size != (expected_width, expected_height):
                                issues.append(f"Driver {driver_path.name} {size_name}.png: Expected {expected_width}x{expected_height}, got {img.size}")
                    else:
                        issues.append(f"Missing driver {driver_path.name} {size_name}.png")
        
        if issues:
            print("  ⚠️ Image validation issues found:")
            for issue in issues[:10]:  # Show first 10 issues
                print(f"    - {issue}")
            if len(issues) > 10:
                print(f"    ... and {len(issues) - 10} more issues")
        else:
            print("  ✅ All images validated successfully")
            
        return len(issues) == 0
        
    def generate_missing_images_report(self):
        """Generate report of missing images"""
        report = {
            'missing_app_images': [],
            'missing_driver_images': [],
            'invalid_dimensions': [],
            'total_drivers_found': 0,
            'drivers_with_complete_images': 0
        }
        
        # Check app images
        for size_name in self.dimensions['app']:
            img_path = self.project_root / 'assets' / 'images' / f'{size_name}.png'
            if not img_path.exists():
                report['missing_app_images'].append(size_name)
        
        # Check driver images
        drivers_path = self.project_root / 'drivers'
        for driver_path in drivers_path.rglob('*'):
            if driver_path.is_dir() and (driver_path / 'driver.compose.json').exists():
                report['total_drivers_found'] += 1
                missing_sizes = []
                
                for size_name in self.dimensions['driver']:
                    img_path = driver_path / 'assets' / 'images' / f'{size_name}.png'
                    if not img_path.exists():
                        missing_sizes.append(size_name)
                
                if missing_sizes:
                    report['missing_driver_images'].append({
                        'driver': driver_path.name,
                        'missing_sizes': missing_sizes
                    })
                else:
                    report['drivers_with_complete_images'] += 1
        
        # Save report
        report_path = self.project_root / 'dev-tools' / 'generation' / 'image_generation_report.json'
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
            
        print(f"  Image Report: {report['drivers_with_complete_images']}/{report['total_drivers_found']} drivers have complete images")
        
        return report
        
    def run(self):
        """Execute complete image generation process"""
        print("Starting Intelligent Image Generation...")
        print("Following Johan Benz design standards + Homey SDK3 compliance\n")
        
        try:
            # Generate app images
            self.generate_app_images()
            
            # Generate driver images
            self.generate_driver_images()
            
            # Validate all images
            validation_success = self.validate_images()
            
            # Generate report
            report = self.generate_missing_images_report()
            
            if validation_success:
                print("\n✅ Image generation completed successfully!")
                print("All images follow Johan Benz standards and SDK3 compliance")
            else:
                print("\n⚠️ Image generation completed with validation issues")
                print("Check the issues above and regenerate problematic images")
                
        except Exception as e:
            print(f"\n❌ Error during image generation: {e}")
            raise

if __name__ == '__main__':
    import sys
    
    project_root = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    generator = IntelligentImageGenerator(project_root)
    generator.run()
