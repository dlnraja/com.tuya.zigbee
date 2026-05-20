import os
import re

def fix_line(line):
    # Pattern: Math.round(someOperation(a, b)   (missing one or more parens)
    if any(x in line for x in ['Math.round(', 'safeMultiply(', 'safeParse(', 'safeDivide(']):
        code = line.split('//')[0]
        # Skip if it contains ? (to avoid ?. optional chaining issue)
        if '?' in code: return line
        
        open_p = code.count('(')
        close_p = code.count(')')
        if open_p > close_p:
            diff = open_p - close_p
            if ';' in code:
                parts = line.split(';', 1)
                return parts[0] + (')' * diff) + ';' + (parts[1] if len(parts) > 1 else '')
            else:
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
    
    # Also fix the OnOffBoundCluster string corruption globally
    text = "".join(new_lines)
    if '// H1: OnOffBoundCluster' in text:
        text = re.sub(r"// H1: OnOffBoundCluster[^\n]*\n\s*genOnOff", "genOnOff", text)
        changed = True
    
    if changed:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(text)
        print(f"REPAIRED: {file_path}")

for dirpath, dirnames, filenames in os.walk('.'):
    if any(x in dirpath for x in ['node_modules', '.git', '.homeybuild', '.gemini']): continue
    for f in filenames:
        if f.endswith('.js'): fix_file(os.path.join(dirpath, f))

print("SAFE DEFINITIVE REPAIR COMPLETE")
