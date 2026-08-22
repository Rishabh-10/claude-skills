#!/usr/bin/env node
'use strict';
// Catch YAML frontmatter mistakes in SKILL.md and agent files without pulling in
// a YAML dependency.
//
// The one that actually bites: square brackets are YAML flow-sequence syntax, so
//   argument-hint: [file to review]
// parses as the ARRAY ["file to review"], not a string, and the schema wants a
// string. Add a comma and it is a three-element array; add a colon and one
// element becomes a map. It fails quietly, which is why it needs a linter.

const fs = require('fs');
const path = require('path');

const root = process.argv[2] || process.cwd();

// Fields the schema types as scalars; a flow collection here is always a bug.
const SCALAR_FIELDS = [
  'name', 'description', 'argument-hint', 'when_to_use', 'model', 'effort',
  'license', 'compatibility', 'agent', 'context', 'shell',
];

const BOOLEAN_FIELDS = [
  'disable-model-invocation', 'user-invocable', 'background',
];

function collect(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full, out);
    else if (entry.name === 'SKILL.md') out.push(full);
    else if (entry.name.endsWith('.md') && path.basename(dir) === 'agents') out.push(full);
  }
  return out;
}

const problems = [];
const files = collect(path.join(root, 'plugins'));

for (const file of files) {
  const rel = path.relative(root, file).split(path.sep).join('/');
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

  if (lines[0] !== '---') {
    problems.push([rel, 1, 'file does not open with a --- frontmatter fence']);
    continue;
  }
  const close = lines.indexOf('---', 1);
  if (close === -1) {
    problems.push([rel, 1, 'frontmatter is never closed']);
    continue;
  }

  const seen = new Set();
  for (let i = 1; i < close; i += 1) {
    const line = lines[i];
    if (!line.trim() || line.startsWith('#') || /^\s/.test(line)) continue;

    const match = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!match) {
      problems.push([rel, i + 1, `not a key: value pair -> ${line}`]);
      continue;
    }
    const [, key, rawValue] = match;
    const value = rawValue.trim();

    if (seen.has(key)) problems.push([rel, i + 1, `duplicate key "${key}"`]);
    seen.add(key);

    if (SCALAR_FIELDS.includes(key)) {
      if (value.startsWith('[') || value.startsWith('{')) {
        problems.push([
          rel, i + 1,
          `"${key}" starts with ${value[0]} so YAML parses it as a collection, not a string. Wrap the value in double quotes.`,
        ]);
      } else if (value === '') {
        problems.push([rel, i + 1, `"${key}" has an empty value`]);
      } else if (/^[*&!]/.test(value)) {
        problems.push([
          rel, i + 1,
          `"${key}" starts with ${value[0]}, which is YAML syntax. Wrap the value in double quotes.`,
        ]);
      }
    }

    if (BOOLEAN_FIELDS.includes(key) && !['true', 'false'].includes(value)) {
      problems.push([rel, i + 1, `"${key}" must be true or false, got ${value}`]);
    }
  }

  if (!seen.has('name')) problems.push([rel, 1, 'missing required "name"']);
  if (!seen.has('description')) problems.push([rel, 1, 'missing required "description"']);
}

for (const [file, line, message] of problems) {
  console.log(`  FAIL  ${file}:${line}`);
  console.log(`        ${message}`);
}

if (!problems.length) {
  console.log(`  ok    ${files.length} skill and agent files, frontmatter clean`);
}
process.exit(problems.length ? 1 : 0);
