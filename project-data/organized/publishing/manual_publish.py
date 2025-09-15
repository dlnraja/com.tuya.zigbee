#!/usr/bin/env python3
import subprocess
import sys
import time
import os

def manual_publish_with_auth():
    """Manually publish to Homey using the authentication code"""
    auth_code = "8701e2d4175d4cabc1475816db753a7a0f65afb7"
    
    try:
        print("🚀 Starting manual Homey app publication...")
        
        # Set environment variable for Homey token
        os.environ['HOMEY_TOKEN'] = auth_code
        
        # Start homey app publish process
        process = subprocess.Popen(
            ["homey", "app", "publish"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1,
            env=os.environ
        )
        
        output_lines = []
        
        # Prepare responses for interactive prompts
        responses = [
            "y",  # uncommitted changes
            "y",  # version update
            "",   # version type (enter for patch)
            "v1.0.31 - Critical Fixes Release - Fixed HOBEIAN multisensor cluster ID error causing device initialization failure. Added proper SOS button driver with emergency capabilities. Enhanced flow triggers and professional device recognition. Community forum issues resolved."
        ]
        
        response_index = 0
        
        while True:
            line = process.stdout.readline()
            if not line:
                break
                
            output_lines.append(line.strip())
            print(f"📤 {line.strip()}")
            
            # Detect prompts and respond automatically
            line_lower = line.lower()
            
            if response_index < len(responses):
                if ("uncommitted changes" in line_lower or 
                    "continue" in line_lower or
                    "version" in line_lower and "?" in line or
                    "changelog" in line_lower and "?" in line):
                    
                    response = responses[response_index]
                    print(f"✅ Auto-responding: {response}")
                    process.stdin.write(response + "\n")
                    process.stdin.flush()
                    response_index += 1
                    time.sleep(1)
            
            # Check for success/failure indicators
            if ("successfully published" in line_lower or 
                "successfully uploaded" in line_lower or
                "build uploaded" in line_lower):
                print("🎉 Publication successful!")
                process.wait()
                return True
                
            if "error" in line_lower and ("failed" in line_lower or "invalid" in line_lower):
                print("❌ Publication failed!")
                process.wait()
                return False
        
        return_code = process.wait()
        
        # Check output for success indicators
        full_output = "\n".join(output_lines)
        if (return_code == 0 or 
            "successfully" in full_output.lower() or
            "uploaded" in full_output.lower()):
            print("🎉 Publication completed successfully!")
            return True
        else:
            print(f"❌ Publication failed (return code: {return_code})")
            return False
            
    except Exception as e:
        print(f"💥 Publication error: {e}")
        return False

if __name__ == "__main__":
    success = manual_publish_with_auth()
    print(f"📊 Final status: {'SUCCESS' if success else 'FAILED'}")
    sys.exit(0 if success else 1)
