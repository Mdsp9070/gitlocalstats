import chalk from 'chalk';
import simpleGit from 'simple-git';
import { DateTime } from 'luxon';

import { getDotFilePath, parseFileLinesToArray } from './utils/functions';

export class Stats {
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

  constructor(private email: string) {}

  private calcOffset(): number {
    return DateTime.local().weekday;
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
      const commitsDays: number[] = [];
      const commitsNum: { [key: number]: number } = {};

      for (const commit of log) {
        const daysAgo = this.countDaysSinceDate(new Date(commit.date)) + offset;

        if (commit.author_email !== email) continue;

        if (daysAgo !== this.outOfRange) {
          commitsDays.push(daysAgo);
        }
      }

      commitsDays.forEach((_, index) => {
        const num = commitsDays[index];
        commitsNum[num] = commitsNum[num] ? commitsNum[num] + 1 : 1;
      });

      for (const key in commitsNum) {
        const value = commitsNum[key];
        commits.set(Number(key), value);
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
    const filePath = getDotFilePath();
    const repos = parseFileLinesToArray(filePath);
    const days = 183;
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

    for (const key of keys) {
      const col: number[] = [];
      const week = Math.floor(key / 7);
      const dayInWeek = key % 7;

      if (dayInWeek === 0) {
        col.length = 0;
      }
      const commit = commits.get(key);

      if (commit !== undefined) col.push(commit);

      if (dayInWeek === 6) {
        cols.set(week, col);
      }
    }

    return cols;
  }

  private printMonths() {
    let week = DateTime.local().minus({ days: this.daysInLastSixMonths });
    let month = week.month;

    process.stdout.write('         ');
    while (week < DateTime.local()) {
      if (week.month !== month) {
        process.stdout.write(this.monthNames[week.month]);
        month = week.month;
      } else {
        process.stdout.write('    ');
      }
      week = week.plus({ week: 1 });
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
      escape = chalk.white.bgGray;
    }
    if (value >= 5 && value < 10) {
      escape = chalk.white.bgYellow;
    }
    if (value >= 10 || today) escape = chalk.white.bgAnsi(45);

    if (value === 0) {
      process.stdout.write(escape('  - '));
      return;
    }

    if (value >= 10) {
      process.stdout.write(escape(` ${value} `));
      return;
    }
    if (value >= 100) {
      process.stdout.write(escape(value));
      return;
    }

    process.stdout.write(escape(`  ${value} `));
  }

  // prints the cells of the graph
  private printCells(cols: Map<number, number[]>) {
    this.printMonths();

    for (let j = 6; j >= 0; j--) {
      for (let i = 6 * 4 + 1; i >= 0; i--) {
        if (i === 6 * 4 + 1) {
          this.printDayCol(j);
        }
        const col = cols.get(i);
        if (col) {
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

  private async printCommitsStats(commits: Map<number, number>) {
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
