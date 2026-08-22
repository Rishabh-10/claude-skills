'use strict';
// Shared helpers for guardrails hooks. Cross-platform: no jq, no shell built-ins.

/** Read the hook payload from stdin. Resolves to {} on any parse failure. */
function readInput() {
  return new Promise((resolve) => {
    let raw = '';
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      try {
        resolve(raw.trim() ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    };
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { raw += chunk; });
    process.stdin.on('end', done);
    process.stdin.on('error', done);
    // stdin never closing must not hang the tool call.
    setTimeout(done, 5000).unref();
  });
}

/** Emit a hook result and exit 0. Exit 0 with JSON is how decisions are returned. */
function emit(payload) {
  if (payload) process.stdout.write(JSON.stringify(payload));
  process.exit(0);
}

/** Allow the tool call to proceed with no comment. */
function allow() {
  process.exit(0);
}

/** Block the tool call with a reason Claude will see. */
function deny(event, reason) {
  emit({
    hookSpecificOutput: {
      hookEventName: event,
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  });
}

/** Add context to the conversation without changing the decision. */
function context(event, text) {
  emit({
    hookSpecificOutput: {
      hookEventName: event,
      additionalContext: text,
    },
  });
}

module.exports = { readInput, emit, allow, deny, context };
