import os
import re

def fix_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    changed = False
    for i in range(len(lines)):
        line = lines[i]
        orig = line
        
        # Pattern 1: Math.round(safeMultiply(value, 10)); -> Math.round(safeMultiply(value, 10)));
        # (Missing one or more parens before semicolon)
        if ('Math.round(' in line or 'safeMultiply(' in line or 'safeParse(' in line) and line.strip().endswith(');'):
             open_p = line.count('(')
             close_p = line.count(')')
             if open_p > close_p:
                 diff = open_p - close_p
                 # Be careful not to add if it's already there but nested
                 # Simple fix: replace ); with needed parens + );
                 line = line.replace(');', (')' * diff) + ');')
        
        # Pattern 2: split if (this.tuyaEF00Manager)
        # if 
        # (this.tuyaEF00Manager) {
        if line.strip() == 'if' and i + 1 < len(lines) and lines[i+1].strip().startswith('(this.tuyaEF00Manager)'):
             line = '      if (this.tuyaEF00Manager) {\n'
             lines[i+1] = '' # Clear next line
             changed = True
        
        if line != orig:
            lines[i] = line
            changed = True
            print(f"Fixed {file_path}:{i+1}")

    if changed:
        with open(file_path, 'w', encoding='utf-8') as f:
            # Filter out empty lines potentially created by split if fix
            f.writelines([l for l in lines if l.strip() != '' or l == '\n'])

def walk_and_fix(root):
    for dirpath, dirnames, filenames in os.walk(root):
        if any(x in dirpath for x in ['node_modules', '.git', '.homeybuild', '.gemini']):
            continue
        for f in filenames:
            if f.endswith('.js'):
                fix_file(os.path.join(dirpath, f))

walk_and_fix('.')
print("GLOBAL REPAIR COMPLETE")
