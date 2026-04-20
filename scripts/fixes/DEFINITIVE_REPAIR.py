import os
import re

def fix_line(line):
    # Pattern: Math.round(safeMultiply(a, b)   (possibly missing parens)
    # Check if we have more ( than )
    if 'Math.round(' in line or 'safeMultiply(' in line or 'safeParse(' in line:
        # Strip comments for counting
        code = line.split('//')[0]
        open_p = code.count('(')
        close_p = code.count(')')
        if open_p > close_p:
            diff = open_p - close_p
            # Insert missing parens before the first semicolon or end of code part
            if ';' in code:
                parts = line.split(';', 1)
                return parts[0] + (')' * diff) + ';' + (parts[1] if len(parts) > 1 else '')
            else:
                # No semicolon, maybe at end of line (but before comment)
                comment_parts = line.split('//', 1)
                return comment_parts[0].rstrip() + (')' * diff) + (' //' + comment_parts[1] if len(comment_parts) > 1 else '\n')
    return line

def fix_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    new_lines = []
    changed = False
    for line in lines:
        fixed = fix_line(line)
        if fixed != line:
            changed = True
        new_lines.append(fixed)
    
    if changed:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        print(f"FIXED: {file_path}")

# Manual restoration for the DIY Custom Zigbee one
def fix_diy_custom():
    path = r'drivers\diy_custom_zigbee\device.js'
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        fixed = re.sub(r"clusters\.includes\('// H1: OnOffBoundCluster[^\n]*\n\s*genOnOff'\)", "clusters.includes('genOnOff')", content)
        if fixed != content:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(fixed)
            print("FIXED: diy_custom_zigbee")

for dirpath, dirnames, filenames in os.walk('.'):
    if any(x in dirpath for x in ['node_modules', '.git', '.homeybuild', '.gemini']): continue
    for f in filenames:
        if f.endswith('.js'): fix_file(os.path.join(dirpath, f))

fix_diy_custom()
print("DONE")
