import { useMemo, type JSX } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { REPORT_COLORS } from '@/utils/palette';
import type { WinLossSplit } from '@/types/gateway';

export interface WinLossDonutProps {
  readonly split: WinLossSplit;
  readonly height?: number;
}

interface DonutDatum {
  readonly name: string;
  readonly value: number;
  readonly fill: string;
}

export default function WinLossDonut({ split, height = 320 }: WinLossDonutProps): JSX.Element {
  const totalTrades = split.wins + split.losses + split.breakeven;

  const chartData: DonutDatum[] = useMemo(
    () => [
      { name: 'Wins', value: split.wins, fill: REPORT_COLORS.positive },
      { name: 'Losses', value: split.losses, fill: REPORT_COLORS.negative },
      { name: 'Breakeven', value: split.breakeven, fill: REPORT_COLORS.neutral },
    ],
    [split],
  );

  return (
    <section aria-label="Win/loss donut chart" className="report-section">
      <div className="relative" style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="80%"
              dataKey="value"
              isAnimationActive={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: unknown) => {
                if (typeof value === 'number') return [value, 'Trades'];
                return [String(value), ''];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          aria-hidden="true"
        >
          <span className="text-2xl font-bold text-white">{totalTrades}</span>
          <span className="text-xs text-[#787B86]">Total trades</span>
        </div>
      </div>
    </section>
  );
}
