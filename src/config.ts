import { z } from 'zod';

const EnvSchema = z.object({
  VITE_APP_NAME: z.string().min(1),
  VITE_APP_VERSION: z.string().min(1),
  VITE_API_BASE_URL: z.string().url(),
});

export type Config = z.infer<typeof EnvSchema>;

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export function loadConfig(env: unknown = import.meta.env): Config {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new ConfigError(
      `Invalid environment configuration. Copy .env.example to .env and set the missing values.\n${issues}`,
    );
  }
  return parsed.data;
}

let cached: Config | undefined;

export function getConfig(): Config {
  if (cached === undefined) {
    cached = loadConfig();
  }
  return cached;
}

export function resetConfigCache(): void {
  cached = undefined;
}
