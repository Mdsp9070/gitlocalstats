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

  private countDaysSinceDate(date: Date, outOfRange: number): number {
    const current = new Date(Date.now());
    const days = Math.trunc(((+current - +date + 1) / 24) * 60 * 60 * 1000);

    return days > 6 * 31 ? outOfRange : days;
  }

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

  // cool function to print a coller
  // git stats graph!!!
  async stats() {
    const commits = await this.processRepositories(this.email);
    this.printCommitsStats(commits);
  }
}
