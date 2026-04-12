import Log from '../../../lib/Log.js';
import { applyHomeyApiExecutionOptions } from '../../../lib/api/ApiCommandOptions.mjs';
import { parseHeaders, parseJsonInput, parseRawInput } from '../../../lib/api/ApiCommandParser.mjs';
import { applyJqFilter } from '../../../lib/api/ApiCommandJq.mjs';
import {
  callHomeyApi,
  createHomeyApiClient,
  disposeHomeyApiClient,
  getRequestTimeout,
} from '../../../lib/api/ApiCommandRuntime.mjs';

export const command = 'raw';
export const aliases = ['call', 'request'];

const REQUEST_BODY_METHODS = new Set(['POST', 'PUT']);
const SENSITIVE_HEADER_NAMES = new Set(['authorization', 'cookie', 'set-cookie']);

function logCommandError(err, argv) {
  if (argv.json) {
    Log(
      JSON.stringify(
        {
          error: err?.message ?? String(err),
        },
        null,
        2,
      ),
    );
    return;
  }

  Log.error(err);
}

function normalizeMethod(method) {
  const normalizedMethod = String(method || 'GET')
    .trim()
    .toUpperCase();

  if (!normalizedMethod) {
    throw new Error('Invalid method. Please provide a non-empty value for --method.');
  }

  return normalizedMethod;
}

function validatePath(rawPath) {
  const pathValue = String(rawPath || '').trim();

  if (!pathValue.startsWith('/')) {
    throw new Error('Invalid path. Please provide an absolute path starting with "/".');
  }

  return pathValue;
}

function parseRequestBody(argv, method) {
  if (typeof argv.body === 'undefined') {
    return undefined;
  }

  if (!REQUEST_BODY_METHODS.has(method)) {
    throw new Error(
      `Invalid option usage: --body is only supported with methods ${Array.from(REQUEST_BODY_METHODS).join(', ')}.`,
    );
  }

  if (argv.requestJson) {
    return parseJsonInput(argv.body, '--body');
  }

  return parseRawInput(argv.body, '--body');
}

function formatResponseBody(result) {
  if (typeof result === 'undefined') {
    return '';
  }

  if (typeof result === 'string') {
    return result;
  }

  return JSON.stringify(result, null, 2);
}

function redactHeaders(headers) {
  const redactedHeaders = {};

  for (const [name, value] of Object.entries(headers || {})) {
    if (SENSITIVE_HEADER_NAMES.has(String(name).toLowerCase())) {
      redactedHeaders[name] = '[REDACTED]';
      continue;
    }

    redactedHeaders[name] = value;
  }

  return redactedHeaders;
}

function getAuthModeLabel({ token, address, homeyId }) {
  if (token && address) {
    return 'token-address';
  }

  if (token && homeyId) {
    return 'token-homey-id';
  }

  if (homeyId) {
    return 'homey-id';
  }

  return 'selected-homey';
}

function printVerbose({ method, path, timeout, authMode, metadata }) {
  console.error(`[homey api raw] method=${method} path=${path}`);
  console.error(`[homey api raw] timeoutMs=${timeout}`);
  console.error(`[homey api raw] authMode=${authMode}`);

  if (metadata?.request?.url) {
    console.error(`[homey api raw] url=${metadata.request.url}`);
  }

  if (metadata?.request?.headers) {
    console.error(
      `[homey api raw] requestHeaders=${JSON.stringify(redactHeaders(metadata.request.headers))}`,
    );
  }

  if (metadata?.response) {
    console.error(`[homey api raw] status=${metadata.response.status}`);
    console.error(`[homey api raw] contentType=${metadata.response.contentType || '-'}`);
  }

  console.error(`[homey api raw] durationMs=${metadata?.durationMs ?? '-'}`);
}

