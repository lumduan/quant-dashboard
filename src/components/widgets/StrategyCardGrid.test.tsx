import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StrategyCardGrid } from '@/components/widgets/StrategyCardGrid';
import { renderWithProviders } from '@/test/render';
import type { StrategyInfo, StrategyPerformance } from '@/types/gateway';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const strategies: StrategyInfo[] = [
  {
    id: 'tfex-01',
    name: 'TFEX Futures Alpha',
    type: 'TFEX_FUTURES',
    capital_weight: 0.4,
    active: true,
  },
  {
    id: 'csm-set-01',
    name: 'CSM-SET Equity Momentum',
    type: 'EQUITY_MOMENTUM',
    capital_weight: 0.6,
    active: true,
  },
];

const performances: Record<string, StrategyPerformance> = {
  'csm-set-01': {
    strategy_id: 'csm-set-01',
    daily_pnl: 0.0123,
    total_value: 5_500_000,
    max_drawdown: -0.0823,
    sharpe_ratio: 1.42,
    last_updated: '2026-05-19T00:00:00.000Z',
  },
  'tfex-01': {
    strategy_id: 'tfex-01',
    daily_pnl: -0.0045,
    total_value: 4_500_000,
    max_drawdown: -0.05,
    sharpe_ratio: 0.91,
    last_updated: '2026-05-19T00:00:00.000Z',
  },
};

describe('StrategyCardGrid', () => {
  beforeEach(() => {
    navigateMock.mockClear();
  });

  it('renders one card per strategy inside the Strategy cards section', () => {
    renderWithProviders(<StrategyCardGrid strategies={strategies} performances={performances} />);
    const section = screen.getByRole('region', { name: 'Strategy cards' });
    const cards = within(section).getAllByRole('button');
    expect(cards).toHaveLength(2);
  });

  it('orders cards alphabetically by name', () => {
    renderWithProviders(<StrategyCardGrid strategies={strategies} performances={performances} />);
    const cards = within(screen.getByRole('region', { name: 'Strategy cards' })).getAllByRole(
      'button',
    );
    expect(cards[0]).toHaveAccessibleName(/CSM-SET Equity Momentum/);
    expect(cards[1]).toHaveAccessibleName(/TFEX Futures Alpha/);
  });

  it('colors positive daily PnL with the trend-up class', () => {
    renderWithProviders(<StrategyCardGrid strategies={strategies} performances={performances} />);
    const csmCard = screen.getByRole('button', { name: /CSM-SET Equity Momentum/ });
    const pnlCell = within(csmCard).getByText('+1.23%');
    expect(pnlCell.className).toContain('text-green-400');
  });

  it('colors negative daily PnL with the trend-down class', () => {
    renderWithProviders(<StrategyCardGrid strategies={strategies} performances={performances} />);
    const tfexCard = screen.getByRole('button', { name: /TFEX Futures Alpha/ });
    const pnlCell = within(tfexCard).getByText('-0.45%');
    expect(pnlCell.className).toContain('text-red-400');
  });

  it('calls navigate("/strategy/:id") when a card is clicked', () => {
    renderWithProviders(<StrategyCardGrid strategies={strategies} performances={performances} />);
    fireEvent.click(screen.getByRole('button', { name: /CSM-SET Equity Momentum/ }));
    expect(navigateMock).toHaveBeenCalledWith('/strategy/csm-set-01');
  });

  it('renders the empty-state status when no strategies are provided', () => {
    renderWithProviders(<StrategyCardGrid strategies={[]} performances={{}} />);
    expect(screen.getByRole('status')).toHaveTextContent('No strategies to display.');
    expect(screen.queryByRole('region', { name: 'Strategy cards' })).toBeNull();
  });

  it('falls back to zero metrics when a performance entry is missing', () => {
    renderWithProviders(<StrategyCardGrid strategies={strategies} performances={{}} />);
    const csmCard = screen.getByRole('button', { name: /CSM-SET Equity Momentum/ });
    // Both Daily PnL and Max DD render "+0.00%" for the all-zero fallback.
    expect(within(csmCard).getAllByText('+0.00%')).toHaveLength(2);
    expect(within(csmCard).getByText('0.00')).toBeInTheDocument();
  });
});
