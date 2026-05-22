import { z } from 'zod';

export const EquityPointSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  value: z.coerce.number(),
});

export const StrategyInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  // `type` is optional — the Gateway does not currently expose this field.
  type: z.string().optional(),
  service_url: z.string(),
  capital_weight: z.coerce.number().min(0).max(1),
  active: z.boolean(),
});

export const StrategyPerformanceSchema = z.object({
  strategy_id: z.string(),
  daily_pnl: z.coerce.number(),
  total_value: z.coerce.number(),
  max_drawdown: z.coerce.number(),
  sharpe_ratio: z.coerce.number(),
  last_updated: z.string().datetime(),
});

export const OverallPerformanceSchema = z.object({
  total_portfolio_value: z.coerce.number(),
  weighted_daily_return: z.coerce.number(),
  combined_max_drawdown: z.coerce.number(),
  active_strategies: z.coerce.number().int(),
  allocation: z.record(z.string(), z.coerce.number()),
  strategies: z.array(StrategyPerformanceSchema),
  computed_at: z.string().datetime(),
});

export const PortfolioSnapshotSchema = z.object({
  snapshot_date: z.string(),
  total_portfolio_value: z.coerce.number(),
  weighted_daily_return: z.coerce.number(),
  combined_drawdown: z.coerce.number().nullable().optional(),
  active_strategies: z.coerce.number().int(),
  allocation: z.record(z.string(), z.coerce.number()),
  computed_at: z.string().datetime(),
});

export const EquityCurveSchema = z.array(EquityPointSchema);
export const StrategyListSchema = z.array(StrategyInfoSchema);

// ── Phase 4: Strategy Report schemas ──────────────────────────────────────

export const BenchmarkPointSchema = z.object({
  date: z.string(),
  value: z.coerce.number(),
});

export const TradeLogEntrySchema = z.object({
  entry_time: z.string(),
  exit_time: z.string(),
  symbol: z.string(),
  side: z.string(),
  qty: z.coerce.number(),
  entry_price: z.coerce.number(),
  exit_price: z.coerce.number(),
  realized_pnl: z.coerce.number(),
  duration_bars: z.coerce.number(),
  commission: z.coerce.number().nullable().optional(),
});

export const TradeLogPageSchema = z.object({
  items: z.array(TradeLogEntrySchema),
  total: z.coerce.number().int(),
  limit: z.coerce.number().int(),
  offset: z.coerce.number().int(),
});

export const HeadlineSchema = z.object({
  total_pnl: z.coerce.number(),
  total_pnl_pct: z.coerce.number(),
  max_equity_drawdown: z.coerce.number(),
  max_equity_drawdown_pct: z.coerce.number(),
  total_trades: z.coerce.number().int(),
  profitable_trades: z.coerce.number().int(),
  profitable_pct: z.coerce.number(),
  profit_factor: z.coerce.number(),
});

export const ProfitStructureSchema = z.object({
  total_profit: z.coerce.number(),
  open_pnl: z.coerce.number(),
  total_loss: z.coerce.number(),
  commission: z.coerce.number(),
  net_pnl: z.coerce.number(),
});

export const ReturnsRowSchema = z.object({
  initial_capital: z.coerce.number(),
  open_pnl: z.coerce.number(),
  net_pnl: z.coerce.number(),
  gross_profit: z.coerce.number(),
  gross_loss: z.coerce.number(),
  profit_factor: z.coerce.number(),
  commission_paid: z.coerce.number(),
  expected_payoff: z.coerce.number(),
});

export const ReturnsSchema = z.object({
  all: ReturnsRowSchema,
  long: ReturnsRowSchema,
  short: ReturnsRowSchema,
});

export const BenchmarkComparisonSchema = z.object({
  buy_and_hold_return: z.coerce.number(),
  buy_and_hold_pct: z.coerce.number(),
  strategy_outperformance: z.coerce.number(),
});

export const RiskAdjustedSchema = z.object({
  sharpe_ratio: z.coerce.number(),
  sortino_ratio: z.coerce.number(),
});

export const PnLDistributionBucketSchema = z.object({
  bucket_low_pct: z.coerce.number(),
  bucket_high_pct: z.coerce.number(),
  count: z.coerce.number().int(),
  kind: z.enum(['loss', 'profit', 'breakeven']),
});

