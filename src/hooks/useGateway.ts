import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  fetchOverallPerformance,
  fetchPortfolioEquityCurve,
  fetchPortfolioSnapshot,
  fetchStrategies,
  fetchStrategyBenchmarkCurve,
  fetchStrategyEquityCurve,
  fetchStrategyPerformance,
  fetchStrategyReport,
  fetchStrategyTrades,
} from '@/api/queries';
import type {
  BenchmarkPoint,
  EquityPoint,
  OverallPerformance,
  PortfolioSnapshot,
  StrategyInfo,
  StrategyPerformance,
  StrategyReportResponse,
  TradeLogPage,
} from '@/types/gateway';
import type { BenchmarkCurveParams, StrategyTradesParams } from '@/api/queries';

const FIVE_MINUTES = 5 * 60_000;
const FOUR_AND_A_HALF_MINUTES = FIVE_MINUTES - 30_000;

export function useOverallPerformance(): UseQueryResult<OverallPerformance, Error> {
  return useQuery({
    queryKey: ['overall-performance'],
    queryFn: fetchOverallPerformance,
    refetchInterval: FIVE_MINUTES,
    staleTime: FOUR_AND_A_HALF_MINUTES,
  });
}

export function useStrategies(): UseQueryResult<StrategyInfo[], Error> {
  return useQuery({
    queryKey: ['strategies'],
    queryFn: fetchStrategies,
  });
}

export function useStrategyEquityCurve(id: string): UseQueryResult<EquityPoint[], Error> {
  return useQuery({
    queryKey: ['equity-curve', 'strategy', id],
    queryFn: () => fetchStrategyEquityCurve(id),
    enabled: Boolean(id),
  });
}

export function usePortfolioEquityCurve(
  normalize = true,
  from?: string,
  to?: string,
): UseQueryResult<EquityPoint[], Error> {
  return useQuery({
    queryKey: ['equity-curve', 'portfolio', { normalize, from, to }],
    queryFn: () => fetchPortfolioEquityCurve({ normalize, from, to }),
  });
}

export function useStrategyPerformance(
  id: string,
  from?: string,
  to?: string,
): UseQueryResult<StrategyPerformance, Error> {
  return useQuery({
    queryKey: ['strategy-performance', id, { from, to }],
    queryFn: () => fetchStrategyPerformance(id, from, to),
    enabled: Boolean(id),
  });
}

export function usePortfolioSnapshot(date?: string): UseQueryResult<PortfolioSnapshot, Error> {
  return useQuery({
    queryKey: ['portfolio-snapshot', date ?? 'latest'],
    queryFn: () => fetchPortfolioSnapshot(date),
  });
}

// ── Phase 4: Strategy Report hooks ────────────────────────────────────────

const TEN_MINUTES = 10 * 60_000;

export function useStrategyReport(
  id: string,
  date?: string,
): UseQueryResult<StrategyReportResponse, Error> {
  return useQuery({
    queryKey: ['strategy-report', id, date],
    queryFn: () => fetchStrategyReport(id, date),
    enabled: Boolean(id),
    staleTime: FOUR_AND_A_HALF_MINUTES,
    gcTime: TEN_MINUTES,
    retry: 1,
  });
}

export function useStrategyTrades(
  id: string,
  params: StrategyTradesParams,
): UseQueryResult<TradeLogPage, Error> {
  return useQuery({
    queryKey: ['strategy-trades', id, params],
    queryFn: () => fetchStrategyTrades(id, params),
    enabled: Boolean(id),
    staleTime: FOUR_AND_A_HALF_MINUTES,
    gcTime: TEN_MINUTES,
    retry: 1,
    placeholderData: keepPreviousData,
  });
}

export function useStrategyBenchmarkCurve(
  id: string,
  params: BenchmarkCurveParams,
): UseQueryResult<BenchmarkPoint[], Error> {
  return useQuery({
    queryKey: ['strategy-benchmark-curve', id, params],
    queryFn: () => fetchStrategyBenchmarkCurve(id, params),
    enabled: Boolean(id),
    staleTime: FOUR_AND_A_HALF_MINUTES,
    gcTime: TEN_MINUTES,
    retry: 1,
  });
}
