// Module-scoped Intl instances — expensive ICU constructors called once at import
// (Vercel js-cache-function-results)
const THB_FORMATTER = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
  maximumFractionDigits: 0,
});

const DATE_FORMATTER = new Intl.DateTimeFormat('th-TH', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

export const formatTHB = (v: number, opts?: { readonly signed?: boolean }): string => {
  const formatted = THB_FORMATTER.format(v);
  if (opts?.signed && v > 0) return `+${formatted}`;
  return formatted;
};

export const formatPercent = (v: number, decimals = 2): string =>
  `${v >= 0 ? '+' : ''}${(v * 100).toFixed(decimals)}%`;

export const formatDateTH = (iso: string): string => DATE_FORMATTER.format(new Date(iso));

const BKK_DATE_FORMATTER = new Intl.DateTimeFormat('th-TH', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'Asia/Bangkok',
});

export const formatDateBKK = (iso: string): string => BKK_DATE_FORMATTER.format(new Date(iso));

export const trendColor = (v: number): string =>
  v > 0 ? 'text-green-400' : v < 0 ? 'text-red-400' : 'text-gray-400';
