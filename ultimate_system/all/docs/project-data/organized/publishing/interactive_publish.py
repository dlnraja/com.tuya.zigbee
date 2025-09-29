#!/usr/bin/env python3
import subprocess
import sys
import time
import threading
import queue

def interactive_homey_publish():
    """Interactive Homey app publication with real-time user input"""
    
    try:
        print("🚀 Starting interactive Homey app publication...")
        print("📝 Prepare responses for prompts:")
        print("   - Uncommitted changes: y")
        print("   - Version update: y") 
        print("   - Version type: patch (or press Enter)")
        print("   - Changelog: Custom message")
        print()
        
        # Start homey app publish process
        process = subprocess.Popen(
            ["homey", "app", "publish"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1
        )
        
        # Function to read output continuously
        def read_output(process, output_queue):
            try:
                while True:
                    line = process.stdout.readline()
                    if not line:
                        break
                    output_queue.put(line)
            except Exception as e:
                output_queue.put(f"Error reading output: {e}\n")
        
        # Start output reading thread
        output_queue = queue.Queue()
        output_thread = threading.Thread(target=read_output, args=(process, output_queue))
        output_thread.daemon = True
        output_thread.start()
        
        # Prepared responses
        responses = [
            "y",  # uncommitted changes
            "y",  # version update  
            "",   # version type (patch)
            "v1.0.31 - Critical Community Fixes - Fixed HOBEIAN multisensor cluster ID initialization error. Added proper SOS emergency button driver with professional capabilities. Enhanced flow triggers for emergency scenarios. Resolved Generic device recognition issues reported in community forum. All community feedback addressed."
        ]
        
        response_index = 0
        
        while process.poll() is None:
            # Check for new output
            try:
                while True:
                    line = output_queue.get_nowait()
                    print(f"📤 {line.strip()}")
                    
                    # Auto-respond to known prompts
                    line_lower = line.lower()
                    if response_index < len(responses):
                        if (("uncommitted" in line_lower and "?" in line) or 
                            ("continue" in line_lower and "?" in line) or
                            ("version" in line_lower and "?" in line) or
                            ("changelog" in line_lower and "?" in line)):
                            
                            response = responses[response_index]
                            print(f"✅ Auto-responding: '{response}'")
                            process.stdin.write(response + "\n")
                            process.stdin.flush()
                            response_index += 1
                            time.sleep(1)
                    
                    # Check for success/failure
                    if ("successfully published" in line_lower or 
                        "successfully uploaded" in line_lower or
                        "build uploaded" in line_lower):
                        print("🎉 Publication successful!")
                        return True
                        
                    if ("error" in line_lower and ("failed" in line_lower or "invalid" in line_lower)):
                        print("❌ Publication failed!")
                        return False
                        
            except queue.Empty:
                pass
            
            time.sleep(0.1)
        
        # Process completed, check return code
        return_code = process.wait()
        print(f"📊 Process completed with return code: {return_code}")
        
        return return_code == 0
        
    except Exception as e:
        print(f"💥 Publication error: {e}")
        return False

if __name__ == "__main__":
    success = interactive_homey_publish()
    print(f"📊 Final result: {'SUCCESS' if success else 'FAILED'}")
    sys.exit(0 if success else 1)
