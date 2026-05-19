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
