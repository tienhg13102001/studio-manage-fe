import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { categoryService } from '../../services/categoryService';
import type { Category } from '../../types';

interface CategoriesState {
  list: Category[];
  loading: boolean;
  error: string | null;
}

const initialState: CategoriesState = { list: [], loading: false, error: null };

export const fetchCategories = createAsyncThunk('categories/fetchAll', () =>
  categoryService.getAll(),
);

const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Lỗi tải danh mục';
      });
  },
});

export default categoriesSlice.reducer;
