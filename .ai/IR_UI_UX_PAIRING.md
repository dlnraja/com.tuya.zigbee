# Universal IR UI/UX & Pairing Guide

**Document Objective**: Provide future AI agents with the logic, mockups, and step-by-step instructions needed to implement a "Universal Remote" pairing wizard and UI within Homey (inspired by Android apps like Xiaomi Mi Remote, SmartIR).

---

## 1. Core Architecture (What we built)
The Homey `ir_blaster` (Zosung ZS06) natively supports raw IR transmission via Zigbee (Cluster `0xE004`). However, raw base64 timings are extremely counter-intuitive for users.

We enriched this by implementing:
- **`IRCodeLibrary.js`**: An offline database and protocol translator (Pronto Hex & Broadlink Base64 -> Zosung Base64).
- **Driver Capabilities (`driver.compose.json`)**: Added standard remote buttons (`volume_up`, `volume_down`, `channel_up`, `button.mute`, etc.).
- **Device Settings**: Exposed `ir_brand` and `ir_category` so the user can define what their blaster controls.

## 2. The Ideal "Pairing Wizard" (Future AI Implementation)
Currently, users set the brand and category in the **Settings** menu *after* pairing. The next evolution is to create a dynamic HTML/JS pairing screen (`.homeycompose/pair/ir_setup.html`) that works like this:

### Step 1: Select Category
User selects "TV", "Air Conditioner", or "Audio".

### Step 2: Select Brand
User types their brand (e.g., "Samsung", "LG", "Daikin"). 
*Auto-complete should fetch keys from `IRCodeLibrary.js` or `irdb-codes.json`.*

### Step 3: Test Codes (The "Mi Remote" UX)
1. The UI displays a big "POWER" button.
2. The user clicks it -> Homey sends the first known IR Code for that Brand/Category.
3. The UI asks: "Did the device respond?"
   - **Yes** -> Move to Step 4.
   - **No** -> Homey sends the *next* code variant for that brand (e.g., Samsung TV Power Code #2).

### Step 4: Save Configuration
Homey saves the selected brand, category, and code-variant into the device settings `setSettings()`.

## 3. Creating the UI Pages (Technical Spec)
To implement this, you will need:
1. **`drivers/ir_blaster/pair/start.html`**: The HTML wizard (using Vue.js or vanilla JS, following Homey styling).
2. **`drivers/ir_blaster/pair/ir_setup.js`**:
   - `Homey.emit('test_ir_code', { brand, category, button: 'Power', variant: 1 })`
3. **`drivers/ir_blaster/driver.js`** (Backend):
   - Listen to `test_ir_code` socket event.
   - Lookup the code via `IRCodeLibrary.getCode(brand, category, 'Power', variant)`.
   - Send the IR payload over the Zigbee network via the device session.

## 4. Flow Cards Architecture
We have decoupled IR commands from capabilities so users can use the blaster purely through Flows.
- `ir_blaster_send_tv_command`: Arguments [Brand, Command Dropdown]
- `ir_blaster_send_ac_command`: Arguments [Brand, Command Dropdown]

*Rule: Future Flow Cards for new categories (e.g., Audio, Projectors) must follow this exact naming and dropdown format to ensure consistency.*
