import { useEffect, useState } from 'react';
import { Pencil, Phone, Plus, School, Trash2, UserCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-toastify';
import { customerService } from '../services/customerService';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchCustomers } from '../store/slices/customersSlice';
import { fetchSales } from '../store/slices/usersSlice';
import { useAuth } from '../context/AuthContext';
import type { Customer, CustomerStatus, CustomerStatusCounts } from '../types';
import {
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_STATUS_VARIANT,
  getCustomerStatus,
  getUserRefId,
  getUserRefName,
} from '../types';
import { cn } from '@/lib/utils';
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  FormField,
  Input,
  Modal,
  PageHeader,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TableSkeleton,
  Textarea,
} from '@/components/ui';
import type { Column } from '@/components/ui';

type FormValues = Omit<Customer, '_id' | 'createdAt'>;

const ALL = '__all__';
const NONE = '__none__';

/** Pipeline fields are changed only through the status endpoint — never sent by the form. */
const PIPELINE_FIELDS = [
  'status',
  'assignedSale',
  'lostReason',
  'statusChangedAt',
  'deposit',
] as const;

const StatusBadge = ({ customer }: { customer: Customer }) => {
  const status = getCustomerStatus(customer);
  return (
    <Badge variant={CUSTOMER_STATUS_VARIANT[status]} dot className="whitespace-nowrap">
      {CUSTOMER_STATUS_LABELS[status]}
    </Badge>
  );
};

const CustomersPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list: customers, total, loading } = useAppSelector((s) => s.customers);
  const { list: seasons, selectedSeasonId } = useAppSelector((s) => s.seasons);
  const sales = useAppSelector((s) => s.users.sales);
  const { user } = useAuth();
  const isAdmin = !!user?.roles.some((r) => r === 0 || r === 1);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | ''>('');
  const [mine, setMine] = useState(false);
  const [counts, setCounts] = useState<CustomerStatusCounts | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>();

  const buildParams = (s: string, p: number, l: number): Record<string, string | number> => {
    const params: Record<string, string | number> = { page: p, limit: l };
    if (s) params.search = s;
    if (selectedSeasonId) params.season = selectedSeasonId;
    if (statusFilter) params.status = statusFilter;
    if (mine) params.assignedSale = 'me';
    return params;
  };

  const loadCounts = () => {
    const params: Record<string, string> = {};
    if (selectedSeasonId) params.season = selectedSeasonId;
    if (mine) params.assignedSale = 'me';
    customerService
      .getStatusCounts(params)
      .then(setCounts)
      .catch(() => setCounts(null));
  };

  useEffect(() => {
    dispatch(fetchCustomers(buildParams(appliedSearch, page, pageSize)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, appliedSearch, page, pageSize, selectedSeasonId, statusFilter, mine]);

  useEffect(() => {
    if (isAdmin) dispatch(fetchSales());
  }, [dispatch, isAdmin]);

  useEffect(() => {
    loadCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeasonId, mine]);

  const changeStatusFilter = (st: CustomerStatus | '') => {
    setPage(1);
    setStatusFilter(st);
  };

  const openCreate = () => {
    setEditing(null);
    reset({
      className: '',
      school: '',
      contactName: '',
      contactPhone: '',
      contactAddress: '',
      total: 0,
      totalMale: 0,
      totalFemale: 0,
      notes: '',
      source: '',
      season: selectedSeasonId || undefined,
    });
    setModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    reset({ ...c, assignedSale: getUserRefId(c.assignedSale) });
    setModalOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    const data: Partial<Customer> = { ...values };
    PIPELINE_FIELDS.forEach((k) => delete data[k]);
    // Only admins may (re)assign the sale in charge through the form.
    if (isAdmin) data.assignedSale = getUserRefId(values.assignedSale);
    try {
      if (editing) {
        await customerService.update(editing._id, data);
        toast.success('Cập nhật lớp thành công!');
      } else {
        await customerService.create(data);
        toast.success('Thêm lớp thành công!');
      }
      setModalOpen(false);
      dispatch(fetchCustomers(buildParams(appliedSearch, page, pageSize)));
      loadCounts();
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const doDelete = async () => {
    if (!confirmId) return;
    try {
      await customerService.remove(confirmId);
      toast.success('Đã xoá lớp.');
      dispatch(fetchCustomers(buildParams(appliedSearch, page, pageSize)));
      loadCounts();
    } catch {
      toast.error('Xoá thất bại, vui lòng thử lại.');
    }
    setConfirmId(null);
  };

  const runSearch = () => {
    setPage(1);
    setAppliedSearch(search);
  };

  return (
    <div className="flex flex-col md:min-h-0 md:flex-1">
      <PageHeader
        kicker="Customers"
        title="Khách hàng (Lớp)"
        description="Danh sách lớp học, trường và thông tin liên hệ."
        action={
          <Button variant="gradient" onClick={openCreate}>
            <Plus />
            Thêm lớp
          </Button>
        }
      />

      {/* Pipeline status strip */}
      <div className="mb-4 flex flex-wrap gap-2">
        {CUSTOMER_STATUSES.map((st) => {
          const active = statusFilter === st;
          return (
            <button
              key={st}
              type="button"
              onClick={() => changeStatusFilter(active ? '' : st)}
              aria-pressed={active}
              className={cn(
                'rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                  : statusFilter
                    ? 'opacity-60 hover:opacity-100'
                    : 'hover:opacity-80',
              )}
            >
              <Badge variant={CUSTOMER_STATUS_VARIANT[st]} dot className="py-1 text-[12.5px]">
                {CUSTOMER_STATUS_LABELS[st]}
                <span className="font-bold tabular">{counts ? (counts[st] ?? 0) : '–'}</span>
              </Badge>
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          className="flex-1 sm:max-w-md"
          placeholder="Tìm kiếm lớp, trường…"
          value={search}
          onChange={setSearch}
          onSearch={runSearch}
          onClear={() => {
            setSearch('');
            setAppliedSearch('');
            setPage(1);
          }}
        />
        <Select
          value={statusFilter || ALL}
          onValueChange={(v) => changeStatusFilter(v === ALL ? '' : (v as CustomerStatus))}
        >
          <SelectTrigger className="h-[38px] w-[190px] rounded-[10px] border-border bg-card shadow-none">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tất cả trạng thái</SelectItem>
            {CUSTOMER_STATUSES.map((st) => (
              <SelectItem key={st} value={st}>
                {CUSTOMER_STATUS_LABELS[st]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          aria-pressed={mine}
          onClick={() => {
            setPage(1);
            setMine((m) => !m);
          }}
          className={cn(
            mine &&
              'border-primary/60 bg-primary/10 text-primary-700 hover:bg-primary/15 dark:text-primary',
          )}
        >
          <UserCheck />
          Lớp của tôi
        </Button>
        <span className="ml-auto text-sm text-muted-foreground tabular">{total} lớp</span>
      </div>

      {loading ? (
        <TableSkeleton cols={6} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:flex md:min-h-0 md:flex-1 md:flex-col">
            <DataTable<Customer>
              fill
              className="flex-1"
              data={customers}
              keyExtractor={(c) => c._id}
              emptyTitle="Chưa có dữ liệu"
              onRowClick={(c) => navigate(`/customers/${c._id}`)}
              pagination={{
                serverSide: true,
                page,
                pageSize,
                total,
                onPageChange: setPage,
                onPageSizeChange: (size: number) => {
                  setPageSize(size);
                  setPage(1);
                },
              }}
              columns={[
                {
                  key: 'className',
                  header: 'Lớp',
                  render: (c) => (
                    <div className="min-w-0">
                      <Link
                        to={`/customers/${c._id}`}
                        className="block font-semibold text-foreground hover:text-primary-700 dark:hover:text-primary"
                      >
                        {c.className}
                      </Link>
                      {c.school && (
                        <span className="block text-xs text-muted-foreground">{c.school}</span>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'status',
                  header: 'Trạng thái',
                  render: (c) => <StatusBadge customer={c} />,
                },
                {
                  key: 'assignedSale',
                  header: 'Sale phụ trách',
                  render: (c) => {
                    const name = getUserRefName(c.assignedSale);
                    return name ? (
                      <span className="whitespace-nowrap text-foreground">{name}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    );
                  },
                },
                {
                  key: 'contact',
                  header: 'Liên hệ',
                  render: (c) => (
                    <div>
                      <span className="block font-semibold text-foreground">{c.contactName}</span>
                      <span className="block text-xs text-muted-foreground tabular">
                        {c.contactPhone}
                      </span>
                    </div>
                  ),
                },
                {
                  key: 'contactAddress',
                  header: 'Địa chỉ',
                  render: (c) => <span>{c.contactAddress}</span>,
                },
                {
                  key: 'total',
                  header: 'Sĩ số',
                  render: (c) => {
                    const male = c.totalMale ?? 0;
                    const female = c.totalFemale ?? 0;
                    const sum = male + female;
                    return (
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground tabular">{c.total}</span>
                          {sum > 0 && (
                            <span className="flex h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                              <span
                                className="bg-blue-400"
                                style={{ width: `${(male / sum) * 100}%` }}
                              />
                              <span
                                className="bg-pink-400"
                                style={{ width: `${(female / sum) * 100}%` }}
                              />
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground tabular">
                          ♂ {male} · ♀ {female}
                        </span>
                      </div>
                    );
                  },
                },
                {
                  key: 'notes',
                  header: 'Ghi chú',
                  render: (c) => (
                    <span
                      className="block max-w-[240px] truncate text-muted-foreground"
                      title={c.notes || ''}
                    >
                      {c.notes || '—'}
                    </span>
                  ),
                },
                {
                  key: 'actions',
                  header: '',
                  align: 'right',
                  className: 'whitespace-nowrap',
                  render: (c) => (
                    <span className="inline-flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-[30px] w-[30px] text-muted-foreground"
                        title="Sửa"
                        aria-label="Sửa"
                        onClick={() => openEdit(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-[30px] w-[30px] text-rose-600 hover:text-rose-700 dark:text-rose-400"
                        title="Xoá"
                        aria-label="Xoá"
                        onClick={() => setConfirmId(c._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </span>
                  ),
                } satisfies Column<Customer>,
              ]}
            />
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {customers.map((c) => (
              <div key={c._id} className="rounded-[14px] border bg-card p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <Link
                      to={`/customers/${c._id}`}
                      className="font-display font-bold text-foreground hover:text-primary-700 dark:hover:text-primary text-base block truncate"
                    >
                      {c.className}
                    </Link>
                    {c.school && (
                      <div className="text-sm text-muted-foreground inline-flex items-center gap-1.5 mt-0.5">
                        <School className="h-4 w-4 text-sky-500 shrink-0" />
                        <span className="truncate">{c.school}</span>
                      </div>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <StatusBadge customer={c} />
                      {getUserRefName(c.assignedSale) && (
                        <span className="text-xs text-muted-foreground">
                          Sale: {getUserRefName(c.assignedSale)}
                        </span>
                      )}
                    </div>
                  </div>
                  {c.total != null && (
                    <Badge
                      variant="outline"
                      className="border-transparent bg-primary-100 text-primary-700 dark:bg-primary/15 dark:text-primary"
                    >
                      {c.total} hs
                      {(c.totalMale != null || c.totalFemale != null) && (
                        <span className="font-normal opacity-70 ml-1">
                          (<span className="text-blue-500">{c.totalMale ?? 0}</span>/
                          <span className="text-pink-500">{c.totalFemale ?? 0}</span>)
                        </span>
                      )}
                    </Badge>
                  )}
                </div>

                {(c.contactName || c.contactPhone) && (
                  <div className="space-y-1 pt-2 border-t">
                    {c.contactName && (
                      <div className="text-sm text-foreground">{c.contactName}</div>
                    )}
                    {c.contactPhone && (
                      <a
                        href={`tel:${c.contactPhone}`}
                        className="text-sm text-muted-foreground inline-flex items-center gap-1.5 hover:text-emerald-500"
                      >
                        <Phone className="h-4 w-4 text-emerald-500" />
                        <span>{c.contactPhone}</span>
                      </a>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-1 mt-3 pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-[30px] w-[30px] text-muted-foreground"
                    title="Sửa"
                    aria-label="Sửa"
                    onClick={() => openEdit(c)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-[30px] w-[30px] text-rose-600 hover:text-rose-700 dark:text-rose-400"
                    title="Xoá"
                    aria-label="Xoá"
                    onClick={() => setConfirmId(c._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {customers.length === 0 && (
              <div className="rounded-[14px] border bg-card py-10 text-center text-muted-foreground">
                Chưa có dữ liệu
              </div>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Xác nhận xoá"
        message="Bạn có chắc muốn xoá lớp này?"
        onConfirm={doDelete}
      />

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Sửa lớp' : 'Thêm lớp mới'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <FormField
              label="Tên lớp"
              required
              htmlFor="className"
              error={errors.className?.message}
              className="col-span-2 sm:col-span-1"
            >
              <Input
                id="className"
                {...register('className', { required: 'Vui lòng nhập tên lớp' })}
              />
            </FormField>
            <FormField
              label="Trường"
              required
              htmlFor="school"
              error={errors.school?.message}
              className="col-span-2"
            >
              <Input id="school" {...register('school', { required: 'Vui lòng nhập trường' })} />
            </FormField>
            <FormField
              label="Sĩ số"
              required
              htmlFor="total"
              error={errors.total?.message}
              className="col-span-2 sm:col-span-1"
            >
              <Input
                id="total"
                type="number"
                {...register('total', { valueAsNumber: true, required: 'Vui lòng nhập sĩ số' })}
              />
            </FormField>
            <FormField
              label="Số nam"
              required
              htmlFor="totalMale"
              error={errors.totalMale?.message}
            >
              <Input
                id="totalMale"
                type="number"
                min={0}
                {...register('totalMale', {
                  valueAsNumber: true,
                  required: 'Vui lòng nhập số nam',
                })}
              />
            </FormField>
            <FormField
              label="Số nữ"
              required
              htmlFor="totalFemale"
              error={errors.totalFemale?.message}
            >
              <Input
                id="totalFemale"
                type="number"
                min={0}
                {...register('totalFemale', {
                  valueAsNumber: true,
                  required: 'Vui lòng nhập số nữ',
                })}
              />
            </FormField>
            <FormField
              label="Người liên hệ"
              required
              htmlFor="contactName"
              error={errors.contactName?.message}
              className="sm:col-span-2"
            >
              <Input
                id="contactName"
                {...register('contactName', { required: 'Vui lòng nhập người liên hệ' })}
              />
            </FormField>
            <FormField
              label="Số điện thoại (người liên hệ)"
              required
              htmlFor="contactPhone"
              error={errors.contactPhone?.message}
            >
              <Input
                id="contactPhone"
                {...register('contactPhone', {
                  required: 'Vui lòng nhập số điện thoại',
                  pattern: {
                    value: /^[0-9+\-\s()]{8,}$/,
                    message: 'Số điện thoại không hợp lệ',
                  },
                })}
              />
            </FormField>
            <FormField
              label="Địa chỉ (người liên hệ)"
              required
              htmlFor="contactAddress"
              error={errors.contactAddress?.message}
              className="col-span-2 sm:col-span-3"
            >
              <Input
                id="contactAddress"
                {...register('contactAddress', { required: 'Vui lòng nhập địa chỉ' })}
              />
            </FormField>
            <FormField label="Nguồn khách" htmlFor="source" className="col-span-2">
              <Input
                id="source"
                placeholder="VD: Facebook, giới thiệu, khách cũ…"
                {...register('source')}
              />
            </FormField>
            {isAdmin && (
              <FormField label="Sale phụ trách" className="col-span-2 sm:col-span-1">
                <Controller
                  name="assignedSale"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={getUserRefId(field.value) ?? NONE}
                      onValueChange={(v) => field.onChange(v === NONE ? null : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chưa có" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Chưa có</SelectItem>
                        {sales.map((u) => (
                          <SelectItem key={u._id} value={u._id}>
                            {u.name || u.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            )}
            <FormField label="Mùa chụp" htmlFor="season" className="col-span-2 sm:col-span-1">
              <Controller
                name="season"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(v) => field.onChange(v || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="-- Chọn mùa --" />
                    </SelectTrigger>
                    <SelectContent>
                      {seasons.map((s) => (
                        <SelectItem key={s._id} value={s._id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField label="Ghi chú" htmlFor="notes" className="col-span-2 sm:col-span-3">
              <Textarea id="notes" rows={2} {...register('notes')} />
            </FormField>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Huỷ
            </Button>
            <Button type="submit" variant="gradient" disabled={isSubmitting}>
              Lưu
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CustomersPage;
