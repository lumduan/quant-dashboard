import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { StrategyAdapterFactory } from '@/components/strategy/StrategyAdapterFactory';
import { renderWithProviders } from '@/test/render';
import type { StrategyInfo } from '@/types/gateway';

// CSMSetAdapter renders the lazy EquityCurveChart which pulls in Recharts; mock
// the same shells used in EquityCurveChart.test.tsx so jsdom doesn't try to
// render SVG.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children?: ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    LineChart: ({ data, children }: { data: unknown[]; children?: ReactNode }) => (
      <div data-testid="line-chart" data-points={JSON.stringify(data)}>
        {children}
      </div>
    ),
    Line: ({ stroke }: { stroke?: string }) => <div data-testid="line" data-color={stroke} />,
    Tooltip: () => <div data-testid="tooltip" />,
    ReferenceLine: ({ y }: { y: number }) => <div data-testid="reference-line" data-y={y} />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    XAxis: () => <div data-testid="xaxis" />,
    YAxis: () => <div data-testid="yaxis" />,
  };
});

function buildStrategy(overrides: Partial<StrategyInfo>): StrategyInfo {
  return {
    id: 'csm-set-01',
    name: 'Synthetic Strategy',
    type: 'EQUITY_MOMENTUM',
    capital_weight: 0.5,
    active: true,
    ...overrides,
  };
}

describe('StrategyAdapterFactory', () => {
  it('routes EQUITY_MOMENTUM strategies to CSMSetAdapter', () => {
    const strategy = buildStrategy({ name: 'EquityMomo', type: 'EQUITY_MOMENTUM' });
    renderWithProviders(<StrategyAdapterFactory strategy={strategy} />);
    expect(screen.getByRole('region', { name: 'EquityMomo adapter' })).toBeInTheDocument();
  });

  it('routes TFEX_FUTURES strategies to TFEXAdapter', () => {
    const strategy = buildStrategy({ name: 'TfexPilot', type: 'TFEX_FUTURES' });
    renderWithProviders(<StrategyAdapterFactory strategy={strategy} />);
    expect(screen.getByRole('region', { name: 'TfexPilot adapter (TFEX)' })).toBeInTheDocument();
    expect(screen.getByText('TFEX integration coming soon')).toBeInTheDocument();
  });

  it('falls back to DefaultAdapter for unknown strategy types', () => {
    const strategy = buildStrategy({ name: 'MysteryStrat', type: 'OPTIONS_GAMMA' });
    renderWithProviders(<StrategyAdapterFactory strategy={strategy} />);
    expect(
      screen.getByRole('region', { name: 'MysteryStrat adapter (default)' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Strategy type "OPTIONS_GAMMA" has no adapter/)).toBeInTheDocument();
  });
});
