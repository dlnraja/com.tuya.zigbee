export const desc = 'Discovery related commands';
export const builder = (yargs) => {
  return yargs
    .commandDir('discovery', {
      extensions: ['.mjs'],
    })
    .demandCommand()
    .help();
};
