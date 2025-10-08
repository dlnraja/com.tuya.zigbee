import os
import sys
from pathlib import Path
from PIL import Image
import cairosvg

def convert_svg_to_png(svg_path, png_path, width=500, height=500):
    """Convert SVG file to PNG with specified dimensions."""
    try:
        # Convert SVG to PNG using cairosvg
        cairosvg.svg2png(url=svg_path, write_to=png_path, output_width=width, output_height=height)
        print(f"Converted {svg_path} to {png_path}")
        return True
    except Exception as e:
        print(f"Error converting {svg_path}: {str(e)}")
        return False

def process_assets(directory):
    """Process all SVG files in the directory and convert them to PNG."""
    assets_dir = Path(directory)
    
    # Find all SVG files
    svg_files = list(assets_dir.rglob('*.svg'))
    
    if not svg_files:
        print(f"No SVG files found in {directory}")
        return
    
    for svg_file in svg_files:
        # Create corresponding PNG path
        png_file = svg_file.with_suffix('.png')
        
        # Skip if PNG already exists and is newer than SVG
        if png_file.exists() and png_file.stat().st_mtime > svg_file.stat().st_mtime:
            print(f"Skipping {svg_file}, PNG already exists and is up to date")
            continue
            
        # Convert SVG to PNG
        convert_svg_to_png(str(svg_file), str(png_file))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        target_dir = sys.argv[1]
    else:
        target_dir = os.path.join(os.path.dirname(__file__), '..', 'assets')
    
    print(f"Processing assets in: {target_dir}")
    process_assets(target_dir)
