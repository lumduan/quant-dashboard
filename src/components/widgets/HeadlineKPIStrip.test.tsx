import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HeadlineKPIStrip } from '@/components/widgets/HeadlineKPIStrip';
import { renderWithProviders } from '@/test/render';
import type { Headline } from '@/types/gateway';

const headline: Headline = {
  total_pnl: 25000,
  total_pnl_pct: 0.125,
  max_drawdown: -15000,
  max_drawdown_pct: -0.075,
  total_trades: 46,
  profitable_trades: 17,
  profitable_trades_pct: 0.3696,
  profit_factor: 1.45,
};

describe('HeadlineKPIStrip', () => {
  it('renders five MetricCards', () => {
    renderWithProviders(<HeadlineKPIStrip headline={headline} />);
    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(5);
  });

  it('renders Total P&L card with formatted value', () => {
    renderWithProviders(<HeadlineKPIStrip headline={headline} />);
    expect(screen.getByText(/total p&l/i)).toBeInTheDocument();
  });

  it('renders Profitable Trades card with ratio', () => {
    renderWithProviders(<HeadlineKPIStrip headline={headline} />);
    expect(screen.getByText('17/46')).toBeInTheDocument();
  });

  it('renders Profit Factor card', () => {
    renderWithProviders(<HeadlineKPIStrip headline={headline} />);
    expect(screen.getByText('1.45')).toBeInTheDocument();
  });

  it('renders with a region aria-label', () => {
    renderWithProviders(<HeadlineKPIStrip headline={headline} />);
    expect(
      screen.getByRole('region', { name: /strategy performance headline/i }),
    ).toBeInTheDocument();
  });
});
