import { z } from 'zod';

export const EquityPointSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  value: z.number(),
});

export const StrategyInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  capital_weight: z.number().min(0).max(1),
  active: z.boolean(),
});

export const StrategyPerformanceSchema = z.object({
  strategy_id: z.string(),
  daily_pnl: z.number(),
  total_value: z.number(),
  max_drawdown: z.number(),
  sharpe_ratio: z.number(),
  last_updated: z.string().datetime(),
});

export const OverallPerformanceSchema = z.object({
  total_portfolio_value: z.number(),
  weighted_daily_return: z.number(),
  combined_max_drawdown: z.number(),
  active_strategies: z.number().int(),
  allocation: z.record(z.string(), z.number()),
  strategies: z.array(StrategyPerformanceSchema),
  computed_at: z.string().datetime(),
});

export const PortfolioSnapshotSchema = z.object({
  date: z.string(),
  total_value: z.number(),
  weighted_return: z.number(),
  allocation: z.record(z.string(), z.number()),
});

export const EquityCurveSchema = z.array(EquityPointSchema);
export const StrategyListSchema = z.array(StrategyInfoSchema);
