import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { scheduleService } from '../../services/scheduleService';
import type { ScheduleResponse } from '../../types';

interface SchedulesState {
  list: ScheduleResponse[];
  total: number;
  loading: boolean;
  error: string | null;
}

const initialState: SchedulesState = { list: [], total: 0, loading: false, error: null };

export const fetchSchedules = createAsyncThunk(
  'schedules/fetchAll',
  (params?: Record<string, string | number>) => scheduleService.getAll(params),
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
        state.list = action.payload.data;
        state.total = action.payload.total;
      })
      .addCase(fetchSchedules.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Lỗi tải lịch chụp';
      });
  },
});

export default schedulesSlice.reducer;
