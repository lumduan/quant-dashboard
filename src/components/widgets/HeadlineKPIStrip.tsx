import type { JSX } from 'react';
import { MetricCard } from '@/components/widgets/MetricCard';
import { formatPercent, formatTHB, trendColor } from '@/utils/formatters';
import type { Headline } from '@/types/gateway';

export interface HeadlineKPIStripProps {
  readonly headline: Headline;
}

export function HeadlineKPIStrip({ headline }: HeadlineKPIStripProps): JSX.Element {
  return (
    <section aria-label="Strategy performance headline" className="report-section">
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
        <MetricCard
          label="Total P&amp;L"
          value={formatTHB(headline.total_pnl, { signed: true })}
          colorClass={trendColor(headline.total_pnl)}
        />
        <MetricCard
          label="Total P&amp;L %"
          value={formatPercent(headline.total_pnl_pct)}
          colorClass={trendColor(headline.total_pnl_pct)}
        />
        <MetricCard
          label="Max Drawdown"
          value={formatPercent(headline.max_drawdown_pct)}
          colorClass={trendColor(headline.max_drawdown_pct)}
        />
        <MetricCard
          label="Profitable Trades"
          value={`${headline.profitable_trades}/${headline.total_trades}`}
          subtitle={formatPercent(headline.profitable_trades_pct)}
        />
        <MetricCard
          label="Profit Factor"
          value={headline.profit_factor.toFixed(2)}
        />
      </div>
    </section>
  );
}
