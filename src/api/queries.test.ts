import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  fetchOverallPerformance,
  fetchPortfolioEquityCurve,
  fetchPortfolioSnapshot,
  fetchStrategies,
  fetchStrategyEquityCurve,
  fetchStrategyPerformance,
} from '@/api/queries';
import { fixtures } from '@/test/mocks/handlers';
import { server } from '@/test/mocks/server';

interface CapturedRequest {
  pathname: string;
  search: URLSearchParams;
}

type JsonPayload = Record<string, unknown> | readonly Record<string, unknown>[];

function captureGet(pattern: string, payload: JsonPayload): { received: CapturedRequest | null } {
  const received: { received: CapturedRequest | null } = { received: null };
  server.use(
    http.get(pattern, ({ request }) => {
      const url = new URL(request.url);
      received.received = { pathname: url.pathname, search: url.searchParams };
      return HttpResponse.json(payload);
    }),
  );
  return received;
}

describe('fetchOverallPerformance', () => {
  it('GETs /api/v1/overall-performance and returns the parsed payload', async () => {
    const captured = captureGet('/api/v1/overall-performance', fixtures.overall);

    const result = await fetchOverallPerformance();

    expect(captured.received?.pathname).toBe('/api/v1/overall-performance');
    expect(result).toEqual(fixtures.overall);
  });
});

describe('fetchStrategies', () => {
  it('GETs /api/v1/strategies', async () => {
    const captured = captureGet('/api/v1/strategies', fixtures.strategies);

    const result = await fetchStrategies();

    expect(captured.received?.pathname).toBe('/api/v1/strategies');
    expect(result).toEqual(fixtures.strategies);
  });
});

describe('fetchStrategyPerformance', () => {
  let captured: { received: CapturedRequest | null };

  beforeEach(() => {
    captured = captureGet('/api/v1/strategies/:id/performance', fixtures.csmSetPerf);
  });

  it('encodes the id in the path and omits query params when no dates are passed', async () => {
    await fetchStrategyPerformance('csm/set 01');

    expect(captured.received?.pathname).toBe('/api/v1/strategies/csm%2Fset%2001/performance');
    expect(captured.received?.search.toString()).toBe('');
  });

  it('attaches from_date and to_date when both are provided', async () => {
    await fetchStrategyPerformance('csm-set-01', '2026-01-01', '2026-05-18');

    expect(captured.received?.pathname).toBe('/api/v1/strategies/csm-set-01/performance');
    expect(captured.received?.search.get('from_date')).toBe('2026-01-01');
    expect(captured.received?.search.get('to_date')).toBe('2026-05-18');
  });

  it('attaches only from_date when to is omitted', async () => {
    await fetchStrategyPerformance('csm-set-01', '2026-01-01');

    expect(captured.received?.search.get('from_date')).toBe('2026-01-01');
    expect(captured.received?.search.has('to_date')).toBe(false);
  });
});

describe('fetchStrategyEquityCurve', () => {
  it('encodes the id and hits /strategies/:id/equity-curve', async () => {
    const captured = captureGet('/api/v1/strategies/:id/equity-curve', fixtures.equityCurve);

    await fetchStrategyEquityCurve('csm/set 01');

    expect(captured.received?.pathname).toBe('/api/v1/strategies/csm%2Fset%2001/equity-curve');
  });
});

describe('fetchPortfolioEquityCurve', () => {
  let captured: { received: CapturedRequest | null };

  beforeEach(() => {
    captured = captureGet('/api/v1/portfolio/equity-curve', fixtures.equityCurve);
  });

  it('omits query params when no options are provided', async () => {
    await fetchPortfolioEquityCurve();

    expect(captured.received?.pathname).toBe('/api/v1/portfolio/equity-curve');
    expect(captured.received?.search.toString()).toBe('');
  });

  it('emits normalize=true as a string when normalize is explicitly true', async () => {
    await fetchPortfolioEquityCurve({ normalize: true });

    expect(captured.received?.search.get('normalize')).toBe('true');
  });

  it('emits normalize=false when normalize is explicitly false', async () => {
    await fetchPortfolioEquityCurve({ normalize: false });

    expect(captured.received?.search.get('normalize')).toBe('false');
  });

  it('attaches from_date and to_date alongside normalize', async () => {
    await fetchPortfolioEquityCurve({
      from: '2026-01-01',
      to: '2026-05-18',
      normalize: true,
    });

    expect(captured.received?.search.get('from_date')).toBe('2026-01-01');
    expect(captured.received?.search.get('to_date')).toBe('2026-05-18');
    expect(captured.received?.search.get('normalize')).toBe('true');
  });
});

describe('fetchPortfolioSnapshot', () => {
  it('hits the latest endpoint when no date is provided', async () => {
    const captured = captureGet('/api/v1/portfolio/snapshot', fixtures.snapshot);

    await fetchPortfolioSnapshot();

    expect(captured.received?.pathname).toBe('/api/v1/portfolio/snapshot');
  });

  it('hits the dated path with an encoded date when one is provided', async () => {
    const captured = captureGet('/api/v1/portfolio/snapshot/:date', fixtures.snapshot);

    await fetchPortfolioSnapshot('2026-05-18');

    expect(captured.received?.pathname).toBe('/api/v1/portfolio/snapshot/2026-05-18');
  });
});
