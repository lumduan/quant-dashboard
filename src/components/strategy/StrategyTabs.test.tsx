import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StrategyTabs } from '@/components/strategy/StrategyTabs';
import { renderWithProviders } from '@/test/render';

const TABS = [
  { id: 'metrics', label: 'Metrics' },
  { id: 'report', label: 'Report' },
  { id: 'trades', label: 'List of Trades' },
];

describe('StrategyTabs', () => {
  it('renders all tabs', () => {
    renderWithProviders(
      <StrategyTabs tabs={TABS} activeTab="metrics" onChange={vi.fn()} />,
    );
    expect(screen.getByRole('tab', { name: 'Metrics' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Report' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'List of Trades' })).toBeInTheDocument();
  });

  it('marks the active tab with aria-selected', () => {
    renderWithProviders(
      <StrategyTabs tabs={TABS} activeTab="report" onChange={vi.fn()} />,
    );
    const reportTab = screen.getByRole('tab', { name: 'Report' });
    expect(reportTab).toHaveAttribute('aria-selected', 'true');
    const metricsTab = screen.getByRole('tab', { name: 'Metrics' });
    expect(metricsTab).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange when a tab is clicked', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <StrategyTabs tabs={TABS} activeTab="metrics" onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Report' }));
    expect(onChange).toHaveBeenCalledWith('report');
  });

  it('handles ArrowRight key to cycle to next tab', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <StrategyTabs tabs={TABS} activeTab="metrics" onChange={onChange} />,
    );
    const metricsTab = screen.getByRole('tab', { name: 'Metrics' });
    fireEvent.keyDown(metricsTab, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('report');
  });

  it('handles ArrowLeft key to wrap to last tab', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <StrategyTabs tabs={TABS} activeTab="metrics" onChange={onChange} />,
    );
    const metricsTab = screen.getByRole('tab', { name: 'Metrics' });
    fireEvent.keyDown(metricsTab, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith('trades');
  });

  it('handles Home key to jump to first tab', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <StrategyTabs tabs={TABS} activeTab="trades" onChange={onChange} />,
    );
    const tradesTab = screen.getByRole('tab', { name: 'List of Trades' });
    fireEvent.keyDown(tradesTab, { key: 'Home' });
    expect(onChange).toHaveBeenCalledWith('metrics');
  });

  it('handles End key to jump to last tab', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <StrategyTabs tabs={TABS} activeTab="metrics" onChange={onChange} />,
    );
    const metricsTab = screen.getByRole('tab', { name: 'Metrics' });
    fireEvent.keyDown(metricsTab, { key: 'End' });
    expect(onChange).toHaveBeenCalledWith('trades');
  });
});
