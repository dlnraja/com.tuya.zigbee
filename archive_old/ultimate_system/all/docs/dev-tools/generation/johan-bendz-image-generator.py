#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import colorsys

class JohanBendezImageGenerator:
    def __init__(self):
        self.project_root = Path.cwd()
        self.johan_colors = {
            'motion': '#2196F3',      # Blue
            'temperature': '#FF9800', # Orange  
            'contact': '#4CAF50',     # Green
            'lighting': '#FFD700',    # Gold
            'power': '#9C27B0',       # Purple
            'safety': '#F44336',      # Red
            'climate': '#FF5722',     # Deep Orange
            'automation': '#607D8B'   # Blue Grey
        }
        
        self.sdk3_dimensions = {
            'app': {'small': (250, 175), 'large': (500, 350), 'xlarge': (1000, 700)},
            'driver': {'small': (75, 75), 'large': (500, 500), 'xlarge': (1000, 1000)}
        }

    def create_gradient_background(self, size, color1, color2):
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

    def hex_to_rgb(self, hex_color):
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

    def get_device_color(self, device_type):
        if 'motion' in device_type.lower() or 'pir' in device_type.lower():
            return self.johan_colors['motion']
        elif 'temperature' in device_type.lower() or 'humidity' in device_type.lower():
            return self.johan_colors['temperature']
        elif 'contact' in device_type.lower() or 'door' in device_type.lower():
            return self.johan_colors['contact']
        elif 'light' in device_type.lower() or 'bulb' in device_type.lower():
            return self.johan_colors['lighting']
        elif 'plug' in device_type.lower() or 'socket' in device_type.lower():
            return self.johan_colors['power']
        elif 'smoke' in device_type.lower() or 'detector' in device_type.lower():
            return self.johan_colors['safety']
        elif 'climate' in device_type.lower() or 'thermostat' in device_type.lower():
            return self.johan_colors['climate']
        else:
            return self.johan_colors['automation']

    def generate_app_images(self):
        """Generate main app images following SDK3 dimensions"""
        assets_path = self.project_root / 'assets' / 'images'
        assets_path.mkdir(parents=True, exist_ok=True)
        
        base_color = self.hex_to_rgb('#1E88E5')
        light_color = tuple(min(255, c + 40) for c in base_color)
        
        for size_name, (width, height) in self.sdk3_dimensions['app'].items():
            image = self.create_gradient_background(
                (width, height), 
                light_color, 
                base_color
            )
            
            # Add Zigbee hub icon
            draw = ImageDraw.Draw(image)
            center_x, center_y = width // 2, height // 2
            radius = min(width, height) // 6
            
            # Draw connected nodes pattern
            for i in range(6):
                angle = i * 60
                x = center_x + radius * 0.8 * cos(radians(angle))
                y = center_y + radius * 0.8 * sin(radians(angle))
                draw.ellipse([x-8, y-8, x+8, y+8], fill='white', outline=base_color, width=2)
            
            # Central hub
            draw.ellipse([center_x-12, center_y-12, center_x+12, center_y+12], 
                        fill='white', outline=base_color, width=3)
            
            image_path = assets_path / f'{size_name}.png'
            image.save(image_path, 'PNG')
            print(f'Generated app image: {image_path}')

    def generate_driver_images(self):
        """Generate driver images for all device types"""
        drivers_path = self.project_root / 'drivers'
        
        if not drivers_path.exists():
            return
            
        for driver_dir in drivers_path.iterdir():
            if driver_dir.is_dir():
                self.generate_driver_image_set(driver_dir)

    def generate_driver_image_set(self, driver_dir):
        """Generate image set for a specific driver"""
        assets_path = driver_dir / 'assets' / 'images'
        assets_path.mkdir(parents=True, exist_ok=True)
        
        driver_name = driver_dir.name
        device_color = self.get_device_color(driver_name)
        base_color = self.hex_to_rgb(device_color)
        light_color = tuple(min(255, c + 30) for c in base_color)
        
        for size_name, (width, height) in self.sdk3_dimensions['driver'].items():
            image = self.create_gradient_background(
                (width, height),
                light_color,
                base_color
            )
            
            # Add device-specific icon
            self.add_device_icon(image, driver_name, width, height, base_color)
            
            image_path = assets_path / f'{size_name}.png'
            image.save(image_path, 'PNG')

    def add_device_icon(self, image, device_type, width, height, color):
        """Add device-specific icon based on type"""
        draw = ImageDraw.Draw(image)
        center_x, center_y = width // 2, height // 2
        size = min(width, height) // 4
        
        # Simple geometric shapes for different device types
        if 'motion' in device_type or 'pir' in device_type:
            # Motion sensor - eye shape
            draw.ellipse([center_x-size, center_y-size//2, center_x+size, center_y+size//2], 
                        fill='white', outline=color, width=3)
            draw.ellipse([center_x-size//3, center_y-size//3, center_x+size//3, center_y+size//3], 
                        fill=color)
        
        elif 'temperature' in device_type or 'humidity' in device_type:
            # Thermometer
            draw.rectangle([center_x-size//4, center_y-size, center_x+size//4, center_y+size//2], 
                          fill='white', outline=color, width=2)
            draw.ellipse([center_x-size//3, center_y+size//3, center_x+size//3, center_y+size], 
                        fill=color)
        
        elif 'light' in device_type or 'bulb' in device_type:
            # Light bulb
            draw.ellipse([center_x-size, center_y-size, center_x+size, center_y+size//2], 
                        fill='white', outline=color, width=3)
            draw.rectangle([center_x-size//3, center_y+size//3, center_x+size//3, center_y+size], 
                          fill='white', outline=color, width=2)
        
        else:
            # Generic device - square with rounded corners
            draw.rounded_rectangle([center_x-size, center_y-size, center_x+size, center_y+size], 
                                 radius=size//4, fill='white', outline=color, width=3)

if __name__ == "__main__":
    from math import cos, sin, radians
    
    generator = JohanBendezImageGenerator()
    print("Generating professional images following Johan Bendz + SDK3 standards...")
    
    generator.generate_app_images()
    generator.generate_driver_images()
    
    print("✅ All images generated successfully!")
