const TYPES = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'];
const PATTERN = new RegExp(`^(${TYPES.join('|')})(\\([^()\\s][^()]*\\))?!?: \\S.*$`);
const MERGE = /^Merge [0-9a-f]{40} into \S+$/;

export function isConventional(message) {
  return PATTERN.test(message.split('\n')[0]);
}

export function findInvalid(messages, { allowMerge = true } = {}) {
  return messages.filter((m) => !(allowMerge && MERGE.test(m)) && !isConventional(m));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const allowMerge = args[0] !== '--no-merge-exemption';
  const invalid = findInvalid(allowMerge ? args : args.slice(1), { allowMerge });
  for (const m of invalid) console.error(`Not a Conventional Commit: ${m}`);
  process.exit(invalid.length ? 1 : 0);
}
