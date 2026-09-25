#!/usr/bin/env node
/**
 * Bundles the plugin into self-contained files under dist/.
 *
 * These bundles are committed. The point is that installing the plugin never
 * runs npm/pnpm on the other developer's machine: they add the marketplace,
 * install, and it works — offline, with no toolchain and no install hook.
 */
import { build } from 'esbuild';
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outdir = path.join(here, 'dist');

const ENTRIES = [
  { in: 'src/daemon.ts', out: 'daemon' },
  { in: 'src/hook.ts', out: 'hook' },
  { in: 'src/mcp-server.ts', out: 'mcp-server' },
  { in: 'src/cli.ts', out: 'cli' },
];

rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });

const result = await build({
  entryPoints: ENTRIES.map((e) => ({ in: path.join(here, e.in), out: e.out })),
  outdir,
  outExtension: { '.js': '.mjs' },
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  sourcemap: false,
  minify: false,
  legalComments: 'none',
  // `ws` requires these behind try/catch for a native speedup; leaving them
  // external means the require throws and ws falls back, which is what we want.
  external: ['bufferutil', 'utf-8-validate'],
  banner: {
    js: [
      "import { createRequire as __createRequire } from 'node:module';",
      'const require = __createRequire(import.meta.url);',
    ].join('\n'),
  },
  metafile: true,
  logLevel: 'info',
});

const sizes = Object.entries(result.metafile.outputs)
  .filter(([file]) => file.endsWith('.mjs'))
  .map(([file, meta]) => `  ${path.basename(file).padEnd(16)} ${(meta.bytes / 1024).toFixed(0)} KB`)
  .sort();

console.log(`\nBundled into ${path.relative(process.cwd(), outdir)}:`);
console.log(sizes.join('\n'));
