import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { ApiError, apiFetch } from '@/api/client';
import { OverallPerformanceSchema } from '@/api/schemas';
import { fixtures } from '@/test/mocks/handlers';
import { server } from '@/test/mocks/server';

describe('ApiError', () => {
  it('sets name, status, url, and message from the constructor args', () => {
    const error = new ApiError(503, '/api/v1/foo', 'service unavailable');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.status).toBe(503);
    expect(error.url).toBe('/api/v1/foo');
    expect(error.message).toBe('service unavailable');
  });
});

describe('apiFetch', () => {
  const path = '/api/v1/overall-performance';

  it('returns parsed, typed data on a valid response', async () => {
    server.use(http.get(path, () => HttpResponse.json(fixtures.overall)));

    const result = await apiFetch(path, OverallPerformanceSchema);

    expect(result).toEqual(fixtures.overall);
  });

  it('throws ApiError with the upstream status on a non-OK HTTP response', async () => {
    server.use(http.get(path, () => new HttpResponse(null, { status: 404 })));

    let caught: unknown;
    try {
      await apiFetch(path, OverallPerformanceSchema);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ApiError);
    const err = caught as ApiError;
    expect(err.status).toBe(404);
    expect(err.url).toBe(path);
    expect(err.name).toBe('ApiError');
    expect(err.message).toContain('HTTP 404');
  });

  it('throws ApiError with a "Schema mismatch" message when the payload shape is wrong', async () => {
    server.use(http.get(path, () => HttpResponse.json({ wrong: 'shape' })));

    let caught: unknown;
    try {
      await apiFetch(path, OverallPerformanceSchema);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ApiError);
    const err = caught as ApiError;
    expect(err.name).toBe('ApiError');
    expect(err.message).toContain('Schema mismatch');
  });

  it('forwards init.headers but preserves the Content-Type default', async () => {
    let observedAuth: string | null = null;
    let observedContentType: string | null = null;
    server.use(
      http.get(path, ({ request }) => {
        observedAuth = request.headers.get('authorization');
        observedContentType = request.headers.get('content-type');
        return HttpResponse.json(fixtures.overall);
      }),
    );

    await apiFetch(path, OverallPerformanceSchema, {
      headers: { Authorization: 'Bearer token-123' },
    });

    expect(observedAuth).toBe('Bearer token-123');
    expect(observedContentType).toBe('application/json');
  });
});
