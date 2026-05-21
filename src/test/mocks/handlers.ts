import { http, HttpResponse } from 'msw';
import type {
  BenchmarkPoint,
  EquityPoint,
  OverallPerformance,
  PortfolioSnapshot,
  StrategyInfo,
  StrategyPerformance,
  StrategyReportResponse,
  TradeLogEntry,
  TradeLogPage,
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
    service_url: 'http://csm-set:8080',
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
  snapshot_date: '2026-05-18',
  total_portfolio_value: 10_000_000,
  weighted_daily_return: 0.0123,
  combined_drawdown: null,
  active_strategies: 1,
  allocation: { 'csm-set-01': 0.6, cash: 0.4 },
  computed_at: isoNow,
};

// Phase 4: Strategy Report fixtures

const tradeLogItems: TradeLogEntry[] = [
  {
    entry_time: '2026-05-15T10:00:00Z',
    exit_time: '2026-05-15T14:30:00Z',
    symbol: 'PTT',
    side: 'LONG',
    qty: 1000,
    entry_price: 32.5,
    exit_price: 33.75,
    realized_pnl: 1250,
    duration_bars: 16,
    commission: 125,
  },
  {
    entry_time: '2026-05-16T10:00:00Z',
    exit_time: '2026-05-16T15:00:00Z',
    symbol: 'SCB',
    side: 'SHORT',
    qty: 500,
    entry_price: 112,
    exit_price: 108.5,
    realized_pnl: 1750,
    duration_bars: 20,
    commission: 175,
  },
  {
    entry_time: '2026-05-17T10:00:00Z',
    exit_time: '2026-05-17T14:00:00Z',
    symbol: 'AOT',
    side: 'LONG',
    qty: 2000,
    entry_price: 61.25,
    exit_price: 60.5,
    realized_pnl: -1500,
    duration_bars: 14,
    commission: 150,
  },
];

const tradeLogPage: TradeLogPage = {
  items: tradeLogItems,
  total: 3,
  limit: 100,
  offset: 0,
};

const benchmarkCurve: BenchmarkPoint[] = [
  { date: '2026-04-19', value: 1000000 },
  { date: '2026-04-26', value: 1012000 },
  { date: '2026-05-03', value: 1008000 },
  { date: '2026-05-10', value: 1025000 },
  { date: '2026-05-17', value: 1030000 },
];

