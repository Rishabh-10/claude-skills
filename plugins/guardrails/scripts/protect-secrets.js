#!/usr/bin/env node
'use strict';
// PreToolUse:Read|Edit|Write|NotebookEdit — keep credential files out of the
// transcript, and stop hand-edits landing in generated files.
//
// Reading a .env file copies live secrets into conversation history, where they
// stay. Asking first is cheap; unlearning a leaked key is not.

const path = require('path');
const { readInput, emit, allow } = require('./_hook.js');

// Paths are normalised to forward slashes before matching, so a single set of
// patterns covers both Windows and POSIX.

// Credentials. Reading these leaks them; ask before either read or write.
const SECRET_PATTERNS = [
  /(^|\/)\.env(\.[\w-]+)?$/i,
  /(^|\/)(id_rsa|id_dsa|id_ecdsa|id_ed25519)$/,
  /\.(pem|key|pfx|p12|keystore|jks)$/i,
  /(^|\/)\.(npmrc|pypirc|netrc)$/,
  /(^|\/)credentials(\.(json|ya?ml|ini))?$/i,
  /(^|\/)service-account[\w-]*\.json$/i,
  /(^|\/)\.(aws|ssh|gnupg)\//,
  /(^|\/)secrets?\.(json|ya?ml|toml|ini)$/i,
  /(^|\/)\.credentials\.json$/,
];

// Machine-generated files. Editing these by hand desynchronises them from
// their source of truth; they should be regenerated instead.
const GENERATED_PATTERNS = [
  /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?)$/,
  /(^|\/)(poetry\.lock|uv\.lock|Pipfile\.lock|Cargo\.lock|Gemfile\.lock|composer\.lock|go\.sum)$/,
  /(^|\/)(node_modules|vendor|dist|build|out|\.next|\.nuxt|\.venv|__pycache__|target)\//,
  /\.min\.(js|css)$/,
  /\.(pb|generated)\.(go|ts|js|py)$/,
];

// Example and template files carry placeholders, not secrets.
const SAFE_PATTERNS = [
  /\.(example|sample|template)$/i,
  /(^|\/)\.env\.(example|sample|template|defaults)$/i,
];

const WRITE_TOOLS = new Set(['Edit', 'Write', 'NotebookEdit']);

/** Project-relative where possible, always forward-slashed. */
function normalise(file, cwd) {
  const rel = path.isAbsolute(file) ? path.relative(cwd || process.cwd(), file) : file;
  const chosen = rel && !rel.startsWith('..') ? rel : file;
  return chosen.split(path.sep).join('/').replace(/\\/g, '/');
}

(async () => {
  const input = await readInput();
  const tool = String(input?.tool_name ?? '');
  const raw = input?.tool_input?.file_path ?? input?.tool_input?.notebook_path ?? '';
  if (!raw) allow();

  const probe = normalise(String(raw), input?.cwd);

  if (SAFE_PATTERNS.some((re) => re.test(probe))) allow();

  const ask = (reason) =>
    emit({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason: reason,
      },
    });

  if (SECRET_PATTERNS.some((re) => re.test(probe))) {
    ask(
      WRITE_TOOLS.has(tool)
        ? `[guardrails/secrets] ${probe} holds credentials. Writing here risks committing a live secret — confirm this is intended.`
        : `[guardrails/secrets] ${probe} holds credentials. Reading it copies them into the transcript, where they persist. Prefer the matching .example file, or confirm you need the real values.`
    );
  }

  if (WRITE_TOOLS.has(tool) && GENERATED_PATTERNS.some((re) => re.test(probe))) {
    ask(
      `[guardrails/generated] ${probe} is generated. Hand-editing it desynchronises it from its source — regenerate it with the project's own tool instead.`
    );
  }

  allow();
})();
