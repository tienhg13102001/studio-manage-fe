import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { scheduleService } from '../../services/scheduleService';
import type { Schedule } from '../../types';

interface SchedulesState {
  list: Schedule[];
  loading: boolean;
  error: string | null;
}

const initialState: SchedulesState = { list: [], loading: false, error: null };

export const fetchSchedules = createAsyncThunk(
  'schedules/fetchAll',
  (params?: Record<string, string | number>) => scheduleService.getAll(params).then((r) => r.data),
);

const schedulesSlice = createSlice({
  name: 'schedules',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSchedules.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSchedules.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchSchedules.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Lỗi tải lịch chụp';
      });
  },
});

export default schedulesSlice.reducer;
