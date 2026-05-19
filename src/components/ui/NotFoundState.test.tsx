import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NotFoundState } from '@/components/ui/NotFoundState';
import { renderWithProviders } from '@/test/render';

describe('NotFoundState', () => {
  it('renders the default message inside the main landmark', () => {
    renderWithProviders(<NotFoundState />);
    const main = screen.getByRole('main');
    expect(main).toHaveTextContent('Not found.');
  });

  it('renders a custom message inside the main landmark', () => {
    renderWithProviders(<NotFoundState message="Strategy not found: csm-set-99" />);
    expect(screen.getByRole('main')).toHaveTextContent('Strategy not found: csm-set-99');
  });

  it('renders a "Back to Dashboard" link pointing at /', () => {
    renderWithProviders(<NotFoundState message="missing" />);
    const link = screen.getByRole('link', { name: /back to dashboard/i });
    expect(link).toHaveAttribute('href', '/');
  });

  it('hides the decorative icon from assistive technology', () => {
    renderWithProviders(<NotFoundState message="missing" />);
    const main = screen.getByRole('main');
    const icon = main.querySelector('[aria-hidden="true"]');
    expect(icon).not.toBeNull();
    expect(icon).toHaveTextContent('?');
  });
});