function printIncludedResponse({ metadata, bodyText }) {
  const status = metadata?.response?.status ?? '-';
  const statusText = metadata?.response?.statusText || '';
  const statusLine = `HTTP/1.1 ${status}${statusText ? ` ${statusText}` : ''}`;
  const responseHeaders = metadata?.response?.headers || {};

  Log(statusLine);

  Object.keys(responseHeaders)
    .sort((left, right) => left.localeCompare(right))
    .forEach((name) => {
      Log(`${name}: ${responseHeaders[name]}`);
    });

  if (bodyText !== '') {
    Log('');
    Log(bodyText);
  }
}

function printResponseBody({ result, argv }) {
  const jqOutput = argv.jq ? applyJqFilter(result, argv.jq) : null;

  if (argv.include) {
    if (jqOutput !== null) {
      return jqOutput;
    }

    if (argv.json) {
      return JSON.stringify(typeof result === 'undefined' ? null : result, null, 2);
    }

    return formatResponseBody(result);
  }

  if (jqOutput !== null) {
    Log(jqOutput);
    return null;
  }

  if (argv.json) {
    Log(JSON.stringify(typeof result === 'undefined' ? null : result, null, 2));
    return null;
  }

  if (typeof result === 'undefined') {
    Log.success('Done.');
    return null;
  }

  if (typeof result === 'string') {
    Log(result);
    return null;
  }

  Log(JSON.stringify(result, null, 2));
  return null;
}

export const desc = 'Perform a raw Homey API request';
export const builder = (yargs) => {
  return applyHomeyApiExecutionOptions(yargs)
    .option('method', {
      alias: 'X',
      type: 'string',
      default: 'GET',
      description: 'Request method',
    })
    .option('path', {
      type: 'string',
      demandOption: true,
      description: 'Absolute Homey API path, e.g. /api/manager/system/',
    })
    .option('header', {
      alias: 'H',
      type: 'string',
      array: true,
      description: 'Request header in "name:value" format (repeatable)',
    })
    .option('body', {
      type: 'string',
      description: 'Request body as JSON string or @file path',
    })
    .option('request-json', {
      type: 'boolean',
      default: true,
      description: 'Encode the request body as JSON',
    })
    .option('jq', {
      type: 'string',
      description: 'Filter JSON output using a jq expression',
    })
    .option('include', {
      type: 'boolean',
      default: false,
      description: 'Include status line and response headers in output',
    })
    .option('verbose', {
      type: 'boolean',
      default: false,
      description: 'Print request diagnostics to stderr',
    })
    .example(
      '$0 api raw --path /api/manager/system/',
      'Perform a GET request to the local Homey API',
    )
    .example(
      '$0 api raw -X POST --path /api/manager/flow/flow --body \'{"name":"Test"}\'',
      'Send a POST request with a JSON body',
    )
    .example(
      '$0 api raw -X POST --path /api/manager/flow/flow --body @body.json',
      'Send a POST request body from a file',
    )
    .help();
};

export const handler = async (argv) => {
  try {
    const method = normalizeMethod(argv.method);
    const path = validatePath(argv.path);
    const timeout = getRequestTimeout(argv.timeout);
    const headers = parseHeaders(argv.header, '--header');
    const body = parseRequestBody(argv, method);
    const api = await createHomeyApiClient({
      token: argv.token,
      address: argv.address,
      homeyId: argv.homeyId,
    });

    try {
      const metadata = await callHomeyApi({
        api,
        callOptions: {
          method,
          path,
          headers,
          body,
          json: argv.requestJson,
          $timeout: timeout,
        },
        captureMetadata: argv.include || argv.verbose,
      });

      if (argv.verbose) {
        printVerbose({
          method,
          path,
          timeout,
          authMode: getAuthModeLabel({
            token: argv.token,
            address: argv.address,
            homeyId: argv.homeyId,
          }),
          metadata,
        });
      }

      const bodyText = printResponseBody({
        result: metadata.result,
        argv,
      });

      if (argv.include) {
        printIncludedResponse({
          metadata,
          bodyText: bodyText || '',
        });
      }
    } finally {
      await disposeHomeyApiClient(api);
    }

    process.exit(0);
  } catch (err) {
    logCommandError(err, argv);
    process.exit(1);
  }
};
