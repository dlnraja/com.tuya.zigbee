import Table from 'cli-table';
import colors from 'colors';

import { logJsonError, printStructuredOutput } from '../CliOutput.mjs';
import Log from '../Log.js';
import { applyJqOutputOption, applyJsonOutputOption } from './ApiCommandOptions.mjs';
import {
  camelToKebab,
  formatAvailabilityLabel,
  getHomeyApiSpecification,
} from './ApiCommandDefinition.mjs';

export function logSchemaCommandError(err, argv) {
  logJsonError(err, argv);
}

function sortByManagerId(left, right) {
  return String(left.manager.idCamelCase).localeCompare(String(right.manager.idCamelCase));
}

function matchesManagerFilter(filterValue, managerName, manager) {
  if (!filterValue) {
    return true;
  }

  return (
    String(filterValue) === String(manager.idCamelCase) ||
    String(filterValue) === String(manager.id) ||
    String(filterValue) === String(managerName)
  );
}

function matchesOperationFilter(filterValue, operationId) {
  if (!filterValue) {
    return true;
  }

  return (
    String(filterValue) === String(operationId) || String(filterValue) === camelToKebab(operationId)
  );
}

export function getFilteredSchema({ specification, managerFilter, operationFilter }) {
  let hasManagerMatch = false;
  let hasOperationMatch = false;

  const managers = Object.entries(specification.managers || {})
    .filter(([managerName, manager]) => {
      const isManagerMatch = matchesManagerFilter(managerFilter, managerName, manager);

      if (isManagerMatch) {
        hasManagerMatch = true;
      }

      return isManagerMatch;
    })
    .map(([managerName, manager]) => {
      const operations = Object.entries(manager.operations || {})
        .filter(([, operation]) => operation.private !== true)
        .filter(([operationId]) => {
          const isOperationMatch = matchesOperationFilter(operationFilter, operationId);

          if (isOperationMatch) {
            hasOperationMatch = true;
          }

          return isOperationMatch;
        });

      return {
        managerName,
        manager: {
          ...manager,
          operations: Object.fromEntries(operations),
        },
      };
    })
    .filter(({ manager }) => Object.keys(manager.operations || {}).length > 0)
    .sort(sortByManagerId);

  if (managerFilter && !hasManagerMatch) {
    throw new Error(`No manager matched filter "${managerFilter}".`);
  }

  if (operationFilter && !hasOperationMatch) {
    throw new Error(`No operation matched filter "${operationFilter}".`);
  }

  return {
    managers: Object.fromEntries(
      managers.map(({ managerName, manager }) => [managerName, manager]),
    ),
  };
}

function getRequiredParameters(operation) {
  return Object.entries(operation.parameters || {})
    .filter(([, parameter]) => parameter.required === true)
    .map(
      ([parameterName, parameter]) =>
        `${camelToKebab(parameterName)} (${parameter.in ?? 'unknown'})`,
    );
}

function formatRequiredParameters(requiredParameters) {
  if (requiredParameters.length === 0) {
    return '-';
  }

  return requiredParameters.join('\n');
}

function formatScopes(scopes = []) {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    return '-';
  }

  return scopes.join('\n');
}

function printPlatformLegend() {
  Log(
    colors.grey(
      'Platform labels: cloud = Homey Cloud; local = Homey Pro, Homey Pro mini, Homey Self-Hosted Server; both = cloud and local.',
    ),
  );
}

function printHumanSchema(filteredSchema) {
  const managerEntries = Object.entries(filteredSchema.managers || {});

  if (managerEntries.length === 0) {
    Log('No schema entries matched the provided filters.');
    return;
  }

  printPlatformLegend();
  Log('');

  managerEntries.forEach(([managerName, manager], managerIndex) => {
    if (managerIndex > 0) {
      Log('');
    }

    const title = `${manager.idCamelCase} (${manager.id})`;
    Log(colors.white.bold(title));
    Log(colors.grey(`Source key: ${managerName}`));
    Log(colors.grey(`Platform: ${formatAvailabilityLabel(manager.availability)}`));

    const table = new Table({
      head: ['Operation', 'Method', 'Path', 'Required Params', 'Scopes', 'Platform'].map((column) =>
        colors.white.bold(column),
      ),
      wordWrap: true,
    });

    Object.entries(manager.operations || {}).forEach(([operationId, operation]) => {
      const requiredParameters = getRequiredParameters(operation);

      table.push([
        camelToKebab(operationId),
        String(operation.method || 'get').toUpperCase(),
        operation.path || '/',
        formatRequiredParameters(requiredParameters),
        formatScopes(operation.scopes),
        formatAvailabilityLabel(operation.availability),
      ]);
    });

    Log(table.toString());
  });
}

export function printSchema({ filteredSchema, argv }) {
  printStructuredOutput({
    value: filteredSchema,
    argv,
    printHuman: () => printHumanSchema(filteredSchema),
  });
}

export function buildSchemaCommand(yargs, { includeManagerOption = true } = {}) {
  let schemaYargs = applyJsonOutputOption(yargs);

  if (includeManagerOption) {
    schemaYargs = schemaYargs.option('manager', {
      type: 'string',
      description: 'Filter by manager idCamelCase, manager id, or specification key',
    });
  }

  return applyJqOutputOption(
    schemaYargs.option('operation', {
      type: 'string',
      description: 'Filter by operation id or kebab-case CLI name',
    }),
  );
}

export async function executeSchemaCommand(argv, { managerFilter = undefined } = {}) {
  const specification = getHomeyApiSpecification();
  const filteredSchema = getFilteredSchema({
    specification,
    managerFilter: managerFilter ?? argv.manager,
    operationFilter: argv.operation,
  });

  printSchema({
    filteredSchema,
    argv,
  });
}

export default {
  buildSchemaCommand,
  executeSchemaCommand,
  getFilteredSchema,
  logSchemaCommandError,
  printSchema,
};
