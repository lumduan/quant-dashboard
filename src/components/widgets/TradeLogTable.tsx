import { type JSX, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { formatDateBKK, formatTHB } from '@/utils/formatters';
import type { TradeLogPage } from '@/types/gateway';

export interface TradeLogTableProps {
  readonly page: TradeLogPage;
  readonly onPageChange: (offset: number) => void;
}

function formatSide(side: string): string {
  return side === 'LONG' ? 'Long' : side === 'SHORT' ? 'Short' : side;
}

export function TradeLogTable({ page, onPageChange }: TradeLogTableProps): JSX.Element {
  const parentRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize = page.total > 200;

  const rowVirtualizer = useVirtualizer({
    count: page.items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 5,
    enabled: shouldVirtualize,
  });

  const handlePrev = useCallback(() => {
    const nextOffset = Math.max(0, page.offset - page.limit);
    onPageChange(nextOffset);
  }, [page.offset, page.limit, onPageChange]);

  const handleNext = useCallback(() => {
    const nextOffset = page.offset + page.limit;
    if (nextOffset < page.total) {
      onPageChange(nextOffset);
    }
  }, [page.offset, page.limit, page.total, onPageChange]);

  const totalPages = Math.ceil(page.total / page.limit);
  const currentPage = Math.floor(page.offset / page.limit) + 1;
  const hasPrev = page.offset > 0;
  const hasNext = page.offset + page.limit < page.total;

  const renderRow = useCallback(
    (index: number) => {
      const trade = page.items[index];
      if (!trade) return null;
      return (
        <tr key={index} className="border-b border-[#1E222D] hover:bg-[#1E222D]/50">
          <td className="px-3 py-2 text-xs text-[#B2B5BE]">{formatDateBKK(trade.entry_time)}</td>
          <td className="px-3 py-2 text-xs text-[#B2B5BE]">{formatDateBKK(trade.exit_time)}</td>
          <td className="px-3 py-2 text-xs text-[#B2B5BE]">{trade.symbol}</td>
          <td className="px-3 py-2 text-xs text-[#B2B5BE]">{formatSide(trade.side)}</td>
          <td className="px-3 py-2 text-xs text-right text-[#B2B5BE]">{trade.qty}</td>
          <td className="px-3 py-2 text-xs text-right text-[#B2B5BE]">{formatTHB(trade.entry_price)}</td>
          <td className="px-3 py-2 text-xs text-right text-[#B2B5BE]">{formatTHB(trade.exit_price)}</td>
          <td
            className={`px-3 py-2 text-xs text-right ${
              trade.realized_pnl >= 0 ? 'text-[#26A69A]' : 'text-[#EF5350]'
            }`}
          >
            {formatTHB(trade.realized_pnl, { signed: true })}
          </td>
          <td className="px-3 py-2 text-xs text-right text-[#B2B5BE]">{trade.duration_bars}</td>
          <td className="px-3 py-2 text-xs text-right text-[#B2B5BE]">
            {trade.commission != null ? formatTHB(trade.commission) : '—'}
          </td>
        </tr>
      );
    },
    [page.items],
  );

  return (
    <section aria-label="Trade log" className="report-section space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#B2B5BE]">List of Trades</h2>
        <div className="flex items-center gap-2 text-xs text-[#787B86]">
          <button
            type="button"
            onClick={handlePrev}
            disabled={!hasPrev}
            className="rounded bg-[#1E222D] px-3 py-1 disabled:opacity-30"
            aria-label="Previous page"
          >
            Prev
          </button>
          <span>
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={handleNext}
            disabled={!hasNext}
            className="rounded bg-[#1E222D] px-3 py-1 disabled:opacity-30"
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div
          ref={parentRef}
          style={shouldVirtualize ? { height: '600px', overflowY: 'auto' } : undefined}
        >
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#2A2E39]">
                <th className="px-3 py-2 text-left font-medium text-[#787B86]">Entry</th>
                <th className="px-3 py-2 text-left font-medium text-[#787B86]">Exit</th>
                <th className="px-3 py-2 text-left font-medium text-[#787B86]">Symbol</th>
                <th className="px-3 py-2 text-left font-medium text-[#787B86]">Side</th>
                <th className="px-3 py-2 text-right font-medium text-[#787B86]">Qty</th>
                <th className="px-3 py-2 text-right font-medium text-[#787B86]">Entry Price</th>
                <th className="px-3 py-2 text-right font-medium text-[#787B86]">Exit Price</th>
                <th className="px-3 py-2 text-right font-medium text-[#787B86]">P&amp;L</th>
                <th className="px-3 py-2 text-right font-medium text-[#787B86]">Bars</th>
                <th className="px-3 py-2 text-right font-medium text-[#787B86]">Commission</th>
              </tr>
            </thead>
            <tbody>
              {shouldVirtualize
                ? rowVirtualizer.getVirtualItems().map((virtualItem) =>
                    renderRow(virtualItem.index),
                  )
                : page.items.map((_, i) => renderRow(i))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
