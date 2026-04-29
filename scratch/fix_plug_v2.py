import os

file_path = r'c:\Users\HP\Desktop\homey app\tuya_repair\drivers\plug_energy_monitor_hybrid\device.js'

with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Fix the broken ternary
text = text.replace('value > 100 ? Math.round(safeParse(value, 10));', 'value > 100 ? Math.round(safeParse(value, 10)) : 0;')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("FIXED")
