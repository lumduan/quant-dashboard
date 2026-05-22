import type { z } from 'zod';
import type {
  BenchmarkComparisonSchema,
  BenchmarkPointSchema,
  CapitalEfficiencySchema,
  CapitalUsageRowSchema,
  DetailsRowSchema,
  DetailsSchema,
  DrawdownRowSchema,
  EquityPointSchema,
  HeadlineSchema,
  MarginUsageSchema,
  OverallPerformanceSchema,
  PnLDistributionBucketSchema,
  PortfolioSnapshotSchema,
  ProfitStructureSchema,
  ReturnsRowSchema,
  ReturnsSchema,
  RiskAdjustedSchema,
  RunUpRowSchema,
  RunUpsDrawdownsSchema,
  StrategyInfoSchema,
  StrategyPerformanceSchema,
  StrategyReportResponseSchema,
  StrategyReportSchema,
  TradeLogEntrySchema,
  TradeLogPageSchema,
  TradesAnalysisSchema,
  WinLossSplitSchema,
} from '@/api/schemas';

export type EquityPoint = z.infer<typeof EquityPointSchema>;
export type StrategyInfo = z.infer<typeof StrategyInfoSchema>;
export type StrategyPerformance = z.infer<typeof StrategyPerformanceSchema>;
export type OverallPerformance = z.infer<typeof OverallPerformanceSchema>;
export type PortfolioSnapshot = z.infer<typeof PortfolioSnapshotSchema>;

// Phase 4: Strategy Report types
export type BenchmarkPoint = z.infer<typeof BenchmarkPointSchema>;
export type TradeLogEntry = z.infer<typeof TradeLogEntrySchema>;
export type TradeLogPage = z.infer<typeof TradeLogPageSchema>;
export type Headline = z.infer<typeof HeadlineSchema>;
export type ProfitStructure = z.infer<typeof ProfitStructureSchema>;
export type ReturnsRow = z.infer<typeof ReturnsRowSchema>;
export type Returns = z.infer<typeof ReturnsSchema>;
export type BenchmarkComparison = z.infer<typeof BenchmarkComparisonSchema>;
export type RiskAdjusted = z.infer<typeof RiskAdjustedSchema>;
export type PnLDistributionBucket = z.infer<typeof PnLDistributionBucketSchema>;
export type WinLossSplit = z.infer<typeof WinLossSplitSchema>;
export type TradesAnalysis = z.infer<typeof TradesAnalysisSchema>;
export type DetailsRow = z.infer<typeof DetailsRowSchema>;
export type Details = z.infer<typeof DetailsSchema>;
export type CapitalUsageRow = z.infer<typeof CapitalUsageRowSchema>;
export type MarginUsage = z.infer<typeof MarginUsageSchema>;
export type CapitalEfficiency = z.infer<typeof CapitalEfficiencySchema>;
export type RunUpRow = z.infer<typeof RunUpRowSchema>;
export type DrawdownRow = z.infer<typeof DrawdownRowSchema>;
export type RunUpsDrawdowns = z.infer<typeof RunUpsDrawdownsSchema>;
export type StrategyReport = z.infer<typeof StrategyReportSchema>;
export type StrategyReportResponse = z.infer<typeof StrategyReportResponseSchema>;
