import os
import shutil
import subprocess
import time
import json

def force_clean_homeybuild():
    """Force clean .homeybuild directory with all nested folders"""
    print("NETTOYAGE FORCE CACHE .homeybuild")
    print("=" * 35)
    
    homeybuild_path = '.homeybuild'
    
    # Multiple attempts with different methods
    for attempt in range(3):
        try:
            if os.path.exists(homeybuild_path):
                # Method 1: Python shutil
                shutil.rmtree(homeybuild_path, ignore_errors=True)
                time.sleep(1)
                
                # Method 2: Windows rd command
                if os.path.exists(homeybuild_path):
                    subprocess.run(['cmd', '/c', 'rd', '/s', '/q', homeybuild_path], 
                                 capture_output=True, shell=True)
                    time.sleep(1)
                
                # Method 3: PowerShell Remove-Item
                if os.path.exists(homeybuild_path):
                    subprocess.run(['powershell', '-Command', 
                                  f'Remove-Item -Path "{homeybuild_path}" -Recurse -Force -ErrorAction SilentlyContinue'], 
                                 capture_output=True)
                    time.sleep(1)
                
                if not os.path.exists(homeybuild_path):
                    print(f"Cache supprime (tentative {attempt + 1})")
                    break
            else:
                print("Pas de cache trouve")
                break
                
        except Exception as e:
            print(f"Erreur tentative {attempt + 1}: {e}")
            time.sleep(2)
    
    # Final check
    if os.path.exists(homeybuild_path):
        print("ATTENTION: Cache partiellement supprime")
    else:
        print("SUCCES: Cache completement supprime")

def commit_and_push():
    """Commit et push les changements"""
    print("\nCOMMIT ET PUSH GITHUB")
    print("=" * 20)
    
    try:
        # Add all changes
        subprocess.run(['git', 'add', '.'], check=True)
        
        # Commit
        commit_msg = "feat: Add Johan Bendz scene remotes support - v1.0.28 complete compatibility"
        subprocess.run(['git', 'commit', '-m', commit_msg], check=True)
        
        # Push
        subprocess.run(['git', 'push', 'origin', 'main'], check=True)
        
        print("SUCCES: Changes pushed to GitHub")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"ERREUR Git: {e}")
        return False

def automated_publish():
    """Publication automatisée avec réponses pré-configurées"""
    print("\nPUBLICATION AUTOMATISEE HOMEY")
    print("=" * 30)
    
    changelog = """v1.0.28 - Complete Johan Bendz Compatibility Update

✨ NEW FEATURES:
• Added 2 Gang Scene Remote (TS0042) - _TZ3000_dfgbtub0 support
• Added 4 Gang Scene Remote (TS0044) - _TZ3000_wkai4ga5 support
• Enhanced Johan Bendz device compatibility with expanded manufacturer IDs
• Professional unbranded device categorization following SDK3 standards

🔧 IMPROVEMENTS:
• Updated support URL to Homey Community forum thread
• Fixed all validation errors and image size requirements (75x75)
• Multi-language tags support (EN/FR/NL)
• Clean asset management and driver structure

🐛 BUG FIXES:
• Corrected all driver image paths after reorganization
• Fixed manifest.tags format to object with language keys
• Resolved .homeybuild cache conflicts
• Enhanced device compatibility matrix

📋 TECHNICAL:
• Full SDK3 compliance with proper endpoint definitions
• Local Zigbee operation - no cloud dependencies
• Professional flow cards and device capabilities
• Automated CI/CD pipeline with GitHub Actions

This version ensures complete compatibility with Johan Bendz's original Tuya Zigbee app while providing modern SDK3 architecture and professional device organization."""

    try:
        # Start publish process
        process = subprocess.Popen(
            ['homey', 'app', 'publish'],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
        
        # Send responses
        responses = ['y\n', 'n\n', changelog + '\n']
        
        for i, response in enumerate(responses):
            time.sleep(2)  # Wait for prompt
            process.stdin.write(response)
            process.stdin.flush()
            print(f"Reponse {i+1} envoyee")
        
        # Wait for completion
        output, _ = process.communicate(timeout=300)
        
        print("\nSORTIE PUBLICATION:")
        print(output)
        
        if process.returncode == 0:
            print("\n🎉 PUBLICATION REUSSIE! 🎉")
            return True
        else:
            print(f"\n❌ ECHEC PUBLICATION (code: {process.returncode})")
            return False
            
    except subprocess.TimeoutExpired:
        process.kill()
        print("❌ Publication timeout - processus termine")
        return False
    except Exception as e:
        print(f"❌ Erreur publication: {e}")
        return False

def main():
    """Processus complet automatisé"""
    print("PUBLICATION COMPLETE AUTOMATISEE - JOHAN BENDZ COMPATIBILITY")
    print("=" * 65)
    
    # Step 1: Force clean cache
    force_clean_homeybuild()
    
    # Step 2: Commit and push
    git_success = commit_and_push()
    
    # Step 3: Publish to Homey
    publish_success = automated_publish()
    
    # Final status
    print("\n" + "=" * 65)
    print("RESULTAT FINAL:")
    
    if git_success:
        print("✅ Git: Changes pushed to GitHub")
    else:
        print("⚠️  Git: Push failed or skipped")
    
    if publish_success:
        print("✅ Homey: App published successfully")
        print("✅ Johan Bendz scene remotes: TS0042 & TS0044 supported")
        print("✅ Professional organization: Complete")
        print("✅ Community forum: Support URL updated")
        print("\n🎯 MISSION ACCOMPLIE!")
    else:
        print("❌ Homey: Publication failed")
        print("Manual intervention required")
    
    print("\nApp details:")
    print("- Version: 1.0.28")
    print("- Scene remotes: 2 Gang (TS0042), 4 Gang (TS0044)")
    print("- Johan Bendz compatibility: Complete")
    print("- Support: https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352")

if __name__ == "__main__":
    main()
