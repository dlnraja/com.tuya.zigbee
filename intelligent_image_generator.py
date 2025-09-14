#!/usr/bin/env python3
"""
Intelligent Image Generator for SDK3 Homey Apps
Creates professional device images following Johan Bendz design standards
"""

import os
import json
from PIL import Image, ImageDraw
from pathlib import Path

class HomeyImageGenerator:
    def __init__(self, project_path):
        self.project_path = Path(project_path)
        self.assets_path = self.project_path / "assets" / "images"
        self.drivers_path = self.project_path / "drivers"
        
        # SDK3 Homey image specifications
        self.small_size = (75, 75)
        self.large_size = (500, 500)
        
        # Johan Bendz color palette and design standards
        self.color_palette = {
            'sensor': '#4CAF50',      # Green for sensors
            'light': '#FFC107',       # Amber for lights
            'switch': '#2196F3',      # Blue for switches
            'plug': '#FF5722',        # Red-orange for plugs
            'climate': '#9C27B0',     # Purple for climate
            'cover': '#795548',       # Brown for covers/motors
            'detector': '#F44336',    # Red for detectors
            'multisensor': '#00BCD4', # Cyan for multisensors
            'remote': '#607D8B',      # Blue-grey for remotes
            'thermostat': '#E91E63'   # Pink for thermostats
        }
        
        self.device_categories = {
            'air_quality_sensor': 'sensor',
            'co_detector': 'detector',
            'contact_sensor': 'sensor', 
            'curtain_motor': 'cover',
            'dimmer_switch': 'switch',
            'energy_plug': 'plug',
            'light_switch': 'switch',
            'motion_sensor': 'sensor',
            'multisensor': 'multisensor',
            'presence_sensor': 'sensor',
            'rgb_light': 'light',
            'scene_remote_2gang': 'remote',
            'scene_remote_4gang': 'remote', 
            'scene_switch': 'switch',
            'smart_light': 'light',
            'smart_plug': 'plug',
            'smoke_detector': 'detector',
            'temperature_humidity_sensor': 'sensor',
            'thermostat': 'thermostat',
            'water_leak_detector': 'detector'
        }
        
    def create_device_icon(self, device_type, size, style='modern'):
        """Create a professional device icon following SDK3 standards"""
        category = self.device_categories.get(device_type, 'sensor')
        color = self.color_palette[category]
        
        # Create image with transparency
        image = Image.new('RGBA', size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)
        
        # Calculate dimensions
        center_x, center_y = size[0] // 2, size[1] // 2
        radius = min(size) // 3
        
        # Create background circle with gradient effect
        self._draw_gradient_circle(draw, center_x, center_y, radius, color, size)
        
        # Add device-specific icon
        self._draw_device_icon(draw, device_type, center_x, center_y, radius, size)
        
        return image
    
    def _draw_gradient_circle(self, draw, center_x, center_y, radius, base_color, size):
        """Draw a gradient circle background"""
        # Convert hex color to RGB
        if base_color.startswith('#'):
            base_color = base_color[1:]
        r = int(base_color[:2], 16)
        g = int(base_color[2:4], 16) 
        b = int(base_color[4:6], 16)
        
        # Create gradient effect
        for i in range(radius):
            alpha = int(255 * (1 - i / radius) * 0.8)  # Fade from center
            circle_color = (r, g, b, alpha)
            draw.ellipse([
                center_x - radius + i, center_y - radius + i,
                center_x + radius - i, center_y + radius - i
            ], fill=circle_color)
    
    def _draw_device_icon(self, draw, device_type, center_x, center_y, radius, size):
        """Draw device-specific icon symbols"""
        icon_size = radius // 2
        white = (255, 255, 255, 255)
        
        if 'sensor' in device_type:
            # Draw sensor symbol (circle with waves)
            draw.ellipse([
                center_x - icon_size//3, center_y - icon_size//3,
                center_x + icon_size//3, center_y + icon_size//3
            ], fill=white)
            
            # Add wave lines
            for i in range(3):
                offset = (i + 1) * icon_size // 4
                draw.ellipse([
                    center_x - offset, center_y - offset,
                    center_x + offset, center_y + offset
                ], outline=white, width=2)
        
        elif 'light' in device_type:
            # Draw light bulb symbol
            bulb_radius = icon_size // 2
            draw.ellipse([
                center_x - bulb_radius, center_y - bulb_radius - icon_size//4,
                center_x + bulb_radius, center_y + bulb_radius - icon_size//4
            ], fill=white)
            
            # Add light rays
            for angle in [0, 45, 90, 135, 180, 225, 270, 315]:
                import math
                ray_x = center_x + int((bulb_radius + icon_size//3) * math.cos(math.radians(angle)))
                ray_y = center_y + int((bulb_radius + icon_size//3) * math.sin(math.radians(angle))) - icon_size//4
                draw.line([center_x, center_y - icon_size//4, ray_x, ray_y], fill=white, width=2)
        
        elif 'switch' in device_type:
            # Draw switch symbol
            switch_width = icon_size
            switch_height = icon_size // 3
            draw.rectangle([
                center_x - switch_width//2, center_y - switch_height//2,
                center_x + switch_width//2, center_y + switch_height//2
            ], fill=white)
            
            # Add switch toggle
            toggle_size = switch_height // 2
            draw.ellipse([
                center_x - toggle_size, center_y - toggle_size,
                center_x + toggle_size, center_y + toggle_size
            ], fill=(100, 100, 100, 255))
        
        elif 'plug' in device_type:
            # Draw power plug symbol
            plug_width = icon_size
            plug_height = icon_size // 2
            draw.rectangle([
                center_x - plug_width//2, center_y - plug_height//4,
                center_x + plug_width//2, center_y + plug_height//4
            ], fill=white)
            
            # Add prongs
            prong_width = plug_width // 6
            prong_height = plug_height // 2
            draw.rectangle([
                center_x - plug_width//3, center_y - plug_height//2,
                center_x - plug_width//3 + prong_width, center_y - plug_height//4
            ], fill=white)
            draw.rectangle([
                center_x + plug_width//3 - prong_width, center_y - plug_height//2,
                center_x + plug_width//3, center_y - plug_height//4
            ], fill=white)
        
        elif 'detector' in device_type:
            # Draw detector symbol (warning triangle or circle)
            if 'smoke' in device_type or 'co' in device_type:
                # Draw warning triangle
                import math
                triangle_size = icon_size
                points = [
                    (center_x, center_y - triangle_size//2),
                    (center_x - triangle_size//2, center_y + triangle_size//2),
                    (center_x + triangle_size//2, center_y + triangle_size//2)
                ]
                draw.polygon(points, fill=white)
                
                # Add exclamation mark
                draw.line([center_x, center_y - triangle_size//4, center_x, center_y + triangle_size//8], 
                         fill=(255, 0, 0, 255), width=3)
                draw.ellipse([
                    center_x - 2, center_y + triangle_size//4 - 2,
                    center_x + 2, center_y + triangle_size//4 + 2
                ], fill=(255, 0, 0, 255))
        
        elif 'remote' in device_type:
            # Draw remote control symbol
            remote_width = icon_size // 2
            remote_height = icon_size
            draw.rectangle([
                center_x - remote_width//2, center_y - remote_height//2,
                center_x + remote_width//2, center_y + remote_height//2
            ], fill=white)
            
            # Add buttons
            button_size = remote_width // 4
            for i in range(3):
                button_y = center_y - remote_height//3 + i * remote_height//4
                draw.ellipse([
                    center_x - button_size, button_y - button_size,
                    center_x + button_size, button_y + button_size
                ], fill=(100, 100, 100, 255))
    
    def generate_all_driver_images(self):
        """Generate images for all drivers in the project"""
        results = {
            'generated': [],
            'errors': [],
            'total_drivers': 0
        }
        
        # Scan all driver directories
        for driver_dir in self.drivers_path.iterdir():
            if driver_dir.is_dir() and not driver_dir.name.startswith('.'):
                results['total_drivers'] += 1
                
                try:
                    # Create assets directory if it doesn't exist
                    assets_dir = driver_dir / "assets" / "images"
                    assets_dir.mkdir(parents=True, exist_ok=True)
                    
                    # Generate small image (75x75)
                    small_image = self.create_device_icon(driver_dir.name, self.small_size)
                    small_path = assets_dir / "small.png"
                    small_image.save(small_path, "PNG")
                    
                    # Generate large image (500x500) 
                    large_image = self.create_device_icon(driver_dir.name, self.large_size)
                    large_path = assets_dir / "large.png"
                    large_image.save(large_path, "PNG")
                    
                    results['generated'].append({
                        'driver': driver_dir.name,
                        'small_image': str(small_path),
                        'large_image': str(large_path)
                    })
                    
                    print(f"[OK] Generated images for {driver_dir.name}")
                    
                except Exception as e:
                    error_msg = f"Failed to generate images for {driver_dir.name}: {str(e)}"
                    results['errors'].append(error_msg)
                    print(f"[ERROR] {error_msg}")
        
        # Save generation report
        report_path = self.project_path / "image_generation_report.json"
        with open(report_path, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\nImage Generation Complete!")
        print(f"Generated images for {len(results['generated'])} drivers")
        print(f"Errors: {len(results['errors'])}")
        print(f"Report saved to: {report_path}")
        
        return results

def main():
    project_path = r"c:\Users\HP\Desktop\tuya_repair"
    generator = HomeyImageGenerator(project_path)
    results = generator.generate_all_driver_images()
    
    if results['errors']:
        print("\nErrors encountered:")
        for error in results['errors']:
            print(f"  - {error}")

if __name__ == "__main__":
    main()
