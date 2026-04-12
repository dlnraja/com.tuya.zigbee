import { DEFAULT_TIMEOUT } from './ApiCommandConstants.mjs';

export function applyJsonOutputOption(yargs) {
  return yargs.option('json', {
    type: 'boolean',
    default: false,
    description: 'Output raw JSON',
  });
}

export function applyJqOutputOption(yargs) {
  return yargs.option('jq', {
    type: 'string',
    description: 'Filter JSON output using a jq expression',
  });
}

export function applyRequestTimeoutOption(yargs) {
  return yargs.option('timeout', {
    type: 'number',
    default: DEFAULT_TIMEOUT,
    description: 'Request timeout in milliseconds',
  });
}

export function applyHomeyAddressOption(yargs) {
  return yargs.option('address', {
    type: 'string',
    description: 'Homey base URL for token mode, e.g. http://192.168.1.100',
  });
}

export function applyHomeyTokenOption(yargs) {
  return yargs.option('token', {
    type: 'string',
    description: 'Use token mode (requires --address or --homey-id)',
  });
}

export function applyHomeyIdOption(yargs) {
  return yargs.option('homey-id', {
    type: 'string',
    description: 'Target a cached Homey by id instead of the selected Homey',
  });
}

export function applyHomeyApiTargetOptions(yargs) {
  return applyHomeyIdOption(applyHomeyAddressOption(applyHomeyTokenOption(yargs)));
}

export function applyHomeyApiExecutionOptions(yargs) {
  return applyHomeyApiTargetOptions(applyRequestTimeoutOption(applyJsonOutputOption(yargs)));
}

export default {
  applyHomeyApiExecutionOptions,
  applyHomeyApiTargetOptions,
  applyHomeyAddressOption,
  applyHomeyIdOption,
  applyJqOutputOption,
  applyHomeyTokenOption,
  applyJsonOutputOption,
  applyRequestTimeoutOption,
};
