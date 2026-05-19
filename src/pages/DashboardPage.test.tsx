import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { DashboardPage } from '@/pages/DashboardPage';
import { server } from '@/test/mocks/server';
import { renderWithProviders } from '@/test/render';

describe('DashboardPage', () => {
  it('renders the Dashboard heading', () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
  });

  it('renders the FilterBar with the StrategySelector and DateRangePicker', async () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByRole('region', { name: 'Filters' })).toBeInTheDocument();
    expect(screen.getByLabelText('From')).toBeInTheDocument();
    expect(screen.getByLabelText('To')).toBeInTheDocument();
    await screen.findByRole('checkbox', { name: /CSM-SET Equity Momentum/ });
  });

  it('renders the PortfolioSummary and AllocationBar once data resolves', async () => {
    renderWithProviders(<DashboardPage />);
    expect(await screen.findByRole('region', { name: 'Portfolio summary' })).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: 'Capital allocation' })).toBeInTheDocument();
  });

  it('renders the lazy equity-curve and drawdown chart regions once data resolves', async () => {
    renderWithProviders(<DashboardPage />);
    expect(await screen.findByRole('region', { name: 'Equity Curve' })).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: 'Drawdown' })).toBeInTheDocument();
  });

  it('renders the MultiStrategyChart populated with all active strategies by default', async () => {
    renderWithProviders(<DashboardPage />);
    // No filter → all active strategies selected → MultiStrategyChart renders
    // a series for csm-set-01 (the only active fixture). The empty-state
    // placeholder ("select strategies to compare") must NOT appear.
    expect(await screen.findByRole('region', { name: 'Strategy Comparison' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText(/select strategies to compare/i)).toBeNull();
    });
  });

  it('reflects ?strategy= in the URL by checking the matching box on first render', async () => {
    renderWithProviders(<DashboardPage />, { route: '/?strategy=csm-set-01' });
    const checkbox = await screen.findByRole('checkbox', { name: /CSM-SET Equity Momentum/ });
    expect(checkbox).toBeChecked();
  });

  it('shows the empty-state placeholder when there are no active strategies', async () => {
    server.use(http.get('/api/v1/strategies', () => HttpResponse.json([])));
    renderWithProviders(<DashboardPage />);
    expect(await screen.findByText(/select strategies to compare/i)).toBeInTheDocument();
  });

  it('re-fetches the portfolio equity curve when the date range changes', async () => {
    let captured: URLSearchParams | null = null;
    server.use(
      http.get('/api/v1/portfolio/equity-curve', ({ request }) => {
        captured = new URL(request.url).searchParams;
        return HttpResponse.json([]);
      }),
    );
    renderWithProviders(<DashboardPage />, { route: '/' });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-02-01' } });
    await waitFor(() => {
      expect(captured?.get('from_date')).toBe('2026-02-01');
    });
  });

  it('renders one series per strategy when multiple active strategies are present', async () => {
    server.use(
      http.get('/api/v1/strategies', () =>
        HttpResponse.json([
          {
            id: 'csm-set-01',
            name: 'CSM-SET Equity Momentum',
            type: 'EQUITY_MOMENTUM',
            capital_weight: 0.6,
            active: true,
          },
          {
            id: 'tfex-01',
            name: 'TFEX Futures Alpha',
            type: 'TFEX_FUTURES',
            capital_weight: 0.4,
            active: true,
          },
        ]),
      ),
    );
    renderWithProviders(<DashboardPage />);
    const checkboxes = await screen.findAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0]).toHaveAccessibleName(/CSM-SET Equity Momentum/);
    expect(checkboxes[1]).toHaveAccessibleName(/TFEX Futures Alpha/);
  });
});
