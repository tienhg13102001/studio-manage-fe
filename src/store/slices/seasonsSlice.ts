import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { seasonService } from '../../services/seasonService';
import type { Season } from '../../types';

interface SeasonsState {
  list: Season[];
  loading: boolean;
  error: string | null;
}

const initialState: SeasonsState = { list: [], loading: false, error: null };

export const fetchSeasons = createAsyncThunk('seasons/fetchAll', () => seasonService.getAll());

const seasonsSlice = createSlice({
  name: 'seasons',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSeasons.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSeasons.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchSeasons.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Lỗi tải mùa chụp';
      });
  },
});

export default seasonsSlice.reducer;
