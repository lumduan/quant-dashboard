import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { Header } from '@/components/layout/Header';
import { server } from '@/test/mocks/server';
import { renderWithProviders } from '@/test/render';

describe('Header', () => {
  it('shows the pending (🟡) indicator on initial render', () => {
    renderWithProviders(<Header />);
    expect(screen.getByLabelText('Connection status')).toHaveTextContent('🟡 Fetching');
  });

  it('renders a "Last updated: —" placeholder while data is unavailable', () => {
    renderWithProviders(<Header />);
    expect(screen.getByLabelText('Last updated')).toHaveTextContent('Last updated: —');
  });

  it('shows the success (🟢) indicator after the overall-performance query resolves', async () => {
    renderWithProviders(<Header />);
    await waitFor(() => {
      expect(screen.getByLabelText('Connection status')).toHaveTextContent('🟢 Connected');
    });
  });

  it('renders the formatted HH:MM:SS timestamp once data lands (via useDeferredValue)', async () => {
    renderWithProviders(<Header />);
    await waitFor(() => {
      expect(screen.getByLabelText('Last updated').textContent ?? '').toMatch(
        /Last updated: \d{2}:\d{2}:\d{2}/,
      );
    });
  });

  it('shows the error (🔴) indicator when the query fails', async () => {
    server.use(
      http.get('/api/v1/overall-performance', () => HttpResponse.json(null, { status: 500 })),
    );
    renderWithProviders(<Header />);
    await waitFor(() => {
      expect(screen.getByLabelText('Connection status')).toHaveTextContent('🔴 Error');
    });
  });
});
