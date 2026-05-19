import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DateRangePicker } from '@/components/filters/DateRangePicker';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

describe('DateRangePicker', () => {
  it('renders both date inputs with From / To labels', () => {
    render(<DateRangePicker from={undefined} to={undefined} onChange={vi.fn()} />);
    expect(screen.getByLabelText('From')).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('To')).toHaveAttribute('type', 'date');
  });

  it('seeds the inputs with from/to props when present', () => {
    render(<DateRangePicker from="2026-01-01" to="2026-05-19" onChange={vi.fn()} />);
    expect(screen.getByLabelText('From')).toHaveValue('2026-01-01');
    expect(screen.getByLabelText('To')).toHaveValue('2026-05-19');
  });

  it('falls back to defaults (30 days ago / today) when props are undefined', () => {
    render(<DateRangePicker from={undefined} to={undefined} onChange={vi.fn()} />);
    const fromValue = (screen.getByLabelText('From') as HTMLInputElement).value;
    const toValue = (screen.getByLabelText('To') as HTMLInputElement).value;
    expect(fromValue).toMatch(ISO_DATE_RE);
    expect(toValue).toMatch(ISO_DATE_RE);
    // The 'to' default is today; 'from' default is ~30 days earlier (ordered).
    expect(fromValue <= toValue).toBe(true);
  });

  it('fires onChange with the new range when From is changed to a valid value', () => {
    const onChange = vi.fn();
    render(<DateRangePicker from="2026-01-01" to="2026-05-19" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-02-01' } });
    expect(onChange).toHaveBeenCalledWith({ from: '2026-02-01', to: '2026-05-19' });
  });

  it('fires onChange with the new range when To is changed to a valid value', () => {
    const onChange = vi.fn();
    render(<DateRangePicker from="2026-01-01" to="2026-05-19" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-06-01' } });
    expect(onChange).toHaveBeenCalledWith({ from: '2026-01-01', to: '2026-06-01' });
  });

  it('shows an alert and suppresses onChange when From > To', () => {
    const onChange = vi.fn();
    render(<DateRangePicker from="2026-01-01" to="2026-05-19" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-12-01' } });
    expect(screen.getByRole('alert')).toHaveTextContent(/From date must be before To date/);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows an alert and suppresses onChange when To < From', () => {
    const onChange = vi.fn();
    render(<DateRangePicker from="2026-05-01" to="2026-05-19" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-04-01' } });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clears the alert once the user fixes the range', () => {
    const onChange = vi.fn();
    render(<DateRangePicker from="2026-01-01" to="2026-05-19" onChange={onChange} />);
    // Drive into invalid state first.
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-12-01' } });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    // Then fix it.
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-03-01' } });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(onChange).toHaveBeenLastCalledWith({ from: '2026-03-01', to: '2026-05-19' });
  });
});
