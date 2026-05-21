export const STRATEGY_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'] as const;

export type StrategyColor = (typeof STRATEGY_COLORS)[number];

export const REPORT_COLORS = {
  positive: '#26A69A',
  negative: '#EF5350',
  accent: '#2962FF',
  neutral: '#787B86',
  bg: '#131722',
  panel: '#1E222D',
} as const satisfies Record<string, string>;
