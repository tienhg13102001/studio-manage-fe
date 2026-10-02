import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { scheduleService } from '../../services/scheduleService';
import type { ScheduleResponse, ScheduleStatusCounts } from '../../types';

interface SchedulesState {
  list: ScheduleResponse[];
  total: number;
  /** GET /schedules facets: counts per shoot status for the current filters minus `status`. */
  statusCounts: ScheduleStatusCounts | null;
  loading: boolean;
  error: string | null;
}

const initialState: SchedulesState = {
  list: [],
  total: 0,
  statusCounts: null,
  loading: false,
  error: null,
};

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
        state.statusCounts = action.payload.statusCounts ?? null;
      })
      .addCase(fetchSchedules.rejected, (state, action) => {
        // A newer request superseded this one — it owns `loading`
        if (action.meta.aborted) return;
        state.loading = false;
        state.error = action.error.message ?? 'Lỗi tải lịch chụp';
      });
  },
});

export default schedulesSlice.reducer;
