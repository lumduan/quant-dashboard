import { fireEvent, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { StrategySelector } from '@/components/filters/StrategySelector';
import { server } from '@/test/mocks/server';
import { renderWithProviders } from '@/test/render';

describe('StrategySelector', () => {
  it('renders a loading skeleton while strategies are pending', () => {
    renderWithProviders(<StrategySelector selectedIds={[]} onChange={vi.fn()} />);
    expect(screen.getByRole('status', { name: 'Loading strategies' })).toBeInTheDocument();
  });

  it('renders one checkbox per active strategy with a capital-weight badge', async () => {
    renderWithProviders(<StrategySelector selectedIds={[]} onChange={vi.fn()} />);
    const checkbox = await screen.findByRole('checkbox', { name: /CSM-SET Equity Momentum/ });
    expect(checkbox).not.toBeChecked();
    expect(screen.getByText('(60%)')).toBeInTheDocument();
  });

  it('reflects selected ids as checked checkboxes', async () => {
    renderWithProviders(<StrategySelector selectedIds={['csm-set-01']} onChange={vi.fn()} />);
    const checkbox = await screen.findByRole('checkbox', { name: /CSM-SET Equity Momentum/ });
    expect(checkbox).toBeChecked();
  });

  it('calls onChange with the id added when an unchecked box is toggled', async () => {
    const onChange = vi.fn();
    renderWithProviders(<StrategySelector selectedIds={[]} onChange={onChange} />);
    const checkbox = await screen.findByRole('checkbox', { name: /CSM-SET Equity Momentum/ });
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith(['csm-set-01']);
  });

  it('calls onChange with the id removed when a checked box is toggled', async () => {
    const onChange = vi.fn();
    renderWithProviders(<StrategySelector selectedIds={['csm-set-01']} onChange={onChange} />);
    const checkbox = await screen.findByRole('checkbox', { name: /CSM-SET Equity Momentum/ });
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('All button selects all active strategy ids', async () => {
    const onChange = vi.fn();
    renderWithProviders(<StrategySelector selectedIds={[]} onChange={onChange} />);
    await screen.findByRole('checkbox', { name: /CSM-SET Equity Momentum/ });
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(onChange).toHaveBeenCalledWith(['csm-set-01']);
  });

  it('Clear button sends an empty array', async () => {
    const onChange = vi.fn();
    renderWithProviders(<StrategySelector selectedIds={['csm-set-01']} onChange={onChange} />);
    await screen.findByRole('checkbox', { name: /CSM-SET Equity Momentum/ });
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('filters out inactive strategies', async () => {
    server.use(
      http.get('/api/v1/strategies', () =>
        HttpResponse.json([
          {
            id: 'active-1',
            name: 'Active One',
            type: 'EQUITY_MOMENTUM',
            service_url: 'http://localhost',
            capital_weight: 0.5,
            active: true,
          },
          {
            id: 'inactive-1',
            name: 'Inactive One',
            type: 'EQUITY_MOMENTUM',
            service_url: 'http://localhost',
            capital_weight: 0.5,
            active: false,
          },
        ]),
      ),
    );
    renderWithProviders(<StrategySelector selectedIds={[]} onChange={vi.fn()} />);
    await screen.findByRole('checkbox', { name: /Active One/ });
    expect(screen.queryByRole('checkbox', { name: /Inactive One/ })).toBeNull();
  });

  it('returns null when the strategies request errors', async () => {
    server.use(http.get('/api/v1/strategies', () => new HttpResponse(null, { status: 500 })));
    const { container } = renderWithProviders(
      <StrategySelector selectedIds={[]} onChange={vi.fn()} />,
    );
    await waitForElementToBeRemoved(() =>
      screen.queryByRole('status', { name: 'Loading strategies' }),
    );
    expect(container.firstChild).toBeNull();
  });
});
