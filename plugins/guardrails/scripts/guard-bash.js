#!/usr/bin/env node
'use strict';
// PreToolUse:Bash — intercept commands that are destructive, irreversible, or
// that quietly bypass a safety net.
//
//   deny -> blocked outright; Claude sees the reason and must find another way.
//   ask  -> the user gets a permission prompt with the reason attached.
//
// Anything not matched passes through untouched.

const { readInput, emit, allow } = require('./_hook.js');

// Commands that only read or print text. SQL and shell keywords inside these
// are arguments, not instructions - the single largest source of false hits.
const READ_ONLY_LEADER = /^\s*(sudo\s+)?(grep|rg|ag|ack|echo|printf|cat|bat|less|more|head|tail|awk|sed\s+-n|git\s+grep|find)\b/;

const RULES = [
  {
    id: 'rm-rf-wide',
    decision: 'deny',
    test: (c) =>
      /\brm\s+(-\w+\s+)*-\w*r\w*f|\brm\s+(-\w+\s+)*-\w*f\w*r/i.test(c) &&
      /\brm\s[^|;&]*\s(\/|~|\$HOME|\/\*|~\/\*|\.\.)(\s|$)|\brm\s[^|;&]*\s\*\s*$/.test(c),
    reason:
      'Recursive force-delete of a root, home, or bare-wildcard path. Delete specific named paths instead.',
  },
  {
    id: 'curl-pipe-shell',
    decision: 'deny',
    test: (c) => /\b(curl|wget)\b[^|]*\|\s*(sudo\s+)?(ba|z|k|d)?sh\b/.test(c),
    reason:
      'Piping a downloaded script straight into a shell executes unreviewed remote code. Download it, read it, then run it.',
  },
  {
    id: 'block-device-write',
    decision: 'deny',
    test: (c) => /\b(mkfs\S*|fdisk|dd)\b[^|;&]*\b(of=)?\/dev\/(sd|nvme|disk|hd)/.test(c),
    reason: 'Direct writes to a block device can destroy a filesystem.',
  },
  {
    id: 'force-push-default-branch',
    decision: 'deny',
    test: (c) =>
      /\bgit\s+push\b[^|;&]*\b(main|master|trunk)\b/.test(c) &&
      /--force(?!-with-lease)|(\s|^)-f(\s|$)|--delete|(\s)-d(\s|$)/.test(c),
    reason:
      'Force-pushing or deleting the default branch rewrites history other people depend on.',
  },
  {
    id: 'repo-delete',
    decision: 'deny',
    test: (c) => /\bgh\s+repo\s+delete\b/.test(c),
    reason: 'Deleting a repository is irreversible and cannot be undone by the user either.',
  },

  {
    id: 'force-push',
    decision: 'ask',
    test: (c) =>
      /\bgit\s+push\b/.test(c) && /--force(?!-with-lease)|(\s|^)-f(\s|$)/.test(c),
    reason:
      'Force push can destroy commits others have pulled. --force-with-lease is the safer form.',
  },
  {
    id: 'discard-uncommitted',
    decision: 'ask',
    test: (c) =>
      /\bgit\s+reset\s+--hard\b|\bgit\s+checkout\s+--\s|\bgit\s+restore\s+(--staged\s+)?[.\s]/.test(c),
    reason:
      'This discards uncommitted work irreversibly. git stash push preserves it instead.',
  },
  {
    id: 'git-clean',
    decision: 'ask',
    test: (c) => /\bgit\s+clean\b[^|;&]*-\w*f/.test(c),
    reason:
      'git clean -f permanently deletes untracked files, including local config. Run it with -n first to preview.',
  },
  {
    id: 'skip-hooks',
    decision: 'ask',
    test: (c) =>
      /\bgit\s+(commit|push)\b[^|;&]*--no-verify\b/.test(c) ||
      /\bgit\s+commit\s+(-\w+\s+)*-n\b/.test(c),
    reason:
      'This skips the commit hooks. A failing hook usually reports a real problem worth fixing.',
  },
  {
    id: 'history-rewrite',
    decision: 'ask',
    test: (c) => /\bgit\s+(rebase\b[^|;&]*(-i|--interactive|--onto)|filter-branch|filter-repo)\b/.test(c),
    reason: 'Rewriting history changes commit IDs and breaks anyone who has pulled the branch.',
  },
  {
    id: 'chmod-777',
    decision: 'ask',
    test: (c) => /\bchmod\s+(-\w+\s+)*[0-7]?777\b/.test(c),
    reason: 'chmod 777 makes the target world-writable. Grant the narrowest permission that works.',
  },
  {
    id: 'sql-destructive',
    decision: 'ask',
    skipIfReadOnly: true,
    test: (c) => /\b(DROP|TRUNCATE)\s+(TABLE|DATABASE|SCHEMA)\b/i.test(c),
    reason: 'Destructive SQL against a live database cannot be undone without a backup.',
  },
  {
    id: 'sql-unbounded-delete',
    decision: 'ask',
    skipIfReadOnly: true,
    // Require real SQL shape - a table name, and SET for UPDATE - so that prose
    // such as a commit message reading "UPDATE the docs" does not trigger this.
    test: (c) =>
      (/\bDELETE\s+FROM\s+[\w"`.\[\]]+/i.test(c) ||
        /\bUPDATE\s+[\w"`.\[\]]+\s+SET\b/i.test(c)) &&
      !/\bWHERE\b/i.test(c),
    reason: 'A DELETE or UPDATE with no WHERE clause affects every row in the table.',
  },
  {
    id: 'registry-publish',
    decision: 'ask',
    test: (c) =>
      /\b(npm|yarn|pnpm)\s+publish\b|\bcargo\s+publish\b|\btwine\s+upload\b|\bgem\s+push\b|\bdotnet\s+nuget\s+push\b/.test(c),
    reason: 'Publishing to a package registry is public and effectively irreversible.',
  },
  {
    id: 'secret-file-read',
    decision: 'ask',
    test: (c) => /\b(cat|less|more|head|tail|bat)\s+[^|;&]*(\.env(\.\w+)?|id_[rd]sa|\.pem|credentials)\b/.test(c),
    reason: 'This prints credentials into the transcript, where they persist.',
  },
];

(async () => {
  const input = await readInput();
  const cmd = String(input?.tool_input?.command ?? '');
  if (!cmd.trim()) allow();

  const readOnly = READ_ONLY_LEADER.test(cmd);

  for (const rule of RULES) {
    if (rule.skipIfReadOnly && readOnly) continue;
    if (!rule.test(cmd)) continue;
    emit({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: rule.decision,
        permissionDecisionReason: `[guardrails/${rule.id}] ${rule.reason}`,
      },
    });
  }

  allow();
})();
