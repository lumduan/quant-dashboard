import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NotFoundState } from '@/components/ui/NotFoundState';

describe('NotFoundState', () => {
  it('renders an accessible alert with the default message', () => {
    render(<NotFoundState />);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Not found.');
  });

  it('renders the provided message inside the alert region', () => {
    render(<NotFoundState message="Strategy not found: csm-set-99" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Strategy not found: csm-set-99');
  });

  it('hides the decorative icon from assistive technology', () => {
    render(<NotFoundState message="Missing" />);
    const alert = screen.getByRole('alert');
    const icon = alert.querySelector('[aria-hidden="true"]');
    expect(icon).not.toBeNull();
    expect(icon).toHaveTextContent('?');
  });
});
