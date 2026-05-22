import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import BenchmarkRangeBar from '@/components/charts/BenchmarkRangeBar';
import { renderWithProviders } from '@/test/render';

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
    Tooltip: () => <div data-testid="tooltip" />,
    XAxis: () => <div data-testid="xaxis" />,
    YAxis: () => <div data-testid="yaxis" />,
  };
});

describe('BenchmarkRangeBar', () => {
  it('renders the chart container', () => {
    renderWithProviders(
      <BenchmarkRangeBar
        strategyReturn={0.125}
        strategyMin={-0.05}
        strategyMax={0.2}
        buyAndHoldReturn={0.075}
        buyAndHoldMin={-0.1}
        buyAndHoldMax={0.15}
      />,
    );
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('renders with correct aria-label', () => {
    renderWithProviders(
      <BenchmarkRangeBar
        strategyReturn={0.125}
        strategyMin={-0.05}
        strategyMax={0.2}
        buyAndHoldReturn={0.075}
        buyAndHoldMin={-0.1}
        buyAndHoldMax={0.15}
      />,
    );
    expect(
      screen.getByRole('region', { name: /benchmark comparison chart/i }),
    ).toBeInTheDocument();
  });

  it('passes 2 data entries for strategy and buy-and-hold', () => {
    renderWithProviders(
      <BenchmarkRangeBar
        strategyReturn={0.125}
        strategyMin={-0.05}
        strategyMax={0.2}
        buyAndHoldReturn={0.075}
        buyAndHoldMin={-0.1}
        buyAndHoldMax={0.15}
      />,
    );
    const chartEl = screen.getByTestId('bar-chart');
    const chartData = JSON.parse(chartEl.getAttribute('data-points') ?? '[]') as unknown[];
    expect(chartData).toHaveLength(2);
  });
});
