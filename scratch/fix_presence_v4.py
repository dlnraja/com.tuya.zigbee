import sys
import os
import re

file_path = r'c:\Users\HP\Desktop\homey app\tuya_repair\drivers\device_air_purifier_presence_hybrid\device.js'

with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Pattern: Math.round((safeDivide(rawTemp,safeMultiply(divisor), ...));
# Or variations with humidity
pattern = r'Math\.round\(\(safeDivide\(([^,]+),safeMultiply\(([^)]+)\)[^)]*\)[^;]*\);'
# Replace with: Math.round(safeDivide($1, $2));
new_text = re.sub(pattern, r'Math.round(safeDivide(\1, \2));', text)

if new_text != text:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_text)
    print("FINISHED")
else:
    print("NO CHANGES")
