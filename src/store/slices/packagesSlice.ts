import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { packageService } from '../../services/packageService';
import type { Package } from '../../types';

interface PackagesState {
  list: Package[];
  loading: boolean;
  error: string | null;
}

const initialState: PackagesState = { list: [], loading: false, error: null };

export const fetchPackages = createAsyncThunk('packages/fetchAll', () => packageService.getAll());

const packagesSlice = createSlice({
  name: 'packages',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPackages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPackages.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchPackages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Lỗi tải gói chụp';
      });
  },
});

export default packagesSlice.reducer;
