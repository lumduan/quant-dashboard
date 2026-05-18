import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { Sidebar } from '@/components/layout/Sidebar';
import { server } from '@/test/mocks/server';
import { renderWithProviders } from '@/test/render';

describe('Sidebar', () => {
  it('always renders a home link to the dashboard', () => {
    renderWithProviders(<Sidebar />);
    const home = screen.getByRole('link', { name: 'Dashboard' });
    expect(home).toHaveAttribute('href', '/');
  });

  it('shows a loading region while strategies are fetching', () => {
    renderWithProviders(<Sidebar />);
    expect(screen.getByRole('status', { name: 'Loading strategies' })).toBeInTheDocument();
  });

  it('renders a NavLink per active strategy after the request resolves', async () => {
    renderWithProviders(<Sidebar />);
    const link = await screen.findByRole('link', { name: 'CSM-SET Equity Momentum' });
    expect(link).toHaveAttribute('href', '/strategy/csm-set-01');
  });

  it('filters out inactive strategies', async () => {
    server.use(
      http.get('/api/v1/strategies', () =>
        HttpResponse.json([
          {
            id: 'active-1',
            name: 'Active Strategy',
            type: 'EQUITY_MOMENTUM',
            capital_weight: 0.5,
            active: true,
          },
          {
            id: 'inactive-1',
            name: 'Inactive Strategy',
            type: 'EQUITY_MOMENTUM',
            capital_weight: 0.5,
            active: false,
          },
        ]),
      ),
    );
    renderWithProviders(<Sidebar />);
    await screen.findByRole('link', { name: 'Active Strategy' });
    expect(screen.queryByRole('link', { name: 'Inactive Strategy' })).toBeNull();
  });
});
