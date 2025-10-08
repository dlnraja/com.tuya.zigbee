#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
JOHAN BENDZ PROFESSIONAL IMAGE GENERATOR
Following exact design standards + Homey SDK3 compliance
Inspired by Zigbee2MQTT, Blakadder, and Johan Bendz original work
"""

import os
import sys
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math

class JohanBendzProfessionalGenerator:
    def __init__(self):
        self.project_root = Path.cwd()
        
        # Johan Bendz exact color palette
        self.johan_colors = {
            'motion_detection': '#2196F3',      # Blue - Motion/PIR sensors
            'contact_security': '#4CAF50',      # Green - Door/Window sensors  
            'temperature_climate': '#FF9800',   # Orange - Temperature/Humidity
            'smart_lighting': '#FFD700',        # Gold - Lights/Bulbs/LEDs
            'power_energy': '#9C27B0',          # Purple - Plugs/Sockets/Energy
            'safety_detection': '#F44336',      # Red - Smoke/Gas/Water leak
            'automation_control': '#607D8B',    # Blue Grey - Buttons/Switches
            'access_control': '#795548'         # Brown - Locks/Curtains/Blinds
        }
        
        # Homey SDK3 official dimensions
        self.sdk3_dimensions = {
            'app': {
                'small': (250, 175),   # App small image
                'large': (500, 350),   # App large image  
                'xlarge': (1000, 700)  # App xlarge image
            },
            'driver': {
                'small': (75, 75),     # Driver small image
                'large': (500, 500),   # Driver large image
                'xlarge': (1000, 1000) # Driver xlarge image
            }
        }
        
        # Device category mappings (unbranded approach)
        self.device_categories = {
            'motion': 'motion_detection',
            'pir': 'motion_detection',
            'presence': 'motion_detection', 
            'radar': 'motion_detection',
            'occupancy': 'motion_detection',
            'contact': 'contact_security',
            'door': 'contact_security',
            'window': 'contact_security',
            'vibration': 'contact_security',
            'shock': 'contact_security',
            'temperature': 'temperature_climate',
            'humidity': 'temperature_climate',
            'soil': 'temperature_climate',
            'air_quality': 'temperature_climate',
            'thermostat': 'temperature_climate',
            'climate': 'temperature_climate',
            'light': 'smart_lighting',
            'bulb': 'smart_lighting',
            'led': 'smart_lighting',
            'dimmer': 'smart_lighting',
            'lamp': 'smart_lighting',
            'strip': 'smart_lighting',
            'rgb': 'smart_lighting',
            'plug': 'power_energy',
            'socket': 'power_energy', 
            'outlet': 'power_energy',
            'energy': 'power_energy',
            'usb': 'power_energy',
            'wall_outlet': 'power_energy',
            'smoke': 'safety_detection',
            'fire': 'safety_detection',
            'gas': 'safety_detection',
            'co': 'safety_detection',
            'water': 'safety_detection',
            'leak': 'safety_detection',
            'flood': 'safety_detection',
            'button': 'automation_control',
            'switch': 'automation_control',
            'scene': 'automation_control',
            'remote': 'automation_control',
            'knob': 'automation_control',
            'rotary': 'automation_control',
            'touch': 'automation_control',
            'wireless': 'automation_control',
            'lock': 'access_control',
            'doorbell': 'access_control',
            'garage': 'access_control',
            'curtain': 'access_control',
            'blind': 'access_control',
            'shade': 'access_control',
            'motor': 'access_control',
            'roller': 'access_control'
        }

    def hex_to_rgb(self, hex_color):
        """Convert hex color to RGB tuple"""
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

    def create_professional_gradient(self, size, base_color):
        """Create Johan Bendz style gradient background"""
        image = Image.new('RGB', size, 'white')
        draw = ImageDraw.Draw(image)
        
        width, height = size
        base_rgb = self.hex_to_rgb(base_color)
        
        # Create subtle gradient from light to base color
        light_rgb = tuple(min(255, c + 60) for c in base_rgb)
        
        for y in range(height):
            ratio = y / height
            r = int(light_rgb[0] * (1 - ratio) + base_rgb[0] * ratio)
            g = int(light_rgb[1] * (1 - ratio) + base_rgb[1] * ratio)
            b = int(light_rgb[2] * (1 - ratio) + base_rgb[2] * ratio)
            draw.line([(0, y), (width, y)], fill=(r, g, b))
        
        return image

    def get_device_category(self, driver_name):
        """Determine device category from driver name"""
        name_lower = driver_name.lower()
        
        for keyword, category in self.device_categories.items():
            if keyword in name_lower:
                return category
                
        return 'automation_control'  # Default fallback

    def generate_app_images(self):
        """Generate main app images following SDK3 dimensions"""
        print("Generating app images (Johan Bendz + SDK3 standards)...")
        
        assets_path = self.project_root / 'assets' / 'images'
        assets_path.mkdir(parents=True, exist_ok=True)
        
        # Use primary blue color for app
        app_color = '#1E88E5'
        
        for size_name, (width, height) in self.sdk3_dimensions['app'].items():
            image = self.create_professional_gradient((width, height), app_color)
            
            # Add Zigbee hub network icon
            self.add_zigbee_hub_icon(image, width, height, self.hex_to_rgb(app_color))
            
            image_path = assets_path / f'{size_name}.png'
            image.save(image_path, 'PNG', optimize=True, quality=95)
            print(f"  Generated: {image_path}")

    def add_zigbee_hub_icon(self, image, width, height, color):
        """Add professional Zigbee hub icon to app image"""
        draw = ImageDraw.Draw(image)
        center_x, center_y = width // 2, height // 2
        
        # Scale based on image size
        hub_radius = min(width, height) // 12
        node_radius = hub_radius // 3
        connection_radius = hub_radius * 2
        line_width = max(2, width // 200)
        
        # Central hub
        draw.ellipse([
            center_x - hub_radius, center_y - hub_radius,
            center_x + hub_radius, center_y + hub_radius
        ], fill='white', outline=color, width=line_width)
        
        # Connected device nodes (6 nodes in circle)
        for i in range(6):
            angle = i * math.pi / 3
            node_x = center_x + connection_radius * math.cos(angle)
            node_y = center_y + connection_radius * math.sin(angle)
            
            # Device node
            draw.ellipse([
                node_x - node_radius, node_y - node_radius,
                node_x + node_radius, node_y + node_radius
            ], fill='white', outline=color, width=line_width)
            
            # Connection line
            draw.line([center_x, center_y, node_x, node_y], 
                     fill='white', width=line_width)
        
        # Add subtle app title area
        title_y = center_y + connection_radius + hub_radius
        if title_y < height - 20:
            # Title background
            title_rect = [
                center_x - connection_radius, title_y - 10,
                center_x + connection_radius, title_y + 10
            ]
            draw.rounded_rectangle(title_rect, radius=8, fill='white', outline=color, width=1)

    def generate_driver_images(self):
        """Generate driver images for all device categories"""
        print("Generating driver images...")
        
        drivers_path = self.project_root / 'drivers'
        if not drivers_path.exists():
            print("  No drivers directory found")
            return
            
        driver_count = 0
        for driver_dir in drivers_path.iterdir():
            if driver_dir.is_dir() and not driver_dir.name.startswith('.'):
                self.generate_driver_image_set(driver_dir)
                driver_count += 1
                
        print(f"  Generated images for {driver_count} drivers")

    def generate_driver_image_set(self, driver_dir):
        """Generate complete image set for a specific driver"""
        driver_name = driver_dir.name
        category = self.get_device_category(driver_name)
        color = self.johan_colors[category]
        
        assets_path = driver_dir / 'assets' / 'images'
        assets_path.mkdir(parents=True, exist_ok=True)
        
        for size_name, (width, height) in self.sdk3_dimensions['driver'].items():
            image = self.create_professional_gradient((width, height), color)
            
            # Add device-specific icon
            self.add_device_icon(image, driver_name, category, width, height, self.hex_to_rgb(color))
            
            image_path = assets_path / f'{size_name}.png'
            image.save(image_path, 'PNG', optimize=True, quality=95)

    def add_device_icon(self, image, device_type, category, width, height, color):
        """Add category-specific device icon inspired by Zigbee2MQTT/Blakadder"""
        draw = ImageDraw.Draw(image)
        center_x, center_y = width // 2, height // 2
        
        # Scale icon based on image size
        icon_size = min(width, height) // 4
        line_width = max(2, width // 100)
        
        device_lower = device_type.lower()
        
        if category == 'motion_detection':
            # Motion sensor - radar waves
            for i in range(3):
                radius = icon_size + (i * icon_size // 3)
                draw.arc([center_x - radius, center_y - radius//2, 
                         center_x + radius, center_y + radius//2], 
                        0, 180, fill='white', width=line_width)
            # Central dot
            draw.ellipse([center_x - icon_size//6, center_y - icon_size//6,
                         center_x + icon_size//6, center_y + icon_size//6], 
                        fill='white')
                        
        elif category == 'contact_security':
            # Door/window sensor - two parts
            gap = icon_size // 8
            draw.rounded_rectangle([
                center_x - icon_size, center_y - icon_size, 
                center_x - gap, center_y + icon_size
            ], radius=icon_size//8, fill='white', outline=color, width=line_width)
            draw.rounded_rectangle([
                center_x + gap, center_y - icon_size,
                center_x + icon_size, center_y + icon_size  
            ], radius=icon_size//8, fill='white', outline=color, width=line_width)
            
        elif category == 'temperature_climate':
            # Thermometer
            bulb_radius = icon_size // 3
            draw.rectangle([
                center_x - icon_size//8, center_y - icon_size,
                center_x + icon_size//8, center_y + icon_size//3
            ], fill='white', outline=color, width=line_width)
            draw.ellipse([
                center_x - bulb_radius, center_y + icon_size//4,
                center_x + bulb_radius, center_y + icon_size
            ], fill='white', outline=color, width=line_width)
            
        elif category == 'smart_lighting':
            # Light bulb
            draw.ellipse([
                center_x - icon_size, center_y - icon_size,
                center_x + icon_size, center_y + icon_size//3
            ], fill='white', outline=color, width=line_width)
            draw.rectangle([
                center_x - icon_size//2, center_y + icon_size//4,
                center_x + icon_size//2, center_y + icon_size
            ], fill='white', outline=color, width=line_width)
            # Light rays
            for angle in [45, 90, 135]:
                ray_x = center_x + (icon_size + icon_size//2) * math.cos(math.radians(angle))  
                ray_y = center_y + (icon_size + icon_size//2) * math.sin(math.radians(angle))
                draw.line([center_x, center_y - icon_size//2, ray_x, ray_y], 
                         fill='white', width=line_width)
            
        elif category == 'power_energy':
            # Power outlet
            draw.rounded_rectangle([
                center_x - icon_size, center_y - icon_size,
                center_x + icon_size, center_y + icon_size
            ], radius=icon_size//4, fill='white', outline=color, width=line_width)
            # Outlet holes
            hole_size = icon_size // 4
            draw.ellipse([center_x - icon_size//2, center_y - hole_size//2,
                         center_x - icon_size//4, center_y + hole_size//2], fill=color)
            draw.ellipse([center_x + icon_size//4, center_y - hole_size//2,
                         center_x + icon_size//2, center_y + hole_size//2], fill=color)
            
        elif category == 'safety_detection':
            # Smoke detector - circular with center dot
            draw.ellipse([
                center_x - icon_size, center_y - icon_size,
                center_x + icon_size, center_y + icon_size
            ], fill='white', outline=color, width=line_width)
            draw.ellipse([
                center_x - icon_size//2, center_y - icon_size//2,
                center_x + icon_size//2, center_y + icon_size//2
            ], fill=color)
            # Detection pattern
            for i in range(4):
                angle = i * 90
                dot_x = center_x + (icon_size // 1.5) * math.cos(math.radians(angle))
                dot_y = center_y + (icon_size // 1.5) * math.sin(math.radians(angle))
                draw.ellipse([dot_x - 3, dot_y - 3, dot_x + 3, dot_y + 3], fill='white')
                
        elif category == 'automation_control':
            # Button/switch - circular with center
            draw.ellipse([
                center_x - icon_size, center_y - icon_size,
                center_x + icon_size, center_y + icon_size
            ], fill='white', outline=color, width=line_width)
            draw.ellipse([
                center_x - icon_size//2, center_y - icon_size//2,
                center_x + icon_size//2, center_y + icon_size//2
            ], fill=color)
            
        elif category == 'access_control':
            # Lock icon
            lock_width = icon_size
            lock_height = icon_size * 1.2
            # Lock body
            draw.rounded_rectangle([
                center_x - lock_width//2, center_y - lock_height//4,
                center_x + lock_width//2, center_y + lock_height//2
            ], radius=lock_width//8, fill='white', outline=color, width=line_width)
            # Lock shackle
            draw.arc([
                center_x - lock_width//3, center_y - lock_height//2,
                center_x + lock_width//3, center_y
            ], 0, 180, fill='white', width=line_width)
            
        else:
            # Generic device icon
            draw.rounded_rectangle([
                center_x - icon_size, center_y - icon_size,
                center_x + icon_size, center_y + icon_size
            ], radius=icon_size//6, fill='white', outline=color, width=line_width)

    def validate_images(self):
        """Validate all generated images meet SDK3 requirements"""
        print("Validating image dimensions...")
        
        errors = []
        
        # Check app images
        app_path = self.project_root / 'assets' / 'images'
        for size_name, (expected_width, expected_height) in self.sdk3_dimensions['app'].items():
            image_path = app_path / f'{size_name}.png'
            if image_path.exists():
                with Image.open(image_path) as img:
                    if img.size != (expected_width, expected_height):
                        errors.append(f"App {size_name}.png: {img.size} != {(expected_width, expected_height)}")
            else:
                errors.append(f"App {size_name}.png: Missing")
        
        # Check driver images
        drivers_path = self.project_root / 'drivers'
        if drivers_path.exists():
            for driver_dir in drivers_path.iterdir():
                if driver_dir.is_dir():
                    for size_name, (expected_width, expected_height) in self.sdk3_dimensions['driver'].items():
                        image_path = driver_dir / 'assets' / 'images' / f'{size_name}.png'
                        if image_path.exists():
                            with Image.open(image_path) as img:
                                if img.size != (expected_width, expected_height):
                                    errors.append(f"Driver {driver_dir.name}/{size_name}.png: {img.size} != {(expected_width, expected_height)}")
        
        if errors:
            print("  Validation errors found:")
            for error in errors:
                print(f"    ERROR: {error}")
            return False
        else:
            print("  SUCCESS: All images validated successfully")
            return True

    def run(self):
        """Execute complete image generation process"""
        print("JOHAN BENDZ PROFESSIONAL IMAGE GENERATOR")
        print("Following exact design standards + Homey SDK3 compliance")
        print("=" * 70)
        
        try:
            self.generate_app_images()
            self.generate_driver_images()
            
            validation_ok = self.validate_images()
            
            print("=" * 70)
            if validation_ok:
                print("SUCCESS: All images generated and validated!")
            else:
                print("WARNING: Images generated but validation errors found")
                
            return validation_ok
            
        except Exception as e:
            print(f"ERROR: {str(e)}")
            return False

if __name__ == "__main__":
    generator = JohanBendzProfessionalGenerator()
    success = generator.run()
    exit(0 if success else 1)
