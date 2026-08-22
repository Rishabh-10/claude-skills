#!/usr/bin/env node
'use strict';
// PostToolUse:Edit|Write|NotebookEdit — run the project's own formatter on the
// file that was just edited, so formatting never becomes review noise.
//
// Deliberately conservative:
//   * Only runs a formatter the project has actually configured. No config
//     file, no formatting — this hook never imposes a style the repo did not
//     choose.
//   * Prefers the locally installed binary over anything global.
//   * Never fails the tool call. A formatter that is missing, broken, or slow
//     is reported as context at most; it never blocks Claude's work.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { readInput, emit, allow } = require('./_hook.js');

const EXT = (f) => path.extname(f).toLowerCase();

/**
 * Formatter definitions, tried in order for a matching extension.
 *   configs: any one present in the project root enables this formatter
 *   local:   project-local binary path, preferred when it exists
 */
const FORMATTERS = [
  {
    name: 'prettier',
    exts: ['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts', '.json', '.jsonc', '.css', '.scss', '.less', '.html', '.vue', '.svelte', '.md', '.mdx', '.yml', '.yaml'],
    configs: ['.prettierrc', '.prettierrc.json', '.prettierrc.js', '.prettierrc.cjs', '.prettierrc.yml', '.prettierrc.yaml', '.prettierrc.mjs', '.prettierrc.toml', 'prettier.config.js', 'prettier.config.cjs', 'prettier.config.mjs'],
    local: ['node_modules/.bin/prettier'],
    args: (f) => ['--write', f],
  },
  {
    name: 'biome',
    exts: ['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.json', '.jsonc', '.css'],
    configs: ['biome.json', 'biome.jsonc'],
    local: ['node_modules/.bin/biome'],
    args: (f) => ['format', '--write', f],
  },
  {
    name: 'ruff',
    exts: ['.py', '.pyi'],
    configs: ['ruff.toml', '.ruff.toml', 'pyproject.toml'],
    local: ['.venv/bin/ruff', '.venv/Scripts/ruff.exe'],
    args: (f) => ['format', f],
  },
  {
    name: 'black',
    exts: ['.py', '.pyi'],
    configs: ['pyproject.toml', 'setup.cfg'],
    local: ['.venv/bin/black', '.venv/Scripts/black.exe'],
    args: (f) => ['--quiet', f],
  },
  {
    name: 'gofmt',
    exts: ['.go'],
    configs: ['go.mod'],
    local: [],
    args: (f) => ['-w', f],
  },
  {
    name: 'rustfmt',
    exts: ['.rs'],
    configs: ['Cargo.toml'],
    local: [],
    args: (f) => ['--edition', '2021', f],
  },
];

function projectRoot(cwd) {
  let dir = cwd || process.cwd();
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return cwd || process.cwd();
}

/** A formatter counts as configured only if the repo declares it. */
function isConfigured(fmt, root) {
  return fmt.configs.some((c) => fs.existsSync(path.join(root, c)));
}

function resolveBinary(fmt, root) {
  for (const rel of fmt.local) {
    const p = path.join(root, rel);
    if (fs.existsSync(p)) return p;
  }
  const probe = spawnSync(fmt.name, ['--version'], { stdio: 'ignore', shell: process.platform === 'win32' });
  return probe.status === 0 ? fmt.name : null;
}

(async () => {
  const input = await readInput();
  const raw = input?.tool_input?.file_path ?? input?.tool_input?.notebook_path ?? '';
  if (!raw) allow();

  const file = String(raw);
  if (!fs.existsSync(file)) allow();

  const root = projectRoot(input?.cwd);
  const ext = EXT(file);

  // Ignore anything outside the project, and anything generated.
  const rel = path.relative(root, file).split(path.sep).join('/');
  if (!rel || rel.startsWith('..')) allow();
  if (/(^|\/)(node_modules|vendor|dist|build|\.venv|__pycache__|target)\//.test(rel)) allow();

  const fmt = FORMATTERS.find((f) => f.exts.includes(ext) && isConfigured(f, root));
  if (!fmt) allow();

  // pyproject.toml alone does not mean ruff or black is actually in use.
  if ((fmt.name === 'ruff' || fmt.name === 'black') && fmt.configs.includes('pyproject.toml')) {
    const pyproject = path.join(root, 'pyproject.toml');
    if (fs.existsSync(pyproject)) {
      const body = fs.readFileSync(pyproject, 'utf8');
      if (!new RegExp(`\\b${fmt.name}\\b`).test(body)) allow();
    }
  }

  const bin = resolveBinary(fmt, root);
  if (!bin) allow();

  const before = fs.readFileSync(file);
  const run = spawnSync(bin, fmt.args(file), {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 45000,
    shell: process.platform === 'win32' && !path.isAbsolute(bin),
  });

  if (run.status !== 0) {
    // A formatter that errors usually means the file does not parse. That is
    // worth telling Claude about, but it must not block the turn.
    const detail = String(run.stderr || run.stdout || '').trim().split('\n').slice(0, 5).join('\n');
    if (!detail) allow();
    emit({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: `[guardrails/format] ${fmt.name} could not format ${rel} — the file may not parse:\n${detail}`,
      },
    });
  }

  const after = fs.readFileSync(file);
  if (before.equals(after)) allow();

  emit({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: `[guardrails/format] ${rel} was reformatted by ${fmt.name}. Re-read it before making further edits — line numbers may have shifted.`,
    },
  });
})();
