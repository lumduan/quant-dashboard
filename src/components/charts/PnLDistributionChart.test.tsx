import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import PnLDistributionChart from '@/components/charts/PnLDistributionChart';
import { renderWithProviders } from '@/test/render';
import type { PnLDistributionBucket } from '@/types/gateway';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children?: ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    BarChart: ({ data, children }: { data: unknown[]; children?: ReactNode }) => (
      <div data-testid="bar-chart" data-points={JSON.stringify(data)}>
        {children}
      </div>
    ),
    Bar: ({ dataKey }: { dataKey: string }) => <div data-testid="bar" data-key={dataKey} />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    ReferenceLine: ({ x, stroke }: { x: string; stroke: string }) => (
      <div data-testid="reference-line" data-x={x} data-stroke={stroke} />
    ),
    Tooltip: () => <div data-testid="tooltip" />,
    XAxis: () => <div data-testid="xaxis" />,
    YAxis: () => <div data-testid="yaxis" />,
  };
});

const buckets: PnLDistributionBucket[] = [
  { bucket_low_pct: -0.03, bucket_high_pct: -0.02, count: 5, kind: 'loss' },
  { bucket_low_pct: -0.02, bucket_high_pct: -0.01, count: 12, kind: 'loss' },
  { bucket_low_pct: -0.01, bucket_high_pct: 0, count: 8, kind: 'breakeven' },
  { bucket_low_pct: 0, bucket_high_pct: 0.01, count: 10, kind: 'profit' },
];

describe('PnLDistributionChart', () => {
  it('renders the chart container', () => {
    renderWithProviders(<PnLDistributionChart buckets={buckets} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('renders with correct aria-label', () => {
    renderWithProviders(<PnLDistributionChart buckets={buckets} />);
    expect(
      screen.getByRole('region', { name: /p&l distribution chart/i }),
    ).toBeInTheDocument();
  });

  it('renders ReferenceLines when avgLossPct and avgProfitPct are provided', () => {
    renderWithProviders(
      <PnLDistributionChart buckets={buckets} avgLossPct={-0.015} avgProfitPct={0.015} />,
    );
    const refLines = screen.getAllByTestId('reference-line');
    expect(refLines).toHaveLength(2);
  });

  it('does not render ReferenceLines when not provided', () => {
    renderWithProviders(<PnLDistributionChart buckets={buckets} />);
    expect(screen.queryByTestId('reference-line')).not.toBeInTheDocument();
  });

  it('passes bucket data to the chart', () => {
    renderWithProviders(<PnLDistributionChart buckets={buckets} />);
    const chartEl = screen.getByTestId('bar-chart');
    const chartData = JSON.parse(chartEl.getAttribute('data-points') ?? '[]') as unknown[];
    expect(chartData).toHaveLength(4);
  });
});
