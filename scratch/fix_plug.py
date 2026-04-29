import sys
import os
import re

file_path = r'c:\Users\HP\Desktop\homey app\tuya_repair\drivers\plug_energy_monitor_hybrid\device.js'

with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Fix the specific broken ternary
text = text.replace('Math.round(safeParse(value) : value)', 'Math.round(safeParse(value, 10))')
# Or maybe it was meant as a ternary:
# value > 100 ? Math.round(safeParse(value)) : value
text = re.sub(r'Math\.round\(safeParse\(value\)\s*:\s*value\)', 'Math.round(safeParse(value, 10))', text)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("FIXED")
