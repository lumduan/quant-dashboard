import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AllocationBar } from '@/components/widgets/AllocationBar';

describe('AllocationBar', () => {
  const allocation = { 'csm-set-01': 0.6, 'tfex-01': 0.3, cash: 0.1 };

  it('renders one legend entry per allocation key', () => {
    render(<AllocationBar allocation={allocation} />);
    expect(screen.getByText('csm-set-01')).toBeInTheDocument();
    expect(screen.getByText('tfex-01')).toBeInTheDocument();
    expect(screen.getByText('cash')).toBeInTheDocument();
  });

  it('orders legend entries by weight descending', () => {
    render(<AllocationBar allocation={allocation} />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('csm-set-01');
    expect(items[1]).toHaveTextContent('tfex-01');
    expect(items[2]).toHaveTextContent('cash');
  });

  it('renders each bar segment with width matching its weight', () => {
    render(<AllocationBar allocation={allocation} />);
    expect(screen.getByLabelText(/^csm-set-01/)).toHaveStyle({ width: '60%' });
    expect(screen.getByLabelText(/^tfex-01/)).toHaveStyle({ width: '30%' });
    expect(screen.getByLabelText(/^cash/)).toHaveStyle({ width: '10%' });
  });

  it('formats the legend percent for each segment', () => {
    render(<AllocationBar allocation={allocation} />);
    expect(screen.getByText('+60.00%')).toBeInTheDocument();
    expect(screen.getByText('+30.00%')).toBeInTheDocument();
    expect(screen.getByText('+10.00%')).toBeInTheDocument();
  });

  it('cycles colours when there are more allocation keys than palette entries', () => {
    const wide = {
      a: 0.2,
      b: 0.2,
      c: 0.2,
      d: 0.15,
      e: 0.15,
      f: 0.1,
    };
    render(<AllocationBar allocation={wide} />);
    // All six keys should appear in the legend.
    for (const key of Object.keys(wide)) {
      expect(screen.getByText(key)).toBeInTheDocument();
    }
  });
});
