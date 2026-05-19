import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorState } from '@/components/ui/ErrorState';

describe('ErrorState', () => {
  it('renders the message inside a role="alert" container', () => {
    render(<ErrorState message="Something went wrong" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Something went wrong');
  });

  it('renders a Retry button when onRetry is provided', () => {
    render(<ErrorState message="failed" onRetry={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('does not render a Retry button when onRetry is omitted', () => {
    render(<ErrorState message="failed" />);
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('calls onRetry when Retry is clicked', () => {
    const onRetry = vi.fn();
    render(<ErrorState message="failed" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('hides the decorative icon from assistive technology', () => {
    render(<ErrorState message="failed" />);
    const alert = screen.getByRole('alert');
    const icon = alert.querySelector('[aria-hidden="true"]');
    expect(icon).not.toBeNull();
  });
});
