import os
import sys

# Configure UTF-8 stdout
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

text_dir = "tmp/extracted_text"
for filename in os.listdir(text_dir):
    if not filename.endswith(".txt"):
        continue
    path = os.path.join(text_dir, filename)
    safe_filename = filename.encode('ascii', 'ignore').decode('ascii')
    print(f"============================================================")
    print(f"SCANNING FILE: {safe_filename}")
    print(f"============================================================")
    
    with open(path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    
    print("--- First 25 lines of the file ---")
    for line in lines[:25]:
        print(line.strip())
        
    print("\n--- Detected file paths / targets ---")
    for i, line in enumerate(lines):
        stripped = line.strip()
        # Look for file-like paths (contain slash and extension, short length)
        if ("/" in stripped or "\\" in stripped) and any(ext in stripped for ext in [".js", ".json", ".yml", ".yaml", ".sh", ".md", ".txt"]):
            if len(stripped) < 120 and not stripped.startswith("http") and not "Source:" in stripped:
                print(f"Line {i+1}: {stripped}")
    print("\n")
