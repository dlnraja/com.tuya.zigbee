import { validateCompose } from 'homey-compose-validator';

export default function validate() {
  try {
    const results = validateCompose();
    console.log('Validation results:', results);
    if (!results.valid) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Validation failed:', err);
    process.exit(1);
  }
}
