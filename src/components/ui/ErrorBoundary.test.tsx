import { fireEvent, render, screen } from '@testing-library/react';
import { type JSX, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary, type ErrorBoundaryFallbackProps } from '@/components/ui/ErrorBoundary';

function Boom(): never {
  throw new Error('boom');
}

function ConditionalBoom({ shouldThrow }: { readonly shouldThrow: boolean }): JSX.Element {
  if (shouldThrow) {
    throw new Error('boom');
  }
  return <p>recovered</p>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React intentionally logs caught errors in dev; silence to keep test output clean.
    vi.spyOn(console, 'error').mockImplementation(vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when no error is thrown', () => {
    render(
      <ErrorBoundary fallbackRender={() => <p>fallback</p>}>
        <p>happy path</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('happy path')).toBeInTheDocument();
    expect(screen.queryByText('fallback')).toBeNull();
  });

  it('invokes fallbackRender with the caught error', () => {
    const fallbackRender = vi.fn(({ error }: ErrorBoundaryFallbackProps) => (
      <p>caught: {error.message}</p>
    ));
    render(
      <ErrorBoundary fallbackRender={fallbackRender}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText('caught: boom')).toBeInTheDocument();
    expect(fallbackRender).toHaveBeenCalled();
    const lastCall = fallbackRender.mock.calls.at(-1);
    expect(lastCall?.[0].error).toBeInstanceOf(Error);
  });

  it('resetErrorBoundary clears state and re-renders children', () => {
    function Harness(): JSX.Element {
      const [shouldThrow, setShouldThrow] = useState(true);
      return (
        <ErrorBoundary
          fallbackRender={({ resetErrorBoundary }) => (
            <button
              type="button"
              onClick={() => {
                setShouldThrow(false);
                resetErrorBoundary();
              }}
            >
              reset
            </button>
          )}
        >
          <ConditionalBoom shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );
    }
    render(<Harness />);
    expect(screen.getByRole('button', { name: 'reset' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'reset' }));
    expect(screen.getByText('recovered')).toBeInTheDocument();
  });

  it('fires onReset callback when resetErrorBoundary is called', () => {
    const onReset = vi.fn();
    function Fallback({ resetErrorBoundary }: ErrorBoundaryFallbackProps): JSX.Element {
      return (
        <button type="button" onClick={resetErrorBoundary}>
          reset
        </button>
      );
    }
    render(
      <ErrorBoundary onReset={onReset} fallbackRender={(props) => <Fallback {...props} />}>
        <Boom />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'reset' }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
