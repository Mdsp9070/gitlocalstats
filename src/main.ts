import { program } from "commander";
import { Stats } from "./stats";

// variables to hold arguments values
let folder = "";
let email = "";

// instanciate my program and parse my required arguments
program
  .arguments("<folderArg> <emailArg>")
  .action((folderArg: string, emailArg: string) => {
    folder = folderArg;
    email = emailArg;
  });

program.parse(process.argv);

// creates a new instance of gitlocalstats
(async () => {
  const gitStats = new Stats(email, folder);

  gitStats.scan();
  await gitStats.stats();
})();
