#!/usr/bin/env python3
"""Extract latest Build ID from Homey API"""

import sys
import json
import urllib.request
import os

def main():
    token = os.environ.get('HOMEY_PAT')
    if not token:
        print('', file=sys.stderr)
        print('Error: HOMEY_PAT not set', file=sys.stderr)
        sys.exit(1)
    
    try:
        req = urllib.request.Request(
            'https://api.developer.homey.app/app/com.dlnraja.tuya.zigbee/builds',
            headers={'Authorization': f'Bearer {token}'}
        )
        
        with urllib.request.urlopen(req, timeout=10) as response:
            builds = json.loads(response.read().decode())
            
            if builds and len(builds) > 0 and 'id' in builds[0]:
                print(builds[0]['id'])
                return 0
            else:
                print('', file=sys.stderr)
                print('Error: No builds found or invalid response', file=sys.stderr)
                return 1
                
    except Exception as e:
        print('', file=sys.stderr)
        print(f'Error: {e}', file=sys.stderr)
        return 1

if __name__ == '__main__':
    sys.exit(main())
