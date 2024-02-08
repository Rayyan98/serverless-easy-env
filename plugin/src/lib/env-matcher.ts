export function inferEnv(
  envMatchers: Array<{
    pattern: RegExp;
    env: string;
  }>,
  rawEnv: string
) {
  for (const { pattern, env } of envMatchers) {
    if (pattern.test(rawEnv)) {
      return env;
    }
  }
  return rawEnv;
}
