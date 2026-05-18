import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { EquityPoint } from '@/types/gateway';
import DrawdownChart from './DrawdownChart';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children?: ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    AreaChart: ({ data, children }: { data: unknown[]; children?: ReactNode }) => (
      <div data-testid="area-chart" data-points={JSON.stringify(data)}>
        {children}
      </div>
    ),
    Area: ({ stroke, dataKey }: { stroke?: string; dataKey?: string }) => (
      <div data-testid="area" data-color={stroke} data-key={dataKey} />
    ),
    Tooltip: ({
      formatter,
      labelFormatter,
    }: {
      formatter?: (v: number) => string;
      labelFormatter?: (l: string) => string;
    }) => (
      <div
        data-testid="tooltip"
        data-value-neg={formatter?.(-12.34)}
        data-value-zero={formatter?.(0)}
        data-label={labelFormatter?.('2026-05-18')}
      />
    ),
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    XAxis: () => <div data-testid="xaxis" />,
    YAxis: () => <div data-testid="yaxis" />,
  };
});

const fixture: EquityPoint[] = [
  { date: '2026-04-19', value: 1_000_000 },
  { date: '2026-04-20', value: 1_050_000 }, // new peak
  { date: '2026-04-21', value: 1_100_000 }, // new peak
  { date: '2026-04-22', value: 1_020_000 }, // drawdown from 1.1M → 1.02M = -7.27%
  { date: '2026-04-23', value: 990_000 }, //  drawdown from 1.1M → 990k  = -10.00%
  { date: '2026-04-24', value: 1_080_000 }, // recovery
];

function getDrawdownSeries(): Array<{ date: string; drawdown: number }> {
  const chart = screen.getByTestId('area-chart');
  const raw = chart.getAttribute('data-points');
  return raw ? JSON.parse(raw) : [];
}

describe('DrawdownChart', () => {
  it('renders the chart container', () => {
    render(<DrawdownChart data={fixture} />);
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    expect(screen.getByTestId('area')).toHaveAttribute('data-key', 'drawdown');
  });

  it('uses red as the area color', () => {
    render(<DrawdownChart data={fixture} />);
    expect(screen.getByTestId('area')).toHaveAttribute('data-color', '#ef4444');
  });

  it('renders a region with the default aria-label', () => {
    render(<DrawdownChart data={fixture} />);
    expect(screen.getByRole('region', { name: 'Portfolio drawdown' })).toBeInTheDocument();
  });

  it('renders the title heading when provided', () => {
    render(<DrawdownChart data={fixture} title="Drawdown" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Drawdown' })).toBeInTheDocument();
  });

  it('starts the series with a drawdown of 0 at the first point', () => {
    render(<DrawdownChart data={fixture} />);
    const series = getDrawdownSeries();
    expect(series[0]?.drawdown).toBe(0);
  });

  it('produces a non-positive drawdown at every point', () => {
    render(<DrawdownChart data={fixture} />);
    const series = getDrawdownSeries();
    for (const point of series) {
      expect(point.drawdown).toBeLessThanOrEqual(0);
    }
  });

  it('drawdown matches the running-peak formula at each point', () => {
    render(<DrawdownChart data={fixture} />);
    const series = getDrawdownSeries();
    let peak = 0;
    fixture.forEach((p, i) => {
      if (p.value > peak) peak = p.value;
      const expected = peak === 0 ? 0 : ((peak - p.value) / peak) * -100;
      expect(series[i]?.drawdown).toBeCloseTo(expected, 6);
    });
  });

  it('max drawdown point equals Math.min(...derivedSeries)', () => {
    render(<DrawdownChart data={fixture} />);
    const series = getDrawdownSeries();
    const values = series.map((p) => p.drawdown);
    const computedMin = Math.min(...values);
    // Reference: peak 1.1M, low 990k → drawdown = (1.1M - 990k) / 1.1M * -100 = -10.0%.
    expect(computedMin).toBeCloseTo(-10, 5);
  });

  it('formats the tooltip value with two decimal places + percent', () => {
    render(<DrawdownChart data={fixture} />);
    const tooltip = screen.getByTestId('tooltip');
    expect(tooltip.getAttribute('data-value-neg')).toBe('-12.34%');
    expect(tooltip.getAttribute('data-value-zero')).toBe('0.00%');
  });

  it('formats the tooltip date label via formatDateTH', () => {
    render(<DrawdownChart data={fixture} />);
    const tooltip = screen.getByTestId('tooltip');
    expect(tooltip.getAttribute('data-label')).toBeTruthy();
    expect(tooltip.getAttribute('data-label')).not.toBe('2026-05-18');
  });

  it('handles an empty data array without crashing', () => {
    render(<DrawdownChart data={[]} />);
    expect(getDrawdownSeries()).toEqual([]);
  });

  it('handles a zero starting peak gracefully (no NaN)', () => {
    const zeroStart: EquityPoint[] = [
      { date: '2026-04-19', value: 0 },
      { date: '2026-04-20', value: 100 },
      { date: '2026-04-21', value: 80 },
    ];
    render(<DrawdownChart data={zeroStart} />);
    const series = getDrawdownSeries();
    expect(series[0]?.drawdown).toBe(0);
    expect(Number.isFinite(series[1]?.drawdown ?? Number.NaN)).toBe(true);
    expect(Number.isFinite(series[2]?.drawdown ?? Number.NaN)).toBe(true);
  });
});
