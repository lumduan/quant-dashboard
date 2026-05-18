import type { z } from 'zod';
import type {
  EquityPointSchema,
  OverallPerformanceSchema,
  PortfolioSnapshotSchema,
  StrategyInfoSchema,
  StrategyPerformanceSchema,
} from '@/api/schemas';

export type EquityPoint = z.infer<typeof EquityPointSchema>;
export type StrategyInfo = z.infer<typeof StrategyInfoSchema>;
export type StrategyPerformance = z.infer<typeof StrategyPerformanceSchema>;
export type OverallPerformance = z.infer<typeof OverallPerformanceSchema>;
export type PortfolioSnapshot = z.infer<typeof PortfolioSnapshotSchema>;
