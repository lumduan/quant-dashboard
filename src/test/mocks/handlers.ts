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

// 30 deterministic daily points from 2026-04-19 to 2026-05-18 starting at 1,000,000.
// Closed-form daily return = drift + sinusoidal swing + a deliberate mid-period dip
// produces a curve with at least one meaningful drawdown for the DrawdownChart test fixtures.
function buildEquityCurve(): EquityPoint[] {
  const points: EquityPoint[] = [];
  const startDate = new Date('2026-04-19T00:00:00.000Z');
  let value = 1_000_000;
  for (let i = 0; i < 30; i++) {
    if (i > 0) {
      const drift = 0.003;
      const swing = 0.012 * Math.sin((i / 30) * 2 * Math.PI);
      const dip = i >= 11 && i <= 15 ? -0.012 : 0;
      const dailyReturn = drift + swing + dip;
      value = value * (1 + dailyReturn);
    }
    const date = new Date(startDate);
    date.setUTCDate(date.getUTCDate() + i);
    const isoDate = date.toISOString().slice(0, 10);
    points.push({ date: isoDate, value: Math.round(value) });
  }
  return points;
}

const equityCurve: EquityPoint[] = buildEquityCurve();

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
