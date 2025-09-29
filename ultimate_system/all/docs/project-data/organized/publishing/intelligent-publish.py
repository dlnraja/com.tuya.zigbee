#!/usr/bin/env python3
"""
Intelligent Automated Homey App Publisher
Handles dynamic interaction with homey app publish command using pexpect-like functionality
"""

import subprocess
import time
import threading
import sys
import os
from queue import Queue, Empty

class IntelligentPublisher:
    def __init__(self):
        self.changelog = """v1.0.19: Complete Device Reorganization - SDK3 & Johan Benz Standards

✅ MAJOR RESTRUCTURING:
- Unbranded all device drivers (removed tuya_ prefixes)
- Organized by device categories: sensors, lights, switches, plugs
- Clean driver structure: motion_sensor, contact_sensor, smart_light, etc.
- Updated flow cards to match new unbranded driver IDs
- Professional device naming following Johan Benz standards

✅ DEVICE CATEGORIES:
- Sensors: motion_sensor, contact_sensor, temperature_humidity_sensor, presence_sensor, multisensor
- Lights: smart_light, light_switch
- Plugs: smart_plug
- All drivers follow SDK3 compliance with proper endpoints

✅ TECHNICAL IMPROVEMENTS:
- Removed duplicate drivers with same functionality
- Comprehensive manufacturer ID support maintained
- Professional asset organization by device category
- Flow cards updated for unbranded compatibility

🏆 App Store Ready: Clean, professional, SDK3 compliant structure"""
        
        self.process = None
        self.output_queue = Queue()
        self.changelog_sent = False
        
    def log(self, message, color="white"):
        colors = {
            "red": "\033[31m",
            "green": "\033[32m", 
            "yellow": "\033[33m",
            "blue": "\033[34m",
            "cyan": "\033[36m",
            "white": "\033[37m",
            "reset": "\033[0m"
        }
        print(f"{colors.get(color, colors['white'])}{message}{colors['reset']}")
    
    def read_output(self, pipe, queue):
        """Read output from subprocess in separate thread"""
        try:
            for line in iter(pipe.readline, ''):
                if line:
                    queue.put(line.strip())
        except:
            pass
        finally:
            pipe.close()
    
    def send_response(self, text, delay=0.5):
        """Send response to subprocess with delay"""
        time.sleep(delay)
        if self.process and self.process.poll() is None:
            try:
                self.process.stdin.write(f"{text}\n")
                self.process.stdin.flush()
                self.log(f"📤 Sent: {text[:50]}{'...' if len(text) > 50 else ''}", "cyan")
                return True
            except:
                return False
        return False
    
    def handle_prompt(self, output_line):
        """Intelligently respond to different prompts"""
        lower_output = output_line.lower()
        
        if "uncommitted changes" in lower_output and "continue" in lower_output:
            self.log("🔄 Detected uncommitted changes prompt", "yellow")
            return self.send_response("y")
            
        elif "update" in lower_output and "version" in lower_output:
            self.log("🔄 Detected version update prompt", "yellow") 
            return self.send_response("n")
            
        elif ("what's new" in lower_output or "changelog" in lower_output) and not self.changelog_sent:
            self.log("📝 Detected changelog prompt", "yellow")
            self.changelog_sent = True
            
            # Send changelog in chunks for better handling
            lines = self.changelog.split('\n')
            threading.Thread(target=self.send_changelog_async, args=(lines,)).start()
            return True
            
        elif "building" in lower_output or "uploading" in lower_output:
            self.log("🏗️ App is being processed...", "blue")
            
        elif "published" in lower_output or "success" in lower_output:
            self.log("✅ Publication successful!", "green")
            
        return False
    
    def send_changelog_async(self, lines):
        """Send changelog lines asynchronously"""
        time.sleep(1)  # Wait a bit before sending
        
        for i, line in enumerate(lines):
            if not self.send_response(line, 0.1):
                break
        
        # Send empty lines to finish
        time.sleep(0.5)
        self.send_response("", 0.2)
        self.send_response("", 0.2)
    
    def publish(self):
        """Main publication process"""
        self.log("🚀 Starting Intelligent Automated Publication...", "green")
        
        try:
            # Start homey app publish process
            self.process = subprocess.Popen(
                ["homey", "app", "publish"],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE, 
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True
            )
            
            # Start output reader thread
            output_thread = threading.Thread(
                target=self.read_output, 
                args=(self.process.stdout, self.output_queue)
            )
            output_thread.daemon = True
            output_thread.start()
            
            # Process output and respond to prompts
            start_time = time.time()
            timeout = 300  # 5 minutes
            
            while self.process.poll() is None:
                try:
                    # Check for timeout
                    if time.time() - start_time > timeout:
                        self.log("⏰ Process timeout", "yellow")
                        self.process.terminate()
                        break
                    
                    # Get output with timeout
                    try:
                        output = self.output_queue.get(timeout=1)
                        self.log(f"📤 Output: {output}", "white")
                        self.handle_prompt(output)
                    except Empty:
                        continue
                        
                except KeyboardInterrupt:
                    self.log("⏹️ Process interrupted", "yellow")
                    self.process.terminate()
                    break
            
            # Wait for process to complete
            exit_code = self.process.wait()
            self.log(f"🎯 Process completed with exit code: {exit_code}", "green" if exit_code == 0 else "yellow")
            
            return exit_code == 0
            
        except FileNotFoundError:
            self.log("❌ Homey CLI not found. Make sure it's installed and in PATH", "red")
            return self.fallback_method()
        except Exception as e:
            self.log(f"❌ Error: {str(e)}", "red")
            return self.fallback_method()
    
    def fallback_method(self):
        """Fallback using input file method"""
        self.log("🔄 Using fallback method with input file...", "yellow")
        
        try:
            # Create input file
            responses = [
                "y",  # uncommitted changes
                "n",  # version update  
                self.changelog,
                "",   # empty line
                ""    # additional empty line
            ]
            
            input_file = "publish_input.txt"
            with open(input_file, 'w', encoding='utf-8') as f:
                f.write('\n'.join(responses))
            
            # Execute with input redirection
            result = subprocess.run(
                f'type "{input_file}" | homey app publish',
                shell=True,
                capture_output=True,
                text=True
            )
            
            self.log(result.stdout, "white")
            if result.stderr:
                self.log(result.stderr, "red")
            
            # Cleanup
            try:
                os.remove(input_file)
            except:
                pass
                
            return result.returncode == 0
            
        except Exception as e:
            self.log(f"❌ Fallback failed: {str(e)}", "red")
            return False

def main():
    publisher = IntelligentPublisher()
    
    try:
        success = publisher.publish()
        
        if success:
            publisher.log("🎉 Ultimate Zigbee Hub v1.0.19 published successfully!", "green")
        else:
            publisher.log("📋 Publication completed - check output for details", "yellow")
            
    except Exception as e:
        publisher.log(f"❌ Publication failed: {str(e)}", "red")
        sys.exit(1)

if __name__ == "__main__":
    main()
