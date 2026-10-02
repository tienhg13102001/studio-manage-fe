import type { Season, TransactionSummaryRow, User } from '../../../types';

export type TxType = '' | 'income' | 'expense';
export type RefundFilter = '' | 'done' | 'pending';
export type TxSort = 'date_desc' | 'date_asc';

export interface FinanceFilters {
  type: TxType;
  customer: string;
  categoryId: string;
  createdBy: string;
  dateFrom: string;
  dateTo: string;
  refund: RefundFilter;
  /** Server-side search on the description. */
  search: string;
}

export const DEFAULT_FINANCE_FILTERS: FinanceFilters = {
  type: '',
  customer: '',
  categoryId: '',
  createdBy: '',
  dateFrom: '',
  dateTo: '',
  refund: '',
  search: '',
};

/** Number of non-default filters (search excluded — it has its own box). */
export const activeFilterCount = (f: FinanceFilters) =>
  [f.type, f.customer, f.categoryId, f.createdBy, f.dateFrom || f.dateTo, f.refund].filter(Boolean)
    .length;

export const buildTxParams = (
  f: FinanceFilters,
  season: string,
  extra: Record<string, string | number>,
): Record<string, string | number> => {
  const params: Record<string, string | number> = { ...extra };
  if (f.type) params.type = f.type;
  if (f.customer) params.customer = f.customer;
  if (f.categoryId) params.categoryId = f.categoryId;
  if (f.createdBy) params.createdBy = f.createdBy;
  if (f.dateFrom) params.dateFrom = f.dateFrom;
  if (f.dateTo) params.dateTo = f.dateTo;
  if (f.refund) params.refund = f.refund;
  if (f.search.trim()) params.search = f.search.trim();
  if (season) params.season = season;
  return params;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Calendar parts of an ISO date, read from its `YYYY-MM-DD` prefix (no timezone shift). */
const parts = (iso: string) => ({
  y: +iso.slice(0, 4),
  m: +iso.slice(5, 7),
  d: +iso.slice(8, 10),
});

/** "30/09", plus "/26" when the date falls outside the selected season (or current year). */
export const shortDate = (iso: string, season?: Season | null) => {
  const { y, m, d } = parts(iso);
  const key = iso.slice(0, 10);
  const inScope = season
    ? key >= season.startDate.slice(0, 10) && key <= season.endDate.slice(0, 10)
    : y === new Date().getFullYear();
  return inScope ? `${pad(d)}/${pad(m)}` : `${pad(d)}/${pad(m)}/${String(y).slice(2)}`;
};

/** "01/09 – 30/09/2026" */
export const rangeLabel = (from: string, to: string) => {
  const full = (iso: string) => {
    const { y, m, d } = parts(iso);
    return `${pad(d)}/${pad(m)}/${y}`;
  };
  if (from && to) {
    const sameYear = from.slice(0, 4) === to.slice(0, 4);
    return `${sameYear ? full(from).slice(0, 5) : full(from)} – ${full(to)}`;
  }
  if (from) return `Từ ${full(from)}`;
  if (to) return `Đến ${full(to)}`;
  return '';
};

/** "5.250.000" */
export const plainAmount = (n: number) => Math.round(n).toLocaleString('vi-VN');

/** "486.500.000 ₫" */
export const money = (n: number) => `${plainAmount(n)} ₫`;

/** "486,5 tr" / "1,2 tỷ" / "825 k" — compact amounts for mobile. */
export const shortMoney = (n: number) => {
  const abs = Math.abs(n);
  const fmt = (v: number) => v.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  if (abs >= 1e9) return `${fmt(n / 1e9)} tỷ`;
  if (abs >= 1e6) return `${fmt(n / 1e6)} tr`;
  if (abs >= 1e3) return `${fmt(n / 1e3)} k`;
  return fmt(n);
};

/** Profit margin in %, or null without income. */
export const marginPct = (profit: number, income: number) =>
  income > 0 ? (profit / income) * 100 : null;

export const formatPct = (pct: number) =>
  `${pct.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;

/** Vietnamese given name = last word ("Nguyễn Thị Hằng" → "Hằng"). */
export const givenName = (u: Pick<User, 'name' | 'username'> | null | undefined) => {
  const full = (u?.name || u?.username || '').trim();
  return full.split(/\s+/).pop() ?? '';
};

export interface FinanceKpi {
  income: number;
  expense: number;
  incomeCount: number;
  expenseCount: number;
  pendingRefund: number;
  pendingRefundCount: number;
}

/** KPIs = sum of the per-class summary rows (which include the "no class" row). */
export const kpiFromSummary = (rows: TransactionSummaryRow[]): FinanceKpi =>
  rows.reduce<FinanceKpi>(
    (acc, r) => ({
      income: acc.income + r.income,
      expense: acc.expense + r.expense,
      incomeCount: acc.incomeCount + (r.incomeCount ?? 0),
      expenseCount: acc.expenseCount + (r.expenseCount ?? 0),
      pendingRefund: acc.pendingRefund + (r.pendingRefund ?? 0),
      pendingRefundCount: acc.pendingRefundCount + (r.pendingRefundCount ?? 0),
    }),
    {
      income: 0,
      expense: 0,
      incomeCount: 0,
      expenseCount: 0,
      pendingRefund: 0,
      pendingRefundCount: 0,
    },
  );

export const INCOME_TEXT = 'text-emerald-600 dark:text-emerald-400';
export const EXPENSE_TEXT = 'text-rose-600 dark:text-rose-400';
