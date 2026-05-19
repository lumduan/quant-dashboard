import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FilterBar } from '@/components/filters/FilterBar';
import { renderWithProviders } from '@/test/render';

describe('FilterBar', () => {
  it('renders both the strategy selector and the date range picker', async () => {
    renderWithProviders(
      <FilterBar
        selectedIds={[]}
        from={undefined}
        to={undefined}
        onSelectedIdsChange={vi.fn()}
        onDateRangeChange={vi.fn()}
      />,
    );
    await screen.findByRole('checkbox', { name: /CSM-SET Equity Momentum/ });
    expect(screen.getByLabelText('From')).toBeInTheDocument();
    expect(screen.getByLabelText('To')).toBeInTheDocument();
  });

  it('propagates strategy toggle to onSelectedIdsChange (inside startTransition)', async () => {
    const onSelectedIdsChange = vi.fn();
    renderWithProviders(
      <FilterBar
        selectedIds={[]}
        from={undefined}
        to={undefined}
        onSelectedIdsChange={onSelectedIdsChange}
        onDateRangeChange={vi.fn()}
      />,
    );
    const checkbox = await screen.findByRole('checkbox', { name: /CSM-SET Equity Momentum/ });
    fireEvent.click(checkbox);
    await waitFor(() => {
      expect(onSelectedIdsChange).toHaveBeenCalledWith(['csm-set-01']);
    });
  });

  it('propagates date change to onDateRangeChange (inside startTransition)', async () => {
    const onDateRangeChange = vi.fn();
    renderWithProviders(
      <FilterBar
        selectedIds={[]}
        from="2026-01-01"
        to="2026-05-19"
        onSelectedIdsChange={vi.fn()}
        onDateRangeChange={onDateRangeChange}
      />,
    );
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-02-01' } });
    await waitFor(() => {
      expect(onDateRangeChange).toHaveBeenCalledWith({ from: '2026-02-01', to: '2026-05-19' });
    });
  });
});
