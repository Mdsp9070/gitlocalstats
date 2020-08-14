import fs from "fs";
import os from "os";
import git from "nodegit";
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
    console.log("Found folders: \n\n");
    const repositories = this.recursiveScanFolder(this.folder);
    const filePath = this.getDotFilePath();
    this.addNewArrayElementsToFile(filePath, repositories);
    console.log("\n\nSuccessfully added\n\n");
  }

  private calcOffset(): number {
    return new Date(Date.now()).getUTCMonth();
  }

  // count diff days from the date of commit from now
  private countDaysSinceDate(date: Date, outOfRange: number): number {
    const current = new Date(Date.now());
    const days = Math.trunc(((+current - +date + 1) / 24) * 60 * 60 * 1000);

    return days > 6 * 31 ? outOfRange : days;
  }

  // walk trough repository and count how many commits
  private async fillCommits(
    email: string,
    path: string,
    commits: Map<number, number>
  ): Promise<Map<number, number>> {
    try {
      const repo = await git.Repository.open(path);
      const first = await repo.getMasterCommit();
      const history = first.history();
      const outOfRange = 99999;
      const offset = this.calcOffset();

      history.on("commit", (commit) => {
        const daysAgo =
          this.countDaysSinceDate(commit.date(), outOfRange) + offset;

        if (commit.author().email() !== email) return;

        if (daysAgo !== outOfRange) {
          const value = commits.get(daysAgo) || 0;
          commits.set(daysAgo, value + 1);
        }
      });

      history.start();

      return commits;
    } catch (err) {
      console.log(err.message);
      return commits;
    }
  }

  // processRepositories given a user email, returns the
  // commits made in the last 6 months
  private async processRepositories(
    email: string
  ): Promise<Map<number, number>> {
    const filePath = this.getDotFilePath();
    const repos = this.parseFileLinesToArray(filePath);
    const days = 6 * 31;
    let commits = new Map<number, number>();

    for (let i = days; i > 0; i--) {
      commits.set(i, 0);
    }

    for (const path of repos) {
      commits = await this.fillCommits(email, path, commits);
    }

    return commits;
  }

  // iterate over the map and sort all keys into a array
  private sortMapIntoArray(m: Map<number, number>): number[] {
    const keys: number[] = [];

    m.forEach((_, key) => {
      keys.push(key);
    });

    return keys.sort((a, b) => a - b);
  }

  // generates a map with rows and columns ready to be printed to screen
  private buildCols(
    keys: number[],
    commits: Map<number, number>
  ): Map<number, number[]> {
    const cols = new Map<number, number[]>();
    const col: number[] = [];

    for (const key of keys) {
      const week = Math.floor(key / 7);
      const dayInWeek = key % 7;

      if (dayInWeek === 0) {
        col.length = 0;
      }

      col.push(commits.get(key)!);

      if (dayInWeek === 6) {
        cols.set(week, col);
      }
    }

    return cols;
  }

  private printMonths() {
    
  }

  // prints the cells of the graph
  private printCells(cols: Map<number, number[]>) {
    this.printMonths();

    for (let j = 6; j >= 0; j--) {
      for (let i = 6 * 4 + 1; i >= 0; i--) {
        if (i === 6 * 4 + 1) {
          this.printDayCol(j);
        }

        if (cols.get(i) !== undefined) {
          const col = cols.get(i)!;
          if (i === 0 && j === this.calcOffset() - 1) {
            this.printCell(col[j], true);
            continue;
          } else {
            if (col.length > j) {
              this.printCell(col[j], false);
              continue;
            }
          }
        }
        this.printCell(0, false);
      }
      console.log("");
    }
  }

  private printCommitsStats(commits: Map<number, number>) {
    const keys = this.sortMapIntoArray(commits);
    const col = this.buildCols(keys, commits);
    this.printCells(cols);
  }

  // cool function to print a coller
  // git stats graph!!!
  async stats() {
    const commits = await this.processRepositories(this.email);
    this.printCommitsStats(commits);
  }
}
