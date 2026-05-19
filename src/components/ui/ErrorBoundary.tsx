import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface ErrorBoundaryFallbackProps {
  readonly error: Error;
  readonly resetErrorBoundary: () => void;
}

export interface ErrorBoundaryProps {
  readonly children: ReactNode;
  readonly fallbackRender: (props: ErrorBoundaryFallbackProps) => ReactNode;
  readonly onReset?: () => void;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
  readonly error: Error | null;
}

const INITIAL_STATE: ErrorBoundaryState = { hasError: false, error: null };

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = INITIAL_STATE;

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Intentional no-op hook for future telemetry; project bans console.*.
  }

  reset = (): void => {
    this.setState(INITIAL_STATE);
    this.props.onReset?.();
  };

  override render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      return this.props.fallbackRender({
        error: this.state.error,
        resetErrorBoundary: this.reset,
      });
    }
    return this.props.children;
  }
}
