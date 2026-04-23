import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { transactionService } from '../services/transactionService';
import { ConfirmModal, DataTable, Modal } from '../components/organisms';
import type { Column } from '../components/organisms';
import { toast } from 'react-toastify';
import { formatDate, formatCurrency } from '../utils/format';
import type { Transaction, TransactionResponse } from '../types';
import { useAuth } from '../context/AuthContext';
import { useAppDispatch, useAppSelector } from '../store';
import {
  fetchTransactions,
  fetchTransactionSummary,
  patchTransaction,
} from '../store/slices/transactionsSlice';
import { fetchCustomers } from '../store/slices/customersSlice';
import { fetchCategories } from '../store/slices/categoriesSlice';
import { TableSkeleton, Select } from '../components/atoms';
import { fetchUsers } from '../store/slices/usersSlice';

interface FilterState {
  type: string;
  customer: string;
  categoryId: string;
  createdBy: string;
  dateFrom: string;
  dateTo: string;
}

const defaultFilter: FilterState = {
  type: '',
  customer: '',
  categoryId: '',
  createdBy: '',
  dateFrom: '',
  dateTo: '',
};

const FinancePage = () => {
  const { user } = useAuth();
  const isAdmin = user?.roles.some((r) => r === 0 || r === 1) ?? false;
  const canRefund = user?.roles.some((r) => r === 5) ?? false;

  const dispatch = useAppDispatch();
  const { list: transactions, summary, loading } = useAppSelector((s) => s.transactions);
  const { list: customers } = useAppSelector((s) => s.customers);
  const { list: categories } = useAppSelector((s) => s.categories);
  const { list: users } = useAppSelector((s) => s.users);
  const [filter, setFilter] = useState<FilterState>(defaultFilter);
  const [tab, setTab] = useState<'list' | 'summary'>('list');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionResponse | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { isSubmitting },
  } = useForm<Partial<Transaction>>();

  const selectedType = watch('type');

  const buildListParams = (f: FilterState): Record<string, string> => {
    const params: Record<string, string> = {};
    if (f.type) params.type = f.type;
    if (f.customer) params.customer = f.customer;
    if (f.categoryId) params.categoryId = f.categoryId;
    if (f.createdBy) params.createdBy = f.createdBy;
    if (f.dateFrom) params.dateFrom = f.dateFrom;
    if (f.dateTo) params.dateTo = f.dateTo;
    return params;
  };

  useEffect(() => {
    dispatch(fetchTransactions({}));
    dispatch(fetchTransactionSummary());
    dispatch(fetchCustomers({ limit: 200 }));
    dispatch(fetchCategories());
    if (canRefund) dispatch(fetchUsers());
  }, [dispatch, canRefund]);

  const openCreate = () => {
    setEditing(null);
    reset({ type: 'income', date: new Date().toISOString().slice(0, 10) });
    setModalOpen(true);
  };

  const openEdit = (t: TransactionResponse) => {
    setEditing(t);
    reset({
      ...t,
      customer: t.customer?._id ?? '',
      categoryId: t.categoryId._id,
      date: t.date.slice(0, 10),
      createdBy: t.createdBy?._id ?? '',
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: Partial<Transaction>) => {
    const payload = { ...data, customer: data.customer || null };
    try {
      if (editing) {
        await transactionService.update(editing._id, payload);
        toast.success('Cập nhật giao dịch thành công!');
      } else {
        await transactionService.create(payload);
        toast.success('Thêm giao dịch thành công!');
      }
      setModalOpen(false);
      dispatch(fetchTransactions(buildListParams(filter)));
      dispatch(fetchTransactionSummary({ dateFrom: filter.dateFrom, dateTo: filter.dateTo }));
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const toggleRefund = async (t: TransactionResponse, value: boolean) => {
    // Optimistic update via redux – không trigger loading state
    dispatch(patchTransaction({ id: t._id, changes: { accountantRefunded: value } }));
    try {
      await transactionService.update(t._id, { accountantRefunded: value });
    } catch {
      // rollback
      dispatch(patchTransaction({ id: t._id, changes: { accountantRefunded: !value } }));
      toast.error('Không thể cập nhật trạng thái hoàn tiền.');
    }
  };

  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleDelete = (id: string) => setConfirmId(id);

  const doDelete = async () => {
    if (!confirmId) return;
    try {
      await transactionService.remove(confirmId);
      toast.success('Đã xoá giao dịch.');
      dispatch(fetchTransactions(buildListParams(filter)));
      dispatch(fetchTransactionSummary({ dateFrom: filter.dateFrom, dateTo: filter.dateTo }));
    } catch {
      toast.error('Xoá thất bại, vui lòng thử lại.');
    }
    setConfirmId(null);
  };

  const applyFilter = () => {
    dispatch(fetchTransactions(buildListParams(filter)));
    dispatch(fetchTransactionSummary({ dateFrom: filter.dateFrom, dateTo: filter.dateTo }));
  };
  const resetFilter = () => {
    setFilter(defaultFilter);
    dispatch(fetchTransactions({}));
    dispatch(fetchTransactionSummary());
  };

  const filteredCategories = categories.filter((c) => !selectedType || c.type === selectedType);

  const grandTotal = summary.reduce(
    (acc, r) => ({
      income: acc.income + r.income,
      expense: acc.expense + r.expense,
      profit: acc.profit + r.profit,
    }),
    { income: 0, expense: 0, profit: 0 },
  );

  const txColumns: Column<TransactionResponse>[] = [
    { key: 'date', header: 'Ngày', render: (t) => formatDate(t.date) },
    {
      key: 'type',
      header: 'Loại',
      render: (t) => (
        <span
          className={`badge ${t.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
        >
          {t.type === 'income' ? 'Thu' : 'Chi'}
        </span>
      ),
    },
    {
      key: 'category',
      header: 'Danh mục',
      className: 'text-gray-600',
      render: (t) => t.categoryId?.name ?? '—',
    },
    {
      key: 'class',
      header: 'Lớp',
      className: 'text-gray-600',
      render: (t) => t.customer?.className ?? '—',
    },
    {
      key: 'description',
      header: 'Mô tả',
      className: 'text-gray-600',
      render: (t) => t.description,
    },
    {
      key: 'createdBy',
      header: 'Người thực hiện',
      className: 'text-gray-600',
      render: (t) => t.createdBy?.name ?? t.createdBy?.username ?? '—',
    },
    {
      key: 'amount',
      header: 'Số tiền',
      align: 'right',
      render: (t) => (
        <span className={`font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
          {t.type === 'expense' ? '-' : '+'}
          {formatCurrency(t.amount)}
        </span>
      ),
    },
    {
      key: 'refund',
      header: 'KT hoàn tiền',
      align: 'center',
      render: (t) => (
        <input
          type="checkbox"
          className="rounded border-gray-300"
          checked={!!t.accountantRefunded}
          disabled={!canRefund}
          onChange={(e) => toggleRefund(t, e.target.checked)}
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (t) => (
        <span className="space-x-2">
          <button onClick={() => openEdit(t)} className="text-blue-600 hover:underline text-xs">
            Sửa
          </button>
          <button
            onClick={() => handleDelete(t._id)}
            className="text-red-600 hover:underline text-xs"
          >
            Xoá
          </button>
        </span>
      ),
    },
  ];

  type SummaryRow = (typeof summary)[number];
  const summaryColumns: Column<SummaryRow>[] = [
    {
      key: 'class',
      header: 'Lớp',
      className: 'font-medium',
      render: (row) => row.customer?.className ?? '(Không có lớp)',
    },
    {
      key: 'school',
      header: 'Trường',
      className: 'text-gray-600',
      render: (row) => row.customer?.school,
    },
    {
      key: 'income',
      header: <span className="text-green-600">Tổng thu</span>,
      align: 'right',
      render: (row) => <span className="text-green-600">{formatCurrency(row.income)}</span>,
    },
    {
      key: 'expense',
      header: <span className="text-red-600">Tổng chi</span>,
      align: 'right',
      render: (row) => <span className="text-red-600">{formatCurrency(row.expense)}</span>,
    },
    {
      key: 'profit',
      header: 'Lợi nhuận',
      align: 'right',
      render: (row) => (
        <span className={`font-medium ${row.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {formatCurrency(row.profit)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Quản lý Thu Chi</h2>
        <button onClick={openCreate} className="btn-primary">
          + Thêm giao dịch
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4 space-y-3">
        {/* Hàng 1: Loại + Lớp + Danh mục */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Select
            options={[
              { value: '', label: 'Tất cả loại' },
              { value: 'income', label: 'Thu' },
              { value: 'expense', label: 'Chi' },
            ]}
            value={filter.type}
            onChange={(v) => setFilter((f) => ({ ...f, type: v as string }))}
          />
          <Select
            options={[
              { value: '', label: 'Tất cả lớp' },
              ...customers.map((c) => ({ value: c._id, label: `${c.className} - ${c.school}` })),
            ]}
            value={filter.customer}
            onChange={(v) => setFilter((f) => ({ ...f, customer: v as string }))}
          />
          <div className="col-span-2 md:col-span-1">
            <Select
              options={[
                { value: '', label: 'Tất cả danh mục' },
                ...categories.map((c) => ({ value: c._id, label: c.name })),
              ]}
              value={filter.categoryId}
              onChange={(v) => setFilter((f) => ({ ...f, categoryId: v as string }))}
            />
          </div>
        </div>

        {canRefund && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select
              options={[
                { value: '', label: 'Tất cả người thực hiện' },
                ...users.map((u) => ({ value: u._id, label: u.name ?? u.username })),
              ]}
              value={filter.createdBy}
              onChange={(v) => setFilter((f) => ({ ...f, createdBy: v as string }))}
            />
          </div>
        )}

        {/* Hàng 2: Từ ngày + Đến ngày + Buttons */}
        <div className="grid grid-cols-2 md:flex md:items-center gap-3">
          <div className="md:flex-1 relative">
            <span className="absolute -top-2 left-2.5 px-1 bg-white text-xs text-gray-400 leading-none z-10 pointer-events-none">
              Từ ngày
            </span>
            <input
              type="date"
              className="input"
              value={filter.dateFrom}
              onChange={(e) => setFilter((f) => ({ ...f, dateFrom: e.target.value }))}
            />
          </div>
          <div className="md:flex-1 relative">
            <span className="absolute -top-2 left-2.5 px-1 bg-white text-xs text-gray-400 leading-none z-10 pointer-events-none">
              Đến ngày
            </span>
            <input
              type="date"
              className="input"
              value={filter.dateTo}
              onChange={(e) => setFilter((f) => ({ ...f, dateTo: e.target.value }))}
            />
          </div>
          <div className="col-span-2 md:col-span-1 flex gap-2 md:ml-auto">
            <button onClick={applyFilter} className="btn-primary flex-1 md:flex-none">
              Lọc
            </button>
            <button onClick={resetFilter} className="btn-secondary flex-1 md:flex-none">
              Xoá
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('list')}
          className={tab === 'list' ? 'btn-primary' : 'btn-secondary'}
        >
          Danh sách
        </button>
        <button
          onClick={() => setTab('summary')}
          className={tab === 'summary' ? 'btn-primary' : 'btn-secondary'}
        >
          Tổng hợp theo lớp
        </button>
      </div>

      {tab === 'list' &&
        (loading ? (
          <TableSkeleton cols={8} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <DataTable<TransactionResponse>
                data={transactions}
                keyExtractor={(t) => t._id}
                emptyTitle="Chưa có dữ liệu"
                columns={txColumns}
              />
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {transactions.map((t) => (
                <div key={t._id} className="card p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-sm text-gray-500">{formatDate(t.date)}</div>
                      <div className="text-sm text-gray-600 mt-0.5">
                        {t.categoryId?.name ?? '—'}
                      </div>
                      {t.customer && (
                        <div className="text-xs text-gray-400">{t.customer.className}</div>
                      )}
                      {t.description && (
                        <div className="text-xs text-gray-400 mt-0.5">{t.description}</div>
                      )}
                      {t.createdBy && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          👤 {t.createdBy.name ?? t.createdBy.username}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <span
                        className={`badge ${t.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {t.type === 'income' ? 'Thu' : 'Chi'}
                      </span>
                      <div
                        className={`font-semibold text-sm mt-1 ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {t.type === 'expense' ? '-' : '+'}
                        {formatCurrency(t.amount)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 pt-2 border-t border-gray-100">
                    <label className="flex items-center gap-1.5 text-xs text-gray-600 mr-auto">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={!!t.accountantRefunded}
                        disabled={!canRefund}
                        onChange={(e) => toggleRefund(t, e.target.checked)}
                      />
                      KT hoàn tiền
                    </label>
                    <button
                      onClick={() => openEdit(t)}
                      className="text-blue-600 text-xs font-medium"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(t._id)}
                      className="text-red-600 text-xs font-medium"
                    >
                      Xoá
                    </button>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="card py-10 text-center text-gray-400">Chưa có dữ liệu</div>
              )}
            </div>
          </>
        ))}

      {tab === 'summary' && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <DataTable<SummaryRow>
              data={summary}
              keyExtractor={(row) => row._id ?? 'unknown'}
              emptyTitle="Chưa có dữ liệu"
              columns={summaryColumns}
              footer={
                summary.length > 0 ? (
                  <tr className="border-t bg-gray-50 font-semibold">
                    <td className="px-3 py-2" colSpan={2}>
                      Tổng cộng
                    </td>
                    <td className="px-3 py-2 text-right text-green-600">
                      {formatCurrency(grandTotal.income)}
                    </td>
                    <td className="px-3 py-2 text-right text-red-600">
                      {formatCurrency(grandTotal.expense)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right ${grandTotal.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {formatCurrency(grandTotal.profit)}
                    </td>
                  </tr>
                ) : undefined
              }
            />
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {summary.map((row) => (
              <div key={row._id ?? 'unknown'} className="card p-4">
                <div className="font-semibold text-gray-900 mb-0.5">
                  {row.customer?.className ?? '(Không có lớp)'}
                </div>
                {row.customer?.school && (
                  <div className="text-sm text-gray-500 mb-2">🏫 {row.customer.school}</div>
                )}
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <div className="text-xs text-gray-400">Thu</div>
                    <div className="text-green-600 font-medium">{formatCurrency(row.income)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Chi</div>
                    <div className="text-red-600 font-medium">{formatCurrency(row.expense)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Lợi nhuận</div>
                    <div
                      className={`font-semibold ${row.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {formatCurrency(row.profit)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {summary.length > 0 && (
              <div className="card p-4 bg-gray-50">
                <div className="font-semibold text-gray-900 mb-2">Tổng cộng</div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <div className="text-xs text-gray-400">Thu</div>
                    <div className="text-green-600 font-semibold">
                      {formatCurrency(grandTotal.income)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Chi</div>
                    <div className="text-red-600 font-semibold">
                      {formatCurrency(grandTotal.expense)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Lợi nhuận</div>
                    <div
                      className={`font-semibold ${grandTotal.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {formatCurrency(grandTotal.profit)}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {summary.length === 0 && (
              <div className="card py-10 text-center text-gray-400">Chưa có dữ liệu</div>
            )}
          </div>
        </>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Sửa giao dịch' : 'Thêm giao dịch'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Loại *</label>
              <Controller
                name="type"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select
                    options={[
                      { value: 'income', label: 'Thu' },
                      { value: 'expense', label: 'Chi' },
                    ]}
                    value={field.value ?? ''}
                    onChange={(v) => field.onChange(v)}
                  />
                )}
              />
            </div>
            <div>
              <label className="label">Danh mục *</label>
              <Controller
                name="categoryId"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select
                    options={filteredCategories.map((c) => ({ value: c._id, label: c.name }))}
                    value={
                      typeof field.value === 'object' && field.value !== null
                        ? (field.value as { _id: string })._id
                        : (field.value ?? '')
                    }
                    onChange={(v) => field.onChange(v)}
                    placeholder="-- Chọn danh mục --"
                  />
                )}
              />
            </div>
            <div>
              <label className="label">Số tiền *</label>
              <input
                {...register('amount', { required: true, valueAsNumber: true, min: 0 })}
                type="number"
                className="input"
              />
            </div>
            <div>
              <label className="label">Ngày *</label>
              <input {...register('date', { required: true })} type="date" className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Lớp (tuỳ chọn)</label>
              <Controller
                name="customer"
                control={control}
                render={({ field }) => (
                  <Select
                    options={customers.map((c) => ({
                      value: c._id,
                      label: `${c.className} – ${c.school}`,
                    }))}
                    value={
                      typeof field.value === 'object' && field.value !== null
                        ? (field.value as { _id: string })._id
                        : (field.value ?? '')
                    }
                    onChange={(v) => field.onChange(v || undefined)}
                    placeholder="-- Không có lớp --"
                  />
                )}
              />
            </div>
            {isAdmin && (
              <div className="sm:col-span-2">
                <label className="label">Người thực hiện</label>
                <Controller
                  name="createdBy"
                  control={control}
                  render={({ field }) => (
                    <Select
                      options={users.map((u) => ({ value: u._id, label: u.name ?? u.username }))}
                      value={
                        typeof field.value === 'object' && field.value !== null
                          ? (field.value as { _id: string })._id
                          : (field.value ?? '')
                      }
                      onChange={(v) => field.onChange(v || undefined)}
                      placeholder="-- Mặc định (tôi) --"
                    />
                  )}
                />
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="label">Mô tả</label>
              <textarea {...register('description')} className="input" rows={2} />
            </div>
            {canRefund && (
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    {...register('accountantRefunded')}
                  />
                  <span className="text-sm text-gray-700">Kế toán đã hoàn tiền</span>
                </label>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Huỷ
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              Lưu
            </button>
          </div>
        </form>
      </Modal>
      <ConfirmModal
        isOpen={!!confirmId}
        message="Bạn có chắc muốn xoá giao dịch này?"
        onConfirm={doDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
};

export default FinancePage;
