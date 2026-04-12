export const desc = 'Dependency related commands (Python only)';
export const builder = (yargs) => {
  return yargs
    .commandDir('dependencies', {
      extensions: ['.mjs'],
    })
    .option('find-links', {
      default: undefined,
      type: 'string',
      desc: 'Additional location to search for candidate Python package distributions',
    })
    .option('docker-socket-path', {
      default: undefined,
      type: 'string',
      description: 'Path to the Docker socket.',
    })
    .demandCommand()
    .help();
};
