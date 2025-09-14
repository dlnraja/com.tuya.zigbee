#!/usr/bin/env python3
"""
Create proper Homey app store images with correct dimensions
Based on Homey requirements: small (250x175), large (500x350), xlarge (1000x700)
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_homey_images():
    """Create professional Homey app store images"""
    
    # Colors matching the app theme
    bg_color = "#1E88E5"  # Blue from brandColor
    text_color = "#FFFFFF"
    
    # Image dimensions as per Homey requirements
    dimensions = {
        'small': (250, 175),
        'large': (500, 350), 
        'xlarge': (1000, 700)
    }
    
    for size_name, (width, height) in dimensions.items():
        # Create image
        img = Image.new('RGB', (width, height), bg_color)
        draw = ImageDraw.Draw(img)
        
        # Calculate text size and position
        text = "Ultimate\nZigbee Hub"
        
        try:
            # Try to use a system font
            font_size = width // 15
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            # Fallback to default font
            font = ImageFont.load_default()
        
        # Calculate text bounding box
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        # Center text
        x = (width - text_width) // 2
        y = (height - text_height) // 2
        
        # Draw text
        draw.text((x, y), text, fill=text_color, font=font, align='center')
        
        # Save image
        filename = f"{size_name}.png"
        filepath = os.path.join("assets", "images", filename)
        img.save(filepath, "PNG")
        print(f"Created {filepath} ({width}x{height})")

if __name__ == "__main__":
    create_homey_images()
