import { apiFetch } from '@/api/client';
import {
  BenchmarkPointSchema,
  EquityCurveSchema,
  OverallPerformanceSchema,
  PortfolioSnapshotSchema,
  StrategyListSchema,
  StrategyPerformanceSchema,
  StrategyReportResponseSchema,
  TradeLogPageSchema,
} from '@/api/schemas';
import { z } from 'zod';
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

const BenchmarkCurveSchema = z.array(BenchmarkPointSchema);

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

// ── Phase 4: Strategy Report queries ──────────────────────────────────────

export interface StrategyTradesParams {
  readonly from_date?: string | undefined;
  readonly to_date?: string | undefined;
  readonly limit?: number | undefined;
  readonly offset?: number | undefined;
}

export interface BenchmarkCurveParams {
  readonly from_date?: string | undefined;
  readonly to_date?: string | undefined;
  readonly normalize?: boolean | undefined;
}

export function fetchStrategyReport(
  id: string,
  date?: string,
): Promise<StrategyReportResponse> {
  const qs = new URLSearchParams();
  if (date) qs.set('date', date);
  const tail = qs.toString();
  return apiFetch(
    `/api/v1/strategies/${encodeURIComponent(id)}/report${tail ? `?${tail}` : ''}`,
    StrategyReportResponseSchema,
  );
}

export function fetchStrategyTrades(
  id: string,
  params: StrategyTradesParams,
): Promise<TradeLogPage> {
  const qs = new URLSearchParams();
  if (params.from_date) qs.set('from_date', params.from_date);
  if (params.to_date) qs.set('to_date', params.to_date);
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  if (params.offset !== undefined) qs.set('offset', String(params.offset));
  const tail = qs.toString();
  return apiFetch(
    `/api/v1/strategies/${encodeURIComponent(id)}/trades${tail ? `?${tail}` : ''}`,
    TradeLogPageSchema,
  );
}

export function fetchStrategyBenchmarkCurve(
  id: string,
  params: BenchmarkCurveParams,
): Promise<BenchmarkPoint[]> {
  const qs = new URLSearchParams();
  if (params.from_date) qs.set('from_date', params.from_date);
  if (params.to_date) qs.set('to_date', params.to_date);
  if (params.normalize !== undefined) qs.set('normalize', String(params.normalize));
  const tail = qs.toString();
  return apiFetch(
    `/api/v1/strategies/${encodeURIComponent(id)}/benchmark-curve${tail ? `?${tail}` : ''}`,
    BenchmarkCurveSchema,
  );
}
