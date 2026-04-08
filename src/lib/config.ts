import "server-only";

/**
 * Reads a required environment variable and throws a descriptive error if it is absent.
 * Use this for all server-side secrets to catch misconfiguration at startup.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}\n` +
        `Copy .env.local.example to .env.local and fill in the value for ${name}.`,
    );
  }
  return value;
}
