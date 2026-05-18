import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LoadingState } from '@/components/ui/LoadingState';

describe('LoadingState', () => {
  it('renders an accessible status region with the default label', () => {
    render(<LoadingState />);
    expect(screen.getByRole('status', { name: 'Loading content' })).toBeInTheDocument();
  });

  it('uses the message prop as the accessible label and renders it as visible text', () => {
    render(<LoadingState message="Fetching strategies…" />);
    expect(screen.getByRole('status', { name: 'Fetching strategies…' })).toBeInTheDocument();
    expect(screen.getByText('Fetching strategies…')).toBeInTheDocument();
  });

  it('does not render the message paragraph when message is omitted', () => {
    render(<LoadingState />);
    expect(screen.queryByText(/.+/)).toBeNull();
  });
});
