import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { userService } from '../../services/userService';
import type { User } from '../../types';

interface UsersState {
  list: User[];
  photographers: User[];
  sales: User[];
  loading: boolean;
  error: string | null;
}

const initialState: UsersState = {
  list: [],
  photographers: [],
  sales: [],
  loading: false,
  error: null,
};

export const fetchUsers = createAsyncThunk('users/fetchAll', () => userService.getAll());

export const fetchPhotographers = createAsyncThunk('users/fetchPhotographers', () =>
  userService.getPhotographers(),
);

export const fetchSales = createAsyncThunk('users/fetchSales', () => userService.getSales());

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Lỗi tải người dùng';
      })
      .addCase(fetchPhotographers.fulfilled, (state, action) => {
        state.photographers = action.payload;
      })
      .addCase(fetchSales.fulfilled, (state, action) => {
        state.sales = action.payload;
      });
  },
});

export default usersSlice.reducer;