const strategyReportResponse: StrategyReportResponse = {
  strategy_id: 'csm-set-01',
  as_of: '2026-05-18T00:00:00Z',
  computed_at: '2026-05-18T00:00:00Z',
  report: {
    as_of: '2026-05-18T00:00:00Z',
    currency: 'THB',
    initial_capital: 200000,
    headline: {
      total_pnl: 25000,
      total_pnl_pct: 0.125,
      max_drawdown: -15000,
      max_drawdown_pct: -0.075,
      total_trades: 46,
      profitable_trades: 17,
      profitable_trades_pct: 0.3696,
      profit_factor: 1.45,
    },
    profit_structure: {
      total_profit: 45000,
      open_pnl: 25000,
      total_loss: -20000,
      commission: 4500,
      net_pnl: 20500,
    },
    returns: {
      all: {
        initial_capital: 200000,
        open_pnl: 25000,
        net_pnl: 20500,
        gross_profit: 45000,
        gross_loss: -20000,
        profit_factor: 1.45,
        commission_paid: 4500,
        expected_payoff: 445.65,
      },
      long: {
        initial_capital: 200000,
        open_pnl: 18000,
        net_pnl: 16000,
        gross_profit: 30000,
        gross_loss: -12000,
        profit_factor: 1.5,
        commission_paid: 2000,
        expected_payoff: 500,
      },
      short: {
        initial_capital: 200000,
        open_pnl: 7000,
        net_pnl: 4500,
        gross_profit: 15000,
        gross_loss: -8000,
        profit_factor: 1.25,
        commission_paid: 2500,
        expected_payoff: 300,
      },
    },
    benchmark_comparison: {
      buy_and_hold_return: 15000,
      buy_and_hold_pct: 0.075,
      strategy_outperformance: 10000,
    },
    risk_adjusted: {
      sharpe_ratio: 1.42,
      sortino_ratio: 1.85,
    },
    trades_analysis: {
      pnl_distribution: [
        { bucket_low_pct: -0.03, bucket_high_pct: -0.02, count: 5, kind: 'loss' },
        { bucket_low_pct: -0.02, bucket_high_pct: -0.01, count: 12, kind: 'loss' },
        { bucket_low_pct: -0.01, bucket_high_pct: 0, count: 8, kind: 'breakeven' },
        { bucket_low_pct: 0, bucket_high_pct: 0.01, count: 10, kind: 'profit' },
        { bucket_low_pct: 0.01, bucket_high_pct: 0.02, count: 7, kind: 'profit' },
        { bucket_low_pct: 0.02, bucket_high_pct: 0.03, count: 4, kind: 'profit' },
      ],
      win_loss_split: { wins: 17, losses: 29, breakeven: 0 },
    },
    details: {
      all: {
        total_trades: 46,
        total_open_trades: 0,
        winning_trades: 17,
        losing_trades: 29,
        percent_profitable: 0.3696,
        avg_pnl: 543.48,
        avg_winning_trade: 2647.06,
        avg_losing_trade: -689.66,
        ratio_avg_win_avg_loss: 3.84,
        largest_winning_trade: 5000,
        largest_winning_trade_pct: 0.025,
        largest_winner_pct_of_gross_profit: 0.1111,
        largest_losing_trade: -2500,
        largest_losing_trade_pct: -0.0125,
        largest_loser_pct_of_gross_loss: 0.125,
        outliers_count: 2,
        outliers_pnl: -1800,
        avg_bars_in_trades: 16.5,
        avg_bars_in_winning_trades: 18.2,
        avg_bars_in_losing_trades: 14.8,
      },
      long: {
        total_trades: 30,
        total_open_trades: 0,
        winning_trades: 12,
        losing_trades: 18,
        percent_profitable: 0.4,
        avg_pnl: 600,
        avg_winning_trade: 2500,
        avg_losing_trade: -666.67,
        ratio_avg_win_avg_loss: 3.75,
        largest_winning_trade: 5000,
        largest_winning_trade_pct: 0.025,
        largest_winner_pct_of_gross_profit: 0.1667,
        largest_losing_trade: -2500,
        largest_losing_trade_pct: -0.0125,
        largest_loser_pct_of_gross_loss: 0.2083,
        outliers_count: 1,
        outliers_pnl: -800,
        avg_bars_in_trades: 17.1,
        avg_bars_in_winning_trades: 19,
        avg_bars_in_losing_trades: 15.2,
      },
      short: {
        total_trades: 16,
        total_open_trades: 0,
        winning_trades: 5,
        losing_trades: 11,
        percent_profitable: 0.3125,
        avg_pnl: 437.5,
        avg_winning_trade: 3000,
        avg_losing_trade: -727.27,
        ratio_avg_win_avg_loss: 4.125,
        largest_winning_trade: 4000,
        largest_winning_trade_pct: 0.02,
        largest_winner_pct_of_gross_profit: 0.2667,
        largest_losing_trade: -2000,
        largest_losing_trade_pct: -0.01,
        largest_loser_pct_of_gross_loss: 0.25,
        outliers_count: 1,
        outliers_pnl: -1000,
        avg_bars_in_trades: 15.2,
        avg_bars_in_winning_trades: 16.5,
        avg_bars_in_losing_trades: 14.1,
      },
    },
    capital_efficiency: {
      capital_usage: {
        all: {
          cagr: 0.15,
          return_on_initial_capital: 0.125,
          account_size_required: 250000,
          return_on_account_size: 0.1,
          net_profit_pct_of_largest_loss: 0.08,
        },
        long: {
          cagr: 0.12,
          return_on_initial_capital: 0.09,
          account_size_required: 250000,
          return_on_account_size: 0.072,
          net_profit_pct_of_largest_loss: 0.06,
        },
        short: {
          cagr: 0.18,
          return_on_initial_capital: 0.035,
          account_size_required: 250000,
          return_on_account_size: 0.028,
          net_profit_pct_of_largest_loss: 0.02,
        },
      },
      margin_usage: null,
    },
    runups_drawdowns: {
      runups: {
        avg_runup_duration: 12,
        avg_runup_pct: 0.035,
        max_runup: 32000,
        max_runup_pct: 0.16,
        max_runup_intrabar: null,
        max_runup_intrabar_pct: null,
      },
      drawdowns: {
        avg_drawdown_duration: 8,
        avg_drawdown_pct: -0.025,
        max_drawdown: -15000,
        max_drawdown_pct: -0.075,
        max_drawdown_intrabar: null,
        max_drawdown_intrabar_pct: null,
        return_of_max_drawdown: -0.075,
      },
    },
    trades: tradeLogItems,
    benchmark_equity_curve: benchmarkCurve,
  },
};

export const fixtures = {
  overall,
  strategies,
  csmSetPerf,
  equityCurve,
  snapshot,
  strategyReportResponse,
  tradeLogPage,
  benchmarkCurve,
} as const;

export const handlers = [
  http.get('/api/v1/overall-performance', () => HttpResponse.json(overall)),
  http.get('/api/v1/strategies', () => HttpResponse.json(strategies)),
  http.get('/api/v1/strategies/:id/performance', () => HttpResponse.json(csmSetPerf)),
  http.get('/api/v1/strategies/:id/equity-curve', () => HttpResponse.json(equityCurve)),
  http.get('/api/v1/portfolio/equity-curve', () => HttpResponse.json(equityCurve)),
  http.get('/api/v1/portfolio/snapshot', () => HttpResponse.json(snapshot)),
  http.get('/api/v1/portfolio/snapshot/:date', () => HttpResponse.json(snapshot)),

  // Phase 4: Strategy Report endpoints
  http.get('/api/v1/strategies/:id/report', () =>
    HttpResponse.json(strategyReportResponse),
  ),
  http.get('/api/v1/strategies/:id/trades', () => HttpResponse.json(tradeLogPage)),
  http.get('/api/v1/strategies/:id/benchmark-curve', () =>
    HttpResponse.json(benchmarkCurve),
  ),
];
