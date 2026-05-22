import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReportHeader } from '@/components/widgets/ReportHeader';
import { renderWithProviders } from '@/test/render';

describe('ReportHeader', () => {
  it('renders the strategy name as h1', () => {
    renderWithProviders(
      <ReportHeader
        strategyName="CSM-SET Equity Momentum"
        activeTab="metrics"
        onTabChange={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'CSM-SET Equity Momentum' }),
    ).toBeInTheDocument();
  });

  it('renders tabs', () => {
    renderWithProviders(
      <ReportHeader
        strategyName="Test Strategy"
        activeTab="metrics"
        onTabChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('tab', { name: 'Metrics' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Report' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'List of Trades' })).toBeInTheDocument();
  });

  it('renders PrintButton', () => {
    renderWithProviders(
      <ReportHeader
        strategyName="Test Strategy"
        activeTab="metrics"
        onTabChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /print report/i })).toBeInTheDocument();
  });

  it('calls onTabChange when a tab is clicked', () => {
    const onTabChange = vi.fn();
    renderWithProviders(
      <ReportHeader
        strategyName="Test Strategy"
        activeTab="metrics"
        onTabChange={onTabChange}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Report' }));
    expect(onTabChange).toHaveBeenCalledWith('report');
  });

  it('marks the active tab with aria-selected', () => {
    renderWithProviders(
      <ReportHeader
        strategyName="Test Strategy"
        activeTab="report"
        onTabChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('tab', { name: 'Report' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
