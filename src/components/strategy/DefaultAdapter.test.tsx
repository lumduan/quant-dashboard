import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DefaultAdapter } from '@/components/strategy/DefaultAdapter';
import { renderWithProviders } from '@/test/render';
import type { StrategyInfo } from '@/types/gateway';

// The Gateway is mocked to always return fixtures.csmSetPerf for any
// /api/v1/strategies/:id/performance request, so a synthetic strategy id is fine.
const unknownTypeStrategy: StrategyInfo = {
  id: 'csm-set-01',
  name: 'Mystery Strategy',
  type: 'UNKNOWN_TYPE',
  service_url: 'http://localhost',
  capital_weight: 0.25,
  active: true,
};

describe('DefaultAdapter', () => {
  it('renders the yellow warning badge with the unknown strategy type', () => {
    renderWithProviders(<DefaultAdapter strategy={unknownTypeStrategy} />);
    expect(screen.getByText(/Strategy type "UNKNOWN_TYPE" has no adapter/)).toBeInTheDocument();
  });

  it('shows the loading skeleton while performance data is pending', () => {
    renderWithProviders(<DefaultAdapter strategy={unknownTypeStrategy} />);
    expect(screen.getByLabelText('Loading strategy performance')).toBeInTheDocument();
  });

  it('renders all four generic metrics once performance data resolves', async () => {
    renderWithProviders(<DefaultAdapter strategy={unknownTypeStrategy} />);
    // fixtures.csmSetPerf: daily_pnl=12_345.67 → formatTHB rounds to 12,346 (maxFractionDigits=0);
    // total_value=5_500_000, sharpe_ratio=1.42, max_drawdown=-0.0823.
    expect(await screen.findByText(/12,3\d\d/)).toBeInTheDocument();
    expect(screen.getByText(/5,500,000/)).toBeInTheDocument();
    expect(screen.getByText('1.42')).toBeInTheDocument();
    expect(screen.getByText('-8.23%')).toBeInTheDocument();
  });

  it('renders the adapter region with a strategy-specific label', () => {
    renderWithProviders(<DefaultAdapter strategy={unknownTypeStrategy} />);
    expect(
      screen.getByRole('region', { name: 'Mystery Strategy adapter (default)' }),
    ).toBeInTheDocument();
  });
});
