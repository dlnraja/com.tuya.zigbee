import { fileURLToPath } from 'node:url';
import { statSync } from 'node:fs';
import { createRequire } from 'node:module';

const MANAGER_EXTENSION_BASE_URL = new URL('../../bin/cmds/api/managers/', import.meta.url);
const require = createRequire(import.meta.url);

function isFile(targetUrl) {
  try {
    return statSync(targetUrl).isFile();
  } catch {
    return false;
  }
}

function getPrimaryCommandName(commandDefinition) {
  return String(commandDefinition.command || '')
    .trim()
    .split(/\s+/, 1)[0];
}

function normalizeManagerExtension(moduleValue, managerIdCamelCase) {
  if (typeof moduleValue === 'undefined' || moduleValue === null) {
    return null;
  }

  if (typeof moduleValue !== 'object' || Array.isArray(moduleValue)) {
    throw new Error(
      `Invalid manager extension for ${managerIdCamelCase}. Expected an object export.`,
    );
  }

  const commands = Array.isArray(moduleValue.commands) ? moduleValue.commands : [];

  commands.forEach((commandDefinition) => {
    const commandName = getPrimaryCommandName(commandDefinition);

    if (!commandName) {
      throw new Error(
        `Invalid manager extension for ${managerIdCamelCase}. Custom commands must define a command name.`,
      );
    }

    if (typeof commandDefinition.handler !== 'function') {
      throw new Error(
        `Invalid manager extension for ${managerIdCamelCase}. Custom command "${commandName}" is missing a handler.`,
      );
    }

    const commandDescription =
      commandDefinition.describe ?? commandDefinition.description ?? commandDefinition.desc;

    if (typeof commandDescription !== 'undefined' && typeof commandDescription !== 'string') {
      throw new Error(
        `Invalid manager extension for ${managerIdCamelCase}. Custom command "${commandName}" has an invalid description.`,
      );
    }
  });

  if (
    typeof moduleValue.description !== 'undefined' &&
    typeof moduleValue.description !== 'string'
  ) {
    throw new Error(
      `Invalid manager extension for ${managerIdCamelCase}. Description must be a string.`,
    );
  }

  return {
    description: moduleValue.description,
    commands: commands.map((commandDefinition) => {
      return {
        ...commandDefinition,
        describe:
          commandDefinition.describe ?? commandDefinition.description ?? commandDefinition.desc,
      };
    }),
  };
}

export function getManagerExtensionCommandNames(extension) {
  if (!extension || !Array.isArray(extension.commands)) {
    return [];
  }

  return extension.commands.map((commandDefinition) => getPrimaryCommandName(commandDefinition));
}

export function loadHomeyManagerCommandExtension(managerIdCamelCase) {
  const extensionUrl = new URL(`${managerIdCamelCase}.mjs`, MANAGER_EXTENSION_BASE_URL);

  if (!isFile(extensionUrl)) {
    return null;
  }

  const module = require(fileURLToPath(extensionUrl));

  return normalizeManagerExtension(
    module.default ?? module.extension ?? module,
    managerIdCamelCase,
  );
}

export default {
  getManagerExtensionCommandNames,
  loadHomeyManagerCommandExtension,
};
