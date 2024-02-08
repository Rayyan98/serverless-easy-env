function serializeEnvMatchers(envMatchers: Record<string, string>) {
  return Object.entries(envMatchers).map(([env, pattern]) => ({
    env,
    pattern,
  }));
}

function encapsulateMatcherPattern(pattern: string) {
  return `${pattern.startsWith("^") ? "" : "^"}${pattern}${
    pattern.endsWith("$") ? "" : "$"
  }`;
}

function regexEnvMatchers(
  envMatchers: {
    env: string;
    pattern: string;
  }[]
) {
  return envMatchers.map(({ env, pattern }) => ({
    env,
    pattern: new RegExp(encapsulateMatcherPattern(pattern)),
  }));
}

export function inferEnv(envMatchers: Record<string, string>, rawEnv: string) {
  for (const { pattern, env } of regexEnvMatchers(
    serializeEnvMatchers(envMatchers)
  )) {
    if (pattern.test(rawEnv)) {
      return env;
    }
  }
  return rawEnv;
}
