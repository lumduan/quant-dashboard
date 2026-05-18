import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MetricCard } from '@/components/widgets/MetricCard';

describe('MetricCard', () => {
  it('renders the label and value', () => {
    render(<MetricCard label="Portfolio Value" value="฿10,000,000" />);
    expect(screen.getByText('Portfolio Value')).toBeInTheDocument();
    expect(screen.getByText('฿10,000,000')).toBeInTheDocument();
  });

  it('applies the colorClass to the value element', () => {
    render(<MetricCard label="Today's Return" value="+1.23%" colorClass="text-green-400" />);
    expect(screen.getByText('+1.23%')).toHaveClass('text-green-400');
  });

  it('falls back to a neutral colour when colorClass is omitted', () => {
    render(<MetricCard label="Active Strategies" value="3" />);
    expect(screen.getByText('3')).toHaveClass('text-gray-900');
  });

  it('renders the subtitle when provided', () => {
    render(<MetricCard label="Active Strategies" value="3" subtitle="strategies" />);
    expect(screen.getByText('strategies')).toBeInTheDocument();
  });

  it('does not render the subtitle node when subtitle is omitted', () => {
    render(<MetricCard label="Active Strategies" value="3" />);
    expect(screen.queryByText('strategies')).toBeNull();
  });
});
