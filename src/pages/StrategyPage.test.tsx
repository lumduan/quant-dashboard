import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { StrategyPage } from '@/pages/StrategyPage';
import { fixtures } from '@/test/mocks/handlers';
import { server } from '@/test/mocks/server';
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
    const main = await screen.findByRole('main');
    expect(main).toHaveTextContent('Strategy not found: unknown-id');
    expect(screen.getByRole('link', { name: /back to dashboard/i })).toHaveAttribute('href', '/');
  });

  it('renders ErrorState with a Retry button when the strategies query fails', async () => {
    server.use(http.get('/api/v1/strategies', () => HttpResponse.json(null, { status: 500 })));
    renderAt('/strategy/csm-set-01');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/failed to load strategies/i);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('re-fetches the strategies query when Retry is clicked', async () => {
    let requestCount = 0;
    server.use(
      http.get('/api/v1/strategies', () => {
        requestCount += 1;
        return requestCount === 1
          ? HttpResponse.json(null, { status: 500 })
          : HttpResponse.json(fixtures.strategies);
      }),
    );
    renderAt('/strategy/csm-set-01');
    const retry = await screen.findByRole('button', { name: 'Retry' });
    fireEvent.click(retry);
    await waitFor(() => {
      expect(requestCount).toBeGreaterThanOrEqual(2);
    });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'CSM-SET Equity Momentum' }),
    ).toBeInTheDocument();
  });
});
