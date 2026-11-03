const TYPES = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'];
const PATTERN = new RegExp(`^(${TYPES.join('|')})(\\([^()\\s][^()]*\\))?!?: \\S.*$`);
const MERGE = /^Merge [0-9a-f]{40} into \S+$/;

export function isConventional(message) {
  return PATTERN.test(message.split('\n')[0]);
}

export function findInvalid(messages) {
  return messages.filter((m) => !MERGE.test(m) && !isConventional(m));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const invalid = findInvalid(process.argv.slice(2).filter((m) => m.trim() !== ''));
  for (const m of invalid) console.error(`Not a Conventional Commit: ${m}`);
  process.exit(invalid.length ? 1 : 0);
}
