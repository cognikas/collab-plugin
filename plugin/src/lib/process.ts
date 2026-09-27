import { execFile } from 'node:child_process';
import fs from 'node:fs';

/** Command line of a process, or undefined when the platform will not say. */
export function readCommandLine(pid: number): Promise<string | undefined> {
  if (process.platform === 'linux') {
    try {
      return Promise.resolve(fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').split('\0').join(' ').trim());
    } catch {
      return Promise.resolve(undefined);
    }
  }

  const [command, args] = process.platform === 'win32'
    ? ['powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      `(Get-CimInstance Win32_Process -Filter "ProcessId=${Math.trunc(pid)}").CommandLine`]]
    : ['ps', ['-o', 'command=', '-p', String(Math.trunc(pid))]];

  return new Promise((resolve) => {
    execFile(command, args, { timeout: 10_000, windowsHide: true }, (err, stdout) => {
      resolve(err ? undefined : stdout.trim() || undefined);
    });
  });
}

/** How a pre-started Claude Code process waiting to host a background session shows up: `claude bg-spare --bg-spare <socket>`. */
const SPARE = /(^|\s)(--)?bg-spare(\s|=|$)/;

/**
 * Whether the Claude Code process a daemon serves turned into a background
 * spare since the daemon started: the session it ran is over, even though the
 * pid lives on. A process that was already a spare then is hosting a session
 * claimed from the pool, so only the change counts.
 */
export function becameSpare(atStart: string | undefined, now: string | undefined): boolean {
  return atStart !== undefined && now !== undefined && !SPARE.test(atStart) && SPARE.test(now);
}
