import { useMemo, type JSX } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { REPORT_COLORS } from '@/utils/palette';
import { formatTHB } from '@/utils/formatters';
import type { ProfitStructure } from '@/types/gateway';

export interface ProfitStructureChartProps {
  readonly data: ProfitStructure;
  readonly height?: number;
}

interface BarDatum {
  readonly name: string;
  readonly value: number;
  readonly fill: string;
}

export default function ProfitStructureChart({
  data,
  height = 320,
}: ProfitStructureChartProps): JSX.Element {
  const chartData: BarDatum[] = useMemo(
    () => [
      { name: 'Total Profit', value: data.total_profit, fill: REPORT_COLORS.positive },
      { name: 'Open P&L', value: data.open_pnl, fill: REPORT_COLORS.accent },
      { name: 'Total Loss', value: data.total_loss, fill: REPORT_COLORS.negative },
      { name: 'Commission', value: data.commission, fill: REPORT_COLORS.neutral },
      { name: 'Net P&L', value: data.net_pnl, fill: REPORT_COLORS.accent },
    ],
    [data],
  );

  return (
    <section aria-label="Profit structure chart" className="report-section">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 20, top: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2E39" />
          <XAxis type="number" tick={{ fill: '#787B86', fontSize: 12 }} />
          <YAxis type="category" dataKey="name" tick={{ fill: '#787B86', fontSize: 12 }} width={80} />
          <Tooltip
            formatter={(value: unknown) => {
              if (typeof value === 'number') return [formatTHB(value), ''];
              return [String(value), ''];
            }}
          />
          <Bar dataKey="value" isAnimationActive={false} radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
