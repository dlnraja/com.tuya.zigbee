import Table from 'cli-table';
import colors from 'colors';

import Log from '../Log.js';

function toDisplayValue(value) {
  if (typeof value === 'undefined' || value === null || value === '') {
    return '-';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function printDevicesTable(devices) {
  const rows = Array.isArray(devices) ? devices : Object.values(devices || {});

  if (rows.length === 0) {
    Log('No devices found.');
    return;
  }

  const table = new Table({
    head: ['ID', 'Name', 'Class', 'Zone', 'Available'].map((title) => colors.white.bold(title)),
  });

  rows.forEach((device) => {
    table.push([
      toDisplayValue(device?.id),
      toDisplayValue(device?.name),
      toDisplayValue(device?.class || device?.virtualClass),
      toDisplayValue(device?.zone),
      toDisplayValue(device?.available),
    ]);
  });

  Log(table.toString());
}

function printSummary(result) {
  if (result === null) {
    Log('null');
    return;
  }

  if (typeof result !== 'object' || Array.isArray(result)) {
    Log(toDisplayValue(result));
    return;
  }

  const table = new Table({
    colWidths: [24, 96],
    wordWrap: true,
  });

  const summaryFields = [
    'id',
    'name',
    'class',
    'virtualClass',
    'driverId',
    'zone',
    'available',
    'capabilities',
  ];

  let hasRows = false;

  summaryFields.forEach((field) => {
    if (typeof result[field] === 'undefined') return;

    table.push([field, toDisplayValue(result[field])]);
    hasRows = true;
  });

  if (!hasRows) {
    Log(JSON.stringify(result, null, 2));
    return;
  }

  Log(table.toString());
}

export function printResult({ managerId, operationId, result, json }) {
  if (json) {
    Log(result === undefined ? 'null' : JSON.stringify(result, null, 2));
    return;
  }

  if (managerId === 'devices' && operationId === 'getDevices') {
    printDevicesTable(result);
    return;
  }

  if (result === undefined) {
    Log.success('Done.');
    return;
  }

  printSummary(result);
}

export default {
  printResult,
};
