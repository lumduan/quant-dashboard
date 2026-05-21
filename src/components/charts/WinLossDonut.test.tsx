import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import WinLossDonut from '@/components/charts/WinLossDonut';
import { renderWithProviders } from '@/test/render';
import type { WinLossSplit } from '@/types/gateway';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children?: ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    PieChart: ({ children }: { children?: ReactNode }) => (
      <div data-testid="pie-chart">{children}</div>
    ),
    Pie: ({ data, children }: { data: unknown[]; children?: ReactNode }) => (
      <div data-testid="pie" data-points={JSON.stringify(data)}>
        {children}
      </div>
    ),
    Cell: ({ fill }: { fill: string }) => <div data-testid="cell" data-fill={fill} />,
    Tooltip: () => <div data-testid="tooltip" />,
  };
});

const split: WinLossSplit = {
  wins: 17,
  losses: 29,
  breakeven: 0,
};

describe('WinLossDonut', () => {
  it('renders the chart container', () => {
    renderWithProviders(<WinLossDonut split={split} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('renders with correct aria-label', () => {
    renderWithProviders(<WinLossDonut split={split} />);
    expect(
      screen.getByRole('region', { name: /win\/loss donut chart/i }),
    ).toBeInTheDocument();
  });

  it('displays total trades in center label', () => {
    renderWithProviders(<WinLossDonut split={split} />);
    expect(screen.getByText('46')).toBeInTheDocument();
    expect(screen.getByText('Total trades')).toBeInTheDocument();
  });

  it('passes 3 data slices to Pie', () => {
    renderWithProviders(<WinLossDonut split={split} />);
    const pieEl = screen.getByTestId('pie');
    const pieData = JSON.parse(pieEl.getAttribute('data-points') ?? '[]') as unknown[];
    expect(pieData).toHaveLength(3);
  });
});
