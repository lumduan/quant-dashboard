import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfigError, getConfig, loadConfig, resetConfigCache } from '@/config';

const validEnv = {
  VITE_APP_NAME: 'quant-dashboard',
  VITE_APP_VERSION: '0.1.0',
  VITE_API_BASE_URL: 'http://localhost:8000',
} as const;

afterEach(() => {
  vi.unstubAllEnvs();
  resetConfigCache();
});

describe('loadConfig', () => {
  it('returns a typed config when all env vars are valid', () => {
    const result = loadConfig(validEnv);
    expect(result).toEqual(validEnv);
  });

  it('throws ConfigError when VITE_API_BASE_URL is missing', () => {
    const { VITE_API_BASE_URL: _omit, ...missing } = validEnv;
    expect(() => loadConfig(missing)).toThrow(ConfigError);
    expect(() => loadConfig(missing)).toThrow(/VITE_API_BASE_URL/);
  });

  it('throws ConfigError when VITE_API_BASE_URL is not a URL', () => {
    const bad = { ...validEnv, VITE_API_BASE_URL: 'not-a-url' };
    expect(() => loadConfig(bad)).toThrow(ConfigError);
    expect(() => loadConfig(bad)).toThrow(/VITE_API_BASE_URL/);
  });

  it('throws ConfigError when VITE_APP_NAME is empty', () => {
    const bad = { ...validEnv, VITE_APP_NAME: '' };
    expect(() => loadConfig(bad)).toThrow(ConfigError);
    expect(() => loadConfig(bad)).toThrow(/VITE_APP_NAME/);
  });
});

describe('getConfig', () => {
  it('reads from import.meta.env and caches the result', () => {
    vi.stubEnv('VITE_APP_NAME', validEnv.VITE_APP_NAME);
    vi.stubEnv('VITE_APP_VERSION', validEnv.VITE_APP_VERSION);
    vi.stubEnv('VITE_API_BASE_URL', validEnv.VITE_API_BASE_URL);

    const first = getConfig();
    const second = getConfig();

    expect(first).toEqual(validEnv);
    expect(second).toBe(first);
  });

  it('re-reads env after resetConfigCache()', () => {
    vi.stubEnv('VITE_APP_NAME', 'first');
    vi.stubEnv('VITE_APP_VERSION', '0.1.0');
    vi.stubEnv('VITE_API_BASE_URL', 'http://first.example.com');

    const first = getConfig();
    expect(first.VITE_APP_NAME).toBe('first');

    resetConfigCache();
    vi.stubEnv('VITE_APP_NAME', 'second');
    const second = getConfig();
    expect(second.VITE_APP_NAME).toBe('second');
  });
});
