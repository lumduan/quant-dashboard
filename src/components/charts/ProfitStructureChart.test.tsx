import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import ProfitStructureChart from '@/components/charts/ProfitStructureChart';
import { renderWithProviders } from '@/test/render';
import type { ProfitStructure } from '@/types/gateway';

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

const data: ProfitStructure = {
  total_profit: 45000,
  open_pnl: 25000,
  total_loss: -20000,
  commission: 4500,
  net_pnl: 20500,
};

describe('ProfitStructureChart', () => {
  it('renders the chart container', () => {
    renderWithProviders(<ProfitStructureChart data={data} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('renders with correct aria-label', () => {
    renderWithProviders(<ProfitStructureChart data={data} />);
    expect(
      screen.getByRole('region', { name: /profit structure chart/i }),
    ).toBeInTheDocument();
  });

  it('passes 5 bar data entries', () => {
    renderWithProviders(<ProfitStructureChart data={data} />);
    const chartEl = screen.getByTestId('bar-chart');
    const chartData = JSON.parse(chartEl.getAttribute('data-points') ?? '[]') as unknown[];
    expect(chartData).toHaveLength(5);
  });
});
