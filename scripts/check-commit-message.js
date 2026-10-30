#!/usr/bin/env node
const TYPES = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'];
const CONVENTIONAL = new RegExp(`^(${TYPES.join('|')})(\\([^()\\s]+\\))?!?: \\S`);
const GITHUB_MERGE = /^Merge [0-9a-f]{40} into [0-9a-f]{40}$/;

function isConventional(message) {
  const subject = String(message).split('\n')[0].trim();
  if (GITHUB_MERGE.test(subject)) return true;
  return CONVENTIONAL.test(subject);
}

module.exports = { isConventional };

if (require.main === module) {
  const messages = process.argv.slice(2);
  const bad = messages.filter((m) => !isConventional(m));
  for (const m of bad) console.error(`Not a Conventional Commit: ${m}`);
  process.exit(bad.length ? 1 : 0);
}
