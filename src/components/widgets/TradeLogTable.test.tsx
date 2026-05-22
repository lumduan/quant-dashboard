import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TradeLogTable } from '@/components/widgets/TradeLogTable';
import { renderWithProviders } from '@/test/render';
import type { TradeLogPage } from '@/types/gateway';

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getVirtualItems: () => [],
    getTotalSize: () => 0,
  }),
}));

const page: TradeLogPage = {
  items: [
    {
      entry_time: '2026-05-15T10:00:00Z',
      exit_time: '2026-05-15T14:30:00Z',
      symbol: 'PTT',
      side: 'LONG',
      qty: 1000,
      entry_price: 32.5,
      exit_price: 33.75,
      realized_pnl: 1250,
      duration_bars: 16,
      commission: 125,
    },
  ],
  total: 1,
  limit: 100,
  offset: 0,
};

describe('TradeLogTable', () => {
  it('renders the trade log table with column headers', () => {
    renderWithProviders(<TradeLogTable page={page} onPageChange={vi.fn()} />);
    expect(screen.getByText('Entry')).toBeInTheDocument();
    expect(screen.getByText('Exit')).toBeInTheDocument();
    expect(screen.getByText('Symbol')).toBeInTheDocument();
    expect(screen.getByText('Side')).toBeInTheDocument();
  });

  it('renders trade data rows', () => {
    renderWithProviders(<TradeLogTable page={page} onPageChange={vi.fn()} />);
    expect(screen.getByText('PTT')).toBeInTheDocument();
    expect(screen.getByText('Long')).toBeInTheDocument();
  });

  it('renders pagination controls', () => {
    renderWithProviders(<TradeLogTable page={page} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /prev/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('calls onPageChange when Next is clicked', () => {
    const multiPage: TradeLogPage = { ...page, total: 250, limit: 100, offset: 0 };
    const onPageChange = vi.fn();
    renderWithProviders(<TradeLogTable page={multiPage} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(100);
  });

  it('calls onPageChange when Prev is clicked', () => {
    const midPage: TradeLogPage = { ...page, total: 250, limit: 100, offset: 100 };
    const onPageChange = vi.fn();
    renderWithProviders(<TradeLogTable page={midPage} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole('button', { name: /prev/i }));
    expect(onPageChange).toHaveBeenCalledWith(0);
  });

  it('disables Prev button on first page', () => {
    renderWithProviders(<TradeLogTable page={page} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /prev/i })).toBeDisabled();
  });

  it('disables Next button on last page', () => {
    renderWithProviders(<TradeLogTable page={page} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('renders correct aria-label on section', () => {
    renderWithProviders(<TradeLogTable page={page} onPageChange={vi.fn()} />);
    expect(screen.getByRole('region', { name: /trade log/i })).toBeInTheDocument();
  });
});
