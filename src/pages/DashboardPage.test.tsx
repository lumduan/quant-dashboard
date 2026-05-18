import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DashboardPage } from '@/pages/DashboardPage';
import { renderWithProviders } from '@/test/render';

describe('DashboardPage', () => {
  it('renders the Dashboard heading', () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
  });
});
