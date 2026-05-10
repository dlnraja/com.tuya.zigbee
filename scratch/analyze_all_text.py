import os
import sys
import re

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
    print(f"📄 ANALYSIS FOR: {safe_filename}")
    print(f"============================================================")
    
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Find all structured file pathways
    matches = re.findall(r'(?:lib|scripts|\.github|data|drivers)/[a-zA-Z0-9_\-\./]+', content)
    unique_matches = sorted(list(set(matches)))
    print("Detected file references:")
    for m in unique_matches:
        if m.endswith(('.js', '.json', '.yml', '.yaml', '.sh', '.md', '.png', '.jpg')):
            print(f"  - {m}")
    
    # Find all page markers and headings
    print("\nPage markers and key headings:")
    for line in content.split("\n"):
        trimmed = line.strip()
        if trimmed.startswith("--- Page") or any(trimmed.startswith(h) for h in ["PHASE", "STEP", "SECTION", "🎯", "🛡️", "📋", "📊", "🚀"]):
            print(f"  {trimmed}")
    print("\n")
