import type { JSX, ReactNode } from 'react';

export interface MetricTableColumn {
  readonly key: string;
  readonly header: string;
  readonly align?: 'left' | 'right' | 'center';
  readonly format?: (value: unknown) => string;
}

export interface MetricTableProps {
  readonly columns: ReadonlyArray<MetricTableColumn>;
  readonly rows: ReadonlyArray<Record<string, unknown>>;
  readonly caption?: string;
}

const ALIGN_CLASS: Record<string, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

export function MetricTable({ columns, rows, caption }: MetricTableProps): JSX.Element {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-[#2A2E39]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-2 font-medium text-[#787B86] ${ALIGN_CLASS[col.align ?? 'left']}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-b border-[#1E222D] hover:bg-[#1E222D]/50 transition-colors"
            >
              {columns.map((col) => {
                const raw = row[col.key];
                const display: ReactNode = col.format ? col.format(raw) : String(raw ?? '');
                return (
                  <td
                    key={col.key}
                    className={`px-4 py-2 text-[#B2B5BE] ${ALIGN_CLASS[col.align ?? 'left']}`}
                  >
                    {display}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
