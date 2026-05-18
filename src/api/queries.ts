import { apiFetch } from '@/api/client';
import {
  EquityCurveSchema,
  OverallPerformanceSchema,
  PortfolioSnapshotSchema,
  StrategyListSchema,
  StrategyPerformanceSchema,
} from '@/api/schemas';
import type {
  EquityPoint,
  OverallPerformance,
  PortfolioSnapshot,
  StrategyInfo,
  StrategyPerformance,
} from '@/types/gateway';

export function fetchOverallPerformance(): Promise<OverallPerformance> {
  return apiFetch('/api/v1/overall-performance', OverallPerformanceSchema);
}

export function fetchStrategies(): Promise<StrategyInfo[]> {
  return apiFetch('/api/v1/strategies', StrategyListSchema);
}

export function fetchStrategyPerformance(
  id: string,
  from?: string,
  to?: string,
): Promise<StrategyPerformance> {
  const qs = new URLSearchParams();
  if (from) qs.set('from_date', from);
  if (to) qs.set('to_date', to);
  const tail = qs.toString();
  return apiFetch(
    `/api/v1/strategies/${encodeURIComponent(id)}/performance${tail ? `?${tail}` : ''}`,
    StrategyPerformanceSchema,
  );
}

export function fetchStrategyEquityCurve(id: string): Promise<EquityPoint[]> {
  return apiFetch(`/api/v1/strategies/${encodeURIComponent(id)}/equity-curve`, EquityCurveSchema);
}

export interface PortfolioEquityCurveParams {
  readonly from?: string | undefined;
  readonly to?: string | undefined;
  readonly normalize?: boolean | undefined;
}

export function fetchPortfolioEquityCurve(
  params?: PortfolioEquityCurveParams,
): Promise<EquityPoint[]> {
  const qs = new URLSearchParams();
  if (params?.from) qs.set('from_date', params.from);
  if (params?.to) qs.set('to_date', params.to);
  if (params?.normalize !== undefined) qs.set('normalize', String(params.normalize));
  const tail = qs.toString();
  return apiFetch(`/api/v1/portfolio/equity-curve${tail ? `?${tail}` : ''}`, EquityCurveSchema);
}

export function fetchPortfolioSnapshot(date?: string): Promise<PortfolioSnapshot> {
  const path = date
    ? `/api/v1/portfolio/snapshot/${encodeURIComponent(date)}`
    : '/api/v1/portfolio/snapshot';
  return apiFetch(path, PortfolioSnapshotSchema);
}
