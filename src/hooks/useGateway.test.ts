import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type PropsWithChildren, type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import {
  useOverallPerformance,
  usePortfolioEquityCurve,
  usePortfolioSnapshot,
  useStrategies,
  useStrategyEquityCurve,
  useStrategyPerformance,
} from '@/hooks/useGateway';
import { fixtures } from '@/test/mocks/handlers';

const FIVE_MINUTES = 5 * 60_000;

function makeWrapper(): {
  wrapper: (props: PropsWithChildren) => ReactElement;
  client: QueryClient;
} {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: PropsWithChildren): ReactElement =>
    createElement(QueryClientProvider, { client }, children);
  return { wrapper, client };
}

describe('useOverallPerformance', () => {
  it('uses the ["overall-performance"] cache key', () => {
    const { wrapper, client } = makeWrapper();
    renderHook(() => useOverallPerformance(), { wrapper });
    const cached = client.getQueryCache().findAll();
    expect(cached).toHaveLength(1);
    expect(cached[0]?.queryKey).toEqual(['overall-performance']);
  });

  it('configures a 5-minute refetchInterval', () => {
    const { wrapper, client } = makeWrapper();
    renderHook(() => useOverallPerformance(), { wrapper });
    const observer = client.getQueryCache().findAll()[0]?.observers[0];
    expect(observer?.options.refetchInterval).toBe(FIVE_MINUTES);
  });

  it('resolves with the parsed Gateway payload end-to-end', async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useOverallPerformance(), { wrapper });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual(fixtures.overall);
  });
});

describe('useStrategies', () => {
  it('uses the ["strategies"] cache key', () => {
    const { wrapper, client } = makeWrapper();
    renderHook(() => useStrategies(), { wrapper });
    expect(client.getQueryCache().findAll()[0]?.queryKey).toEqual(['strategies']);
  });

  it('flows MSW data through Zod parsing into the hook result', async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useStrategies(), { wrapper });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual(fixtures.strategies);
  });
});

describe('useStrategyEquityCurve', () => {
  it('builds the ["equity-curve", "strategy", id] cache key', () => {
    const { wrapper, client } = makeWrapper();
    renderHook(() => useStrategyEquityCurve('csm-set-01'), { wrapper });
    expect(client.getQueryCache().findAll()[0]?.queryKey).toEqual([
      'equity-curve',
      'strategy',
      'csm-set-01',
    ]);
  });

  it('is disabled when id is the empty string', () => {
    const { wrapper, client } = makeWrapper();
    const { result } = renderHook(() => useStrategyEquityCurve(''), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
    const query = client.getQueryCache().findAll()[0];
    expect(query?.state.fetchStatus).toBe('idle');
  });
});

describe('usePortfolioEquityCurve', () => {
  it('uses ["equity-curve", "portfolio", { normalize, from, to }] with defaults', () => {
    const { wrapper, client } = makeWrapper();
    renderHook(() => usePortfolioEquityCurve(), { wrapper });
    expect(client.getQueryCache().findAll()[0]?.queryKey).toEqual([
      'equity-curve',
      'portfolio',
      { normalize: true, from: undefined, to: undefined },
    ]);
  });

  it('reflects explicit normalize/from/to in the cache key', () => {
    const { wrapper, client } = makeWrapper();
    renderHook(() => usePortfolioEquityCurve(false, '2026-01-01', '2026-05-18'), { wrapper });
    expect(client.getQueryCache().findAll()[0]?.queryKey).toEqual([
      'equity-curve',
      'portfolio',
      { normalize: false, from: '2026-01-01', to: '2026-05-18' },
    ]);
  });
});

describe('useStrategyPerformance', () => {
  it('uses ["strategy-performance", id, { from, to }] as its cache key', () => {
    const { wrapper, client } = makeWrapper();
    renderHook(() => useStrategyPerformance('csm-set-01', '2026-01-01', '2026-05-18'), { wrapper });
    expect(client.getQueryCache().findAll()[0]?.queryKey).toEqual([
      'strategy-performance',
      'csm-set-01',
      { from: '2026-01-01', to: '2026-05-18' },
    ]);
  });

  it('is disabled when id is empty', () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useStrategyPerformance(''), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });
});

describe('usePortfolioSnapshot', () => {
  it('uses ["portfolio-snapshot", "latest"] when no date is passed', () => {
    const { wrapper, client } = makeWrapper();
    renderHook(() => usePortfolioSnapshot(), { wrapper });
    expect(client.getQueryCache().findAll()[0]?.queryKey).toEqual(['portfolio-snapshot', 'latest']);
  });

  it('uses the passed-in date as the cache-key suffix', () => {
    const { wrapper, client } = makeWrapper();
    renderHook(() => usePortfolioSnapshot('2026-05-18'), { wrapper });
    expect(client.getQueryCache().findAll()[0]?.queryKey).toEqual([
      'portfolio-snapshot',
      '2026-05-18',
    ]);
  });
});