export const WinLossSplitSchema = z.object({
  wins: z.coerce.number().int(),
  losses: z.coerce.number().int(),
  breakeven: z.coerce.number().int(),
});

export const TradesAnalysisSchema = z.object({
  pnl_distribution: z.array(PnLDistributionBucketSchema),
  win_loss_split: WinLossSplitSchema,
});

export const DetailsRowSchema = z.object({
  total_trades: z.coerce.number().int(),
  total_open_trades: z.coerce.number().int(),
  winning_trades: z.coerce.number().int(),
  losing_trades: z.coerce.number().int(),
  percent_profitable: z.coerce.number(),
  avg_pnl: z.coerce.number(),
  avg_winning_trade: z.coerce.number(),
  avg_losing_trade: z.coerce.number(),
  ratio_avg_win_avg_loss: z.coerce.number(),
  largest_winning_trade: z.coerce.number(),
  largest_winning_trade_pct: z.coerce.number(),
  largest_winner_pct_of_gross_profit: z.coerce.number(),
  largest_losing_trade: z.coerce.number(),
  largest_losing_trade_pct: z.coerce.number(),
  largest_loser_pct_of_gross_loss: z.coerce.number(),
  outliers_count: z.coerce.number().int(),
  outliers_pnl: z.coerce.number(),
  avg_bars_in_trades: z.coerce.number(),
  avg_bars_in_winning_trades: z.coerce.number(),
  avg_bars_in_losing_trades: z.coerce.number(),
});

export const DetailsSchema = z.object({
  all: DetailsRowSchema,
  long: DetailsRowSchema,
  short: DetailsRowSchema,
});

export const CapitalUsageRowSchema = z.object({
  annualized_return_cagr: z.coerce.number(),
  return_on_initial_capital: z.coerce.number(),
  account_size_required: z.coerce.number(),
  return_on_account_size_required: z.coerce.number(),
  net_profit_pct_of_largest_loss: z.coerce.number(),
});

export const MarginUsageSchema = z.object({
  avg_margin_used: z.coerce.number().nullable(),
  max_margin_used: z.coerce.number().nullable(),
  margin_efficiency: z.coerce.number().nullable(),
  margin_calls: z.coerce.number().int().nullable(),
});

export const CapitalEfficiencySchema = z.object({
  capital_usage: z.object({
    all: CapitalUsageRowSchema,
    long: CapitalUsageRowSchema,
    short: CapitalUsageRowSchema,
  }),
  margin_usage: MarginUsageSchema.nullable(),
});

export const RunUpRowSchema = z.object({
  avg_duration_days: z.coerce.number(),
  avg_runup: z.coerce.number(),
  max_runup_close_to_close: z.coerce.number(),
  max_runup_intrabar: z.coerce.number().nullable(),
  max_runup_pct_initial_capital_intrabar: z.coerce.number().nullable(),
});

export const DrawdownRowSchema = z.object({
  avg_duration_days: z.coerce.number(),
  avg_drawdown: z.coerce.number(),
  max_drawdown_close_to_close: z.coerce.number(),
  max_drawdown_intrabar: z.coerce.number().nullable(),
  max_drawdown_pct_initial_capital_intrabar: z.coerce.number().nullable(),
  return_of_max_drawdown: z.coerce.number(),
});

export const RunUpsDrawdownsSchema = z.object({
  runups: RunUpRowSchema,
  drawdowns: DrawdownRowSchema,
});

export const StrategyReportSchema = z.object({
  as_of: z.string(),
  currency: z.string(),
  initial_capital: z.coerce.number(),
  headline: HeadlineSchema,
  profit_structure: ProfitStructureSchema,
  returns: ReturnsSchema,
  benchmark_comparison: BenchmarkComparisonSchema.nullable(),
  risk_adjusted: RiskAdjustedSchema,
  trades_analysis: TradesAnalysisSchema,
  details: DetailsSchema,
  capital_efficiency: CapitalEfficiencySchema,
  runups_drawdowns: RunUpsDrawdownsSchema,
  trades: z.array(TradeLogEntrySchema),
  benchmark_equity_curve: z.array(BenchmarkPointSchema),
});

export const StrategyReportResponseSchema = z.object({
  strategy_id: z.string(),
  as_of: z.string(),
  report: StrategyReportSchema,
  computed_at: z.string(),
});
