import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CSMSetAdapter } from '@/components/strategy/CSMSetAdapter';
import { renderWithProviders } from '@/test/render';
import type { StrategyInfo } from '@/types/gateway';

// Phase 5 pattern: mock recharts shells so the chart's render is asserted via
// data-testid attributes — no SVG / DOM measurement in jsdom.
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

const csmSetStrategy: StrategyInfo = {
  id: 'csm-set-01',
  name: 'CSM-SET Equity Momentum',
  type: 'EQUITY_MOMENTUM',
  service_url: 'http://localhost',
  capital_weight: 0.6,
  active: true,
};

describe('CSMSetAdapter', () => {
  it('renders the capital-weight badge', () => {
    renderWithProviders(<CSMSetAdapter strategy={csmSetStrategy} />);
    expect(screen.getByText('Weight: 60% of portfolio')).toBeInTheDocument();
  });

  it('renders the adapter region labelled with the strategy name', () => {
    renderWithProviders(<CSMSetAdapter strategy={csmSetStrategy} />);
    expect(
      screen.getByRole('region', { name: 'CSM-SET Equity Momentum adapter' }),
    ).toBeInTheDocument();
  });

  it('shows the loading skeleton while performance data is pending', () => {
    renderWithProviders(<CSMSetAdapter strategy={csmSetStrategy} />);
    expect(screen.getByLabelText('Loading strategy performance')).toBeInTheDocument();
  });

  it('renders all four performance metrics with formatted fixture values', async () => {
    renderWithProviders(<CSMSetAdapter strategy={csmSetStrategy} />);
    // fixtures.csmSetPerf: daily_pnl=12_345.67 → formatTHB rounds to 12,346;
    // total_value=5_500_000, sharpe_ratio=1.42, max_drawdown=-0.0823.
    expect(await screen.findByText(/12,3\d\d/)).toBeInTheDocument();
    expect(screen.getByText(/5,500,000/)).toBeInTheDocument();
    expect(screen.getByText('1.42')).toBeInTheDocument();
    expect(screen.getByText('-8.23%')).toBeInTheDocument();
  });

  it('renders the lazy EquityCurveChart region once equity-curve data resolves', async () => {
    renderWithProviders(<CSMSetAdapter strategy={csmSetStrategy} />);
    // Suspense resolves once the EquityCurveChart chunk loads + curve data arrives.
    expect(
      await screen.findByRole('region', { name: 'Equity Curve' }, { timeout: 3000 }),
    ).toBeInTheDocument();
  });

  it('renders the DEV-only raw-JSON details viewer in dev mode', () => {
    // Vitest runs Vite in dev mode by default → import.meta.env.DEV === true.
    renderWithProviders(<CSMSetAdapter strategy={csmSetStrategy} />);
    expect(screen.getByText('Raw JSON')).toBeInTheDocument();
  });
});
