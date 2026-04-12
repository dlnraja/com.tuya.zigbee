export const desc = 'App related commands';
export const builder = (yargs) => {
  return yargs
    .commandDir('app', {
      extensions: ['.mjs'],
    })
    .option('path', {
      alias: 'p',
      type: 'string',
      desc: 'Path to a Homey App directory',
      default: process.cwd(),
    })
    .demandCommand()
    .help();
};
