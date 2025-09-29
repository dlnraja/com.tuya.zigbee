#!/usr/bin/env python3
"""
Professional Device Image Generator for Ultimate Zigbee Hub
Creates category-specific device icons following Johan Benz standards

Generates proper device images for each driver category:
- Lighting: Bulbs, switches, dimmers, RGB controllers
- Sensors: Motion, temperature, door/window, air quality, radar
- Security: Smoke, CO, water leak detectors
- Energy: Smart plugs with power monitoring
- Climate: Thermostats and climate control
- Covers: Curtain motors and automated covers
- Controls: Scene switches and wireless controllers
"""

from PIL import Image, ImageDraw, ImageFont
import os
import colorsys

class ProfessionalDeviceImageGenerator:
    def __init__(self):
        self.base_color = "#1E88E5"  # Professional blue
        self.accent_color = "#FF6900"  # Orange accent
        self.text_color = "#FFFFFF"
        self.bg_color = "#F5F5F5"  # Light gray background
        
        # Professional device categories with specific colors and icons
        self.device_categories = {
            # Lighting & Control - Warm colors
            'tuya_smart_light': {
                'color': '#FFC107', 'icon': '💡', 'name': 'Smart Light',
                'symbol': 'BULB', 'bg_gradient': ['#FFC107', '#FF9800']
            },
            'tuya_dimmer_switch': {
                'color': '#FF9800', 'icon': '🎛️', 'name': 'Dimmer Switch',
                'symbol': 'DIM', 'bg_gradient': ['#FF9800', '#F57C00']
            },
            'tuya_light_switch': {
                'color': '#FF5722', 'icon': '🔘', 'name': 'Light Switch',
                'symbol': 'SW', 'bg_gradient': ['#FF5722', '#E64A19']
            },
            'tuya_rgb_controller': {
                'color': '#E91E63', 'icon': '🌈', 'name': 'RGB Controller',
                'symbol': 'RGB', 'bg_gradient': ['#E91E63', '#C2185B']
            },
            
            # Sensors & Monitoring - Blue/Teal colors
            'tuya_motion_sensor': {
                'color': '#2196F3', 'icon': '👁️', 'name': 'Motion Sensor',
                'symbol': 'PIR', 'bg_gradient': ['#2196F3', '#1976D2']
            },
            'tuya_temperature_humidity_sensor': {
                'color': '#00BCD4', 'icon': '🌡️', 'name': 'Temp/Humidity',
                'symbol': 'T°H', 'bg_gradient': ['#00BCD4', '#0097A7']
            },
            'tuya_door_window_sensor': {
                'color': '#009688', 'icon': '🚪', 'name': 'Door/Window',
                'symbol': 'DW', 'bg_gradient': ['#009688', '#00695C']
            },
            'tuya_air_quality_sensor': {
                'color': '#4CAF50', 'icon': '🌿', 'name': 'Air Quality',
                'symbol': 'AQ', 'bg_gradient': ['#4CAF50', '#388E3C']
            },
            'tuya_radar_sensor': {
                'color': '#3F51B5', 'icon': '📡', 'name': 'Radar Sensor',
                'symbol': 'RAD', 'bg_gradient': ['#3F51B5', '#303F9F']
            },
            
            # Security & Safety - Red/Orange colors
            'tuya_smoke_sensor': {
                'color': '#F44336', 'icon': '🔥', 'name': 'Smoke Sensor',
                'symbol': 'SMK', 'bg_gradient': ['#F44336', '#D32F2F']
            },
            'tuya_co_detector': {
                'color': '#FF5722', 'icon': '⚠️', 'name': 'CO Detector',
                'symbol': 'CO', 'bg_gradient': ['#FF5722', '#E64A19']
            },
            'tuya_water_leak_sensor': {
                'color': '#03A9F4', 'icon': '💧', 'name': 'Water Leak',
                'symbol': 'H2O', 'bg_gradient': ['#03A9F4', '#0288D1']
            },
            
            # Energy & Smart Plugs - Green colors
            'tuya_smart_plug': {
                'color': '#4CAF50', 'icon': '🔌', 'name': 'Smart Plug',
                'symbol': 'PLUG', 'bg_gradient': ['#4CAF50', '#388E3C']
            },
            'tuya_energy_plug': {
                'color': '#8BC34A', 'icon': '⚡', 'name': 'Energy Plug',
                'symbol': 'kWh', 'bg_gradient': ['#8BC34A', '#689F38']
            },
            
            # Climate Control - Purple colors
            'tuya_thermostat': {
                'color': '#9C27B0', 'icon': '🌡️', 'name': 'Thermostat',
                'symbol': 'HVAC', 'bg_gradient': ['#9C27B0', '#7B1FA2']
            },
            
            # Covers & Motors - Brown colors
            'tuya_curtain_motor': {
                'color': '#795548', 'icon': '🪟', 'name': 'Curtain Motor', 
                'symbol': 'CUR', 'bg_gradient': ['#795548', '#5D4037']
            },
            
            # Interactive Controls - Gray colors
            'tuya_scene_switch': {
                'color': '#607D8B', 'icon': '🎮', 'name': 'Scene Switch',
                'symbol': 'SCENE', 'bg_gradient': ['#607D8B', '#455A64']
            }
        }
    
    def create_gradient_background(self, draw, width, height, colors):
        """Create a gradient background"""
        color1 = colors[0]
        color2 = colors[1]
        
        # Convert hex to RGB
        def hex_to_rgb(hex_color):
            return tuple(int(hex_color[i:i+2], 16) for i in (1, 3, 5))
        
        rgb1 = hex_to_rgb(color1)
        rgb2 = hex_to_rgb(color2)
        
        # Create vertical gradient
        for y in range(height):
            ratio = y / height
            r = int(rgb1[0] * (1 - ratio) + rgb2[0] * ratio)
            g = int(rgb1[1] * (1 - ratio) + rgb2[1] * ratio)
            b = int(rgb1[2] * (1 - ratio) + rgb2[2] * ratio)
            draw.line([(0, y), (width, y)], fill=(r, g, b))
    
    def create_device_image(self, device_id, size):
        """Create professional device image"""
        device_info = self.device_categories.get(device_id)
        if not device_info:
            return None
        
        width, height = size
        img = Image.new('RGB', (width, height), '#FFFFFF')
        draw = ImageDraw.Draw(img)
        
        # Create gradient background
        self.create_gradient_background(draw, width, height, device_info['bg_gradient'])
        
        # Add rounded corners effect
        corner_radius = min(width, height) // 10
        
        # Calculate text sizes
        symbol_size = width // 8
        name_size = width // 20
        
        try:
            # Try to load a professional font
            symbol_font = ImageFont.truetype("arial.ttf", symbol_size)
            name_font = ImageFont.truetype("arial.ttf", name_size)
        except:
            # Fallback to default font
            symbol_font = ImageFont.load_default()
            name_font = ImageFont.load_default()
        
        # Draw main symbol/text
        symbol_text = device_info['symbol']
        symbol_bbox = draw.textbbox((0, 0), symbol_text, font=symbol_font)
        symbol_width = symbol_bbox[2] - symbol_bbox[0]
        symbol_height = symbol_bbox[3] - symbol_bbox[1]
        
        # Center symbol
        symbol_x = (width - symbol_width) // 2
        symbol_y = (height - symbol_height) // 2 - height // 8
        
        # Draw symbol with shadow effect
        shadow_offset = 2
        draw.text((symbol_x + shadow_offset, symbol_y + shadow_offset), 
                 symbol_text, fill='#00000040', font=symbol_font)
        draw.text((symbol_x, symbol_y), symbol_text, fill='#FFFFFF', font=symbol_font)
        
        # Draw device name
        name_text = device_info['name']
        name_bbox = draw.textbbox((0, 0), name_text, font=name_font)
        name_width = name_bbox[2] - name_bbox[0]
        name_x = (width - name_width) // 2
        name_y = symbol_y + symbol_height + height // 10
        
        # Draw name with shadow
        draw.text((name_x + 1, name_y + 1), name_text, fill='#00000060', font=name_font)
        draw.text((name_x, name_y), name_text, fill='#FFFFFF', font=name_font)
        
        # Add category indicator
        category_y = height - height // 8
        category_text = "ZIGBEE 3.0"
        category_bbox = draw.textbbox((0, 0), category_text, font=name_font)
        category_width = category_bbox[2] - category_bbox[0]
        category_x = (width - category_width) // 2
        
        draw.text((category_x + 1, category_y + 1), category_text, fill='#00000040', font=name_font)
        draw.text((category_x, category_y), category_text, fill='#FFFFFF', font=name_font)
        
        return img
    
    def generate_all_device_images(self):
        """Generate all device images for all drivers"""
        sizes = {
            'small': (75, 75),
            'large': (500, 350)
        }
        
        for device_id in self.device_categories:
            driver_path = f"drivers/{device_id}/assets/images"
            
            # Create directory if it doesn't exist
            os.makedirs(driver_path, exist_ok=True)
            
            for size_name, dimensions in sizes.items():
                img = self.create_device_image(device_id, dimensions)
                if img:
                    filepath = f"{driver_path}/{size_name}.png"
                    img.save(filepath, "PNG", optimize=True)
                    print(f"Created {filepath} ({dimensions[0]}x{dimensions[1]})")

def main():
    generator = ProfessionalDeviceImageGenerator()
    generator.generate_all_device_images()
    print("\n✅ All professional device images created successfully!")
    print("🎨 Each device now has unique category-specific icons")
    print("📱 Images optimized for Homey app store display")

if __name__ == "__main__":
    main()
