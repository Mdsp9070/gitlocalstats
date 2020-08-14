import git from "nodegit";
import { Scan } from "./scan";

export class Stats extends Scan {
  private outOfRange: number = 99999;
  private daysInLastSixMonths: number = 183;
  private monthNames: string[] = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  constructor(private email: string, folder: string) {
    super(folder);
  }

  private calcOffset(): number {
    return new Date(Date.now()).getUTCMonth();
  }

  // count diff days from the date of commit from now
  private countDaysSinceDate(date: Date): number {
    const current = new Date(Date.now());
    const days = Math.trunc(((+current - +date + 1) / 24) * 60 * 60 * 1000);

    return days > 6 * 31 ? this.outOfRange : days;
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
      const offset = this.calcOffset();

      history.on("commit", (commit) => {
        const daysAgo = this.countDaysSinceDate(commit.date()) + offset;

        if (commit.author().email() !== email) return;

        if (daysAgo !== this.outOfRange) {
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
    let week = new Date(
      Date.now() / 1000 / 60 / 60 / 24 - this.daysInLastSixMonths
    );
    const month = week.getUTCMonth();

    process.stdout.write("         ");
    while (true) {
      if (week.getUTCMonth() === month) {
        process.stdout.write(this.monthNames[month]);
      } else {
        process.stdout.write("    ");
      }

      week = new Date(+week + 7 * 24);
      if (week === new Date(Date.now())) break;
    }
    console.log("");
  }

  private printDayCol(day: number) {
    let out = "     ";

    switch (day) {
      case 1:
        out = " Mon ";
        break;
      case 3:
        out = " Wed ";
        break;
      case 5:
        out = " Fri ";
        break;
    }
    process.stdout.write(out);
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
    const cols = this.buildCols(keys, commits);
    this.printCells(cols);
  }

  // cool function to print a coller
  // git stats graph!!!
  async stats() {
    const commits = await this.processRepositories(this.email);
    this.printCommitsStats(commits);
  }
}
