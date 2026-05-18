import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  fetchOverallPerformance,
  fetchPortfolioEquityCurve,
  fetchPortfolioSnapshot,
  fetchStrategies,
  fetchStrategyEquityCurve,
  fetchStrategyPerformance,
} from '@/api/queries';
import type {
  EquityPoint,
  OverallPerformance,
  PortfolioSnapshot,
  StrategyInfo,
  StrategyPerformance,
} from '@/types/gateway';

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
