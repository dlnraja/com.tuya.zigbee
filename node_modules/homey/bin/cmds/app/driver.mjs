export const desc = 'Driver related commands';
export const builder = (yargs) => {
  return yargs
    .commandDir('driver', {
      extensions: ['.mjs'],
    })
    .demandCommand()
    .help();
};
