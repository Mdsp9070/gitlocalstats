import { program } from 'commander';

import { Scan } from './scan';
import { Stats } from './stats';

// variables to hold arguments values
const args: string[] = [];

// instanciate my program and parse my required arguments
program
  .arguments('<folderArg> <emailArg>')
  .action((folder: string, email: string) => {
    args.push(folder, email);
  });

program.parse(process.argv);

// creates a new instance of gitlocalstats
(async () => {
  const gitScan = new Scan(args[0]);
  gitScan.scan();

  const gitStats = new Stats(args[1]);
  await gitStats.stats();
})();
