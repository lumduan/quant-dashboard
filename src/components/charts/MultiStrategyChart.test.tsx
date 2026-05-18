import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { STRATEGY_COLORS } from '@/utils/palette';
import MultiStrategyChart, { type Series } from './MultiStrategyChart';

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
    Line: ({
      stroke,
      dataKey,
      name,
    }: {
      stroke?: string;
      dataKey?: string;
      name?: string;
    }) => <div data-testid="line" data-color={stroke} data-key={dataKey} data-name={name ?? ''} />,
    Legend: () => <div data-testid="legend" />,
    Tooltip: ({ formatter }: { formatter?: (v: number) => string }) => (
      <div data-testid="tooltip" data-value-105={formatter?.(105)} />
    ),
    ReferenceLine: ({ y }: { y: number }) => <div data-testid="reference-line" data-y={y} />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    XAxis: () => <div data-testid="xaxis" />,
    YAxis: () => <div data-testid="yaxis" />,
  };
});

const twoSeries: Series[] = [
  {
    id: 'csm-set',
    label: 'CSM-SET',
    color: STRATEGY_COLORS[0],
    data: [
      { date: '2026-04-19', value: 1_000_000 },
      { date: '2026-04-20', value: 1_050_000 },
      { date: '2026-04-21', value: 1_100_000 },
    ],
  },
  {
    id: 'tfex',
    label: 'TFEX',
    color: STRATEGY_COLORS[1],
    data: [
      { date: '2026-04-19', value: 500 },
      { date: '2026-04-20', value: 510 },
      { date: '2026-04-21', value: 525 },
    ],
  },
];

function getMergedData(): Array<Record<string, number | string>> {
  const chart = screen.getByTestId('line-chart');
  const raw = chart.getAttribute('data-points');
  return raw ? JSON.parse(raw) : [];
}

describe('MultiStrategyChart', () => {
  it('renders one <Line /> per series', () => {
    render(<MultiStrategyChart series={twoSeries} />);
    expect(screen.getAllByTestId('line')).toHaveLength(2);
  });

  it('renders each <Line /> with the series-provided color', () => {
    render(<MultiStrategyChart series={twoSeries} />);
    const lines = screen.getAllByTestId('line');
    const colors = lines.map((l) => l.getAttribute('data-color'));
    expect(colors).toEqual([STRATEGY_COLORS[0], STRATEGY_COLORS[1]]);
    // Sanity: colors are distinct
    expect(colors[0]).not.toBe(colors[1]);
  });

  it('passes the series label to each <Line name=...> for Legend display', () => {
    render(<MultiStrategyChart series={twoSeries} />);
    const lines = screen.getAllByTestId('line');
    const names = lines.map((l) => l.getAttribute('data-name'));
    expect(names).toEqual(['CSM-SET', 'TFEX']);
  });

  it('renders a Legend element', () => {
    render(<MultiStrategyChart series={twoSeries} />);
    expect(screen.getByTestId('legend')).toBeInTheDocument();
  });

  it('renders a ReferenceLine at y=100 (always normalized)', () => {
    render(<MultiStrategyChart series={twoSeries} />);
    expect(screen.getByTestId('reference-line')).toHaveAttribute('data-y', '100');
  });

  it('merges series by date and normalizes each series independently to Base-100', () => {
    render(<MultiStrategyChart series={twoSeries} />);
    const data = getMergedData();
    expect(data).toHaveLength(3);
    expect(data[0]?.['csm-set']).toBe(100);
    expect(data[0]?.tfex).toBe(100);
    expect(data[1]?.['csm-set']).toBeCloseTo(105, 5);
    expect(data[1]?.tfex).toBeCloseTo(102, 5);
    expect(data[2]?.['csm-set']).toBeCloseTo(110, 5);
    expect(data[2]?.tfex).toBeCloseTo(105, 5);
  });

  it('emits one row per unique date across all series, sorted ascending', () => {
    const seriesDifferentDates: Series[] = [
      {
        id: 'a',
        label: 'A',
        color: STRATEGY_COLORS[0],
        data: [
          { date: '2026-04-19', value: 100 },
          { date: '2026-04-20', value: 110 },
        ],
      },
      {
        id: 'b',
        label: 'B',
        color: STRATEGY_COLORS[1],
        data: [
          { date: '2026-04-20', value: 200 },
          { date: '2026-04-21', value: 210 },
        ],
      },
    ];
    render(<MultiStrategyChart series={seriesDifferentDates} />);
    const data = getMergedData();
    expect(data.map((r) => r.date)).toEqual(['2026-04-19', '2026-04-20', '2026-04-21']);
    expect(data[0]?.a).toBe(100);
    expect(data[0]?.b).toBeUndefined();
    expect(data[2]?.a).toBeUndefined();
    expect(data[2]?.b).toBeCloseTo(105, 5);
  });

  it('renders the empty-state status message when series is empty', () => {
    render(<MultiStrategyChart series={[]} />);
    expect(screen.getByRole('status')).toHaveTextContent(/select strategies to compare/i);
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('line')).not.toBeInTheDocument();
  });

  it('renders the title heading when provided', () => {
    render(<MultiStrategyChart series={twoSeries} title="Strategies" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Strategies' })).toBeInTheDocument();
  });

  it('does not crash when series prop changes via rerender (useDeferredValue convergence)', async () => {
    const { rerender } = render(<MultiStrategyChart series={twoSeries} />);
    expect(await screen.findAllByTestId('line')).toHaveLength(2);

    const threeSeries: Series[] = [
      ...twoSeries,
      {
        id: 'crypto',
        label: 'CRYPTO',
        color: STRATEGY_COLORS[2],
        data: [
          { date: '2026-04-19', value: 10 },
          { date: '2026-04-20', value: 11 },
        ],
      },
    ];
    rerender(<MultiStrategyChart series={threeSeries} />);
    expect(await screen.findAllByTestId('line')).toHaveLength(3);
  });

  it('formats the tooltip value as % gain from base-100', () => {
    render(<MultiStrategyChart series={twoSeries} />);
    const tooltip = screen.getByTestId('tooltip');
    expect(tooltip.getAttribute('data-value-105')).toMatch(/\+5\.00%/);
  });
});
