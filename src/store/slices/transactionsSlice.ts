import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { transactionService } from '../../services/transactionService';
import type { Transaction, TransactionSummaryRow } from '../../types';

interface TransactionsState {
  list: Transaction[];
  summary: TransactionSummaryRow[];
  loading: boolean;
  error: string | null;
}

const initialState: TransactionsState = { list: [], summary: [], loading: false, error: null };

export const fetchTransactions = createAsyncThunk(
  'transactions/fetchAll',
  (params?: Record<string, string | number>) =>
    transactionService.getAll(params).then((r) => r.data),
);

export const fetchTransactionSummary = createAsyncThunk(
  'transactions/fetchSummary',
  (params?: { dateFrom?: string; dateTo?: string }) => transactionService.getSummary(params),
);

const transactionsSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    patchTransaction: (
      state,
      action: { payload: { id: string; changes: Partial<Transaction> } },
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
        state.list = action.payload;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Lỗi tải giao dịch';
      })
      .addCase(fetchTransactionSummary.fulfilled, (state, action) => {
        state.summary = action.payload;
      });
  },
});

export const { patchTransaction } = transactionsSlice.actions;

export default transactionsSlice.reducer;
