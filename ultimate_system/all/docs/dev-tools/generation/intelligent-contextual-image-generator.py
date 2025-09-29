import os
import json
from PIL import Image, ImageDraw, ImageFont
import colorsys

class IntelligentContextualImageGenerator:
    def __init__(self):
        self.project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
        self.drivers_path = os.path.join(self.project_root, 'drivers')
        
        # SDK3 image dimensions
        self.dimensions = {
            'small': (75, 75),
            'large': (500, 500)
        }
        
        # Intelligent color mapping by device category and power type
        self.color_schemes = {
            # Battery switches - Green tones (eco-friendly)
            'battery_switches': {
                'primary': '#4CAF50',    # Green
                'secondary': '#81C784',  # Light Green  
                'accent': '#2E7D32',     # Dark Green
                'text': '#FFFFFF'
            },
            
            # AC wall switches - Blue tones (electrical)
            'ac_wall_switches': {
                'primary': '#2196F3',    # Blue
                'secondary': '#64B5F6',  # Light Blue
                'accent': '#1565C0',     # Dark Blue
                'text': '#FFFFFF'
            },
            
            # DC switches - Purple tones (low voltage)
            'dc_switches': {
                'primary': '#9C27B0',    # Purple
                'secondary': '#BA68C8',  # Light Purple
                'accent': '#6A1B9A',     # Dark Purple
                'text': '#FFFFFF'
            },
            
            # Hybrid switches - Orange tones (versatile)
            'hybrid_switches': {
                'primary': '#FF9800',    # Orange
                'secondary': '#FFB74D',  # Light Orange
                'accent': '#E65100',     # Dark Orange
                'text': '#FFFFFF'
            },
            
            # Scene controllers - Teal tones (control)
            'scene_controllers': {
                'primary': '#009688',    # Teal
                'secondary': '#4DB6AC',  # Light Teal
                'accent': '#00695C',     # Dark Teal
                'text': '#FFFFFF'
            },
            
            # Touch switches - Indigo tones (modern)
            'touch_switches': {
                'primary': '#3F51B5',    # Indigo
                'secondary': '#7986CB',  # Light Indigo
                'accent': '#283593',     # Dark Indigo
                'text': '#FFFFFF'
            },
            
            # Motion sensors - Red tones (detection)
            'motion_sensors': {
                'primary': '#F44336',    # Red
                'secondary': '#EF5350',  # Light Red
                'accent': '#C62828',     # Dark Red
                'text': '#FFFFFF'
            },
            
            # Environmental sensors - Yellow/Green (nature)
            'environmental_sensors': {
                'primary': '#8BC34A',    # Light Green
                'secondary': '#AED581',  # Very Light Green
                'accent': '#689F38',     # Medium Green
                'text': '#FFFFFF'
            },
            
            # Smart lights - Warm yellow (illumination)
            'smart_lights': {
                'primary': '#FFC107',    # Amber
                'secondary': '#FFD54F',  # Light Amber
                'accent': '#FF8F00',     # Dark Amber
                'text': '#000000'
            }
        }
    
    def analyze_driver_context(self, driver_name):
        """Analyze driver name to understand context and generate appropriate imagery"""
        
        context = {
            'category': self.determine_category(driver_name),
            'button_count': self.extract_button_count(driver_name),
            'power_type': self.extract_power_type(driver_name),
            'device_type': self.extract_device_type(driver_name),
            'gang_count': self.extract_gang_count(driver_name),
            'interface_type': self.extract_interface_type(driver_name)
        }
        
        return context
    
    def determine_category(self, driver_name):
        """Determine the main category of the driver"""
        
        if 'battery' in driver_name:
            return 'battery_switches'
        elif 'wall_switch' in driver_name and 'ac' in driver_name:
            return 'ac_wall_switches'
        elif 'wall_switch' in driver_name and 'dc' in driver_name:
            return 'dc_switches'
        elif 'hybrid' in driver_name:
            return 'hybrid_switches'
        elif 'scene_controller' in driver_name:
            return 'scene_controllers'
        elif 'touch_switch' in driver_name:
            return 'touch_switches'
        elif 'motion_sensor' in driver_name:
            return 'motion_sensors'
        elif any(x in driver_name for x in ['temperature', 'humidity', 'air_quality', 'soil']):
            return 'environmental_sensors'
        elif any(x in driver_name for x in ['bulb', 'light', 'led']):
            return 'smart_lights'
        
        return 'battery_switches'  # Default
    
    def extract_button_count(self, driver_name):
        """Extract number of buttons from driver name"""
        
        import re
        
        # Look for patterns like "1gang", "2gang", "3button", etc.
        gang_match = re.search(r'(\d+)gang', driver_name)
        if gang_match:
            return int(gang_match.group(1))
        
        button_match = re.search(r'(\d+)button', driver_name)
        if button_match:
            return int(button_match.group(1))
        
        # Single switch/button by default
        return 1
    
    def extract_power_type(self, driver_name):
        """Extract power type from driver name"""
        
        if 'battery' in driver_name:
            return 'battery'
        elif 'ac' in driver_name:
            return 'ac'
        elif 'dc' in driver_name:
            return 'dc'
        elif 'hybrid' in driver_name:
            return 'hybrid'
        
        return 'unknown'
    
    def extract_device_type(self, driver_name):
        """Extract specific device type"""
        
        if 'motion_sensor' in driver_name:
            if 'pir' in driver_name:
                return 'pir'
            elif 'radar' in driver_name:
                return 'radar'
            elif 'mmwave' in driver_name:
                return 'mmwave'
        
        if 'switch' in driver_name:
            return 'switch'
        elif 'sensor' in driver_name:
            return 'sensor'
        elif 'controller' in driver_name:
            return 'controller'
        
        return 'device'
    
    def extract_gang_count(self, driver_name):
        """Extract gang count (same as button count for switches)"""
        return self.extract_button_count(driver_name)
    
    def extract_interface_type(self, driver_name):
        """Extract interface type"""
        
        if 'touch' in driver_name:
            return 'touch'
        elif 'wireless' in driver_name:
            return 'wireless'
        
        return 'physical'
    
    def generate_switch_image(self, context, size):
        """Generate intelligent switch image based on context"""
        
        width, height = size
        img = Image.new('RGBA', size, (255, 255, 255, 0))
        draw = ImageDraw.Draw(img)
        
        # Get color scheme
        colors = self.color_schemes.get(context['category'], self.color_schemes['battery_switches'])
        
        # Draw switch base (rounded rectangle)
        margin = width // 10
        switch_rect = [margin, margin, width - margin, height - margin]
        
        # Background with gradient effect
        draw.rounded_rectangle(switch_rect, radius=width//15, fill=colors['primary'])
        
        # Draw individual buttons based on gang count
        button_count = context['button_count']
        
        if button_count == 1:
            self.draw_single_button(draw, switch_rect, colors, context)
        elif button_count <= 6:
            self.draw_multiple_buttons(draw, switch_rect, colors, button_count, context)
        else:
            # For more than 6 buttons, show a grid pattern
            self.draw_grid_buttons(draw, switch_rect, colors, button_count, context)
        
        # Add power indicator
        self.draw_power_indicator(draw, switch_rect, colors, context['power_type'])
        
        # Add interface indicator for touch switches
        if context['interface_type'] == 'touch':
            self.draw_touch_indicator(draw, switch_rect, colors)
        
        return img
    
    def draw_single_button(self, draw, rect, colors, context):
        """Draw a single button"""
        
        x1, y1, x2, y2 = rect
        center_x = (x1 + x2) // 2
        center_y = (y1 + y2) // 2
        
        # Button size based on switch size
        button_size = min(x2 - x1, y2 - y1) // 3
        
        # Button rectangle
        button_rect = [
            center_x - button_size//2,
            center_y - button_size//2,
            center_x + button_size//2,
            center_y + button_size//2
        ]
        
        # Draw button with slight 3D effect
        draw.rounded_rectangle(button_rect, radius=button_size//8, fill=colors['secondary'])
        
        # Button highlight
        highlight_rect = [
            button_rect[0] + 2,
            button_rect[1] + 2,
            button_rect[2] - 2,
            button_rect[3] - 2
        ]
        draw.rounded_rectangle(highlight_rect, radius=button_size//10, fill=colors['accent'])
    
    def draw_multiple_buttons(self, draw, rect, colors, count, context):
        """Draw multiple buttons intelligently arranged"""
        
        x1, y1, x2, y2 = rect
        
        # Calculate button arrangement
        if count <= 2:
            rows, cols = 1, count
        elif count <= 4:
            rows, cols = 2, 2
        elif count <= 6:
            rows, cols = 2, 3
        else:
            rows, cols = 3, 3
        
        # Button dimensions
        available_width = (x2 - x1) - 20
        available_height = (y2 - y1) - 20
        
        button_width = available_width // cols - 5
        button_height = available_height // rows - 5
        
        start_x = x1 + 10 + (available_width - (cols * button_width + (cols-1) * 5)) // 2
        start_y = y1 + 10 + (available_height - (rows * button_height + (rows-1) * 5)) // 2
        
        # Draw each button
        for i in range(count):
            row = i // cols
            col = i % cols
            
            button_x1 = start_x + col * (button_width + 5)
            button_y1 = start_y + row * (button_height + 5)
            button_x2 = button_x1 + button_width
            button_y2 = button_y1 + button_height
            
            # Button background
            draw.rounded_rectangle([button_x1, button_y1, button_x2, button_y2], 
                                 radius=button_width//10, fill=colors['secondary'])
            
            # Button highlight
            draw.rounded_rectangle([button_x1 + 2, button_y1 + 2, button_x2 - 2, button_y2 - 2], 
                                 radius=button_width//12, fill=colors['accent'])
    
    def draw_grid_buttons(self, draw, rect, colors, count, context):
        """Draw grid pattern for many buttons"""
        
        x1, y1, x2, y2 = rect
        
        # Create a grid pattern
        grid_size = int(count ** 0.5) + 1
        
        button_size = min((x2 - x1), (y2 - y1)) // (grid_size + 1)
        
        start_x = x1 + (x2 - x1 - grid_size * button_size) // 2
        start_y = y1 + (y2 - y1 - grid_size * button_size) // 2
        
        buttons_drawn = 0
        for row in range(grid_size):
            for col in range(grid_size):
                if buttons_drawn >= count:
                    break
                
                button_x = start_x + col * button_size
                button_y = start_y + row * button_size
                
                draw.rounded_rectangle([button_x, button_y, button_x + button_size - 2, button_y + button_size - 2],
                                     radius=button_size//8, fill=colors['secondary'])
                
                buttons_drawn += 1
    
    def draw_power_indicator(self, draw, rect, colors, power_type):
        """Draw power type indicator"""
        
        x1, y1, x2, y2 = rect
        
        # Small indicator in corner
        indicator_size = 8
        indicator_x = x2 - indicator_size - 5
        indicator_y = y1 + 5
        
        indicator_colors = {
            'battery': '#4CAF50',  # Green
            'ac': '#2196F3',       # Blue  
            'dc': '#9C27B0',       # Purple
            'hybrid': '#FF9800'    # Orange
        }
        
        color = indicator_colors.get(power_type, '#666666')
        
        # Draw small circle indicator
        draw.ellipse([indicator_x, indicator_y, indicator_x + indicator_size, indicator_y + indicator_size], 
                    fill=color)
    
    def draw_touch_indicator(self, draw, rect, colors):
        """Draw touch interface indicator"""
        
        x1, y1, x2, y2 = rect
        
        # Touch pattern (small dots around edge)
        center_x = (x1 + x2) // 2
        center_y = (y1 + y2) // 2
        
        # Draw subtle touch pattern
        for angle in range(0, 360, 45):
            import math
            x = center_x + int(math.cos(math.radians(angle)) * (x2 - x1) // 3)
            y = center_y + int(math.sin(math.radians(angle)) * (y2 - y1) // 3)
            
            draw.ellipse([x-2, y-2, x+2, y+2], fill=colors['accent'])
    
    def generate_sensor_image(self, context, size):
        """Generate sensor image based on context"""
        
        width, height = size
        img = Image.new('RGBA', size, (255, 255, 255, 0))
        draw = ImageDraw.Draw(img)
        
        # Get colors
        colors = self.color_schemes.get(context['category'], self.color_schemes['motion_sensors'])
        
        # Sensor housing
        margin = width // 8
        housing_rect = [margin, margin, width - margin, height - margin]
        
        # Main housing
        draw.rounded_rectangle(housing_rect, radius=width//12, fill=colors['primary'])
        
        # Sensor lens/detector
        center_x = (housing_rect[0] + housing_rect[2]) // 2
        center_y = (housing_rect[1] + housing_rect[3]) // 2
        
        lens_size = width // 4
        lens_rect = [
            center_x - lens_size//2,
            center_y - lens_size//2,
            center_x + lens_size//2,
            center_y + lens_size//2
        ]
        
        # Draw lens based on sensor type
        if context['device_type'] == 'pir':
            # PIR sensor with segmented lens
            draw.ellipse(lens_rect, fill=colors['secondary'])
            # Draw PIR segments
            for i in range(4):
                angle = i * 90
                import math
                x1 = center_x + int(math.cos(math.radians(angle)) * lens_size//4)
                y1 = center_y + int(math.sin(math.radians(angle)) * lens_size//4)
                x2 = center_x + int(math.cos(math.radians(angle + 45)) * lens_size//4)
                y2 = center_y + int(math.sin(math.radians(angle + 45)) * lens_size//4)
                draw.line([x1, y1, x2, y2], fill=colors['accent'], width=2)
                
        elif context['device_type'] == 'radar':
            # Radar sensor with wave pattern
            draw.ellipse(lens_rect, fill=colors['secondary'])
            # Draw radar waves
            for i in range(3):
                wave_radius = lens_size//6 + i * lens_size//12
                wave_rect = [
                    center_x - wave_radius,
                    center_y - wave_radius,
                    center_x + wave_radius,
                    center_y + wave_radius
                ]
                draw.ellipse(wave_rect, outline=colors['accent'], width=1)
                
        elif context['device_type'] == 'mmwave':
            # mmWave sensor with directional pattern
            draw.ellipse(lens_rect, fill=colors['secondary'])
            # Draw directional waves
            for i in range(5):
                start_angle = -30 + i * 15
                import math
                x1 = center_x
                y1 = center_y
                x2 = center_x + int(math.cos(math.radians(start_angle)) * lens_size//2)
                y2 = center_y + int(math.sin(math.radians(start_angle)) * lens_size//2)
                draw.line([x1, y1, x2, y2], fill=colors['accent'], width=1)
        
        # Power indicator
        self.draw_power_indicator(draw, housing_rect, colors, context['power_type'])
        
        return img
    
    def generate_driver_images(self, driver_name):
        """Generate both small and large images for a driver"""
        
        print(f"Generating contextual images for {driver_name}...")
        
        # Analyze context
        context = self.analyze_driver_context(driver_name)
        
        print(f"   Context: {context['category']}, {context['button_count']} buttons, {context['power_type']} power")
        
        # Generate images based on device type
        if 'switch' in driver_name or 'controller' in driver_name:
            small_img = self.generate_switch_image(context, self.dimensions['small'])
            large_img = self.generate_switch_image(context, self.dimensions['large'])
        elif 'sensor' in driver_name:
            small_img = self.generate_sensor_image(context, self.dimensions['small'])
            large_img = self.generate_sensor_image(context, self.dimensions['large'])
        else:
            # Default to switch-style
            small_img = self.generate_switch_image(context, self.dimensions['small'])
            large_img = self.generate_switch_image(context, self.dimensions['large'])
        
        # Save images
        driver_path = os.path.join(self.drivers_path, driver_name, 'assets')
        os.makedirs(driver_path, exist_ok=True)
        
        small_path = os.path.join(driver_path, 'small.png')
        large_path = os.path.join(driver_path, 'large.png')
        
        small_img.save(small_path, 'PNG')
        large_img.save(large_path, 'PNG')
        
        print(f"   Generated: {small_path} ({self.dimensions['small'][0]}x{self.dimensions['small'][1]})")
        print(f"   Generated: {large_path} ({self.dimensions['large'][0]}x{self.dimensions['large'][1]})")
        
        return {'small': small_path, 'large': large_path}
    
    def analyze_all_drivers(self):
        """Analyze all drivers and identify image mismatches"""
        
        print("Analyzing all drivers for image context mismatches...")
        
        mismatches = []
        processed = 0
        
        for driver_name in os.listdir(self.drivers_path):
            driver_path = os.path.join(self.drivers_path, driver_name)
            
            if os.path.isdir(driver_path):
                context = self.analyze_driver_context(driver_name)
                
                # Check if images exist and analyze them
                small_image_path = os.path.join(driver_path, 'assets', 'small.png')
                large_image_path = os.path.join(driver_path, 'assets', 'large.png')
                
                needs_regeneration = False
                
                # Check if images exist
                if not os.path.exists(small_image_path) or not os.path.exists(large_image_path):
                    needs_regeneration = True
                    reason = "Missing images"
                
                # Check for obvious mismatches (e.g., wall_3gang should show 3 buttons)
                elif context['button_count'] > 1 and 'gang' in driver_name:
                    needs_regeneration = True
                    reason = f"Multi-gang switch ({context['button_count']} buttons) needs contextual image"
                
                if needs_regeneration:
                    mismatches.append({
                        'driver': driver_name,
                        'context': context,
                        'reason': reason
                    })
                
                processed += 1
        
        print(f"Analyzed {processed} drivers, found {len(mismatches)} needing regeneration")
        return mismatches
    
    def regenerate_all_images(self):
        """Regenerate all driver images with intelligent context"""
        
        print("Starting intelligent contextual image regeneration...")
        
        mismatches = self.analyze_all_drivers()
        results = []
        
        for mismatch in mismatches:
            driver_name = mismatch['driver']
            
            try:
                paths = self.generate_driver_images(driver_name)
                results.append({
                    'driver': driver_name,
                    'status': 'success',
                    'paths': paths,
                    'context': mismatch['context']
                })
            except Exception as e:
                results.append({
                    'driver': driver_name,
                    'status': 'failed',
                    'error': str(e),
                    'context': mismatch['context']
                })
                print(f"   Failed: {driver_name} - {e}")
        
        return results
    
    def generate_report(self, results):
        """Generate image regeneration report"""
        
        successful = [r for r in results if r['status'] == 'success']
        failed = [r for r in results if r['status'] == 'failed']
        
        report = {
            'timestamp': '2025-09-16T00:50:00Z',
            'total_processed': len(results),
            'successful': len(successful),
            'failed': len(failed),
            'success_rate': len(successful) / len(results) * 100 if results else 0,
            'categories_processed': {},
            'results': results
        }
        
        # Count by category
        for result in successful:
            category = result['context']['category']
            if category not in report['categories_processed']:
                report['categories_processed'][category] = 0
            report['categories_processed'][category] += 1
        
        # Save report
        report_path = os.path.join(self.project_root, 'project-data', 'analysis-results', 
                                  'intelligent-image-generation-report.json')
        
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\nIMAGE GENERATION REPORT:")
        print(f"Total processed: {report['total_processed']}")
        print(f"Successful: {report['successful']}")
        print(f"Failed: {report['failed']}")
        print(f"Success rate: {report['success_rate']:.1f}%")
        print(f"Categories: {', '.join(report['categories_processed'].keys())}")
        
        return report

def main():
    generator = IntelligentContextualImageGenerator()
    
    print("Starting Intelligent Contextual Image Generator...")
    print("Mission: Generate coherent images where wall_3gang = 3 visible buttons")
    
    results = generator.regenerate_all_images()
    report = generator.generate_report(results)
    
    print("\nIntelligent image generation complete!")
    
    return report

if __name__ == "__main__":
    main()
