import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DashboardPage } from '@/pages/DashboardPage';
import { renderWithProviders } from '@/test/render';

describe('DashboardPage', () => {
  it('renders the Dashboard heading', () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
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

  it('renders the MultiStrategyChart placeholder (empty series → status message)', async () => {
    renderWithProviders(<DashboardPage />);
    expect(await screen.findByRole('region', { name: 'Strategy Comparison' })).toBeInTheDocument();
    expect(screen.getByText(/select strategies to compare/i)).toBeInTheDocument();
  });
});
