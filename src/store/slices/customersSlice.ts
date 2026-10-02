import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { customerService } from '../../services/customerService';
import type { Customer } from '../../types';

interface CustomersState {
  list: Customer[];
  total: number;
  loading: boolean;
  error: string | null;
  /** Latest request — older (out-of-order) responses are ignored. */
  requestId: string | null;
}

const initialState: CustomersState = {
  list: [],
  total: 0,
  loading: false,
  error: null,
  requestId: null,
};

export const fetchCustomers = createAsyncThunk(
  'customers/fetchAll',
  (params: Record<string, string | number> | undefined, { signal }) =>
    customerService.getAll(params, signal),
);

const customersSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.requestId = action.meta.requestId;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.requestId) return;
        state.loading = false;
        state.list = action.payload.data;
        state.total = action.payload.total;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        if (action.meta.requestId !== state.requestId || action.meta.aborted) return;
        state.loading = false;
        state.error = action.error.message ?? 'Lỗi tải khách hàng';
      });
  },
});

export default customersSlice.reducer;
