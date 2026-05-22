import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReturnsTable } from '@/components/widgets/ReturnsTable';
import { renderWithProviders } from '@/test/render';
import type { Returns, ReturnsRow } from '@/types/gateway';

const _row = (overrides: Partial<ReturnsRow> = {}): ReturnsRow => ({
  initial_capital: 1_000_000,
  open_pnl: 0,
  net_pnl: 0,
  gross_profit: 0,
  gross_loss: 0,
  profit_factor: 0,
  commission_paid: 0,
  expected_payoff: 0,
  ...overrides,
});

const DATA: Returns = {
  all: _row({ net_pnl: 25_000, profit_factor: 1.45 }),
  long: _row({ net_pnl: 18_000, profit_factor: 1.5 }),
  short: _row({ net_pnl: 7_000, profit_factor: 1.25 }),
};

describe('ReturnsTable', () => {
  it('renders one row per side', () => {
    renderWithProviders(<ReturnsTable data={DATA} />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Long')).toBeInTheDocument();
    expect(screen.getByText('Short')).toBeInTheDocument();
  });

  it('formats profit_factor to two decimals', () => {
    renderWithProviders(<ReturnsTable data={DATA} />);
    expect(screen.getByText('1.45')).toBeInTheDocument();
    expect(screen.getByText('1.50')).toBeInTheDocument();
    expect(screen.getByText('1.25')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    renderWithProviders(<ReturnsTable data={DATA} />);
    expect(screen.getByText('Initial Capital')).toBeInTheDocument();
    expect(screen.getByText('Net P&L')).toBeInTheDocument();
    expect(screen.getByText('Profit Factor')).toBeInTheDocument();
  });
});
