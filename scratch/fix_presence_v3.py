import sys
import os

file_path = r'c:\Users\HP\Desktop\homey app\tuya_repair\drivers\device_air_purifier_presence_hybrid\device.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the specific madness
content = content.replace('Math.round((safeDivide(rawTemp,safeMultiply(divisor), safeParse)(10), 10);', 'Math.round(safeDivide(rawTemp, divisor));')
content = content.replace('Math.round((safeDivide(rawHum,safeMultiply(divisor), safeParse)(10), 10);', 'Math.round(safeDivide(rawHum, divisor));')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("FIXED")
