#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import colorsys
import math

class AdvancedImageGenerator:
    def __init__(self):
        self.project_root = Path.cwd()
        
        # Johan Bendz color palette
        self.colors = {
            'motion_detection': '#2196F3',
            'contact_security': '#4CAF50',
            'temperature_climate': '#FF9800', 
            'smart_lighting': '#FFD700',
            'power_energy': '#9C27B0',
            'safety_detection': '#F44336',
            'automation_control': '#607D8B',
            'access_control': '#795548'
        }
        
        # SDK3 dimensions
        self.dimensions = {
            'app': {'small': (250, 175), 'large': (500, 350), 'xlarge': (1000, 700)},
            'driver': {'small': (75, 75), 'large': (500, 500), 'xlarge': (1000, 1000)}
        }

    def hex_to_rgb(self, hex_color):
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

    def create_gradient(self, size, color1, color2):
        image = Image.new('RGB', size)
        draw = ImageDraw.Draw(image)
        
        width, height = size
        for y in range(height):
            ratio = y / height
            r = int(color1[0] * (1 - ratio) + color2[0] * ratio)
            g = int(color1[1] * (1 - ratio) + color2[1] * ratio)
            b = int(color1[2] * (1 - ratio) + color2[2] * ratio)
            draw.line([(0, y), (width, y)], fill=(r, g, b))
        
        return image

    def get_device_category(self, driver_name):
        categories = {
            'motion': 'motion_detection',
            'pir': 'motion_detection', 
            'presence': 'motion_detection',
            'radar': 'motion_detection',
            'contact': 'contact_security',
            'door': 'contact_security',
            'window': 'contact_security',
            'temperature': 'temperature_climate',
            'humidity': 'temperature_climate',
            'thermostat': 'temperature_climate',
            'light': 'smart_lighting',
            'bulb': 'smart_lighting',
            'led': 'smart_lighting',
            'dimmer': 'smart_lighting',
            'plug': 'power_energy',
            'socket': 'power_energy',
            'outlet': 'power_energy',
            'smoke': 'safety_detection',
            'gas': 'safety_detection',
            'water': 'safety_detection',
            'button': 'automation_control',
            'switch': 'automation_control',
            'remote': 'automation_control',
            'lock': 'access_control',
            'curtain': 'access_control',
            'blind': 'access_control'
        }
        
        for keyword, category in categories.items():
            if keyword in driver_name.lower():
                return category
        
        return 'automation_control'  # default

    def generate_app_images(self):
        print("Generating app images...")
        assets_path = self.project_root / 'assets' / 'images'
        assets_path.mkdir(parents=True, exist_ok=True)
        
        base_color = self.hex_to_rgb('#1E88E5')
        light_color = tuple(min(255, c + 40) for c in base_color)
        
        for size_name, (width, height) in self.dimensions['app'].items():
            image = self.create_gradient((width, height), light_color, base_color)
            
            # Add Zigbee network icon
            draw = ImageDraw.Draw(image)
            center_x, center_y = width // 2, height // 2
            radius = min(width, height) // 8
            
            # Central hub
            draw.ellipse([center_x-radius//2, center_y-radius//2, 
                         center_x+radius//2, center_y+radius//2], 
                        fill='white', outline=base_color, width=max(2, width//200))
            
            # Connected nodes
            for i in range(6):
                angle = i * math.pi / 3
                x = center_x + radius * 1.5 * math.cos(angle)
                y = center_y + radius * 1.5 * math.sin(angle)
                node_size = radius // 4
                draw.ellipse([x-node_size, y-node_size, x+node_size, y+node_size], 
                           fill='white', outline=base_color, width=max(1, width//300))
                
                # Connection lines
                draw.line([center_x, center_y, x, y], 
                         fill='white', width=max(1, width//400))
            
            image_path = assets_path / f'{size_name}.png'
            image.save(image_path, 'PNG', optimize=True)
            print(f"Generated {image_path}")

    def generate_driver_images(self):
        print("Generating driver images...")
        drivers_path = self.project_root / 'drivers'
        
        if not drivers_path.exists():
            print("No drivers directory found")
            return
            
        for driver_dir in drivers_path.iterdir():
            if driver_dir.is_dir() and not driver_dir.name.startswith('.'):
                self.generate_driver_image_set(driver_dir)

    def generate_driver_image_set(self, driver_dir):
        driver_name = driver_dir.name
        category = self.get_device_category(driver_name)
        color = self.colors.get(category, self.colors['automation_control'])
        
        assets_path = driver_dir / 'assets' / 'images'
        assets_path.mkdir(parents=True, exist_ok=True)
        
        base_color = self.hex_to_rgb(color)
        light_color = tuple(min(255, c + 30) for c in base_color)
        
        for size_name, (width, height) in self.dimensions['driver'].items():
            image = self.create_gradient((width, height), light_color, base_color)
            
            # Add device-specific icon
            self.add_device_icon(image, driver_name, width, height, base_color)
            
            image_path = assets_path / f'{size_name}.png'
            image.save(image_path, 'PNG', optimize=True)

    def add_device_icon(self, image, device_type, width, height, color):
        draw = ImageDraw.Draw(image)
        center_x, center_y = width // 2, height // 2
        size = min(width, height) // 4
        line_width = max(2, width // 100)
        
        device_lower = device_type.lower()
        
        if any(x in device_lower for x in ['motion', 'pir', 'presence']):
            # Motion sensor icon
            draw.arc([center_x-size, center_y-size//2, center_x+size, center_y+size//2], 
                    0, 180, fill='white', width=line_width)
            draw.ellipse([center_x-size//4, center_y-size//4, center_x+size//4, center_y+size//4], 
                        fill='white')
                        
        elif any(x in device_lower for x in ['contact', 'door', 'window']):
            # Door/window sensor
            draw.rectangle([center_x-size, center_y-size, center_x-size//4, center_y+size], 
                          fill='white', outline=color, width=line_width)
            draw.rectangle([center_x+size//4, center_y-size, center_x+size, center_y+size], 
                          fill='white', outline=color, width=line_width)
                          
        elif any(x in device_lower for x in ['temperature', 'humidity', 'thermostat']):
            # Temperature sensor
            draw.rectangle([center_x-size//6, center_y-size, center_x+size//6, center_y+size//3], 
                          fill='white', outline=color, width=line_width)
            draw.ellipse([center_x-size//3, center_y+size//4, center_x+size//3, center_y+size], 
                        fill='white', outline=color, width=line_width)
                        
        elif any(x in device_lower for x in ['light', 'bulb', 'led', 'dimmer']):
            # Light bulb
            draw.ellipse([center_x-size, center_y-size, center_x+size, center_y+size//3], 
                        fill='white', outline=color, width=line_width)
            draw.rectangle([center_x-size//3, center_y+size//4, center_x+size//3, center_y+size], 
                          fill='white', outline=color, width=line_width)
                          
        elif any(x in device_lower for x in ['plug', 'socket', 'outlet']):
            # Power outlet
            draw.rounded_rectangle([center_x-size, center_y-size, center_x+size, center_y+size], 
                                 radius=size//4, fill='white', outline=color, width=line_width)
            draw.ellipse([center_x-size//3, center_y-size//4, center_x-size//6, center_y+size//6], 
                        fill=color)
            draw.ellipse([center_x+size//6, center_y-size//4, center_x+size//3, center_y+size//6], 
                        fill=color)
                        
        elif any(x in device_lower for x in ['smoke', 'gas', 'fire']):
            # Smoke detector
            draw.ellipse([center_x-size, center_y-size, center_x+size, center_y+size], 
                        fill='white', outline=color, width=line_width)
            draw.ellipse([center_x-size//2, center_y-size//2, center_x+size//2, center_y+size//2], 
                        fill=color)
                        
        elif any(x in device_lower for x in ['button', 'switch', 'remote']):
            # Switch/button
            draw.ellipse([center_x-size, center_y-size, center_x+size, center_y+size], 
                        fill='white', outline=color, width=line_width)
            draw.ellipse([center_x-size//3, center_y-size//3, center_x+size//3, center_y+size//3], 
                        fill=color)
                        
        else:
            # Generic device
            draw.rounded_rectangle([center_x-size, center_y-size, center_x+size, center_y+size], 
                                 radius=size//6, fill='white', outline=color, width=line_width)

    def run(self):
        print("Advanced Image Generator - Johan Bendz + SDK3 Standards")
        print("=" * 60)
        
        self.generate_app_images()
        self.generate_driver_images()
        
        print("=" * 60)
        print("All images generated successfully!")

if __name__ == "__main__":
    generator = AdvancedImageGenerator()
    generator.run()
