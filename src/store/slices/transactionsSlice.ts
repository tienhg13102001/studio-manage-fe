import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { transactionService } from '../../services/transactionService';
import type { TransactionResponse, TransactionSummaryRow, TransactionTotals } from '../../types';

interface TransactionsState {
  list: TransactionResponse[];
  total: number;
  /** Totals of the whole filtered set (not just the current page). */
  totals: TransactionTotals | null;
  summary: TransactionSummaryRow[];
  summaryLoading: boolean;
  /** Tổng hợp tải lỗi: KPI phải báo lỗi, không hiện 0 ₫. */
  summaryError: string | null;
  /** Phạm vi (mùa|từ|đến) của `summary` đang giữ — khác phạm vi hiện tại thì số liệu là cũ. */
  summaryKey: string | null;
  loading: boolean;
  /** Mobile "Tải thêm": next page being appended. */
  loadingMore: boolean;
  error: string | null;
}

const initialState: TransactionsState = {
  list: [],
  total: 0,
  totals: null,
  summary: [],
  summaryLoading: false,
  summaryError: null,
  summaryKey: null,
  loading: false,
  loadingMore: false,
  error: null,
};

export const fetchTransactions = createAsyncThunk(
  'transactions/fetchAll',
  (params?: Record<string, string | number>) => transactionService.getAll(params),
);

/** Fetches the next page and appends it to `list` (mobile load-more). */
export const fetchMoreTransactions = createAsyncThunk(
  'transactions/fetchMore',
  (params: Record<string, string | number>) => transactionService.getAll(params),
);

export const summaryScopeKey = (p?: { dateFrom?: string; dateTo?: string; season?: string }) =>
  `${p?.season ?? ''}|${p?.dateFrom ?? ''}|${p?.dateTo ?? ''}`;

export const fetchTransactionSummary = createAsyncThunk(
  'transactions/fetchSummary',
  (params?: { dateFrom?: string; dateTo?: string; season?: string }) =>
    transactionService.getSummary(params),
);

const transactionsSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    patchTransaction: (
      state,
      action: { payload: { id: string; changes: Partial<TransactionResponse> } },
    ) => {
      const { id, changes } = action.payload;
      const idx = state.list.findIndex((t) => t._id === id);
      if (idx !== -1) {
        state.list[idx] = { ...state.list[idx], ...changes };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data;
        state.total = action.payload.total;
        state.totals = action.payload.totals ?? null;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        // A newer request superseded this one — it owns `loading`
        if (action.meta.aborted) return;
        state.loading = false;
        state.error = action.error.message ?? 'Lỗi tải giao dịch';
      })
      .addCase(fetchMoreTransactions.pending, (state) => {
        state.loadingMore = true;
      })
      .addCase(fetchMoreTransactions.fulfilled, (state, action) => {
        state.loadingMore = false;
        const seen = new Set(state.list.map((t) => t._id));
        state.list.push(...action.payload.data.filter((t) => !seen.has(t._id)));
        state.total = action.payload.total;
        state.totals = action.payload.totals ?? state.totals;
      })
      .addCase(fetchMoreTransactions.rejected, (state, action) => {
        if (action.meta.aborted) return;
        state.loadingMore = false;
      })
      .addCase(fetchTransactionSummary.pending, (state) => {
        state.summaryLoading = true;
        state.summaryError = null;
      })
      .addCase(fetchTransactionSummary.fulfilled, (state, action) => {
        state.summaryLoading = false;
        state.summaryError = null;
        state.summary = action.payload;
        state.summaryKey = summaryScopeKey(action.meta.arg);
      })
      .addCase(fetchTransactionSummary.rejected, (state, action) => {
        if (action.meta.aborted) return;
        state.summaryLoading = false;
        state.summaryError = action.error.message ?? 'Không tải được số liệu tổng hợp';
        state.summary = [];
        state.summaryKey = null;
      });
  },
});

export const { patchTransaction } = transactionsSlice.actions;

export default transactionsSlice.reducer;
