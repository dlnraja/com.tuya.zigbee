export const desc = 'Flow related commands';
export const builder = (yargs) => {
  return yargs
    .commandDir('flow', {
      extensions: ['.mjs'],
    })
    .demandCommand()
    .help();
};
