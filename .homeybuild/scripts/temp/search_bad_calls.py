import os

def search_in_files():
    print("Searching for 'getDeviceConditionCard' in all JS files...")
    count = 0
    for root, dirs, files in os.walk('.'):
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        if '.git' in dirs:
            dirs.remove('.git')
        if '.gemini' in dirs:
            dirs.remove('.gemini')
            
        for file in files:
            if file.endswith('.js'):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        if 'getDeviceConditionCard' in content:
                            print(f"FOUND IN: {path}")
                            count += 1
                except Exception as e:
                    pass
    print(f"Search complete. Found in {count} files.")

if __name__ == "__main__":
    search_in_files()
