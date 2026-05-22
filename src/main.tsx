import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { StrategyPage } from '@/pages/StrategyPage';
import '@/index.css';
import '@/styles/print.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element with id "root" was not found in index.html');
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 4 * 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AppLayout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/strategy/:id" element={<StrategyPage />} />
          </Routes>
        </AppLayout>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
