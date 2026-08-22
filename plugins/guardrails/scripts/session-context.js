#!/usr/bin/env node
'use strict';
// SessionStart — inject a short, factual snapshot of the repo so the session
// starts oriented instead of spending its first three tool calls on `git status`.
//
// Kept deliberately small. This text is prepended to every session, so every
// line has to earn its place.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { readInput, emit, allow } = require('./_hook.js');

function git(args, cwd) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
    }).trim();
  } catch {
    return '';
  }
}

/** Identify the stack from manifests, which is more reliable than file extensions. */
function detectStack(root) {
  const found = [];
  const check = (file, label, extra) => {
    const p = path.join(root, file);
    if (!fs.existsSync(p)) return;
    found.push(extra ? `${label} (${extra(p)})` : label);
  };

  check('package.json', 'Node', (p) => {
    try {
      const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
      const scripts = Object.keys(pkg.scripts || {});
      const useful = ['dev', 'build', 'test', 'lint', 'typecheck'].filter((s) => scripts.includes(s));
      return useful.length ? `npm run ${useful.join(', ')}` : 'no scripts';
    } catch {
      return 'unreadable package.json';
    }
  });
  check('pyproject.toml', 'Python');
  check('requirements.txt', 'Python (requirements.txt)');
  check('go.mod', 'Go');
  check('Cargo.toml', 'Rust');
  check('Gemfile', 'Ruby');
  check('pom.xml', 'Java (Maven)');
  check('build.gradle', 'Java (Gradle)');
  check('build.gradle.kts', 'Kotlin (Gradle)');
  check('Makefile', 'Makefile');
  check('justfile', 'just');

  return found;
}

(async () => {
  const input = await readInput();
  const cwd = input?.cwd || process.cwd();

  const root = git(['rev-parse', '--show-toplevel'], cwd);
  if (!root) allow(); // Not a git repo: nothing worth saying.

  const lines = [];

  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
  const status = git(['status', '--short'], cwd);
  const changed = status ? status.split('\n').filter(Boolean) : [];

  const head = [branch && `branch \`${branch}\``];
  const upstream = git(['rev-parse', '--abbrev-ref', '@{upstream}'], cwd);
  if (upstream) {
    const counts = git(['rev-list', '--left-right', '--count', `${upstream}...HEAD`], cwd);
    const [behind, ahead] = counts.split(/\s+/).map((n) => parseInt(n, 10) || 0);
    if (ahead || behind) head.push(`${ahead} ahead / ${behind} behind ${upstream}`);
  }
  if (changed.length) head.push(`${changed.length} uncommitted file${changed.length === 1 ? '' : 's'}`);
  else head.push('clean tree');

  lines.push(`**Repo state** — ${head.filter(Boolean).join(' · ')}`);

  if (changed.length && changed.length <= 10) {
    lines.push(changed.map((l) => `  ${l}`).join('\n'));
  }

  const recent = git(['log', '--oneline', '-5'], cwd);
  if (recent) {
    lines.push('', '**Recent commits**', recent.split('\n').map((l) => `  ${l}`).join('\n'));
  }

  const stack = detectStack(root);
  if (stack.length) lines.push('', `**Stack** — ${stack.join('; ')}`);

  // Point at the repo's own instructions rather than restating them.
  const docs = ['CLAUDE.md', 'CONTRIBUTING.md', 'AGENTS.md', 'ARCHITECTURE.md']
    .filter((f) => fs.existsSync(path.join(root, f)));
  if (docs.length) lines.push('', `**Project docs present** — ${docs.join(', ')}`);

  emit({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: lines.join('\n'),
    },
  });
})();
