import fs from 'fs';
import { basename } from 'path';

import { getDotFilePath, parseFileLinesToArray } from './utils/functions';

export class Scan {
  // instanciate properties
  constructor(private folder: string) {}

  // recursivally scan folders
  private scanGitFolders(folders: string[], folder: string): string[] {
    folder = folder.replace(/\/$/, '');

    let path = '';

    const files = fs.readdirSync(folder);

    for (const file of files) {
      if (fs.lstatSync(`${folder}/${file}`).isDirectory()) {
        path = `${folder}/${basename(file)}`;

        if (file === ' ') continue;
        if (basename(file) === '.git') {
          path = path.replace(/.git$/g, '');
          folders.push(path);
          continue;
        }
        if (basename(file) === 'vendor' || basename(file) === 'node_modules')
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
    const content = repos.join('\n');

    fs.appendFileSync(filePath, content);
  }

  // add new paths to the '.gitlocalstats'
  private addNewArrayElementsToFile(filePath: string, newRepos: string[]) {
    const existingRepos = parseFileLinesToArray(filePath);
    const repos = this.joinArrays(newRepos, existingRepos);
    this.dumpStringsArrayToFile(repos, filePath);
  }

  // main function to scan folders
  scan(): void {
    const repositories = this.recursiveScanFolder(this.folder);
    const filePath = getDotFilePath();
    this.addNewArrayElementsToFile(filePath, repositories);
  }
}
