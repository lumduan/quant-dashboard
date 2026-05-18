import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppLayout } from '@/components/layout/AppLayout';
import { renderWithProviders } from '@/test/render';

describe('AppLayout', () => {
  it('renders the primary navigation, banner, and main landmarks', () => {
    renderWithProviders(
      <AppLayout>
        <p>placeholder</p>
      </AppLayout>,
    );
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('renders children inside the main landmark', () => {
    renderWithProviders(
      <AppLayout>
        <p>Test child content</p>
      </AppLayout>,
    );
    const main = screen.getByRole('main');
    expect(main).toHaveTextContent('Test child content');
  });
});
