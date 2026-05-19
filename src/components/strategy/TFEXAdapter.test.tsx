import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TFEXAdapter } from '@/components/strategy/TFEXAdapter';
import type { StrategyInfo } from '@/types/gateway';

const tfexStrategy: StrategyInfo = {
  id: 'tfex-set-01',
  name: 'TFEX Futures Pilot',
  type: 'TFEX_FUTURES',
  service_url: 'http://localhost',
  capital_weight: 0.15,
  active: true,
};

describe('TFEXAdapter', () => {
  it('renders the strategy name as a heading', () => {
    render(<TFEXAdapter strategy={tfexStrategy} />);
    expect(
      screen.getByRole('heading', { level: 2, name: 'TFEX Futures Pilot' }),
    ).toBeInTheDocument();
  });

  it('shows the strategy type label', () => {
    render(<TFEXAdapter strategy={tfexStrategy} />);
    expect(screen.getByText('Type: TFEX_FUTURES')).toBeInTheDocument();
  });

  it('renders the "Coming soon" placeholder text', () => {
    render(<TFEXAdapter strategy={tfexStrategy} />);
    expect(screen.getByText('TFEX integration coming soon')).toBeInTheDocument();
  });

  it('renders an accessible region labelled with the strategy name', () => {
    render(<TFEXAdapter strategy={tfexStrategy} />);
    expect(
      screen.getByRole('region', { name: 'TFEX Futures Pilot adapter (TFEX)' }),
    ).toBeInTheDocument();
  });
});
