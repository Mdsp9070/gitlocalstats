import { program } from 'commander';

import { Scan } from './scan';
import { Stats } from './stats';

// variables to hold arguments values
const folder = '/home/mdsp/Documents/BeTheHero';
const email = 'matheus_pessanha2001@outlook.com';

// instanciate my program and parse my required arguments
// program
//   .arguments('<folderArg> <emailArg>')
//   .action((folderArg: string, emailArg: string) => {
//     folder = folderArg;
//     email = emailArg;
//   });

// program.parse(process.argv);

// creates a new instance of gitlocalstats
(async () => {
  const gitScan = new Scan(folder);
  gitScan.scan();

  const gitStats = new Stats(email);
  await gitStats.stats();
})();
