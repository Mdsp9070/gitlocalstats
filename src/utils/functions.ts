import os from 'os';
import fs from 'fs';

// get '.gitlocalstats' file path
export function getDotFilePath(): string {
  return `${os.homedir()}/.gitlocalstats`;
}

// get existing repos by reading
// the actual content of '.gitlocalstats'
export function parseFileLinesToArray(filePath: string): string[] {
  // if file doesn't exist, create it
  if (!fs.existsSync(filePath)) {
    fs.closeSync(fs.openSync(getDotFilePath(), 'w'));
    console.log('Creating ".gitlocalstats" on your home directory!');
    return [];
  }
  const repos = fs.readFileSync(filePath).toString().split('\n');

  fs.writeFileSync(filePath, '');

  return repos;
}
