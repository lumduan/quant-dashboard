import type { JSX } from 'react';
import { MetricTable, type MetricTableColumn } from '@/components/widgets/MetricTable';
import { formatTHB } from '@/utils/formatters';
import type { Returns } from '@/types/gateway';

export interface ReturnsTableProps {
  readonly data: Returns;
}

const COLUMNS: ReadonlyArray<MetricTableColumn> = [
  { key: 'side', header: '', align: 'left' },
  {
    key: 'initial_capital',
    header: 'Initial Capital',
    align: 'right',
    format: (v) => formatTHB(Number(v)),
  },
  {
    key: 'open_pnl',
    header: 'Open P&L',
    align: 'right',
    format: (v) => formatTHB(Number(v), { signed: true }),
  },
  {
    key: 'net_pnl',
    header: 'Net P&L',
    align: 'right',
    format: (v) => formatTHB(Number(v), { signed: true }),
  },
  {
    key: 'gross_profit',
    header: 'Gross Profit',
    align: 'right',
    format: (v) => formatTHB(Number(v)),
  },
  {
    key: 'gross_loss',
    header: 'Gross Loss',
    align: 'right',
    format: (v) => formatTHB(Number(v)),
  },
  {
    key: 'profit_factor',
    header: 'Profit Factor',
    align: 'right',
    format: (v) => Number(v).toFixed(2),
  },
  {
    key: 'commission_paid',
    header: 'Commission',
    align: 'right',
    format: (v) => formatTHB(Number(v)),
  },
  {
    key: 'expected_payoff',
    header: 'Expected Payoff',
    align: 'right',
    format: (v) => formatTHB(Number(v), { signed: true }),
  },
];

export function ReturnsTable({ data }: ReturnsTableProps): JSX.Element {
  const rows = [
    { side: 'All', ...data.all },
    { side: 'Long', ...data.long },
    { side: 'Short', ...data.short },
  ];
  return <MetricTable columns={COLUMNS} rows={rows} caption="Returns by side" />;
}
