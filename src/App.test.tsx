import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '@/App';

describe('App', () => {
  it('renders the heading text', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'react-template' })).toBeInTheDocument();
  });

  it('renders the tagline paragraph', () => {
    render(<App />);
    expect(screen.getByText('Fork-ready. AI-agent enabled.')).toBeInTheDocument();
  });
});
