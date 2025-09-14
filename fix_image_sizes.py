#!/usr/bin/env python3
"""
Fix image sizes to comply with Homey validation requirements
All small.png images must be 75x75 pixels
"""

import os
import json
from PIL import Image, ImageDraw

def create_75x75_image(driver_path, category):
    """Create a 75x75 image for the driver"""
    colors = {
        'sensor': '#4CAF50',
        'light': '#FFC107', 
        'socket': '#FF5722',
        'switch': '#2196F3',
        'thermostat': '#9C27B0',
        'windowcoverings': '#795548',
        'default': '#607D8B'
    }
    
    color = colors.get(category, colors['default'])
    
    # Create 75x75 image
    img = Image.new('RGB', (75, 75), color)
    draw = ImageDraw.Draw(img)
    
    # Draw a simple icon
    draw.ellipse([15, 15, 60, 60], fill='white', outline=color, width=3)
    draw.rectangle([30, 30, 45, 45], fill=color)
    
    return img

def fix_all_image_sizes():
    """Fix all image sizes to 75x75"""
    print("CORRECTION TAILLES IMAGES 75x75")
    print("=" * 40)
    
    drivers_dir = "drivers"
    fixed_count = 0
    
    for driver_name in os.listdir(drivers_dir):
        driver_path = os.path.join(drivers_dir, driver_name)
        if not os.path.isdir(driver_path):
            continue
            
        # Check driver.compose.json for class
        driver_json_path = os.path.join(driver_path, "driver.compose.json")
        if not os.path.exists(driver_json_path):
            continue
            
        try:
            with open(driver_json_path, 'r', encoding='utf-8') as f:
                driver_data = json.load(f)
                driver_class = driver_data.get('class', 'sensor')
        except:
            driver_class = 'sensor'
            
        # Fix small image
        small_img_path = os.path.join(driver_path, "assets", "images", "small.png")
        if os.path.exists(small_img_path):
            try:
                with Image.open(small_img_path) as img:
                    if img.size != (75, 75):
                        print(f"Redimensionnement {driver_name}: {img.size} -> (75, 75)")
                        # Resize maintaining aspect ratio then crop/pad to 75x75
                        img_resized = img.resize((75, 75), Image.LANCZOS)
                        img_resized.save(small_img_path)
                        fixed_count += 1
                    else:
                        print(f"✓ {driver_name}: déjà 75x75")
            except Exception as e:
                print(f"Erreur {driver_name}: {e}")
                # Create new 75x75 image
                new_img = create_75x75_image(driver_path, driver_class)
                os.makedirs(os.path.dirname(small_img_path), exist_ok=True)
                new_img.save(small_img_path)
                fixed_count += 1
        else:
            print(f"Création {driver_name}: image manquante")
            # Create new 75x75 image
            new_img = create_75x75_image(driver_path, driver_class)
            os.makedirs(os.path.dirname(small_img_path), exist_ok=True)
            new_img.save(small_img_path)
            fixed_count += 1
            
        # Fix large image (500x500)
        large_img_path = os.path.join(driver_path, "assets", "images", "large.png")
        if os.path.exists(large_img_path):
            try:
                with Image.open(large_img_path) as img:
                    if img.size != (500, 500):
                        print(f"Redimensionnement large {driver_name}: {img.size} -> (500, 500)")
                        img_resized = img.resize((500, 500), Image.LANCZOS)
                        img_resized.save(large_img_path)
            except:
                # Create new 500x500 image
                large_img = create_75x75_image(driver_path, driver_class)
                large_img = large_img.resize((500, 500), Image.LANCZOS)
                large_img.save(large_img_path)
        else:
            # Create new 500x500 image
            large_img = create_75x75_image(driver_path, driver_class)
            large_img = large_img.resize((500, 500), Image.LANCZOS)
            os.makedirs(os.path.dirname(large_img_path), exist_ok=True)
            large_img.save(large_img_path)
    
    print(f"\nCORRECTION TERMINÉE: {fixed_count} images corrigées")
    print("Toutes les images sont maintenant 75x75 (small) et 500x500 (large)")
    return True

if __name__ == "__main__":
    fix_all_image_sizes()
