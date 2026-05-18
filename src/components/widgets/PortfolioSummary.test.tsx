import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { PortfolioSummary } from '@/components/widgets/PortfolioSummary';
import { fixtures } from '@/test/mocks/handlers';
import { server } from '@/test/mocks/server';
import { renderWithProviders } from '@/test/render';
import { formatPercent, formatTHB } from '@/utils/formatters';

describe('PortfolioSummary', () => {
  it('renders a loading skeleton synchronously before the query resolves', () => {
    renderWithProviders(<PortfolioSummary />);
    expect(screen.getByRole('status', { name: /loading portfolio summary/i })).toBeInTheDocument();
  });

  it('renders all four metric values once the query resolves', async () => {
    renderWithProviders(<PortfolioSummary />);
    expect(
      await screen.findByText(formatTHB(fixtures.overall.total_portfolio_value)),
    ).toBeInTheDocument();
    expect(
      screen.getByText(formatPercent(fixtures.overall.weighted_daily_return)),
    ).toBeInTheDocument();
    expect(
      screen.getByText(formatPercent(fixtures.overall.combined_max_drawdown)),
    ).toBeInTheDocument();
    expect(screen.getByText(String(fixtures.overall.active_strategies))).toBeInTheDocument();
    expect(screen.getByText('strategies')).toBeInTheDocument();
  });

  it('applies the trend colour to the daily-return metric (positive → green)', async () => {
    renderWithProviders(<PortfolioSummary />);
    const dailyReturn = await screen.findByText(
      formatPercent(fixtures.overall.weighted_daily_return),
    );
    expect(dailyReturn).toHaveClass('text-green-400');
  });

  it('applies the trend colour to the max-drawdown metric (negative → red)', async () => {
    renderWithProviders(<PortfolioSummary />);
    const drawdown = await screen.findByText(formatPercent(fixtures.overall.combined_max_drawdown));
    expect(drawdown).toHaveClass('text-red-400');
  });

  it('renders an inline alert when the query fails', async () => {
    server.use(
      http.get('/api/v1/overall-performance', () => HttpResponse.json(null, { status: 500 })),
    );
    renderWithProviders(<PortfolioSummary />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/failed to load portfolio summary/i);
  });
});
