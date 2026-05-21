import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PrintButton } from '@/components/widgets/PrintButton';
import { renderWithProviders } from '@/test/render';

describe('PrintButton', () => {
  it('calls window.print when clicked', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {
      // no-op
    });
    renderWithProviders(<PrintButton />);
    fireEvent.click(screen.getByRole('button', { name: /print report/i }));
    expect(printSpy).toHaveBeenCalledOnce();
    printSpy.mockRestore();
  });

  it('has accessible aria-label', () => {
    renderWithProviders(<PrintButton />);
    expect(screen.getByRole('button', { name: /print report/i })).toBeInTheDocument();
  });
});
