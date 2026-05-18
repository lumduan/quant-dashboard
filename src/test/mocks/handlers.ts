import { http, HttpResponse } from 'msw';
import type {
  EquityPoint,
  OverallPerformance,
  PortfolioSnapshot,
  StrategyInfo,
  StrategyPerformance,
} from '@/types/gateway';

const isoNow = '2026-05-18T00:00:00.000Z';

const csmSetPerf: StrategyPerformance = {
  strategy_id: 'csm-set-01',
  daily_pnl: 12_345.67,
  total_value: 5_500_000,
  max_drawdown: -0.0823,
  sharpe_ratio: 1.42,
  last_updated: isoNow,
};

const overall: OverallPerformance = {
  total_portfolio_value: 10_000_000,
  weighted_daily_return: 0.0123,
  combined_max_drawdown: -0.0876,
  active_strategies: 1,
  allocation: { 'csm-set-01': 0.6, cash: 0.4 },
  strategies: [csmSetPerf],
  computed_at: isoNow,
};

const strategies: StrategyInfo[] = [
  {
    id: 'csm-set-01',
    name: 'CSM-SET Equity Momentum',
    type: 'EQUITY_MOMENTUM',
    capital_weight: 0.6,
    active: true,
  },
];

const equityCurve: EquityPoint[] = [
  { date: '2026-01-01', value: 100 },
  { date: '2026-02-01', value: 103.5 },
  { date: '2026-03-01', value: 101.2 },
];

const snapshot: PortfolioSnapshot = {
  date: '2026-05-18',
  total_value: 10_000_000,
  weighted_return: 0.0123,
  allocation: { 'csm-set-01': 0.6, cash: 0.4 },
};

export const fixtures = {
  overall,
  strategies,
  csmSetPerf,
  equityCurve,
  snapshot,
} as const;

export const handlers = [
  http.get('/api/v1/overall-performance', () => HttpResponse.json(overall)),
  http.get('/api/v1/strategies', () => HttpResponse.json(strategies)),
  http.get('/api/v1/strategies/:id/performance', () => HttpResponse.json(csmSetPerf)),
  http.get('/api/v1/strategies/:id/equity-curve', () => HttpResponse.json(equityCurve)),
  http.get('/api/v1/portfolio/equity-curve', () => HttpResponse.json(equityCurve)),
  http.get('/api/v1/portfolio/snapshot', () => HttpResponse.json(snapshot)),
  http.get('/api/v1/portfolio/snapshot/:date', () => HttpResponse.json(snapshot)),
];
