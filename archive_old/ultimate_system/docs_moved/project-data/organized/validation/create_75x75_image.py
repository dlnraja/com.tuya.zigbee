from PIL import Image

# Create a 75x75 image for hobeian_multisensor
img = Image.new('RGBA', (75, 75), (76, 175, 80, 255))  # Green color
img.save('drivers/hobeian_multisensor/assets/images/small.png')
print("Created 75x75 small.png for hobeian_multisensor")
