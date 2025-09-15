#!/usr/bin/env python3
import subprocess
import sys
import time

def homey_login_with_code():
    """Login to Homey using the authentication code"""
    auth_code = "8701e2d4175d4cabc1475816db753a7a0f65afb7"
    
    try:
        print("🔐 Starting Homey authentication...")
        
        # Start homey login process
        process = subprocess.Popen(
            ["homey", "login"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1
        )
        
        output_lines = []
        
        # Send the authentication code immediately
        process.stdin.write(auth_code + "\n")
        process.stdin.flush()
        time.sleep(2)
        
        # Read output
        while True:
            line = process.stdout.readline()
            if not line:
                break
                
            output_lines.append(line.strip())
            print(f"📤 {line.strip()}")
            
            # Check for success indicators
            if "logged in" in line.lower() or "welcome" in line.lower():
                print("✅ Successfully logged in to Homey!")
                process.wait()
                return True
                
            if "invalid" in line.lower() or "error" in line.lower():
                print("❌ Login failed!")
                process.wait()
                return False
        
        return_code = process.wait()
        
        # Check final status
        full_output = "\n".join(output_lines)
        if return_code == 0 or "logged in" in full_output.lower():
            print("✅ Homey login completed successfully!")
            return True
        else:
            print(f"❌ Homey login failed (return code: {return_code})")
            return False
            
    except Exception as e:
        print(f"💥 Login error: {e}")
        return False

if __name__ == "__main__":
    success = homey_login_with_code()
    sys.exit(0 if success else 1)
