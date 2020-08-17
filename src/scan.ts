import fs from "fs";
import os from "os";
import { basename } from "path";

export class Scan {
  // instanciate properties
  constructor(private folder: string) {}

  // recursivally scan folders
  private scanGitFolders(folders: string[], folder: string): string[] {
    folder = folder.replace(/\/$/, "");

    let path = "";

    const files = fs.readdirSync(folder);

    for (const file of files) {
      if (fs.lstatSync(`${folder}/${file}`).isDirectory()) {
        path = `${folder}/${basename(file)}`;

        if (file === " ") continue;
        if (basename(file) === ".git") {
          path = path.replace(/.git$/g, "");
          folders.push(path);
          continue;
        }
        if (basename(file) === "vendor" || basename(file) === "node_modules")
          continue;
        folders = this.scanGitFolders(folders, path);
      }
    }

    return folders;
  }

  // calls scanGitFolders
  private recursiveScanFolder(folder: string): string[] {
    return this.scanGitFolders([], folder);
  }

  // get '.gitlocalstats' file path
  public getDotFilePath(): string {
    return `${os.homedir()}/.gitlocalstats`;
  }

  // get existing repos by reading
  // the actual content of '.gitlocalstats'
  public parseFileLinesToArray(filePath: string): string[] {
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
  private joinArrays(newly: string[], current: string[]): string[] {
    for (const path of newly) {
      if (current.indexOf(path) === -1) {
        current.push(path);
      }
    }

    return current;
  }

  // join all paths and append to '.gitlocalstats'
  private dumpStringsArrayToFile(repos: string[], filePath: string) {
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
    const repositories = this.recursiveScanFolder(this.folder);
    const filePath = this.getDotFilePath();
    this.addNewArrayElementsToFile(filePath, repositories);
  }
}
