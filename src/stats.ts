import simpleGit from 'simple-git';
import { DateTime } from 'luxon';
import chalk from 'chalk';
import { Scan } from './scan';

export class Stats extends Scan {
  private outOfRange = 99999;
  private daysInLastSixMonths = 183;
  private monthNames: string[] = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  constructor(private email: string, folder: string) {
    super(folder);
  }

  private calcOffset(): number {
    return DateTime.local().month;
  }

  // count diff days from the date of commit from now
  private countDaysSinceDate(date: Date): number {
    const current = DateTime.local();
    const newDate = DateTime.fromJSDate(date);
    const days = Math.trunc(current.diff(newDate, 'days').days);

    return days > 6 * 31 ? this.outOfRange : days;
  }

  // walk trough repository and count how many commits
  private async fillCommits(
    email: string,
    path: string,
    commits: Map<number, number>
  ): Promise<Map<number, number>> {
    try {
      const git = simpleGit(path);
      const log = (await git.log()).all;
      const offset = this.calcOffset();

      for (const commit of log) {
        const daysAgo = this.countDaysSinceDate(new Date(commit.date)) + offset;

        if (commit.author_email !== email) continue;

        if (daysAgo !== this.outOfRange) {
          const value = commits.get(daysAgo) || 0;
          commits.set(daysAgo, value + 1);
        }
      }

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
      console.log(cols);
    }

    return cols;
  }

  private printMonths() {
    let week = DateTime.local().minus({ days: this.daysInLastSixMonths });
    let month = week.month;
    //let la = 4;

    process.stdout.write('         ');
    while (true) {
      if (week.month !== month) {
        process.stdout.write(this.monthNames[week.month]);
        month = week.month;
      } else {
        process.stdout.write('    ');
      }
      week = week.plus({ week: 1 });
      if (week >= DateTime.local()) break;
      //la--;
    }
    console.log('');
  }

  private printDayCol(day: number) {
    let out = '     ';

    switch (day) {
      case 1:
        out = ' Mon ';
        break;
      case 3:
        out = ' Wed ';
        break;
      case 5:
        out = ' Fri ';
        break;
    }
    process.stdout.write(out);
  }

  private printCell(value: number, today: boolean) {
    let escape = chalk.black;

    if (value > 0 && value < 5) {
      escape = chalk.black.bgGray;
    }
    if (value >= 5 && value < 10) {
      escape = chalk.black.bgYellow;
    }
    if (value >= 10 || today) escape = chalk.gray.bgAnsi(45);

    if (value === 0) {
      process.stdout.write(escape('  - '));
      return;
    }

    if (value >= 10) {
      process.stdout.write(escape(` ${value} `));
    }
    if (value >= 100) {
      process.stdout.write(escape(value));
    }
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
      console.log('');
    }
  }

  private printCommitsStats(commits: Map<number, number>) {
    const keys = this.sortMapIntoArray(commits);
    const cols = this.buildCols(keys, commits);
    this.printCells(cols);
  }

  // cool function to print a coller
  // git stats graph!!!
  async stats(): Promise<void> {
    const commits = await this.processRepositories(this.email);
    this.printCommitsStats(commits);
  }
}
