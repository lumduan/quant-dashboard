import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '@/App';

describe('App', () => {
  it('renders the heading text', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'quant-dashboard' })).toBeInTheDocument();
  });

  it('renders the placeholder tagline', () => {
    render(<App />);
    expect(screen.getByText(/React 19 SPA for the quant trading system/)).toBeInTheDocument();
  });
});
