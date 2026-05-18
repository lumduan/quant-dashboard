import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { EquityPoint } from '@/types/gateway';
import EquityCurveChart from './EquityCurveChart';

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
    Tooltip: ({
      formatter,
      labelFormatter,
    }: {
      formatter?: (v: number) => string;
      labelFormatter?: (l: string) => string;
    }) => (
      <div
        data-testid="tooltip"
        data-value-105={formatter?.(105)}
        data-value-95={formatter?.(95)}
        data-value-1m={formatter?.(1_050_000)}
        data-label={labelFormatter?.('2026-05-18')}
      />
    ),
    ReferenceLine: ({ y }: { y: number }) => <div data-testid="reference-line" data-y={y} />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    XAxis: () => <div data-testid="xaxis" />,
    YAxis: () => <div data-testid="yaxis" />,
  };
});

const fixture: EquityPoint[] = [
  { date: '2026-04-19', value: 1_000_000 },
  { date: '2026-04-20', value: 1_050_000 },
  { date: '2026-04-21', value: 1_020_000 },
  { date: '2026-04-22', value: 1_100_000 },
];

function getChartData(): Array<{ date: string; value: number }> {
  const chart = screen.getByTestId('line-chart');
  const raw = chart.getAttribute('data-points');
  return raw ? JSON.parse(raw) : [];
}

describe('EquityCurveChart', () => {
  it('renders the chart container', () => {
    render(<EquityCurveChart data={fixture} />);
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('renders the default region label when no title is provided', () => {
    render(<EquityCurveChart data={fixture} />);
    expect(screen.getByRole('region', { name: 'Portfolio equity curve' })).toBeInTheDocument();
  });

  it('renders the title heading when provided', () => {
    render(<EquityCurveChart data={fixture} title="Equity Curve" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Equity Curve' })).toBeInTheDocument();
  });

  it('normalizes to Base-100 by default (first point = 100)', () => {
    render(<EquityCurveChart data={fixture} />);
    const series = getChartData();
    expect(series).toHaveLength(fixture.length);
    expect(series[0]?.value).toBe(100);
    expect(series[1]?.value).toBeCloseTo(105, 5);
    expect(series[3]?.value).toBeCloseTo(110, 5);
  });

  it('renders a ReferenceLine at y=100 when normalized', () => {
    render(<EquityCurveChart data={fixture} />);
    const ref = screen.getByTestId('reference-line');
    expect(ref).toHaveAttribute('data-y', '100');
  });

  it('passes raw THB values through when normalize=false', () => {
    render(<EquityCurveChart data={fixture} normalize={false} />);
    const series = getChartData();
    expect(series.map((p) => p.value)).toEqual(fixture.map((p) => p.value));
  });

  it('omits the ReferenceLine when normalize=false', () => {
    render(<EquityCurveChart data={fixture} normalize={false} />);
    expect(screen.queryByTestId('reference-line')).not.toBeInTheDocument();
  });

  it('formats the tooltip value as percent gain when normalized (105 → +5.00%)', () => {
    render(<EquityCurveChart data={fixture} />);
    const tooltip = screen.getByTestId('tooltip');
    expect(tooltip.getAttribute('data-value-105')).toMatch(/\+5\.00%/);
    expect(tooltip.getAttribute('data-value-95')).toMatch(/-5\.00%/);
  });

  it('formats the tooltip value as THB when raw', () => {
    render(<EquityCurveChart data={fixture} normalize={false} />);
    const tooltip = screen.getByTestId('tooltip');
    expect(tooltip.getAttribute('data-value-1m')).toMatch(/1,050,000/);
  });

  it('formats the tooltip date label via formatDateTH', () => {
    render(<EquityCurveChart data={fixture} />);
    const tooltip = screen.getByTestId('tooltip');
    expect(tooltip.getAttribute('data-label')).toBeTruthy();
    expect(tooltip.getAttribute('data-label')).not.toBe('2026-05-18');
  });

  it('renders an empty series for empty data', () => {
    render(<EquityCurveChart data={[]} />);
    expect(getChartData()).toEqual([]);
  });

  it('renders all 100s when first value is zero', () => {
    const zeroBase: EquityPoint[] = [
      { date: '2026-04-19', value: 0 },
      { date: '2026-04-20', value: 50 },
      { date: '2026-04-21', value: 100 },
    ];
    render(<EquityCurveChart data={zeroBase} />);
    expect(getChartData().map((p) => p.value)).toEqual([100, 100, 100]);
  });
});
