#!/usr/bin/env python3

"""
SMART IMAGE GENERATOR v2.0
Génération d'images contextuelles intelligentes pour drivers Zigbee
Exemple: wall_switch_3gang = image avec 3 boutons visibles
"""

from PIL import Image, ImageDraw, ImageFont
import os
import json

# Palette couleurs Johan Bendz par catégorie
COLORS = {
    'switches': ['#4CAF50', '#8BC34A'],  # Green
    'sensors': ['#2196F3', '#03A9F4'],   # Blue  
    'lights': ['#FFD700', '#FFA500'],    # Yellow/Orange
    'security': ['#F44336', '#E91E63'],  # Red/Pink
    'climate': ['#FF9800', '#FF5722'],   # Orange/Red
    'energy': ['#9C27B0', '#673AB7'],    # Purple
    'automation': ['#607D8B', '#455A64'] # Gray/Blue
}

def generate_switch_image(gangs=1, power_type='ac', size=(75, 75)):
    """Génère image switch avec nombre correct de boutons"""
    
    img = Image.new('RGBA', size, (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    # Couleurs switches
    bg_color = COLORS['switches'][0]
    accent_color = COLORS['switches'][1]
    
    # Background
    draw.rectangle([5, 5, size[0]-5, size[1]-5], fill=bg_color, outline=accent_color, width=2)
    
    # Dessiner les gangs (boutons)
    button_width = (size[0] - 20) // gangs
    button_height = (size[1] - 20) // 2
    
    for i in range(gangs):
        x = 10 + i * button_width
        y = 15
        # Bouton principal
        draw.rectangle([x, y, x + button_width - 5, y + button_height], 
                      fill='white', outline=accent_color, width=1)
        
        # Indicateur alimentation
        if power_type == 'battery':
            # Icône batterie
            draw.rectangle([x + 5, y + 5, x + 15, y + 15], 
                          fill='black', outline='black')
    
    return img

def generate_sensor_image(sensor_type='motion', size=(75, 75)):
    """Génère image sensor selon fonction"""
    
    img = Image.new('RGBA', size, (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    # Couleurs sensors
    bg_color = COLORS['sensors'][0] 
    accent_color = COLORS['sensors'][1]
    
    # Background rond pour sensors
    center = (size[0]//2, size[1]//2)
    radius = min(size) // 2 - 5
    
    draw.ellipse([center[0]-radius, center[1]-radius, 
                  center[0]+radius, center[1]+radius], 
                 fill=bg_color, outline=accent_color, width=2)
    
    # Élément spécifique selon type
    if sensor_type == 'motion':
        # Dôme PIR
        draw.ellipse([center[0]-10, center[1]-10, center[0]+10, center[1]+10], 
                     fill='white', outline='gray')
    elif sensor_type == 'soil':
        # Sonde sol
        draw.line([center[0], center[1]-15, center[0], center[1]+15], 
                  fill='brown', width=3)
        
    return img

def main():
    """Génération images pour drivers critiques"""
    
    print("🎨 SMART IMAGE GENERATOR v2.0")
    
    # Générer images switches contextuelles  
    drivers_path = "drivers"
    
    # wall_switch_3gang_ac = 3 boutons
    img_3gang = generate_switch_image(gangs=3, power_type='ac', size=(75, 75))
    img_3gang.save(f"{drivers_path}/wall_switch_3gang_ac/assets/images/small.png")
    
    # Large version
    img_3gang_large = generate_switch_image(gangs=3, power_type='ac', size=(500, 500))
    img_3gang_large.save(f"{drivers_path}/wall_switch_3gang_ac/assets/images/large.png")
    
    print("✅ Images switches 3-gang générées avec cohérence contextuelle")

if __name__ == "__main__":
    main()
