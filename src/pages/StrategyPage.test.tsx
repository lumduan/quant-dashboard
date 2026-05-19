import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { StrategyPage } from '@/pages/StrategyPage';
import { renderWithProviders } from '@/test/render';

// StrategyPage → StrategyAdapterFactory → CSMSetAdapter → EquityCurveChart, which
// imports Recharts. Mock the same shells used by EquityCurveChart.test.tsx.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children?: ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    LineChart: ({ data, children }: { data: unknown[]; children?: ReactNode }) => (
      <div data-testid="line-chart" data-points={JSON.stringify(data)}>
        {children}
      </div>
    ),
    Line: ({ stroke }: { stroke?: string }) => <div data-testid="line" data-color={stroke} />,
    Tooltip: () => <div data-testid="tooltip" />,
    ReferenceLine: ({ y }: { y: number }) => <div data-testid="reference-line" data-y={y} />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    XAxis: () => <div data-testid="xaxis" />,
    YAxis: () => <div data-testid="yaxis" />,
  };
});

function renderAt(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/strategy/:id" element={<StrategyPage />} />
    </Routes>,
    { route },
  );
}

describe('StrategyPage', () => {
  it('renders the strategy heading once the matching strategy resolves', async () => {
    renderAt('/strategy/csm-set-01');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'CSM-SET Equity Momentum' }),
    ).toBeInTheDocument();
  });

  it('renders the CSMSetAdapter region for the EQUITY_MOMENTUM strategy', async () => {
    renderAt('/strategy/csm-set-01');
    expect(
      await screen.findByRole('region', { name: 'CSM-SET Equity Momentum adapter' }),
    ).toBeInTheDocument();
  });

  it('renders NotFoundState when the id is not in the strategies list', async () => {
    renderAt('/strategy/unknown-id');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Strategy not found: unknown-id');
  });
});
