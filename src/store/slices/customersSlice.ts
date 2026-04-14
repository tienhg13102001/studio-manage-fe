import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { customerService } from '../../services/customerService';
import type { Customer } from '../../types';

interface CustomersState {
  list: Customer[];
  loading: boolean;
  error: string | null;
}

const initialState: CustomersState = { list: [], loading: false, error: null };

export const fetchCustomers = createAsyncThunk(
  'customers/fetchAll',
  (params?: Record<string, string | number>) => customerService.getAll(params).then((r) => r.data),
);

const customersSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Lỗi tải khách hàng';
      });
  },
});

export default customersSlice.reducer;
