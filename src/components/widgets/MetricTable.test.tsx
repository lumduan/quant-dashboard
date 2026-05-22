import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MetricTable } from '@/components/widgets/MetricTable';
import { renderWithProviders } from '@/test/render';

const COLUMNS = [
  { key: 'metric', header: 'Metric' },
  { key: 'value', header: 'Value', align: 'right' as const },
];

const ROWS = [
  { metric: 'Total P&L', value: '+฿25,000' },
  { metric: 'Sharpe Ratio', value: '1.42' },
];

describe('MetricTable', () => {
  it('renders column headers', () => {
    renderWithProviders(<MetricTable columns={COLUMNS} rows={ROWS} />);
    expect(screen.getByText('Metric')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
  });

  it('renders row data', () => {
    renderWithProviders(<MetricTable columns={COLUMNS} rows={ROWS} />);
    expect(screen.getByText('Total P&L')).toBeInTheDocument();
    expect(screen.getByText('+฿25,000')).toBeInTheDocument();
  });

  it('renders caption for screen readers when provided', () => {
    renderWithProviders(
      <MetricTable columns={COLUMNS} rows={ROWS} caption="Returns breakdown" />,
    );
    expect(screen.getByText('Returns breakdown')).toBeInTheDocument();
  });

  it('renders empty tbody when data is empty', () => {
    const { container } = renderWithProviders(
      <MetricTable columns={COLUMNS} rows={[]} />,
    );
    const tbody = container.querySelector('tbody');
    expect(tbody?.children.length).toBe(0);
  });

  it('applies alignment class to right-aligned columns', () => {
    const { container } = renderWithProviders(
      <MetricTable columns={COLUMNS} rows={ROWS} />,
    );
    const cells = container.querySelectorAll('td');
    const valueCell = cells[1];
    expect(valueCell?.className).toContain('text-right');
  });

  it('uses format function when provided', () => {
    const columns = [
      { key: 'val', header: 'Value', format: (v: unknown) => `$${String(v)}` },
    ];
    renderWithProviders(<MetricTable columns={columns} rows={[{ val: 100 }]} />);
    expect(screen.getByText('$100')).toBeInTheDocument();
  });
});
