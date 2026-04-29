import sys
import os
import re

file_path = r'c:\Users\HP\Desktop\homey app\tuya_repair\drivers\device_air_purifier_presence_hybrid\device.js'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

changed = False
for i in range(len(lines)):
    line = lines[i]
    if 'Math.round(' in line and line.strip().endswith(');'):
        open_p = line.count('(')
        close_p = line.count(')')
        if open_p > close_p:
             # Add missing parens before the semicolon
             diff = open_p - close_p
             new_line = line.replace(');', (')' * diff) + ');')
             lines[i] = new_line
             changed = True
             print(f"Fixed line {i+1}: {new_line.strip()}")

if changed:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("FINISHED")
else:
    print("NO CHANGES")
