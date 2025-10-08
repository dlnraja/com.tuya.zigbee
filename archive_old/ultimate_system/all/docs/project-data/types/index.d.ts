/// <reference types="homey" />

// Import type definitions
import './homey';
import './BaseDevice';
import './tuya-api';

// Global type declarations
declare global {
  // Add any global type declarations here
  
  // Example:
  // interface Window {
  //   myGlobal: any;
  // }
}

// Export all types
export * from './homey';
export * from './BaseDevice';
export * from './tuya-api';
