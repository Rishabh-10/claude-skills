#!/usr/bin/env bash
# Validate every plugin in this marketplace, plus the JSON and JS that back them.
# Runs on Git Bash, macOS, and Linux.
set -uo pipefail

cd "$(dirname "$0")/.." || exit 1
fail=0

step() { printf '\n\033[1m%s\033[0m\n' "$1"; }
ok()   { printf '  \033[32mok\033[0m    %s\n' "$1"; }
bad()  { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; fail=1; }

step "JSON syntax"
for f in .claude-plugin/marketplace.json plugins/*/.claude-plugin/plugin.json \
         plugins/*/hooks/hooks.json templates/settings.json; do
  [ -f "$f" ] || continue
  if node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" "$f" 2>/dev/null; then
    ok "$f"
  else
    bad "$f"
  fi
done

step "Hook scripts parse"
for f in plugins/*/scripts/*.js; do
  [ -f "$f" ] || continue
  if node --check "$f" 2>/dev/null; then ok "$f"; else bad "$f"; fi
done

step "Skill and agent frontmatter"
node scripts/check-frontmatter.js . || fail=1

step "Every marketplace entry resolves to a plugin"
node - <<'NODE' || fail=1
const fs = require('fs');
const mk = JSON.parse(fs.readFileSync('.claude-plugin/marketplace.json', 'utf8'));
let bad = 0;
for (const p of mk.plugins) {
  const dir = typeof p.source === 'string' ? p.source : null;
  if (!dir) { console.log(`  skip  ${p.name} (non-path source)`); continue; }
  const manifest = `${dir}/.claude-plugin/plugin.json`;
  if (!fs.existsSync(manifest)) {
    console.log(`  FAIL  ${p.name} -> ${manifest} missing`); bad = 1; continue;
  }
  const m = JSON.parse(fs.readFileSync(manifest, 'utf8'));
  if (m.name !== p.name) {
    console.log(`  FAIL  ${p.name} -> manifest name is "${m.name}"`); bad = 1; continue;
  }
  if (m.version !== p.version) {
    console.log(`  FAIL  ${p.name} -> version ${p.version} vs manifest ${m.version}`); bad = 1; continue;
  }
  console.log(`  ok    ${p.name} v${m.version}`);
}
process.exit(bad);
NODE

step "claude plugin validate"
if command -v claude >/dev/null 2>&1; then
  for d in plugins/*/; do
    if claude plugin validate "$d" >/dev/null 2>&1; then
      ok "$d"
    else
      bad "$d"
      claude plugin validate "$d" 2>&1 | sed 's/^/        /'
    fi
  done
else
  printf '  skipped (claude CLI not on PATH)\n'
fi

printf '\n'
if [ "$fail" -eq 0 ]; then
  printf '\033[32mAll checks passed.\033[0m\n'
else
  printf '\033[31mSome checks failed.\033[0m\n'
fi
exit "$fail"
