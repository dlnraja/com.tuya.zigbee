import fs from 'node:fs';
import path from 'node:path';

import { camelToKebab } from './ApiCommandDefinition.mjs';

function getOptionType(parameter) {
  if (Array.isArray(parameter.type)) return 'string';

  switch (parameter.type) {
    case 'boolean':
      return 'boolean';
    case 'number':
      return 'number';
    default:
      return 'string';
  }
}

function getArgValue(argv, flagName, parameterName) {
  if (typeof argv[flagName] !== 'undefined') return argv[flagName];
  if (typeof argv[parameterName] !== 'undefined') return argv[parameterName];

  return undefined;
}

function readInputSource(value, optionName) {
  if (typeof value !== 'string') {
    throw new Error(`Invalid ${optionName} value. Expected a string or @file path.`);
  }

  let source = value;

  if (source.startsWith('@')) {
    const filePath = path.resolve(process.cwd(), source.slice(1));
    try {
      source = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
      throw new Error(`Cannot read file for ${optionName}: ${err.message}`);
    }
  }

  return source;
}

export function parseJsonInput(value, optionName) {
  const source = readInputSource(value, optionName);

  try {
    return JSON.parse(source);
  } catch (err) {
    throw new Error(`Invalid JSON for ${optionName}: ${err.message}`);
  }
}

export function parseRawInput(value, optionName) {
  return readInputSource(value, optionName);
}

export function parseHeaders(rawHeaders, optionName = '--header') {
  const headers = {};
  const headerEntries = Array.isArray(rawHeaders)
    ? rawHeaders
    : typeof rawHeaders === 'undefined'
      ? []
      : [rawHeaders];

  for (const rawHeader of headerEntries) {
    if (typeof rawHeader !== 'string') {
      throw new Error(`Invalid ${optionName} value. Expected a "name:value" pair.`);
    }

    const separatorIndex = rawHeader.indexOf(':');

    if (separatorIndex <= 0) {
      throw new Error(`Invalid ${optionName} value "${rawHeader}". Expected "name:value".`);
    }

    const name = rawHeader.slice(0, separatorIndex).trim();
    const value = rawHeader.slice(separatorIndex + 1).trim();

    if (!name) {
      throw new Error(`Invalid ${optionName} value "${rawHeader}". Header name cannot be empty.`);
    }

    headers[name] = value;
  }

  return headers;
}

function getRootBodyParameters(operation) {
  return Object.entries(operation.parameters || {}).filter(
    ([, parameter]) => parameter.in === 'body' && parameter.root === true,
  );
}

function assertSingleRootBodyParameter(operation, rootBodyParameters) {
  if (rootBodyParameters.length > 1) {
    throw new Error(`Unsupported operation: ${operation.id} has multiple root body parameters.`);
  }
}

function parseBooleanValue(rawValue, optionName) {
  if (typeof rawValue === 'boolean') return rawValue;

  if (typeof rawValue === 'string') {
    if (rawValue === 'true') return true;
    if (rawValue === 'false') return false;
  }

  throw new Error(`Invalid boolean value for ${optionName}.`);
}

function parseNumberValue(rawValue, optionName) {
  if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
    return rawValue;
  }

  if (typeof rawValue === 'string' && rawValue.length > 0) {
    const numberValue = Number(rawValue);
    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }

  throw new Error(`Invalid number value for ${optionName}.`);
}

function parseParameterValue(rawValue, parameter, optionName) {
  const parameterType = parameter.type;

  if (Array.isArray(parameterType)) {
    const allowedTypes = new Set(parameterType);

    if (allowedTypes.has('boolean')) {
      try {
        return parseBooleanValue(rawValue, optionName);
      } catch (err) {
        // Ignore and continue.
      }
    }

    if (allowedTypes.has('number')) {
      try {
        return parseNumberValue(rawValue, optionName);
      } catch (err) {
        // Ignore and continue.
      }
    }

    if (allowedTypes.has('string') && typeof rawValue === 'string') {
      return rawValue;
    }

    throw new Error(
      `Invalid value for ${optionName}. Expected one of: ${parameterType.join(', ')}.`,
    );
  }

  switch (parameterType) {
    case 'boolean':
      return parseBooleanValue(rawValue, optionName);
    case 'number':
      return parseNumberValue(rawValue, optionName);
    case 'object': {
      const value = parseJsonInput(rawValue, optionName);
      if (value === null || Array.isArray(value) || typeof value !== 'object') {
        throw new Error(`Invalid object value for ${optionName}.`);
      }

      return value;
    }
    case 'array': {
      const value = parseJsonInput(rawValue, optionName);
      if (!Array.isArray(value)) {
        throw new Error(`Invalid array value for ${optionName}.`);
      }

      return value;
    }
    case 'string':
    default:
      if (typeof rawValue !== 'string') {
        throw new Error(`Invalid string value for ${optionName}.`);
      }

      return rawValue;
  }
}

export function applyOperationOptions(yargs, operation) {
  const rootBodyParameters = getRootBodyParameters(operation);
  assertSingleRootBodyParameter(operation, rootBodyParameters);
  const hasRootBodyParameter = rootBodyParameters.length === 1;
  const rootBodyParameterRequired = hasRootBodyParameter
    ? rootBodyParameters[0][1].required === true
    : false;

  for (const [parameterName, parameter] of Object.entries(operation.parameters || {})) {
    if (parameter.in === 'body' && parameter.root === true) {
      continue;
    }

    const optionName = camelToKebab(parameterName);
    yargs.option(optionName, {
      type: getOptionType(parameter),
      demandOption: parameter.required === true,
      description: `${parameter.in ?? 'unknown'} parameter${parameter.required === true ? ' (required)' : ''}`,
    });
  }

  if (hasRootBodyParameter) {
    yargs.option('body', {
      type: 'string',
      demandOption: rootBodyParameterRequired,
      description: 'JSON request body as string or @file path',
    });
  }

  return yargs;
}

export function buildOperationArgs(argv, operation) {
  const args = {};
  const rootBodyParameters = getRootBodyParameters(operation);
  assertSingleRootBodyParameter(operation, rootBodyParameters);
  const rootBodyRawValue = typeof argv.body === 'undefined' ? undefined : argv.body;
  let parsedRootBodyValue;
  let hasParsedRootBodyValue = false;

  for (const [parameterName, parameter] of Object.entries(operation.parameters || {})) {
    if (parameter.in === 'body' && parameter.root === true) {
      if (typeof rootBodyRawValue !== 'undefined') {
        if (!hasParsedRootBodyValue) {
          parsedRootBodyValue = parseJsonInput(rootBodyRawValue, '--body');
          hasParsedRootBodyValue = true;
        }

        args[parameterName] = parsedRootBodyValue;
      } else if (parameter.required === true) {
        throw new Error('Missing required option: --body');
      }

      continue;
    }

    const optionName = camelToKebab(parameterName);
    const rawValue = getArgValue(argv, optionName, parameterName);

    if (typeof rawValue === 'undefined') {
      if (parameter.required === true) {
        throw new Error(`Missing required option: --${optionName}`);
      }

      continue;
    }

    args[parameterName] = parseParameterValue(rawValue, parameter, `--${optionName}`);
  }

  return args;
}

export default {
  applyOperationOptions,
  buildOperationArgs,
  parseHeaders,
  parseJsonInput,
  parseRawInput,
};
