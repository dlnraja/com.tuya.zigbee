#!/usr/bin/env python3
import os
import json
from PIL import Image, ImageDraw, ImageFont
import glob
from datetime import datetime

class MassImageGenerator:
    def __init__(self):
        self.drivers_dir = 'drivers'
        self.generated_images = []
        
        # Device type colors and icons
        self.device_configs = {
            'sensor': {'color': (46, 125, 50), 'icon': '🌡️'},
            'switch': {'color': (25, 118, 210), 'icon': '🔘'},
            'light': {'color': (255, 193, 7), 'icon': '💡'},
            'plug': {'color': (156, 39, 176), 'icon': '🔌'},
            'detector': {'color': (244, 67, 54), 'icon': '🔍'},
            'thermostat': {'color': (76, 175, 80), 'icon': '🌡️'},
            'valve': {'color': (0, 150, 136), 'icon': '🚰'},
            'button': {'color': (96, 125, 139), 'icon': '🔲'},
            'remote': {'color': (121, 85, 72), 'icon': '📱'},
            'curtain': {'color': (158, 158, 158), 'icon': '🪟'},
            'default': {'color': (33, 33, 33), 'icon': '📱'}
        }
    
    def determine_device_type(self, driver_name, capabilities=None):
        """Determine device type from name and capabilities"""
        name_lower = driver_name.lower()
        
        if any(word in name_lower for word in ['sensor', 'temperature', 'humidity', 'motion', 'pir', 'radar']):
            return 'sensor'
        elif any(word in name_lower for word in ['detector', 'smoke', 'water', 'leak', 'co']):
            return 'detector'
        elif any(word in name_lower for word in ['light', 'led', 'bulb', 'lamp']):
            return 'light'
        elif any(word in name_lower for word in ['plug', 'socket', 'outlet']):
            return 'plug'
        elif any(word in name_lower for word in ['switch', 'gang']):
            return 'switch'
        elif any(word in name_lower for word in ['thermostat', 'valve', 'radiator']):
            return 'thermostat'
        elif any(word in name_lower for word in ['button', 'knob', 'remote']):
            return 'button'
        elif any(word in name_lower for word in ['curtain', 'blind', 'cover']):
            return 'curtain'
        else:
            return 'default'
    
    def create_device_image(self, size, device_type, driver_name):
        """Create device image with specified size"""
        config = self.device_configs.get(device_type, self.device_configs['default'])
        
        # Create image with gradient background
        img = Image.new('RGBA', size, (255, 255, 255, 0))
        draw = ImageDraw.Draw(img)
        
        # Create gradient background
        for i in range(size[1]):
            alpha = int(255 * (1 - i / size[1]) * 0.8)
            color = (*config['color'], alpha)
            draw.rectangle([0, i, size[0], i+1], fill=color)
        
        # Add border
        border_color = (*config['color'], 200)
        draw.rectangle([0, 0, size[0]-1, size[1]-1], outline=border_color, width=2)
        
        # Add device icon (simplified geometric shape)
        center_x, center_y = size[0] // 2, size[1] // 2
        icon_size = min(size[0], size[1]) // 3
        
        if device_type == 'sensor':
            # Circle for sensors
            draw.ellipse([center_x - icon_size//2, center_y - icon_size//2,
                         center_x + icon_size//2, center_y + icon_size//2],
                        fill=(255, 255, 255, 200), outline=config['color'], width=3)
            # Add inner dot
            dot_size = icon_size // 4
            draw.ellipse([center_x - dot_size//2, center_y - dot_size//2,
                         center_x + dot_size//2, center_y + dot_size//2],
                        fill=config['color'])
        
        elif device_type == 'switch':
            # Rectangle for switches
            rect_width, rect_height = icon_size, icon_size // 2
            draw.rectangle([center_x - rect_width//2, center_y - rect_height//2,
                           center_x + rect_width//2, center_y + rect_height//2],
                          fill=(255, 255, 255, 200), outline=config['color'], width=3)
            # Add switch indicator
            indicator_size = rect_width // 3
            draw.rectangle([center_x - indicator_size//2, center_y - rect_height//4,
                           center_x + indicator_size//2, center_y + rect_height//4],
                          fill=config['color'])
        
        elif device_type == 'light':
            # Bulb shape for lights
            bulb_radius = icon_size // 2
            draw.ellipse([center_x - bulb_radius, center_y - bulb_radius,
                         center_x + bulb_radius, center_y + bulb_radius],
                        fill=(255, 255, 255, 200), outline=config['color'], width=3)
            # Add rays
            for angle in [0, 45, 90, 135, 180, 225, 270, 315]:
                import math
                ray_length = bulb_radius + 10
                start_x = center_x + int((bulb_radius + 5) * math.cos(math.radians(angle)))
                start_y = center_y + int((bulb_radius + 5) * math.sin(math.radians(angle)))
                end_x = center_x + int(ray_length * math.cos(math.radians(angle)))
                end_y = center_y + int(ray_length * math.sin(math.radians(angle)))
                draw.line([start_x, start_y, end_x, end_y], fill=config['color'], width=2)
        
        elif device_type == 'plug':
            # Plug shape
            plug_width, plug_height = icon_size, icon_size // 2
            draw.rectangle([center_x - plug_width//2, center_y - plug_height//2,
                           center_x + plug_width//2, center_y + plug_height//2],
                          fill=(255, 255, 255, 200), outline=config['color'], width=3)
            # Add plug pins
            pin_size = 6
            draw.ellipse([center_x - plug_width//4 - pin_size//2, center_y - pin_size//2,
                         center_x - plug_width//4 + pin_size//2, center_y + pin_size//2],
                        fill=config['color'])
            draw.ellipse([center_x + plug_width//4 - pin_size//2, center_y - pin_size//2,
                         center_x + plug_width//4 + pin_size//2, center_y + pin_size//2],
                        fill=config['color'])
        
        else:
            # Default generic device
            draw.rectangle([center_x - icon_size//2, center_y - icon_size//2,
                           center_x + icon_size//2, center_y + icon_size//2],
                          fill=(255, 255, 255, 200), outline=config['color'], width=3)
        
        return img
    
    def process_driver_directory(self, driver_path):
        """Process a single driver directory to generate images"""
        driver_name = os.path.basename(driver_path)
        images_dir = os.path.join(driver_path, 'assets', 'images')
        
        # Create images directory if it doesn't exist
        os.makedirs(images_dir, exist_ok=True)
        
        # Load driver.compose.json to get driver info
        compose_file = os.path.join(driver_path, 'driver.compose.json')
        if not os.path.exists(compose_file):
            return False
        
        try:
            with open(compose_file, 'r', encoding='utf-8') as f:
                driver_data = json.load(f)
            
            display_name = driver_data.get('name', {}).get('en', driver_name)
            capabilities = driver_data.get('capabilities', [])
            device_type = self.determine_device_type(display_name, capabilities)
            
            # Generate small image (75x75)
            small_img = self.create_device_image((75, 75), device_type, display_name)
            small_path = os.path.join(images_dir, 'small.png')
            small_img.save(small_path, 'PNG')
            
            # Generate large image (500x500)
            large_img = self.create_device_image((500, 500), device_type, display_name)
            large_path = os.path.join(images_dir, 'large.png')
            large_img.save(large_path, 'PNG')
            
            self.generated_images.append({
                'driver_id': driver_data.get('id', driver_name),
                'driver_name': display_name,
                'device_type': device_type,
                'small_image': small_path,
                'large_image': large_path
            })
            
            print(f"Generated images for: {display_name}")
            return True
            
        except Exception as e:
            print(f"Error processing {driver_path}: {e}")
            return False
    
    def process_all_drivers(self):
        """Process all driver directories"""
        driver_dirs = [d for d in glob.glob(os.path.join(self.drivers_dir, '*')) 
                      if os.path.isdir(d)]
        
        print(f"Processing {len(driver_dirs)} driver directories...")
        
        for driver_dir in driver_dirs:
            self.process_driver_directory(driver_dir)
        
        return self.generated_images
    
    def generate_summary_report(self):
        """Generate summary report"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_images_generated': len(self.generated_images) * 2,  # small + large
            'drivers_processed': len(self.generated_images),
            'device_type_breakdown': self.analyze_device_types(),
            'generated_images': self.generated_images
        }
        
        os.makedirs('data/image_generation', exist_ok=True)
        with open('data/image_generation/image_generation_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"\nImage Generation Summary:")
        print(f"Drivers processed: {report['drivers_processed']}")
        print(f"Total images generated: {report['total_images_generated']}")
        print(f"Device types: {report['device_type_breakdown']}")
        print(f"Report saved to data/image_generation/image_generation_report.json")
        
        return report
    
    def analyze_device_types(self):
        """Analyze device types"""
        type_counts = {}
        for img_info in self.generated_images:
            device_type = img_info['device_type']
            type_counts[device_type] = type_counts.get(device_type, 0) + 1
        return type_counts

if __name__ == "__main__":
    generator = MassImageGenerator()
    generated_images = generator.process_all_drivers()
    report = generator.generate_summary_report()
