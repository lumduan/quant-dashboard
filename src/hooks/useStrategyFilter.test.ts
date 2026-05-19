import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useStrategyFilter } from '@/hooks/useStrategyFilter';

function makeWrapper(initialUrl = '/') {
  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return createElement(MemoryRouter, { initialEntries: [initialUrl] }, children);
  };
}

function combined() {
  return { filter: useStrategyFilter(), location: useLocation() };
}

describe('useStrategyFilter', () => {
  it('returns empty defaults when no params are present', () => {
    const { result } = renderHook(combined, { wrapper: makeWrapper('/') });
    expect(result.current.filter.selectedIds).toEqual([]);
    expect(result.current.filter.from).toBeUndefined();
    expect(result.current.filter.to).toBeUndefined();
    expect(result.current.location.search).toBe('');
  });

  it('writes selectedIds to the URL with one ?strategy=… per id', () => {
    const { result } = renderHook(combined, { wrapper: makeWrapper('/') });
    act(() => result.current.filter.setSelectedIds(['csm-set-01', 'tfex-01']));
    expect(result.current.location.search).toBe('?strategy=csm-set-01&strategy=tfex-01');
    expect(result.current.filter.selectedIds).toEqual(['csm-set-01', 'tfex-01']);
  });

  it('clears all strategy params when called with an empty array', () => {
    const { result } = renderHook(combined, {
      wrapper: makeWrapper('/?strategy=a&strategy=b'),
    });
    expect(result.current.filter.selectedIds).toEqual(['a', 'b']);
    act(() => result.current.filter.setSelectedIds([]));
    expect(result.current.location.search).toBe('');
    expect(result.current.filter.selectedIds).toEqual([]);
  });

  it('writes both from and to to the URL', () => {
    const { result } = renderHook(combined, { wrapper: makeWrapper('/') });
    act(() => result.current.filter.setDateRange({ from: '2026-01-01', to: '2026-05-19' }));
    expect(result.current.location.search).toBe('?from=2026-01-01&to=2026-05-19');
    expect(result.current.filter.from).toBe('2026-01-01');
    expect(result.current.filter.to).toBe('2026-05-19');
  });

  it('clears from while preserving to when from is undefined', () => {
    const { result } = renderHook(combined, {
      wrapper: makeWrapper('/?from=2026-01-01&to=2026-05-19'),
    });
    act(() => result.current.filter.setDateRange({ from: undefined, to: '2026-05-19' }));
    expect(result.current.location.search).toBe('?to=2026-05-19');
    expect(result.current.filter.from).toBeUndefined();
    expect(result.current.filter.to).toBe('2026-05-19');
  });

  it('clears to while preserving from when to is undefined', () => {
    const { result } = renderHook(combined, {
      wrapper: makeWrapper('/?from=2026-01-01&to=2026-05-19'),
    });
    act(() => result.current.filter.setDateRange({ from: '2026-01-01', to: undefined }));
    expect(result.current.location.search).toBe('?from=2026-01-01');
    expect(result.current.filter.from).toBe('2026-01-01');
    expect(result.current.filter.to).toBeUndefined();
  });

  it('restores filter state from URL params on mount (refresh-as-remount)', () => {
    const { result } = renderHook(combined, {
      wrapper: makeWrapper('/?strategy=csm-set-01&strategy=tfex-01&from=2026-04-01'),
    });
    expect(result.current.filter.selectedIds).toEqual(['csm-set-01', 'tfex-01']);
    expect(result.current.filter.from).toBe('2026-04-01');
    expect(result.current.filter.to).toBeUndefined();
  });

  it('preserves date params when overwriting selectedIds and vice versa', () => {
    const { result } = renderHook(combined, {
      wrapper: makeWrapper('/?from=2026-01-01&to=2026-05-19'),
    });
    act(() => result.current.filter.setSelectedIds(['csm-set-01']));
    expect(result.current.location.search).toBe(
      '?from=2026-01-01&to=2026-05-19&strategy=csm-set-01',
    );
    act(() => result.current.filter.setSelectedIds([]));
    expect(result.current.location.search).toBe('?from=2026-01-01&to=2026-05-19');
  });
});
