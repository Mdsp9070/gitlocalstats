import fs from "fs";
import os from "os";
import { basename } from "path";

export class GitLocal {
  // instanciate properties
  constructor(private folder: string, private email: string) {}

  // recursivally scan folders
  private scanGitFolders(folders: string[], folder: string): string[] {
    folder = folder.replace(/\//g, "");

    let path = "";

    fs.readdir(folder, (err, files) => {
      if (err) throw new Error(err.message);

      for (const file of files) {
        if (fs.lstatSync(file).isDirectory()) {
          path = `${folder}/${basename(file)}`;

          if (basename(file) === ".git") {
            path = path.replace(/.git$/g, "");
            console.log(path);
            folders.push(path);
            continue;
          }
          if (basename(file) === "vendor" || basename(file) === "node_modules")
            continue;
          folders = this.scanGitFolders(folders, path);
        }
      }
    });

    return folders;
  }

  // calls scanGitFolders
  private recursiveScanFolder(folder: string): string[] {
    return this.scanGitFolders([], folder);
  }

  // get '.gitlocalstats' file path
  private getDotFilePath(): string {
    return `${os.homedir()}/.gitlocalstats`;
  }

  // get existing repos by reading
  // the actual content of '.gitlocalstats'
  private parseFileLinesToArray(filePath: string): string[] {
    // if file doesn't exist, create it
    if (!fs.existsSync(filePath)) {
      fs.closeSync(fs.openSync(this.getDotFilePath(), "w"));
      console.log('Creating ".gitlocalstats" on your home directory!');
      return [];
    }

    return fs.readFileSync(filePath).toString().split("\n");
  }

  // adds the element of the 'new' array
  // into the 'current' array, only if not already there
  joinArrays(newly: string[], current: string[]): string[] {
    for (const path of newly) {
      if (current.indexOf(path) === -1) {
        current.push(path);
      }
    }

    return current;
  }

  // join all paths and append to '.gitlocalstats'
  dumpStringsArrayToFile(repos: string[], filePath: string) {
    const content = repos.join("\n");

    fs.appendFileSync(filePath, content);
  }

  // add new paths to the '.gitlocalstats'
  private addNewArrayElementsToFile(filePath: string, newRepos: string[]) {
    const existingRepos = this.parseFileLinesToArray(filePath);
    const repos = this.joinArrays(newRepos, existingRepos);
    this.dumpStringsArrayToFile(repos, filePath);
  }

  // main function to scan folders
  scan() {
    console.log("Found folders: \n\n");
    const repositories = this.recursiveScanFolder(this.folder);
    const filePath = this.getDotFilePath();
    this.addNewArrayElementsToFile(filePath, repositories);
    console.log("\n\nSuccessfully added\n\n");
  }

  // cool function to print a coller
  // git stats graph!!!
  stats(email: string) {}
}
