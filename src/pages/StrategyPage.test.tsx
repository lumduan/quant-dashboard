import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { StrategyPage } from '@/pages/StrategyPage';
import { renderWithProviders } from '@/test/render';

describe('StrategyPage', () => {
  it('renders the strategy id from the route param', () => {
    renderWithProviders(
      <Routes>
        <Route path="/strategy/:id" element={<StrategyPage />} />
      </Routes>,
      { route: '/strategy/csm-set-01' },
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Strategy: csm-set-01' }),
    ).toBeInTheDocument();
  });

  it('encodes the id as-is in the heading for arbitrary ids', () => {
    renderWithProviders(
      <Routes>
        <Route path="/strategy/:id" element={<StrategyPage />} />
      </Routes>,
      { route: '/strategy/tfex-futures-01' },
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Strategy: tfex-futures-01' }),
    ).toBeInTheDocument();
  });
});
