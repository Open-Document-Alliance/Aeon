import { spawn } from 'node:child_process';
import fs from 'node:fs';
import type { TokenUsage } from './types.js';

export const EMPTY_USAGE: TokenUsage = { input: 0, cachedInput: 0, output: 0 };

export function nowIso(): string {
  return new Date().toISOString();
}

export function pathExists(p: string): boolean {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

export interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

export function runCommand(
  command: string,
  args: string[],
  opts?: { cwd?: string; allowFailure?: boolean },
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: opts?.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      if (opts?.allowFailure) {
        resolve({ code: 1, stdout, stderr: stderr || err.message });
      } else {
        reject(err);
      }
    });

    child.on('close', (code) => {
      const exitCode = code ?? 1;
      if (exitCode !== 0 && !opts?.allowFailure) {
        reject(new Error(`${command} ${args.join(' ')} failed (exit ${exitCode}): ${stderr.trim()}`));
      } else {
        resolve({ code: exitCode, stdout, stderr });
      }
    });
  });
}

export function slugify(filename: string): string {
  return filename
    .replace(/\.md$/, '')
    .replace(/[^a-z0-9-]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export function generateRunId(): string {
  const date = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 10);
  return `${date}-${rand}`;
}

export function elapsed(startIso: string): string {
  const ms = Date.now() - new Date(startIso).getTime();
  const totalSecs = Math.floor(ms / 1000);
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    input: a.input + b.input,
    cachedInput: a.cachedInput + b.cachedInput,
    output: a.output + b.output,
  };
}
