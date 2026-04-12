export const desc = 'Widget related commands';
export const builder = (yargs) => {
  return yargs
    .commandDir('widget', {
      extensions: ['.mjs'],
    })
    .demandCommand()
    .help();
};
