import sys
import os
import re

file_path = r'c:\Users\HP\Desktop\homey app\tuya_repair\drivers\device_air_purifier_presence_hybrid\device.js'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

changed = False
for i in range(len(lines)):
    line = lines[i]
    # Handle Math.round(safeDivide(a, b);
    if 'Math.round(safeDivide(' in line and line.strip().endswith(');'):
        if line.count('(') > line.count(')'):
             new_line = line.replace(');', '));')
             lines[i] = new_line
             changed = True
             print(f"Fixed line {i+1}: {new_line.strip()}")
    # Handle common presence device issues
    if 'lux = Math.max(0, Math.round(lux);' in line:
        new_line = line.replace('lux = Math.max(0, Math.round(lux);', 'lux = Math.max(0, Math.round(lux));')
        lines[i] = new_line
        changed = True

if changed:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("FINISHED")
else:
    print("NO CHANGES")
